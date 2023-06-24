import * as core from '@actions/core'
import * as github from '@actions/github'

const initialWaitTime = 10 // Wait time until GitHub workflows are initialized in seconds
const retryIntervalSeconds = 60 // Retry interval in seconds
const timeoutSeconds = 600 // Timeout duration in seconds

async function run(): Promise<void> {
  const inputs = {
    token: core.getInput('github-token', {required: true}),
    workflowId: core.getInput('workflow-id')
  }

  let octokit = github.getOctokit(inputs.token)
  let elapsedTimeSeconds = 0
  await sleep(initialWaitTime)

  while (elapsedTimeSeconds < timeoutSeconds) {
    const response = await octokit.request(
      'GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}/runs',
      {
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        workflow_id: inputs.workflowId,
        headers: {
          'X-GitHub-Api-Version': '2022-11-28'
        }
      }
    )

    const workflowRuns = response.data.workflow_runs
    const totalCounts = response.data.total_count

    if (totalCounts > 0) {
      const latestRun = workflowRuns[0]
      const latestRunStatus = latestRun.status
      const latestRunConclusion = latestRun.conclusion

      if (latestRunStatus === 'completed') {
        if (latestRunConclusion === 'success') {
          console.log('Latest run was successful')
          break // Do not wait if the latest run was successful
        } else if (latestRunConclusion === 'failure') {
          core.setFailed('Latest run was not successful')
          process.exit(1)
        } else {
          // todo check with input parameter which status cases should lead to a failed state
        }
      } else {
        console.log(`Wait because status is ${latestRunStatus}`)
      }
    } else {
      console.log('No workflow runs found')
      break // Do not wait
    }

    elapsedTimeSeconds += retryIntervalSeconds

    if (elapsedTimeSeconds < timeoutSeconds) {
      console.log(`Retrying in ${retryIntervalSeconds} seconds...`)
      await sleep(retryIntervalSeconds)
    } else {
      core.setFailed('await-workflow timed out')
      process.exit(1)
    }
  }
  // core.debug(`Workflow${ms} milliseconds ...`) // debug is only output if you set the secret `ACTIONS_STEP_DEBUG` to true
  // core.setOutput('time', new Date().toTimeString())
  console.log('Finished waiting')
}

function sleep(seconds: number): Promise<void> {
  const milliseconds = seconds * 1000
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

run().catch(error => {
  if (error instanceof Error) core.setFailed(error.message)
})
