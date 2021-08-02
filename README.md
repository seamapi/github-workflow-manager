# Github Workflow Manager

Easily install Github workflows for common patterns such as
publishing an npm module on pushes to master or pushing
a Dockerfile.

![demo_usage_gif](https://github.com/seveibar/github-workflow-manager/blob/main/demo.gif)

> This is not an official Github project.

## Installation

`npm install -g github-workflow-manager`

Or to execute without installation:

`npx github-workflow-manager install <some workflow>`

## Usage

<!-- GENERATED_HELP_OUTPUT_SECTION_START -->
```bash
gwm [command]

Commands:
  gwm ls       List installed workflows
  gwm edit     Edit an existing workflow
  gwm install  Install a github workflow

Options:
  --help     Show help                                                 [boolean]
  --version  Show version number                                       [boolean]
```
<!-- GENERATED_HELP_OUTPUT_SECTION_END -->


<!-- GENERATED_WORKFLOWS_SECTION_START -->
## Workflows

### gwm install build-dockerfile

Build and push a Dockerfile

Automatically build a Dockerfile at the root of your repository and
push it to docker hub.

### gwm install npm-semantic-release

Build and publish new npm versions, using commits to increment version numbers.

Every time you make a commit, add one of the following tags before it:

type             | version | commit message
-----------------|---------|-----------------------------------
patch release    |  _._.x  | "fix: <some message>"
feature release  |  _.x.0  | "feat: <some message>"
breaking release |  x.0.0  | "BREAKING CHANGE: <some message>"

When merged to master, these commits will be analyzed and new versions of
your package will be published.

### gwm install npm-test

Run the test script in package.json

A github check with "npm run test" will be run on any pull request.

### gwm install prettier

Check that all files are formatted with prettier

Any time a pull request is opened, github will make sure all files are formatted with prettier.

To ignore files, use a ".prettierignore" file in the root of the repository.
<!-- GENERATED_WORKFLOWS_SECTION_END -->

