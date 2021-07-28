const path = require("path")
const prompts = require("prompts")
const fs = require("fs/promises")
const runShell = require("../../lib/runShell")

async function createWorkflowInteractive({ userRepoDir, config }) {
  const packageJson = JSON.parse(
    await fs.readFile(path.join(userRepoDir, "package.json"))
  )

  const releaseRCExists = Boolean(
    await fs.stat(path.join(userRepoDir, ".releaserc.js")).catch((e) => null)
  )
  const yarnLockExists = Boolean(
    await fs.stat(path.join(userRepoDir, "yarn.lock"))
  )

  const { buildCommand, releaseBranch } = await prompts([
    {
      type: "text",
      name: "releaseBranch",
      message: "Main Release Branch:",
      initial: "main"
    },
    {
      type: "text",
      name: "buildCommand",
      message: "Build Command",
      initial: packageJson?.scripts?.build ? "build" : "none",
    },
  ], { onCancel: () => { throw new Error("Cancelled by user") }})

  console.log({ buildCommand, releaseBranch })

  if (!releaseRCExists) {
    console.log("Installing dependencies...")
    const deps = ["@semantic-release/commit-analyzer", "@semantic-release/release-notes-generator", "@semantic-release/npm", "@semantic-release/github", "@semantic-release/git"]
    if (yarnLockExists) {
      await runShell("yarn", ["add", "--dev", ...deps], { cwd: userRepoDir })
    } else {
      await runShell("npm", ["install", "--dev", ...deps], { cwd: userRepoDir })
    }
    console.log(`Creating ".releaserc.js"...`)
    await fs.writeFile(path.join(userRepoDir, ".releaserc.js"), `module.exports = {
  branch: "${releaseBranch}",
  plugins: [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    ["@semantic-release/npm", { npmPublish: true}],
    "@semantic-release/github",
    [
      "@semantic-release/git",
      {
        assets: ["package.json"],
        message:
          "chore(release): \${nextRelease.version} [skip ci]\\n\\n\${nextRelease.notes}",
      },
    ],
  ],
}`)

  }

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
