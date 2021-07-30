const open = require("open")
const fs = require("fs")
const path = require("path")

const openGithubSecretsPage = async ({ userRepoDir }) => {
  const packageJSON = JSON.parse(
    fs.readFileSync(path.resolve(userRepoDir, "package.json"))
  )
  if (!packageJSON.repository) {
    console.log("package.json does not have a repository field")
    return
  }
  const repoUrl =
    typeof packageJSON.repository === "string"
      ? packageJSON.repository
      : packageJSON.repository.url

  let repo
  if (repoUrl.includes("github.com")) {
    repo = repoUrl.match(/github.com\/([a-zA-Z0-9-]+\/[a-zA-Z0-9-]+)/)[1]
  } else if (repoUrl.includes("github:")) {
    repo = repoUrl.match(/github:([a-zA-Z0-9/-]+)/)[1]
  }
  open(`https://github.com/${repo}/settings/secrets/new`)
}
