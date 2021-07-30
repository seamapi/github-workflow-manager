module.exports = () => `name: Prettier
on: ["pull_request"]
jobs:
  prettier:
    if: "!contains(github.event.head_commit.message, 'skip ci')"
    name: Run Prettier
    runs-on: ubuntu-20.04
    steps:
      - name: Checkout
        uses: actions/checkout@v1
      - name: Setup Node.js
        uses: actions/setup-node@v1
        with:
          node-version: 14
      - name: Run Prettier Test
        run: npx prettier --check .\n`
