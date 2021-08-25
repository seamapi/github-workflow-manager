const path = require("path")
const prompts = require("prompts")
const deindent = require("deindent")
const fs = require("fs/promises")
const runShell = require("../../lib/runShell")
const confirm = require("../../lib/confirm")
const chalk = require("chalk")
const stripColor = require("strip-color")
const workflowTemplate = require("./workflow-template")
const openGithubSecretsPage = require("../../lib/openGithubSecretsPage")
const getRepoPath = require("../../lib/getRepoPath")
const open = require("open")

async function createWorkflowInteractive({ userRepoDir, config = {} }) {
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

  const { buildCommand, releaseBranch, publishTo, testBeforePublish } =
    await prompts(
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
          type: "toggle",
          name: "testBeforePublish",
          message: "Test before publishing?",
          initial: packageJSON?.scripts?.test,
          active: "yes",
          inactive: "no",
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
      ],
      {
        onCancel: () => {
          throw new Error("Cancelled by user")
        },
      }
    )

  const repoPath = await getRepoPath({ userRepoDir })

  if (!packageJSON.repository) {
    // Add repository to package.json
    if (!repoPath) throw new Error(`Need "repository" field in package.json`)
    const fullRepoURL = `https://github.com/${repoPath}`
    if (
      await confirm(`Add '"repository": "${fullRepoURL}"' to package.json?`)
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

  let usePersonalAccessToken = false,
    personalAccessTokenName

  if (
    publishTo === "npm" &&
    (await confirm("Generate NPM token? (required to publish)"))
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
    if (!(await confirm("Would you like to open the github secrets page?"))) {
      await openGithubSecretsPage({ userRepoDir })
    }
  } else if (publishTo === "github") {
    if (!repoPath)
      throw new Error(
        "Repo path not found - does 'git remote -v' show a repository?"
      )
    console.log(
      chalk.gray(
        "Personal Access Tokens are required when you have to install other private github packages from within your github package (during the npm install step). If you're publishing a package without private github package dependencies you don't need a personal access token."
      )
    )
    if (
      await confirm({
        message: "Use personal access token?",
        default: false,
      })
    ) {
      usePersonalAccessToken = true
      ;({ personalAccessTokenName } = await prompts([
        {
          type: "text",
          name: "personalAccessTokenName",
          message: "Name to use for personal access token secret?",
          initial: "GWM_GH_TOKEN",
        },
      ])),
        {
          onCancel: () => {
            throw new Error("Cancelled by user")
          },
        }
      if (await confirm("Do you need to create a new personal access token?")) {
        console.log(
          chalk.blue(
            `\n\nCreate a personal access token on github:\nhttps://github.com/settings/tokens/new\n\n\tNote:      \tGithub Workflow Manager PAT\n\tExpiration:\tNever\n\tPermissions:\trepo (all), workflow, write:packages, read:packages\n\n`
          )
        )

        if (
          await confirm("Open personal access token creation page in browser?")
        ) {
	  console.log(chalk.grey("Opening https://github.com/settings/tokens/new"))
          open("https://github.com/settings/tokens/new")
        }

        await confirm("Personal access token created?")

        console.log(
          chalk.grey(
            " Organization secrets are reusable across repositories but unavailable to personal accounts."
          )
        )
        const { newSecretType } = await prompts([
          {
            type: "select",
            name: "newSecretType",
            message: "Which type of secret would you like to create?",
            choices: [
              { title: "Create a repository secret", value: "repo_secret" },
              { title: "Create an organization secret", value: "org_secret" },
              {
                title: "Organization/Repository secret already exists",
                value: "already_exists",
              },
            ],
          },
        ])

        console.log(
          chalk.blue(
            `\n\nCreate a new secret:\n\n\tName:\t${personalAccessTokenName}\n\tValue:\t<Personal access token from previous step>\n\tAccess:\tPrivate Repositories\n\n`
          )
        )

        if (newSecretType === "repo_secret") {
          if (await confirm("Open repository secrets page in browser?")) {
            openGithubSecretsPage({ userRepoDir })
          }
          await confirm("Repository secret added?")
        } else if (newSecretType === "org_secret") {
          if (await confirm("Open organization secrets page in browser?")) {
            open(
              `https://github.com/organizations/${
                repoPath.split("/")[0]
              }/settings/secrets/actions/new`
            )
          }
          await confirm("Organization secret added?")
        }
      }
    }
  }

  return {
    config: { ...config, releaseBranch, publishTo, buildCommand },
    content: workflowTemplate({
      releaseBranch,
      buildCommand,
      testBeforePublish,
      registryType: publishTo,
      usePersonalAccessToken,
      personalAccessTokenName,
    }),
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
