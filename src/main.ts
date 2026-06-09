import * as core from '@actions/core'
import * as github from '@actions/github'

async function startWorkflow(): Promise<void> {
  const inputs = {
    workflowId: core.getInput('workflowId'),
    repository:
      core.getInput('repository') ||
      `${github.context.repo.owner}/${github.context.repo.repo}`,
    branch: core.getInput('branch'),
    retryIntervalSeconds: Number(core.getInput('retryIntervalSeconds')),
    timeoutSeconds: Number(core.getInput('timeoutSeconds')),
    initialWaitSeconds: Number(core.getInput('initialWaitSeconds')),
    successStatuses: core
      .getInput('successStatuses')
      .split(',')
      .map(status => status.trim()),
    token: core.getInput('github-token', { required: true })
  }
  const octokit = github.getOctokit(inputs.token)
  const [owner, repo] = inputs.repository.split('/')
  let elapsedTimeSeconds = 0
  await sleep(inputs.initialWaitSeconds)

  while (elapsedTimeSeconds < inputs.timeoutSeconds) {
    const response = await octokit.request(
      'GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}/runs',
      {
        owner,
        repo,
        workflow_id: inputs.workflowId,
        headers: {
          'X-GitHub-Api-Version': '2022-11-28'
        }
      }
    )

    let workflow_runs = response.data.workflow_runs;

    if (inputs.branch){
      workflow_runs = workflow_runs?.filter(run => run.head_branch === inputs.branch);
    }
    
    const latestWorkflowRun = workflow_runs?.[0]
    const totalCounts = response.data.total_count

    if (totalCounts === 0) {
      core.debug('No runs of the given workflow found')
      break
    }

    const latestRunStatus = latestWorkflowRun?.status
    const latestRunConclusion = latestWorkflowRun?.conclusion
    const latestRunBranch = latestWorkflowRun?.head_branch

    if (latestRunStatus === 'completed') {
      if (
        latestRunConclusion &&
        inputs.successStatuses.includes(latestRunConclusion)
      ) {
        core.debug(
          `Latest run of the given workflow allows continuation [${latestRunConclusion}]`
        )
        break
      } else if (latestRunConclusion === 'failure') {
        core.setFailed(`Latest run of the given workflow in branch ${latestRunBranch} was a failure`)
        process.exit(1)
      } else {
        core.setFailed(
          `Latest run of the given workflow in branch ${latestRunBranch} was not successful [${latestRunStatus}]`
        )
        process.exit(1)
      }
    } else {
      core.debug(`Wait because status is ${latestRunStatus}`)
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

export async function run(): Promise<void> {
  try {
    await startWorkflow()
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
