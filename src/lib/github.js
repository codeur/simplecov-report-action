const {readFile} = require('node:fs/promises')

const API_BASE = 'https://api.github.com'

function getInput(name, {required = false, defaultValue = ''} = {}) {
  const key = `INPUT_${name.replace(/ /g, '_').toUpperCase()}`
  const value = process.env[key] ?? defaultValue
  const trimmed = String(value).trim()

  if (required && !trimmed) {
    throw new Error(`Input required and not supplied: ${name}`)
  }

  return trimmed
}

function warning(message) {
  console.warn(message)
}

function getRepoFromEnv() {
  const repository = process.env.GITHUB_REPOSITORY ?? ''
  const [owner, repo] = repository.split('/')

  if (!owner || !repo) {
    throw new Error('GITHUB_REPOSITORY is not set or invalid.')
  }

  return {owner, repo}
}

async function getIssueNumberFromEvent() {
  const eventPath = process.env.GITHUB_EVENT_PATH
  if (!eventPath) {
    return null
  }

  const eventRaw = await readFile(eventPath, 'utf8')
  const event = JSON.parse(eventRaw)

  return event?.pull_request?.number ?? event?.issue?.number ?? null
}

async function githubRequest(token, endpoint, {method = 'GET', body} = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`GitHub API request failed (${response.status}): ${errorBody}`)
  }

  if (response.status === 204) {
    return null
  }

  return response.json()
}

async function upsertPullRequestComment(body) {
  const token = getInput('token', {required: true})
  const issueNumber = await getIssueNumberFromEvent()

  if (!issueNumber) {
    warning('Cannot find the PR id.')
    return
  }

  const {owner, repo} = getRepoFromEnv()

  const comments = await githubRequest(
    token,
    `/repos/${owner}/${repo}/issues/${issueNumber}/comments?per_page=100`
  )

  const existing = comments.find(comment =>
    typeof comment.body === 'string' && comment.body.startsWith(COMMENT_HEADER)
  )

  if (existing) {
    await githubRequest(token, `/repos/${owner}/${repo}/issues/comments/${existing.id}`, {
      method: 'PATCH',
      body
    })
    return
  }

  await githubRequest(token, `/repos/${owner}/${repo}/issues/${issueNumber}/comments`, {
    method: 'POST',
    body
  })
}

module.exports = {getInput, upsertPullRequestComment}
