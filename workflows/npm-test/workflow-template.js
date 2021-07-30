module.exports = () => `name: NPM Test
on: ["pull_request"]
jobs:
  npm_test:
    if: "!contains(github.event.head_commit.message, 'skip ci')"
    name: Run NPM Test
    runs-on: ubuntu-20.04
    steps:
      - name: Checkout
        uses: actions/checkout@v1
      - name: Setup Node.js
        uses: actions/setup-node@v1
        with:
          node-version: 14
      - name: Run NPM Install
        run: npm install
      - name: Run NPM Test
        run: npm test\n`
