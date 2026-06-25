const {readFile} = require('node:fs/promises')
const path = require('node:path')
const core = require('@actions/core')
const github = require('@actions/github')

const COMMENT_HEADER = '## Simplecov Report'

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

async function upsertPullRequestComment(body) {
  const token = core.getInput('token', {required: true})
  const issueNumber = github.context.issue.number

  if (!issueNumber) {
    core.warning('Cannot find the PR id.')
    return
  }

  const {owner, repo} = github.context.repo
  const octokit = github.getOctokit(token)

  const {data: comments} = await octokit.rest.issues.listComments({
    owner,
    repo,
    issue_number: issueNumber,
    per_page: 100
  })

  const existing = comments.find(comment =>
    typeof comment.body === 'string' && comment.body.startsWith(COMMENT_HEADER)
  )

  if (existing) {
    await octokit.rest.issues.updateComment({
      owner,
      repo,
      comment_id: existing.id,
      body
    })
    return
  }

  await octokit.rest.issues.createComment({
    owner,
    repo,
    issue_number: issueNumber,
    body
  })
}

async function run() {
  try {
    const failedThreshold = Number.parseFloat(core.getInput('failedThreshold'))
    if (!Number.isFinite(failedThreshold)) {
      throw new Error('failedThreshold must be a valid number.')
    }

    const resultPath = core.getInput('resultPath')
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
      core.setFailed(error.message)
    }
  }
}

if (require.main === module) {
  void run()
}

module.exports = {run, parseCoveredPercent, buildCommentBody}
