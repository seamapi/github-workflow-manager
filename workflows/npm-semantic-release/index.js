const path = require("path")
const prompts = require("prompts")
const deindent = require("deindent")
const fs = require("fs/promises")
const runShell = require("../../lib/runShell")
const Confirm = require("prompt-confirm")
const chalk = require("chalk")
const stripColor = require("strip-color")
const workflowTemplate = require("./workflow-template")
const openGithubSecretsPage = require("../../lib/openGithubSecretsPage")

async function createWorkflowInteractive({ userRepoDir, config }) {
  const packageJSON = JSON.parse(
    await fs.readFile(path.join(userRepoDir, "package.json"))
  )

  const releaseConfigExists = Boolean(
    await fs
      .stat(path.join(userRepoDir, "release.config.js"))
      .catch((e) => null)
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
        initial: config.releaseBranch || "main",
      },
      {
        type: "text",
        name: "buildCommand",
        message: "Build Command",
        initial:
          config.buildCommand ||
          (packageJSON?.scripts?.build ? "build" : "none"),
      },
      {
        type: "select",
        name: "publishTo",
        message: "Publish to...",
        // initial: config.publishTo || "npm",
        choices: [
          { title: "npm", value: "npm" },
          { title: "github", value: "github" },
        ],
      },
    ],
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
        log: false,
      })
    ).match(/git@github\.com:(.+)\.git/m)?.[1]
    if (!repoPath) throw new Error(`Need "repository" field in package.json`)
    const fullRepoURL = `https://github.com/${repoPath}`
    if (
      await new Confirm(
        `Add '"repository": "${fullRepoURL}"' to package.json?`
      ).run()
    ) {
      packageJSON.repository = fullRepoURL
      await fs.writeFile(
        path.join(userRepoDir, "package.json"),
        JSON.stringify(packageJSON, null, "  ")
      )
    } else {
      throw new Error(`Need "repository" field in package.json`)
    }
  }

  if (!releaseConfigExists) {
    console.log("Installing dependencies...")
    const deps = [
      "@semantic-release/commit-analyzer",
      "@semantic-release/release-notes-generator",
      "@semantic-release/npm",
      "@semantic-release/git",
    ]
    if (yarnLockExists) {
      await runShell("yarn", ["add", "--dev", ...deps], { cwd: userRepoDir })
    } else {
      await runShell("npm", ["install", "--dev", ...deps], { cwd: userRepoDir })
    }
    console.log(`Creating "release.config.js"...`)
    await fs.writeFile(
      path.join(userRepoDir, "release.config.js"),
      `module.exports = {
  branches: ["${releaseBranch}"],
  plugins: [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    ["@semantic-release/npm", { npmPublish: true}],
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
      log: true,
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
      await openGithubSecretsPage({ userRepoDir })
    }
  }

  return {
    config: { ...config, releaseBranch, publishTo, buildCommand },
    content: workflowTemplate({ releaseBranch, buildCommand }),
  }
}

module.exports = {
  createWorkflowInteractive,
  description:
    "Build and publish new npm versions, using commits to increment version numbers.",
  usage: `
    
Every time you make a commit, add one of the following tags before it:

type             | version | commit message
-----------------|---------|-----------------------------------
patch release    |  _._.x  | "fix: <some message>"
feature release  |  _.x.0  | "feat: <some message>"
breaking release |  x.0.0  | "BREAKING CHANGE: <some message>"

When merged to master, these commits will be analyzed and new versions of
your package will be published.

    `.trim(),
}
