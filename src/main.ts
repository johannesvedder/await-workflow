import * as core from '@actions/core'
import * as github from '@actions/github'

async function run(): Promise<void> {
  const inputs = {
    workflowId: core.getInput('workflow-id'),
    retryIntervalSeconds: Number(core.getInput('retryIntervalSeconds')),
    timeoutSeconds: Number(core.getInput('timeoutSeconds')),
    initialWaitSeconds: Number(core.getInput('initialWaitSeconds')),
    token: core.getInput('github-token', {required: true})
  }

  let octokit = github.getOctokit(inputs.token)
  let elapsedTimeSeconds = 0
  await sleep(inputs.initialWaitSeconds)

  while (elapsedTimeSeconds < inputs.timeoutSeconds) {
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
          core.debug('Latest run of the given workflow was successful')
          break
        } else if (latestRunConclusion === 'failure') {
          core.setFailed('Latest run of the given workflow was a failure')
          process.exit(1)
        } else {
          // todo check with another input parameter which status cases should lead to a failed state
          // see https://docs.github.com/en/rest/actions/workflow-runs?apiVersion=2022-11-28#get-a-workflow-run
          // and https://docs.github.com/en/rest/guides/using-the-rest-api-to-interact-with-checks?apiVersion=2022-11-28

          // For now just fail
          core.setFailed(
            `Latest run of the given workflow was not successful (status: ${latestRunStatus})`
          )
          process.exit(1)
        }
      } else {
        core.debug(`Wait because status is ${latestRunStatus}`)
      }
    } else {
      core.debug('No runs of the given workflow found')
      break
    }

    elapsedTimeSeconds += inputs.retryIntervalSeconds

    if (elapsedTimeSeconds < inputs.timeoutSeconds) {
      core.debug(`Retrying in ${inputs.retryIntervalSeconds} seconds...`)
      await sleep(inputs.retryIntervalSeconds)
    } else {
      core.setFailed('Timed out')
      process.exit(1)
    }
  }
  core.debug('Action completed')
}

export async function sleep(seconds: number): Promise<void> {
  const milliseconds = seconds * 1000
  return new Promise(resolve => {
    if (isNaN(milliseconds)) {
      throw new Error('milliseconds not a number')
    }
    setTimeout(resolve, milliseconds)
  })
}

run().catch(error => {
  if (error instanceof Error) core.setFailed(error.message)
})
