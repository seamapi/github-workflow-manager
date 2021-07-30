const workflowTemplate = require("./workflow-template")

async function createWorkflowInteractive() {
  return {
    config: {},
    content: workflowTemplate(),
  }
}

module.exports = {
  createWorkflowInteractive,
  description: "Check that all files are formatted with prettier",
  usage: `
  
Any time a pull request is opened, github will make sure all files are formatted with prettier.

To ignore files, use a ".prettierignore" file in the root of the repository.


  `.trim(),
}
