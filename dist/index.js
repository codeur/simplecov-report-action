/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 530:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const {readFile} = __nccwpck_require__(455)

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


/***/ }),

/***/ 936:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const {readFile} = __nccwpck_require__(455)
const path = __nccwpck_require__(760)
const {getInput, upsertPullRequestComment} = __nccwpck_require__(530)
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

if (require.main === require.cache[eval('__filename')]) {
  void run()
}

module.exports = {run, parseCoveredPercent, buildCommentBody}


/***/ }),

/***/ 455:
/***/ ((module) => {

"use strict";
module.exports = require("node:fs/promises");

/***/ }),

/***/ 760:
/***/ ((module) => {

"use strict";
module.exports = require("node:path");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __nccwpck_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId](module, module.exports, __nccwpck_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = __dirname + "/";
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __nccwpck_require__(936);
/******/ 	module.exports = __webpack_exports__;
/******/ 	
/******/ })()
;