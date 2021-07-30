const fs = require("fs/promises")
const path = require("path")
const workflowTemplate = require("./workflow-template")
const prompts = require("prompts")
const runShell = require("../../lib/runShell")
const getRepoPath = require("../../lib/getRepoPath")

async function createWorkflowInteractive({ userRepoDir, config = {} }) {
  const repoPath = await getRepoPath({ userRepoDir })
  const { dockerOrg, releaseBranch, imageName } = await prompts(
    [
      {
        type: "text",
        name: "releaseBranch",
        message: "Main Release Branch:",
        initial: config.releaseBranch || "main",
      },
      {
        type: "text",
        name: "dockerOrg",
        message: "Docker Organization",
        initial: config.dockerOrg || repoPath.split("/")[0],
      },
      {
        type: "text",
        name: "imageName",
        message: "Image Name",
        initial: config.imageName || repoPath.split("/")[1],
      },
    ],
    {
      onCancel: () => {
        throw new Error("Cancelled by user")
      },
    }
  )

  return {
    config: { dockerOrg, imageName, releaseBranch },
    content: workflowTemplate({ dockerOrg, imageName, releaseBranch }),
  }
}

module.exports = {
  createWorkflowInteractive,
  description: "Build and push a Dockerfile",
  usage: `

Automatically build a Dockerfile at the root of your repository and
push it to docker hub.
  
`.trim(),
}
