import assert from 'node:assert/strict'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { createServer } from 'vite'
import { api, post } from '../src/auth/api.js'

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
try {
  const { default: Header } = await server.ssrLoadModule('/src/components/Header.jsx')
  const render = (auth) => renderToStaticMarkup(h(MemoryRouter, null, h(Header, {
    auth, cart: { items: [], count: 0 }, menu: { loading: false, dishes: [] }, retry() {},
  })))
  const guest = render({ user: null, checking: false })
  for (const href of ['/#home', '/#menu', '/#booking', '/#about']) assert.ok(guest.includes(`href="${href}"`))
  assert.match(guest, /Log In/)
  assert.match(guest, /aria-controls="header-content"/)
  assert.doesNotMatch(guest, /Admin Dashboard|Welcome,|Hello,/)
  for (const role of ['CLIENT', 'ADMIN']) {
    const html = render({ user: { name: 'Test Person', role }, checking: false })
    assert.equal(html.split('Test Person').length - 1, 1)
    assert.match(html, /aria-controls="account-links"/)
    assert.match(html, /href="\/reservations"/)
    if (role === 'ADMIN') {
      assert.match(html, /href="\/#admin"/)
      assert.match(html, /href="\/admin\/reservations\/calendar"/)
    } else assert.doesNotMatch(html, /Admin Dashboard|Reservation Calendar/)
    assert.doesNotMatch(html, /class="login-button">Log In|Login unavailable|Welcome,/)
  }
  assert.match(render({ checking: true }), /Checking login/)
  const error = render({ checking: false, error: 'Cannot reach the server.' })
  assert.match(error, /Login unavailable.*Retry.*Cannot reach the server/s)
  assert.doesNotMatch(error, /class="login-button">Log In|account-toggle/)

  const originalFetch = globalThis.fetch
  const originalWindow = globalThis.window
  try {
    let expired = 0
    globalThis.window = { dispatchEvent: () => expired++ }
    globalThis.fetch = async () => new Response('{"message":"Please log in."}', { status: 401 })
    await assert.rejects(api('/api/reservations'), { status: 401 })
    assert.equal(expired, 1)
    await assert.rejects(api('/api/auth/login'), { status: 401 })
    await assert.rejects(api('/api/auth/me'), { status: 401 })
    assert.equal(expired, 1, 'login and verification own their 401 handling')
    globalThis.fetch = async () => { throw new TypeError('offline') }
    await assert.rejects(api('/api/auth/me'), /Cannot reach the server/)
    assert.equal(expired, 1, 'connection errors are not session expiry')
    const calls = []
    globalThis.fetch = async (path, options) => {
      calls.push({ path, options })
      return new Response(JSON.stringify(path.endsWith('/csrf') ? { token: 'fresh-token', headerName: 'X-CSRF-TOKEN' } : { message: 'ok' }))
    }
    await post('/api/auth/logout', {})
    assert.equal(calls[0].path, '/api/auth/csrf')
    assert.equal(calls[1].options.headers['X-CSRF-TOKEN'], 'fresh-token')
    assert.equal(calls[1].options.credentials, 'same-origin')
  } finally {
    globalThis.fetch = originalFetch
    globalThis.window = originalWindow
  }
  console.log('Header states, session expiry, connection errors and CSRF checks passed.')
} finally {
  await server.close()
}

