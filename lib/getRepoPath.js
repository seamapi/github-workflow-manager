const runShell = require("./runShell")

module.exports = async ({ userRepoDir }) => {
  const repoPath = (
    await runShell("git", ["remote", "-v"], {
      cwd: userRepoDir,
    })
  ).match(/git@github\.com:(.+)\.git/m)?.[1]
  return repoPath
}
