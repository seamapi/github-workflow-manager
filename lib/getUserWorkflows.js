const fs = require("fs/promises")
const yaml = require("yaml")
const path = require("path")

module.exports = async ({ userRepoDir }) => {
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

    const content = yaml.parse(fileContent)
    matchingWorkflows.push({
      gwmConfig,
      content,
      fileName: userWorkflowFileName,
    })
    // TODO store comments to allow comment reconciliation later
  }
  return matchingWorkflows
}
