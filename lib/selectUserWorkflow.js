const path = require("path")
const prompts = require("prompts")
const fs = require("fs/promises")
const yaml = require("yaml")
const getWorkflows = require("./getWorkflows")

module.exports = async ({ userRepoDir, workflowType, workflowDef }) => {
  const matchingWorkflows = (await getWorkflows({ userRepoDir })).filter(
    (wf) => !workflowType || wf.gwmConfig.type === workflowType
  )

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
