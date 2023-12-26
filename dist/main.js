"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sleep = void 0;
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
async function run() {
    const inputs = {
        workflowId: core.getInput('workflowId'),
        repository: core.getInput('repository') ||
            `${github.context.repo.owner}/${github.context.repo.repo}`,
        retryIntervalSeconds: Number(core.getInput('retryIntervalSeconds')),
        timeoutSeconds: Number(core.getInput('timeoutSeconds')),
        initialWaitSeconds: Number(core.getInput('initialWaitSeconds')),
        successStatuses: core
            .getInput('successStatuses')
            .split(',')
            .map(status => status.trim()),
        token: core.getInput('github-token', { required: true })
    };
    const octokit = github.getOctokit(inputs.token);
    const [owner, repo] = inputs.repository.split('/');
    let elapsedTimeSeconds = 0;
    await sleep(inputs.initialWaitSeconds);
    while (elapsedTimeSeconds < inputs.timeoutSeconds) {
        const response = await octokit.request('GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}/runs', {
            owner,
            repo,
            workflow_id: inputs.workflowId,
            headers: {
                'X-GitHub-Api-Version': '2022-11-28'
            }
        });
        const latestWorkflowRun = response.data.workflow_runs?.[0];
        const totalCounts = response.data.total_count;
        if (totalCounts === 0) {
            core.debug('No runs of the given workflow found');
            break;
        }
        const latestRunStatus = latestWorkflowRun?.status;
        const latestRunConclusion = latestWorkflowRun?.conclusion;
        if (latestRunStatus === 'completed') {
            if (latestRunConclusion &&
                inputs.successStatuses.includes(latestRunConclusion)) {
                core.debug(`Latest run of the given workflow allows continuation [${latestRunConclusion}]`);
                break;
            }
            else if (latestRunConclusion === 'failure') {
                core.setFailed('Latest run of the given workflow was a failure');
                process.exit(1);
            }
            else {
                core.setFailed(`Latest run of the given workflow was not successful [${latestRunStatus}]`);
                process.exit(1);
            }
        }
        else {
            core.debug(`Wait because status is ${latestRunStatus}`);
        }
        elapsedTimeSeconds += inputs.retryIntervalSeconds;
        if (elapsedTimeSeconds < inputs.timeoutSeconds) {
            core.debug(`Retrying in ${inputs.retryIntervalSeconds} seconds...`);
            await sleep(inputs.retryIntervalSeconds);
        }
        else {
            core.setFailed('Timed out');
            process.exit(1);
        }
    }
    core.debug('Action completed');
}
async function sleep(seconds) {
    const milliseconds = seconds * 1000;
    return new Promise(resolve => {
        if (isNaN(milliseconds)) {
            throw new Error('milliseconds not a number');
        }
        setTimeout(resolve, milliseconds);
    });
}
exports.sleep = sleep;
;
(async () => {
    try {
        await run();
    }
    catch (error) {
        if (error instanceof Error) {
            core.setFailed(error.message);
        }
    }
})();
//# sourceMappingURL=main.js.map