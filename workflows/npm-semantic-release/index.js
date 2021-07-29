const path = require("path")
const prompts = require("prompts")
const fs = require("fs/promises")
const runShell = require("../../lib/runShell")
const Confirm = require("prompt-confirm")
const chalk = require("chalk")
const stripColor = require("strip-color")
const openGithubSecretsPage = require("../../lib/openGithubSecretsPage")

async function createWorkflowInteractive({ userRepoDir, config }) {
  const packageJSON = JSON.parse(
    await fs.readFile(path.join(userRepoDir, "package.json"))
  )

  const releaseRCExists = Boolean(
    await fs.stat(path.join(userRepoDir, ".releaserc.js")).catch((e) => null)
  )
  const yarnLockExists = Boolean(
    await fs.stat(path.join(userRepoDir, "yarn.lock"))
  )

  const { buildCommand, releaseBranch, publishTo } = await prompts(
    [
      {
        type: "text",
        name: "releaseBranch",
        message: "Main Release Branch:",
        initial: "main",
      },
      {
        type: "text",
        name: "buildCommand",
        message: "Build Command",
        initial: packageJSON?.scripts?.build ? "build" : "none",
      },
      {
        type: "select",
        name: "publishTo",
        message: "Publish to...",
        choices: [
          { title: "npm", value: "npm" },
          { title: "github", value: "github" },
        ],
      },
    ].filter(Boolean),
    {
      onCancel: () => {
        throw new Error("Cancelled by user")
      },
    }
  )

  if (!packageJSON.repository) {
    // Add repository to package.json
    const repoPath = (
      await runShell("git", ["remote", "-v"], {
        cwd: userRepoDir,
      })
    ).match(/git@github\.com:(.+)\.git/m)?.[1]
    if (!repoPath) throw new Error(`Need "repository" field in package.json`)
    const fullRepoURL = `https://github.com/${repoPath}`
    if (
      new Confirm(`Add '"repository": "${fullRepoURL}"' to package.json?`).run()
    ) {
      packageJSON.repository = fullRepoURL
      await fs.writeFile(
        path.join(userRepoDir, "package.json"),
        JSON.stringify(packageJSON)
      )
    } else {
      throw new Error(`Need "repository" field in package.json`)
    }
  }

  if (!releaseRCExists) {
    console.log("Installing dependencies...")
    const deps = [
      "@semantic-release/commit-analyzer",
      "@semantic-release/release-notes-generator",
      "@semantic-release/npm",
      "@semantic-release/github",
      "@semantic-release/git",
    ]
    if (yarnLockExists) {
      await runShell("yarn", ["add", "--dev", ...deps], { cwd: userRepoDir })
    } else {
      await runShell("npm", ["install", "--dev", ...deps], { cwd: userRepoDir })
    }
    console.log(`Creating ".releaserc.js"...`)
    await fs.writeFile(
      path.join(userRepoDir, ".releaserc.js"),
      `module.exports = {
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
}`
    )
  }

  if (
    publishTo === "npm" &&
    (await new Confirm("Generate NPM token? (required to publish)").run())
  ) {
    const tokenOutput = await runShell("npm", ["token", "create"], {
      cwd: userRepoDir,
    })
    const tokenMatchRes = stripColor(tokenOutput).match(
      /token[\s│\|]+([a-fA-F0-9\-]+)/m
    )
    let token
    if (tokenMatchRes && tokenMatchRes[1]) {
      token = tokenMatchRes[1]
    } else {
      throw new Error("Could not parse token from 'npm create token' output")
    }

    console.log(
      chalk.blue(
        `\n\n\tCreate the NPM_TOKEN secret on github:\n\n\tSecret Name:  NPM_TOKEN\n\tSecret Value: ${token}\n\n\n`
      )
    )
    if (
      !(await new Confirm(
        "Would you like to open the github secrets page?"
      ).run())
    ) {
      openGithubSecretsPage()
    }
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
        run: npm install${
          buildCommand !== "none"
            ? `\n      - name: Build NPM package
        run: npm run ${buildCommand}`
            : ""
        }
      - name: Release
        env:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: \${{ secrets.NPM_TOKEN }}
        run: npx semantic-release`,
  }
}

module.exports = {
  createWorkflowInteractive,
  description:
    "Build and publish new npm versions, using commits to increment version numbers.",
}
