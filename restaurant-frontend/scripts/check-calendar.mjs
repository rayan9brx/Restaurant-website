import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { createServer } from 'vite'
import { addDays, berlinToday, dateLabel, monthDays, shiftMonth } from '../src/booking/calendarDates.js'

test('today uses Berlin even when the UTC calendar date differs', () => {
  assert.equal(berlinToday(new Date('2026-10-18T22:30:00Z')), '2026-10-19')
  assert.equal(berlinToday(new Date('2026-01-01T23:30:00Z')), '2026-01-02')
})

test('month ranges include full Monday–Sunday weeks and adjacent dates', () => {
  const days = monthDays('2026-10-18')
  assert.equal(days[0], '2026-09-28')
  assert.equal(days.at(-1), '2026-11-01')
  assert.equal(days.length, 35)
  assert.equal(new Set(days).size, days.length)
  assert.deepEqual(monthDays('2021-02-12').slice(0, 2), ['2021-02-01', '2021-02-02'])
  assert.equal(monthDays('2021-02-12').length, 28)
  assert.equal(monthDays('2026-03-01').length, 42)
})

test('date navigation crosses leap days, year boundaries and Berlin DST safely', () => {
  assert.equal(addDays('2028-02-28', 1), '2028-02-29')
  assert.equal(addDays('2028-02-29', 1), '2028-03-01')
  assert.equal(addDays('2026-12-31', 1), '2027-01-01')
  assert.equal(addDays('2026-03-28', 1), '2026-03-29')
  assert.equal(addDays('2026-03-29', 1), '2026-03-30')
  assert.equal(addDays('2026-10-25', -1), '2026-10-24')
  assert.equal(shiftMonth('2028-01-31', 1), '2028-02-29')
  assert.equal(shiftMonth('2026-03-31', -1), '2026-02-28')
  assert.equal(shiftMonth('2026-12-18', 1), '2027-01-18')
  assert.match(dateLabel('2026-10-25'), /Sunday, 25 October 2026/)
})

test('calendar renders the current month for admins and gates other accounts', async () => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
  try {
    const { default: Calendar } = await server.ssrLoadModule('/src/booking/ReservationCalendar.jsx')
    const render = auth => renderToStaticMarkup(h(MemoryRouter, null, h(Calendar, { auth })))
    const admin = render({ checking: false, user: { role: 'ADMIN', email: 'owner@example.com' } })
    assert.ok(admin.includes(dateLabel(berlinToday(), { month: 'long', year: 'numeric' })))
    for (const text of ['Previous month', 'Next month', 'Today', 'Month', 'Day', 'All statuses',
      'Pending', 'Confirmed', 'Rejected', 'Cancelled', 'Monthly agenda', 'Loading reservations']) {
      assert.ok(admin.includes(text), text)
    }
    const client = render({ checking: false, user: { role: 'CLIENT' } })
    assert.match(client, /Please log in with an administrator account/)
    assert.ok(!client.includes('calendar-container'))
    assert.ok(!render({ checking: false, user: null }).includes('calendar-container'))
    assert.match(render({ checking: true, user: null }), /Checking login/)
  } finally {
    await server.close()
  }
})
