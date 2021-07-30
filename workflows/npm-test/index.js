const fs = require("fs/promises")
const path = require("path")
const workflowTemplate = require("./workflow-template")

async function createWorkflowInteractive({ userRepoDir, config }) {
  const packageJSON = JSON.parse(
    await fs.readFile(path.join(userRepoDir, "package.json"))
  )

  if (!packageJSON?.scripts?.test) {
    throw new Error(`Create a test script in package.json`)
  }

  return {
    config: {},
    content: workflowTemplate(),
  }
}

module.exports = {
  createWorkflowInteractive,
  description: "Run the test script in package.json",
  usage: `

A github check with "npm run test" will be run on any pull request.
  
`.trim(),
}
