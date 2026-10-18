export const reservationStatuses = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
}

export function berlinToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now)
  const part = type => parts.find(value => value.type === type).value
  return `${part('year')}-${part('month')}-${part('day')}`
}

// Calendar days are date strings. UTC arithmetic avoids browser timezone and DST shifts.
export function addDays(date, amount) {
  const value = new Date(`${date}T12:00:00Z`)
  value.setUTCDate(value.getUTCDate() + amount)
  return value.toISOString().slice(0, 10)
}

export function shiftMonth(date, amount) {
  const value = new Date(`${date}T12:00:00Z`)
  const day = value.getUTCDate()
  value.setUTCDate(1)
  value.setUTCMonth(value.getUTCMonth() + amount)
  const last = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 1, 0)).getUTCDate()
  value.setUTCDate(Math.min(day, last))
  return value.toISOString().slice(0, 10)
}

export function monthDays(date) {
  const first = `${date.slice(0, 7)}-01`
  const weekday = new Date(`${first}T12:00:00Z`).getUTCDay()
  const start = addDays(first, -((weekday + 6) % 7))
  const last = addDays(shiftMonth(first, 1), -1)
  const lastWeekday = new Date(`${last}T12:00:00Z`).getUTCDay()
  const end = addDays(last, 6 - ((lastWeekday + 6) % 7))
  const days = []
  for (let day = start; day <= end; day = addDays(day, 1)) days.push(day)
  return days
}

export function dateLabel(date, options = { dateStyle: 'full' }) {
  return new Intl.DateTimeFormat('en-GB', { ...options, timeZone: 'Europe/Berlin' })
    .format(new Date(`${date}T12:00:00Z`))
}
