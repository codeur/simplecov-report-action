const {readFile} = require('node:fs/promises')
const path = require('node:path')
const {getInput, upsertPullRequestComment} = require('./lib/github.js')
const COMMENT_HEADER = '## Simplecov Report'

function setFailed(message) {
  console.error(message)
  process.exitCode = 1
}

function parseCoveredPercent(file) {
  const coveredPercent = file?.result?.covered_percent ?? file?.result?.line
  if (coveredPercent === undefined || Number.isNaN(coveredPercent)) {
    throw new Error('Coverage is undefined in result.covered_percent/result.line.')
  }
  return coveredPercent
}

function buildCommentBody(coveredPercent, failedThreshold) {
  return `${COMMENT_HEADER}

| Covered | Threshold |
| --- | --- |
| ${coveredPercent}% | ${failedThreshold}% |
`
}

async function run() {
  try {
    const failedThreshold = Number.parseFloat(getInput('failedThreshold', {defaultValue: '90'}))
    if (!Number.isFinite(failedThreshold)) {
      throw new Error('failedThreshold must be a valid number.')
    }

    const resultPath = getInput('resultPath', {defaultValue: 'coverage/.last_run.json'})
    const workspace = process.env.GITHUB_WORKSPACE ?? process.cwd()
    const jsonPath = path.join(workspace, resultPath)
    const raw = await readFile(jsonPath, 'utf8')
    const parsed = JSON.parse(raw)
    const coveredPercent = parseCoveredPercent(parsed)

    await upsertPullRequestComment(buildCommentBody(coveredPercent, failedThreshold))

    if (coveredPercent < failedThreshold) {
      throw new Error(`Coverage is less than ${failedThreshold}%. (${coveredPercent}%)`)
    }
  } catch (error) {
    if (error instanceof Error) {
      setFailed(error.message)
    }
  }
}

if (require.main === module) {
  void run()
}

module.exports = {run, parseCoveredPercent, buildCommentBody}
