Workflows are stored in the `workflows` directory. If you drop a folder with an `index.js` file in there, you'll automatically
create a workflow recognized by the program.

Each workflow `index.js` should return an object matching the following type:

```
{
  // Printed in the --help message, short description of what this workflow does
  description: string,
  
  // Printed after the installation completes
  usage: string,
  
  // Create a workflow, using user input where needed. If this workflow is being re-created, you'll also be passed
  // a `config` object of the previously created workflow. The `config` object can contain anything you want and is
  // stored at the top of the YAML as a comment
  createWorkflowInteractive: ({ userRepoDir: string, config: Object }) => { config: Object, content: Object | string }
}
```
