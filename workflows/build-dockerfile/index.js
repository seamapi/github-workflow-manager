const fs = require("fs/promises")
const path = require("path")
const workflowTemplate = require("./workflow-template")
const prompts = require("prompts")
const runShell = require("../../lib/runShell")

async function createWorkflowInteractive({ userRepoDir, config }) {
  const { dockerOrg, releaseBranch, imageName } = await prompts([
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
      initial: config.dockerOrg,
    },
    {
      type: "text",
      name: "imageName",
      message: "Image Name",
      initial: config.imageName,
    },
  ])

  return {
    config: { dockerOrg, imageName, releaseBranch },
    content: workflowTemplate({ dockerOrg, imageName }),
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
