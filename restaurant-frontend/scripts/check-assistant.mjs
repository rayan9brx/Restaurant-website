import assert from 'node:assert/strict'
import test from 'node:test'
import { askMenu, recentHistory } from '../src/assistant/assistantApi.js'

test('assistant keeps only bounded recent context, including selected records for follow-ups', () => {
  const messages = Array.from({ length: 10 }, (_, index) => ({ role: index % 2 ? 'assistant' : 'user', content: `message ${index}` }))
  messages[9].answer = { dishes: [{ id: 1, name: 'Pizza' }] }
  const history = recentHistory(messages)
  assert.equal(history.length, 6)
  assert.equal(history[0].content, 'message 4')
  assert.match(history[5].content, /1: Pizza/)
  assert.equal(recentHistory([{ role: 'user', content: 'x'.repeat(2000) }])[0].content.length, 1200)
})

test('assistant obtains CSRF and sends same-origin JSON without credentials or a provider URL', async () => {
  const original = globalThis.fetch
  const calls = []
  globalThis.fetch = async (path, options) => {
    calls.push({ path, options })
    return new Response(JSON.stringify(path.endsWith('/csrf')
      ? { token: 'test-csrf', headerName: 'X-CSRF-TOKEN' }
      : { message: 'Verified menu', dishes: [], links: [] }))
  }
  try {
    const controller = new AbortController()
    assert.equal((await askMenu('Hello', [], controller.signal)).message, 'Verified menu')
    assert.equal(calls[0].path, '/api/auth/csrf')
    assert.equal(calls[1].path, '/api/menu-assistant/chat')
    assert.equal(calls[1].options.credentials, 'same-origin')
    assert.equal(calls[1].options.headers['X-CSRF-TOKEN'], 'test-csrf')
    assert.equal(calls[1].options.signal, controller.signal)
    assert.deepEqual(JSON.parse(calls[1].options.body), { message: 'Hello', history: [] })
    assert.equal(calls[1].options.headers.Authorization, undefined)
  } finally { globalThis.fetch = original }
})

test('configuration and quota errors remain honest and retryable', async () => {
  const original = globalThis.fetch
  try {
    for (const [status, message] of [[503, 'Assistant is not configured yet'], [429, 'Usage limit reached']]) {
      globalThis.fetch = async path => new Response(JSON.stringify(path.endsWith('/csrf')
        ? { token: 'csrf', headerName: 'X-CSRF-TOKEN' } : { message }), { status: path.endsWith('/csrf') ? 200 : status })
      await assert.rejects(askMenu('Hello', []), error => error.status === status && error.message === message)
    }
  } finally { globalThis.fetch = original }
})
