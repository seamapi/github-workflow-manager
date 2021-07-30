const chalk = require("chalk")
const child_process = require("child_process")

module.exports = async function runShell(command, args, { cwd, log }) {
  const argsString = args.map((a) => (a.includes(" ") ? `"${a}"` : a)).join(" ")
  const commandLogLine = "\n> " + command + " " + argsString
  if (log) console.log(chalk.green(commandLogLine))

  const proc = child_process.spawn(
    "bash",
    ["-c", `'${command} ${argsString}'`],
    {
      cwd,
      stdio: ["inherit", "pipe", "pipe"],
      shell: true,
      detached: true,
    }
  )

  let stdout = "",
    stderr = ""
  proc.stdout.on("data", (data) => {
    if (log) console.log(data.toString())
    stdout += data.toString()
  })
  proc.stderr.on("data", (data) => {
    if (log) console.log(data.toString())
    stderr += data.toString()
  })

  process.on("exit", () => {
    proc.kill("SIGINT")
  })

  await new Promise((resolve, reject) => {
    proc.on("close", (exitCode) => {
      if (exitCode)
        return reject(
          `Error\n\n${chalk.red(commandLogLine)}\n${chalk.red(
            stderr
          )}\n${chalk.red(`< Exited code=${exitCode}`)}\n\n`
        )
      resolve()
    })
  })

  return stdout
}
