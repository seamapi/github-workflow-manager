const child_process = require("child_process");
const chalk = require("chalk")

module.exports = async function runShell(command, args, { cwd }) {

  console.log(`\n> ${chalk.green(command + args.map(a => `"${a}"`).join(" "))}`)

  const proc = child_process.spawn(command, args, { cwd, stdio: "inherit", shell: true })

  await new Promise(resolve => proc.on("close", resolve))
}

