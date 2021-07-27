import { args, Option, Choice } from "https://deno.land/x/args@2.1.1/index.ts"
import yaml from "yaml"
import npmSemanticRelease from "./workflows/npm-semantic-release/index.ts"
import {
  prettier,
  prettierPlugins,
} from "https://denolib.com/denolib/prettier/prettier.ts"
import chalkInvalid from "https://deno.land/x/chalk_deno@v4.1.1-deno/source/index.js"

console.log(prompts)

const chalk = chalkInvalid as any

const workflows = {
  "npm-semantic-release": npmSemanticRelease,
  "npm-test": npmSemanticRelease,
}

let parser = Object.keys(workflows).reduce(
  (agg, wf) => (agg as any).sub(wf, args.describe("")),
  args
)

async function main() {
  // TODO search parent directories for .git to know where .github/workflows is
  const parsedArgs = parser.parse(Deno.args)
  const workflowType = parsedArgs.tag

  if (!(workflowType.toString() in workflows))
    throw new Error(
      `Unknown workflow type "${workflowType.toString()}"\n\nKnown workflow types:\n${Object.keys(
        workflows
      )
        .map((w) => `\t${w}`)
        .join("\n")}`
    )

  const workflowsDir = `.github/workflows`
  const matchingWorkflows = []

  for await (const workflowFile of Deno.readDir(workflowsDir)) {
    if (!workflowFile.isFile || !workflowFile.name.endsWith(".yml")) continue
    const textDecoder = new TextDecoder("utf-8")
    const fileContent = textDecoder.decode(
      await Deno.readFile(workflowsDir + "/" + workflowFile.name)
    )
    const m = fileContent.match(/#[ ]*gwm:[ ]*({.*)$/m)!
    if (m === null || m === undefined) continue
    const gwmConfig = JSON.parse(m[1])
    if (gwmConfig.type !== workflowType) continue

    const content = yaml.parse(fileContent)
    matchingWorkflows.push({ gwmConfig, content, fileName: workflowFile.name })
    // TODO store comments to allow comment reconciliation later

    // console.log(content)
    // console.log(yaml.stringify(content)
  }

  if (matchingWorkflows.length === 0) {
    console.log("Creating new worflow...")
  }

  let workflowToEdit
  if (matchingWorkflows.length >= 1) {
    workflowToEdit = matchingWorkflows[0]
    // TODO use prompts to allow selection of this workflow or "create new" when
    // deno has a prompts with choices
  } else if (matchingWorkflows.length > 2) {
    // TODO use prompts to allow selection when deno has a prompts with choices
  }

  if (!workflowToEdit) {
    console.log(`No workflow found, creating workflow for "${workflowType}"`)
  } else {
    console.log(`Editing "${workflowType}"`)
  }

  // await Prompt.prompts([
  //   { message: "Prompt Text", type: "text", name: "prompt_text" },
  // ])
  // console.log(await fs.listDir(workflowsDir))
}

main().catch((e) => {
  console.log(chalk.red(`\n${e.toString()}\n\n${e.stack}\n`))
})
