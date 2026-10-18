import { useEffect, useRef, useState } from 'react'
import { api, post } from '../auth/api'
import { dateLabel, reservationStatuses } from './calendarDates'

export function StatusBadge({ status }) {
  return <span className={`reservation-badge status-${status.toLowerCase()}`}>
    {reservationStatuses[status] || status}
  </span>
}

export default function ReservationDetails({ id, version, onClose, onChanged }) {
  const dialog = useRef(null)
  const saving = useRef(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState(null)
  const key = `${id}:${version}:${attempt}`
  const current = result?.key === key ? result : null
  const booking = current?.booking

  useEffect(() => {
    const element = dialog.current
    const opener = document.activeElement
    element.showModal()
    return () => {
      element.close()
      const target = opener?.isConnected ? opener : document.getElementById('calendar-heading')
      target?.focus()
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    api(`/api/admin/reservations/${id}`, { signal: controller.signal }).then(
      booking => { if (!controller.signal.aborted) setResult({ key, booking }) },
      failure => { if (!controller.signal.aborted) setResult({ key, error: failure.message }) },
    )
    return () => controller.abort()
  }, [id, key])

  async function change(status) {
    if (saving.current || booking?.status !== 'PENDING') return
    saving.current = true
    setBusy(true)
    setError('')
    try {
      const updated = await post(`/api/admin/reservations/${id}/status`, { status })
      setResult({ key, booking: updated })
      onChanged(`Reservation ${reservationStatuses[status].toLowerCase()}.`)
    } catch (failure) {
      setError(failure.message)
      // Another administrator may have already acted on this request.
      if (failure.status === 409) onChanged('Reservation changed. The latest status has been loaded.')
    } finally {
      saving.current = false
      setBusy(false)
    }
  }

  return <dialog className="reservation-dialog" ref={dialog} aria-labelledby="reservation-detail-title"
    onCancel={onClose} onClose={() => { if (!dialog.current?.open) onClose() }}>
    <div className="reservation-dialog-heading">
      <h2 id="reservation-detail-title">Reservation details</h2>
      <button type="button" onClick={onClose} aria-label="Close reservation details">Close ×</button>
    </div>
    {!current ? <p role="status">Loading reservation details…</p> : current.error ? <div role="alert">
      <p>{current.error}</p><button type="button" onClick={() => setAttempt(value => value + 1)}>Retry details</button>
    </div> : <>
      <StatusBadge status={booking.status} />
      <dl className="reservation-detail-list">
        <dt>Booking reference</dt><dd>{booking.reference}</dd>
        <dt>Customer</dt><dd>{booking.name}</dd>
        <dt>Email</dt><dd>{booking.email}</dd>
        <dt>Phone</dt><dd>{booking.phone}</dd>
        <dt>Date and time</dt><dd>{dateLabel(booking.date)} at {booking.time.slice(0, 5)} (Europe/Berlin)</dd>
        <dt>Number of guests</dt><dd>{booking.guests}</dd>
        <dt>Special requests</dt><dd className="reservation-requests">{booking.specialRequests || 'None'}</dd>
        <dt>Created</dt><dd>{new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Europe/Berlin', dateStyle: 'medium', timeStyle: 'short',
        }).format(new Date(booking.createdAt))} (Europe/Berlin)</dd>
      </dl>
      {booking.status === 'PENDING' && <div className="reservation-actions">
        <button className="auth-submit" type="button" disabled={busy} onClick={() => change('CONFIRMED')}>Confirm request</button>
        <button type="button" disabled={busy} onClick={() => change('REJECTED')}>Reject request</button>
      </div>}
    </>}
    {busy && <p role="status">Saving status…</p>}
    {error && <p role="alert" className="booking-error">{error}</p>}
  </dialog>
}
