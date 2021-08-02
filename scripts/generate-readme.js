const fs = require("fs/promises")
const path = require("path")
const workflows = require("../lib/workflows")
const { getYargsBuilder } = require("../index.js")
const yargs = require("yargs")

function replaceSection(content, sectionName, newContent) {
  re = `<!-- GENERATED_${sectionName}_SECTION_START[\\s\\S\\n]*GENERATED_${sectionName}_SECTION_END -->`

  return content.replace(
    new RegExp(re, "gm"),
    `<!-- GENERATED_${sectionName}_SECTION_START -->\n${newContent}\n<!-- GENERATED_${sectionName}_SECTION_END -->`
  )
}

async function generateReadme() {
  let readmeContent = (
    await fs.readFile(path.join(__dirname, "../README.md"))
  ).toString()

  const yargsBuilder = getYargsBuilder()
  readmeContent = replaceSection(
    readmeContent,
    "HELP_OUTPUT",
    `\`\`\`bash\n${(await yargsBuilder.getHelp()).replace(
      /generate-readme\.js/g,
      "gwm"
    )}\n\`\`\``
  )

  readmeContent = replaceSection(
    readmeContent,
    "WORKFLOWS",
    `## Workflows\n\n${Object.entries(workflows)
      .map(
        ([wfName, wf]) =>
          `### gwm install ${wfName}\n\n${wf.description}\n\n${wf.usage}`
      )
      .join("\n\n")}`
  )
  console.log(readmeContent)
}

generateReadme()
