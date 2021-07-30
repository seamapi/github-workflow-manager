module.exports = ({ releaseBranch, buildCommand }) =>
  `name: NPM Semantic Release
on:
  push:
    branches:
      - ${releaseBranch}
jobs:
  publish:
    if: "!contains(github.event.head_commit.message, 'skip ci')"
    name: Release
    runs-on: ubuntu-20.04
    steps:
      - name: Checkout
        uses: actions/checkout@v1
      - name: Setup Node.js
        uses: actions/setup-node@v1
        with:
          node-version: 14
      - name: Install dependencies
        run: npm install${
          buildCommand !== "none"
            ? `\n      - name: Build NPM package
        run: npm run ${buildCommand}`
            : ""
        }
      - name: Release
        env:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: \${{ secrets.NPM_TOKEN }}
        run: npx semantic-release`
