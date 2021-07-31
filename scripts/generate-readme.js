const fs = require("fs/promises")
const path = require("path")
const workflows = require("../lib/workflows")

async function replaceSection(sectionName) {}

async function generateReadme() {
  let readmeContent = (
    await fs.readFile(path.join(__dirname, "../README.md"))
  ).toString()

  replaceSection(
    "WORKFLOWS",
    `## Workflows\n\n${Object.entries(workflows).map(([wfName, wf]) => ``)}`
  )
}

generateReadme()
