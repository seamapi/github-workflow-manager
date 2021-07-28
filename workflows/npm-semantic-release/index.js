const path = require("path")
const prompts = require("prompts")
const fs = require("fs/promises")

async function createWorkflowInteractive({ userRepoDir, config }) {
  const packageJson = JSON.parse(
    await fs.readFile(path.join(userRepoDir, "package.json"))
  )

  const releaseRCExists = Boolean(
    await fs.stat(path.join(userRepoDir, ".releaserc.js")).catch((e) => null)
  )

  const { buildCommand } = await prompts([
    {
      type: "text",
      name: "buildCommand",
      message: "Build Command",
      initial: packageJson.scripts.build ? "build" : "none",
    },
  ])

  console.log({ buildCommand })

  return {
    config: { ...config },
    content: `name: NPM Semantic Release
on:
  push:
    branches:
      - master
jobs:
  publish:
    if: "!contains(github.event.head_commit.message, 'skip ci')"
    name: Release
    runs-on: ubuntu-20.04
    steps:
      - name: Checkout
        uses: actions/checkout@v1
      - name: Setup Node.js
        uses: actions/setup-node@v1
        with:
          node-version: 14
      - name: Install dependencies
        run: npm install
${
  buildCommand !== "none"
    ? `      - name: Build NPM package
        run: npm run ${buildCommand}`
    : ""
}
      - name: Release
        env:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: \${{ secrets.NPM_TOKEN }}
        run: npx semantic-release
      - name: Publish github pages
        run: |
          git remote set-url origin https://git:\${GITHUB_TOKEN}@github.com/UniversalDataTool/universal-data-tool.git
          npm run gh-pages -- -u "github-actions-bot <support+actions@github.com>"
        env:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}`,
  }
}

module.exports = {
  createWorkflowInteractive,
  description:
    "Build and publish new npm versions, using commits to increment version numbers.",
}
