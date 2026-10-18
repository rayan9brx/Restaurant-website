import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, post } from '../auth/api'
import './Booking.css'

const statuses = ['PENDING', 'CONFIRMED', 'REJECTED', 'CANCELLED']

export default function Reservations({ auth, admin = false }) {
  const [date, setDate] = useState('')
  const [status, setStatus] = useState('')
  const [result, setResult] = useState({ loading: true, rows: [] })
  const [attempt, setAttempt] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const allowed = auth.user && (!admin || auth.user.role === 'ADMIN')

  useEffect(() => {
    if (!allowed) return
    const controller = new AbortController()
    const path = admin
      ? `/api/admin/reservations?date=${date}&status=${status}`
      : '/api/reservations/mine'

    api(path, { signal: controller.signal }).then(
      rows => {
        if (!controller.signal.aborted) setResult({ loading: false, rows })
      },
      failure => {
        if (!controller.signal.aborted) {
          setResult({ loading: false, rows: [], error: failure.message })
        }
      },
    )
    return () => controller.abort()
  }, [allowed, admin, date, status, attempt])

  async function change(id, nextStatus) {
    if (busy) return
    setBusy(true)
    setError('')
    const path = admin
      ? `/api/admin/reservations/${id}/status`
      : `/api/reservations/${id}/cancel`
    try {
      await post(path, { status: nextStatus })
      setAttempt(current => current + 1)
    } catch (failure) {
      setError(failure.message)
    } finally {
      setBusy(false)
    }
  }

  function clearResults() {
    setResult({ loading: true, rows: [] })
  }

  function reload() {
    clearResults()
    setAttempt(current => current + 1)
  }

  return (
    <div className="page-content">
      <section className="reservations-page">
        <h1>{admin ? 'Reservations' : 'My reservations'}</h1>
        <p>All times are Europe/Berlin. Pending requests await the restaurant’s confirmation.</p>
        <Link to="/#booking">Back to booking</Link>
        {admin && allowed && <Link to="/admin/reservations/calendar">Reservation Calendar</Link>}
        {auth.checking ? <p role="status">Checking login…</p> : !allowed ? (
          <p>Please log in{admin ? ' with an administrator account' : ''} to view reservations.</p>
        ) : <>
          {admin && (
            <div className="booking-grid">
              <label>
                Filter by date
                <input type="date" value={date} onChange={event => {
                  setDate(event.target.value)
                  clearResults()
                }} />
              </label>
              <label>
                Filter by status
                <select value={status} onChange={event => {
                  setStatus(event.target.value)
                  clearResults()
                }}>
                  <option value="">All statuses</option>
                  {statuses.map(value => <option key={value}>{value}</option>)}
                </select>
              </label>
            </div>
          )}
          <button onClick={reload} disabled={busy}>Refresh reservations</button>
          {error && <p role="alert" className="booking-error">{error}</p>}
          <ReservationResults result={result} admin={admin} busy={busy} onChange={change} />
        </>}
      </section>
    </div>
  )
}

function ReservationResults({ result, admin, busy, onChange }) {
  if (result.loading) return <p role="status">Loading reservations…</p>
  if (result.error) {
    return <p role="alert">{result.error} Use Refresh reservations to try again.</p>
  }
  if (!result.rows.length) return <p>No reservations found.</p>

  return (
    <ul className="reservation-list">
      {result.rows.map(booking => {
        const start = new Date(`${booking.date}T${booking.time}${berlinOffset(booking.date, booking.time)}`)
        const canCancel = start > new Date() && ['PENDING', 'CONFIRMED'].includes(booking.status)
        return (
          <li key={booking.id}>
            <h3>{booking.date} · {booking.time.slice(0, 5)} · {booking.guests} guests</h3>
            <p>{booking.name} · <strong>{booking.status === 'PENDING' ? 'Pending confirmation' : booking.status}</strong></p>
            <p>Reference: {booking.reference}</p>
            {admin && <><p>{booking.email} · {booking.phone}</p><p>{booking.specialRequests}</p></>}
            {admin && booking.status === 'PENDING' && (
              <div className="reservation-actions">
                <button disabled={busy} onClick={() => onChange(booking.id, 'CONFIRMED')}>Confirm</button>
                <button disabled={busy} onClick={() => onChange(booking.id, 'REJECTED')}>Reject</button>
              </div>
            )}
            {!admin && canCancel && (
              <button disabled={busy} onClick={() => onChange(booking.id, 'CANCELLED')}>Cancel reservation</button>
            )}
          </li>
        )
      })}
    </ul>
  )
}

// Ask the browser's timezone database for Berlin's daylight-saving offset.
function berlinOffset(date, time) {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Europe/Berlin',
    timeZoneName: 'longOffset',
  }).formatToParts(new Date(`${date}T${time}Z`))
  return parts.find(part => part.type === 'timeZoneName').value.replace('GMT', '') || '+00:00'
}
