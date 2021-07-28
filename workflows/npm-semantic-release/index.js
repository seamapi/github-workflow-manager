const prompts = require("prompts")

async function createWorkflowInteractive({ userRepoDir }) {
  const {} = await prompts([
    {
      type: "",
      name: "",
      message: "",
    },
  ])


return `name: NPM Semantic Release
on:
  push:
    branches:
      - master
jobs:
  release:
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
        run: npm install
      - name: Build NPM package
        run: npm run build:lib
      - name: Release
        env:
          GITHUB_TOKEN: ${{ secrets.RELEASE_GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
        run: npx semantic-release
      - name: Publish github pages
        run: |
          git remote set-url origin https://git:${GITHUB_TOKEN}@github.com/UniversalDataTool/universal-data-tool.git
          npm run gh-pages -- -u "github-actions-bot <support+actions@github.com>"
        env:
          GITHUB_TOKEN: ${{ secrets.RELEASE_GITHUB_TOKEN }}
          REACT_APP_GOOGLE_DRIVE_APP_ID: ${{ secrets.REACT_APP_GOOGLE_DRIVE_APP_ID }}
          REACT_APP_GOOGLE_DRIVE_CLIENT_ID: ${{ secrets.REACT_APP_GOOGLE_DRIVE_CLIENT_ID }}
          REACT_APP_GOOGLE_DRIVE_DEVELOPER_KEY: ${{ secrets.REACT_APP_GOOGLE_DRIVE_DEVELOPER_KEY }}`
}

module.exports = {
  createWorkflowInteractive,
  description:
    "Build and publish new npm versions, using commits to increment version numbers.",
}
