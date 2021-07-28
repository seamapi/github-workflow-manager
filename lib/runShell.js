const execa = require("execa");
const chalk = require("chalk")

module.exports = async function runShell(command, args, { cwd }) {

  const argsString = args.map(a => a.includes(" ") ? `"${a}"` : a).join(" ")
  console.log(chalk.green("\n> " + command + " " + argsString))

  // const proc = child_process.spawn(command, args, { cwd, stdio: ["inherit", "pipe", "pipe"], shell: true })
  const proc = execa(command, args, {  shell: true, cwd, buffer: false })
  // process.stdin.pipe(proc.stdin)
  // proc.stdout.pipe(process.stdout)
  // proc.stderr.pipe(process.stderr)
  process.on("exit", () => { proc.kill("SIGINT") })

  setTimeout(() => { process.exit(2) }, 5000)

  // let output = ""
  // proc.stdout.on("data", data => {
  //   console.log(data.toString())
  //   output += data
  // })
  // proc.stderr.on("data", data => {
  //   console.log(chalk.red(data.toString()))
  // })
  // process.on("SIGINT", () => proc.kill("SIGINT"))
  

  // await new Promise(resolve => proc.on("close", resolve))

  return (await proc).stdout
}

