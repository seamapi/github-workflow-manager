module.exports = ({
  releaseBranch,
  buildCommand,
  registryType = "npm",
  testBeforePublish,
  usePersonalAccessToken = false,
  personalAccessTokenName,
}) => {
  const NODE_AUTH_TOKEN =
    registryType === "github"
      ? usePersonalAccessToken
        ? `\${{ secrets.${personalAccessTokenName} }}`
        : "${{ secrets.GITHUB_TOKEN }}"
      : "${{ secrets.NPM_TOKEN }}"
  return `name: NPM Semantic Release
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
        uses: actions/setup-node@v2
        with:
          node-version: '14.x'
          registry-url: '${
            registryType === "github"
              ? "https://npm.pkg.github.com"
              : "https://registry.npmjs.org"
          }'
      - name: Install dependencies
        env:
          NODE_AUTH_TOKEN: ${NODE_AUTH_TOKEN}
        run: npm install${
          buildCommand !== "none"
            ? `\n      - name: Build NPM package
        run: npm run ${buildCommand}\n`
            : ""
        }${
    testBeforePublish
      ? `\n      - name: Test
        run: npm run test`
      : ""
  }
      - name: Release
        env:
          NODE_AUTH_TOKEN: ${NODE_AUTH_TOKEN}
          GITHUB_TOKEN: ${GITHUB_TOKEN}
        run: npx semantic-release`
}
