#!/usr/bin/env node

const yargs = require("yargs/yargs")
const { hideBin } = require("yargs/helpers")
const chalk = require("chalk")
const { readdirSync } = require("fs")
const fs = require("fs/promises")
const path = require("path")
const yaml = require("yaml")
const selectUserWorkflow = require("./lib/selectUserWorkflow")
const findGitRoot = require("find-git-root")
const prettier = require("prettier")
const { create } = require("domain")

const workflows = readdirSync(path.resolve(__dirname, "workflows")).reduce(
  (agg, dirName) => ({
    ...agg,
    [dirName]: require(path.resolve(__dirname, "workflows", dirName)),
  }),
  {}
)

async function main() {
  const yargsBuilder = yargs(hideBin(process.argv))

  const installCommand = yargsBuilder.command(
    "install",
    "Install a github workflow",
    (installBuilder) => {
      for (const wfName in workflows) {
        if (!workflows[wfName].description)
          throw new Error(
            `Workflow Template "${wfName}" is missing the "description" export.`
          )
        installBuilder.command(wfName, workflows[wfName].description)
      }
    }
  )

  const argv = yargsBuilder.argv

  if (argv._.length === 0) {
    yargsBuilder.showHelp()
    process.exit(1)
  }

  if (argv._[0] !== "install") {
    console.log(yargsBuilder.showHelp())
    process.exit(1)
  }

  const workflowType = argv._[1]

  if (!workflows[workflowType]) {
    yargsBuilder.showHelp()
    process.exit(1)
  }

  const userRepoDir = path.resolve(findGitRoot(process.cwd()), "..")

  const { selectedWorkflowName, gwmConfig } = await selectUserWorkflow({
    userRepoDir,
    workflowType,
    workflowDef: workflows[workflowType],
  })

  const createdWorkflow = await workflows[
    workflowType
  ].createWorkflowInteractive({ ...argv, userRepoDir, config: gwmConfig })

  const outputPath = path.resolve(
    userRepoDir,
    ".github",
    "workflows",
    `${selectedWorkflowName}.yml`
  )
  console.log(`Writing to "${outputPath.replace(userRepoDir + "/", "")}"`)

  let fileContent =
    typeof createdWorkflow.content === "string"
      ? createdWorkflow.content
      : yaml.stringify(createdWorkflow.content)
  const configFile = await prettier.resolveConfig(outputPath)
  fileContent = prettier.format(fileContent, { ...configFile, parser: "yaml" })

  await fs.writeFile(
    outputPath,
    `# GENERATED BY github-workflow-manager\n# gwm: ${JSON.stringify({
      type: workflowType,
      ...createdWorkflow.config,
    })}\n${fileContent}`
  )

  console.log(
    `\n${chalk.green(
      "Success!"
    )}\n\n=====================================================\n\n${workflowType} usage:\n\n${
      workflows[workflowType].usage
    }\n\n`
  )
}

if (!module.parent) {
  process.on("SIGINT", () => process.exit(1))
  main().catch((e) => {
    const quietErrors = ["Cancelled by user"]
    const err = e.toString()
    console.log(
      chalk.red(
        err + quietErrors.some((qErr) => err.includes(qErr))
          ? ""
          : "\n\n" + e.stack
      )
    )
  })
}
