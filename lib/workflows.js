const path = require("path")
const { readdirSync } = require("fs")

// Load in workflows directory
module.exports = readdirSync(path.resolve(__dirname, "../workflows")).reduce(
  (agg, dirName) => ({
    ...agg,
    [dirName]: require(path.resolve(__dirname, "../workflows", dirName)),
  }),
  {}
)
