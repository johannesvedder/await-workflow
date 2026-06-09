# GitHub Action: Await Workflow

This GitHub Action allows you to wait for a specific workflow to complete before
proceeding with the next steps in your workflow.

## Inputs

- `workflowId`: The ID of the workflow to monitor or the filename of the
  workflow (required).
- `repository`: The repository in the format 'owner/repository'. It is used to
  fetch the workflow runs. If not provided, it falls back to the current
  repository (default: `github.context.repo.owner/github.context.repo.repo`).
- `branch`: The branch to fetch the workflow runs (If not provided, considers all branches.)
- `retryIntervalSeconds`: The number of seconds to wait between each retry
  (default: 60).
- `timeoutSeconds`: The maximum number of seconds to wait before timing out
  (default: 600).
- `initialWaitSeconds`: The number of seconds to wait before the first check
  (default: 10).
- `successStatuses`: The comma-separated list of status values that indicate a
  successful workflow run (default: `success`).
- `github-token`: The GitHub token used to authenticate the API requests
  (default: ${{ github.token }}).

## Usage

```yaml
name: My Workflow

on:
  push:
    branches:
      - main

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Await completion of another workflow
        uses: johannesvedder/await-workflow@v1
        with:
          workflowId: workflow_to_wait_on.yml
```
