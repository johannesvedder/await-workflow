import { readFileSync } from 'fs'
import { describe, expect, it } from '@jest/globals'

describe('GitHub Action runtime metadata', () => {
  it('uses Node.js 24 for the published action runtime', () => {
    const actionMetadata = readFileSync('action.yml', 'utf8')

    expect(actionMetadata).toContain('using: node24')
  })

  it('uses Node.js 24 for local development and CI', () => {
    const nodeVersion = readFileSync('.node-version', 'utf8').trim()
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
      engines: { node: string }
    }

    expect(nodeVersion).toBe('24')
    expect(packageJson.engines.node).toBe('>=24')
  })

  it('uses Node.js 24 compatible first-party actions in workflows', () => {
    const workflowPaths = [
      '.github/workflows/check-dist.yml',
      '.github/workflows/ci.yml',
      '.github/workflows/codeql-analysis.yml',
      '.github/workflows/linter.yml'
    ]

    const workflows = workflowPaths
      .map(path => readFileSync(path, 'utf8'))
      .join('\n')

    expect(workflows).not.toContain('actions/checkout@v4')
    expect(workflows).not.toContain('actions/setup-node@v4')
    expect(workflows).not.toContain('actions/upload-artifact@v4')
    expect(workflows).not.toContain('github/codeql-action/init@v3')
    expect(workflows).not.toContain('github/codeql-action/autobuild@v3')
    expect(workflows).not.toContain('github/codeql-action/analyze@v3')
  })
})
