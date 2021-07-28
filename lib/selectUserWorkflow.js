const path = require("path")
const prompts = require("prompts")
const fs = require("fs/promises")
const yaml = require("yaml")

module.exports = async ({ userRepoDir, workflowType, workflowDef }) => {
  const userWorkflowFileNames = await fs.readdir(
    path.resolve(userRepoDir, ".github", "workflows")
  )

  const matchingWorkflows = []
  for (const userWorkflowFileName of userWorkflowFileNames) {
    if (!userWorkflowFileName.endsWith(".yml")) continue
    const fileContent = (
      await fs.readFile(
        path.resolve(userRepoDir, ".github", "workflows", userWorkflowFileName)
      )
    ).toString()
    const m = fileContent.match(/#[ ]*gwm:[ ]*({.*)$/m)
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

  let gwmConfig
  if (selectedWorkflowName === "create_new") {
    ;({ selectedWorkflowName } = await prompts([
      {
        type: "text",
        name: "selectedWorkflowName",
        message: "Name your workflow file",
        initial: workflowDef.defaultFileName || workflowType,
      },
    ]))
  } else {
    gwmConfig = matchingWorkflows.find((mf) =>
      mf.fileName.startsWith(selectedWorkflowName)
    ).gwmConfig
  }

  if (!selectedWorkflowName) throw new Error("No workflow selected")

  return { selectedWorkflowName, gwmConfig }
}
