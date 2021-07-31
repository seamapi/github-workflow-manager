const Confirm = require("prompt-confirm")

module.exports = (...args) => new Confirm(...args).run()
