const test = require('node:test')
const assert = require('node:assert/strict')

const {parseCoveredPercent, buildCommentBody} = require('../src/main.js')

test('parseCoveredPercent supports covered_percent', () => {
  assert.equal(parseCoveredPercent({result: {covered_percent: 97.5}}), 97.5)
})

test('parseCoveredPercent supports line fallback', () => {
  assert.equal(parseCoveredPercent({result: {line: 88.2}}), 88.2)
})

test('buildCommentBody builds markdown table', () => {
  const body = buildCommentBody(95, 90)
  assert.match(body, /Simplecov Report/)
  assert.match(body, /\| 95% \| 90% \|/)
})
