const test = require('node:test')
const assert = require('node:assert/strict')
const {mkdtemp, writeFile} = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')

const {upsertPullRequestComment} = require('../src/lib/github.js')

const originalEnv = {...process.env}
const originalFetch = global.fetch

test.afterEach(() => {
  process.env = {...originalEnv}
  global.fetch = originalFetch
})

async function setupEventFile(issueNumber) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'simplecov-report-action-'))
  const eventPath = path.join(dir, 'event.json')

  await writeFile(eventPath, JSON.stringify({issue: {number: issueNumber}}), 'utf8')

  return eventPath
}

test('upsertPullRequestComment creates a new issue comment with object payload', async () => {
  const eventPath = await setupEventFile(123)

  process.env.INPUT_TOKEN = 'token'
  process.env.GITHUB_REPOSITORY = 'octo/repo'
  process.env.GITHUB_EVENT_PATH = eventPath

  const calls = []

  global.fetch = async (url, options) => {
    calls.push({url, options})

    if (String(url).includes('/comments?per_page=100')) {
      return {
        ok: true,
        status: 200,
        json: async () => []
      }
    }

    return {
      ok: true,
      status: 201,
      json: async () => ({id: 1})
    }
  }

  await upsertPullRequestComment('## Simplecov Report\n\n| Covered | Threshold |', '## Simplecov Report')

  assert.equal(calls.length, 2)
  assert.equal(calls[1].options.method, 'POST')
  assert.deepEqual(JSON.parse(calls[1].options.body), {
    body: '## Simplecov Report\n\n| Covered | Threshold |'
  })
})

test('upsertPullRequestComment updates an existing issue comment with object payload', async () => {
  const eventPath = await setupEventFile(456)

  process.env.INPUT_TOKEN = 'token'
  process.env.GITHUB_REPOSITORY = 'octo/repo'
  process.env.GITHUB_EVENT_PATH = eventPath

  const calls = []

  global.fetch = async (url, options) => {
    calls.push({url, options})

    if (String(url).includes('/comments?per_page=100')) {
      return {
        ok: true,
        status: 200,
        json: async () => [{id: 42, body: '## Simplecov Report\nold'}]
      }
    }

    return {
      ok: true,
      status: 200,
      json: async () => ({id: 42})
    }
  }

  await upsertPullRequestComment('## Simplecov Report\nnew', '## Simplecov Report')

  assert.equal(calls.length, 2)
  assert.equal(calls[1].options.method, 'PATCH')
  assert.deepEqual(JSON.parse(calls[1].options.body), {
    body: '## Simplecov Report\nnew'
  })
})
