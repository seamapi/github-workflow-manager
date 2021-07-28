const yargs = require("yargs/yargs")
const { hideBin } = require("yargs/helpers")
const chalk = require("chalk")
const { readdirSync } = require("fs")
const fs = require("fs/promises")
const path = require("path")
const yaml = require("yaml")
const prompts = require("prompts")
const findGitRoot = require("find-git-root")

const workflows = readdirSync(path.resolve(__dirname, "workflows")).reduce(
  (agg, dirName) => ({
    ...agg,
    [dirName]: require(path.resolve(__dirname, "workflows", dirName)),
  }),
  {}
)

async function main() {
  const yargsBuilder = yargs(hideBin(process.argv))

  for (const wfName in workflows) {
    if (!workflows[wfName].description)
      throw new Error(
        `Workflow Template "${wfName}" is missing the "description" export.`
      )
    yargsBuilder.command(wfName, workflows[wfName].description)
  }

  const argv = yargsBuilder.argv

  if (argv._.length === 0) {
    yargsBuilder.showHelp()
    process.exit(1)
  }

  const workflowType = argv._[0]

  if (!workflows[workflowType]) {
    yargsBuilder.showHelp()
    process.exit(1)
  }

  const userRepoRoot = path.resolve(findGitRoot(process.cwd()), "..")

  const userWorkflowFileNames = await fs.readdir(
    path.resolve(userRepoRoot, ".github", "workflows")
  )

  const matchingWorkflows = []

  for (const userWorkflowFileName of userWorkflowFileNames) {
    if (!userWorkflowFileName.endsWith(".yml")) continue
    const fileContent = (
      await fs.readFile(
        path.resolve(userRepoRoot, ".github", "workflows", userWorkflowFileName)
      )
    ).toString()
    const m = fileContent.match(/#[ ]*gwm:[ ]*({.*)$/m)
    console.log(fileContent, m)
    if (m === null || m === undefined) continue
    const gwmConfig = JSON.parse(m[1])
    if (gwmConfig.type !== workflowType) continue

    const content = yaml.parse(fileContent)
    matchingWorkflows.push({
      gwmConfig,
      content,
      fileName: userWorkflowFileName,
    })
    // TODO store comments to allow comment reconciliation later
  }

  let { selectedWorkflowName } = await prompts([
    {
      type: "select",
      name: "selectedWorkflowName",
      message: "Select Workflow to Overwrite:",
      choices: [
        ...(await matchingWorkflows.map((mf) => ({
          title: mf.fileName.split(".")[0],
          value: mf.fileName.split(".")[0],
        }))),
        { title: "Create New", value: "create_new" },
      ],
    },
  ])

  if (selectedWorkflowName === "create_new") {
    ;({ selectedWorkflowName } = await prompts([
      {
        type: "text",
        name: "selectedWorkflowName",
        message: "Name your workflow file",
        initial: workflows[workflowType].defaultFileName || workflowType,
      },
    ]))
  }

  if (!selectedWorkflowName) throw new Error("No workflow selected")

  const createdWorkflow = await workflows[
    workflowType
  ].createWorkflowInteractive(argv)

  const outputPath = path.resolve(
    userRepoRoot,
    ".github",
    "workflows",
    `${selectedWorkflowName}.yml`
  )
  console.log(`Writing to "${outputPath.replace(userRepoRoot + "/", "")}"`)
  await fs.writeFile(
    outputPath,
    `# GENERATED BY github-workflow-manager\n# gwm: ${JSON.stringify({
      type: workflowType,
    })}\n
    ${
      typeof createdWorkflow === "string"
        ? createdWorkflow
        : yaml.stringify(createdWorkflow)
    }`
  )
}

if (!module.parent) {
  main().catch((e) => {
    console.log(chalk.red(e.toString() + "\n\n" + e.stack))
  })
}
