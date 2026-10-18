import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../auth/api'
import ReservationDetails, { StatusBadge } from './ReservationDetails'
import { addDays, berlinToday, dateLabel, monthDays, reservationStatuses, shiftMonth } from './calendarDates'
import './Booking.css'
import './ReservationCalendar.css'

export default function ReservationCalendar({ auth }) {
  return <div className="page-content"><section className="reservation-calendar-page" aria-labelledby="calendar-heading">
    <p className="calendar-eyebrow">RAYEN RESTAURANT · ADMIN</p>
    <h1 id="calendar-heading" tabIndex={-1}>Reservation Calendar</h1>
    <p>Plan each service at a glance. All dates and times are Europe/Berlin.</p>
    <nav className="calendar-links" aria-label="Dashboard pages">
      <Link to="/#admin">Admin Dashboard</Link><Link to="/admin/reservations">Reservation list</Link>
    </nav>
    {auth.checking ? <p role="status">Checking login…</p> : auth.user?.role !== 'ADMIN'
      ? <p>Please log in with an administrator account to view the reservation calendar.</p>
      : <Calendar key={auth.user.email} />}
  </section></div>
}

function Calendar() {
  const today = berlinToday()
  const [selectedDate, setSelectedDate] = useState(today)
  const [view, setView] = useState('month')
  const [status, setStatus] = useState('')
  const [version, setVersion] = useState(0)
  const [result, setResult] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [notice, setNotice] = useState('')
  const pendingFocus = useRef(null)
  const dayHeading = useRef(null)
  const days = monthDays(selectedDate)
  const start = view === 'day' ? selectedDate : days[0]
  const end = view === 'day' ? selectedDate : days.at(-1)
  const path = `/api/admin/reservations?start=${start}&end=${end}&status=${status}`
  const key = `${path}:${version}`
  const current = result?.key === key ? result : null
  const loading = !current
  const reservations = current?.rows || []

  useEffect(() => {
    const controller = new AbortController()
    api(path, { signal: controller.signal }).then(
      rows => { if (!controller.signal.aborted) setResult({ key, rows }) },
      failure => { if (!controller.signal.aborted) setResult({ key, error: failure.message }) },
    )
    return () => controller.abort()
  }, [path, key])

  useEffect(() => {
    if (!pendingFocus.current) return
    const target = view === 'day' ? dayHeading.current : document.getElementById(`calendar-day-${selectedDate}`)
    target?.focus()
    pendingFocus.current = null
  }, [selectedDate, view])

  function openDay(date) {
    pendingFocus.current = true
    setSelectedDate(date)
    setView('day')
  }

  function navigate(amount) {
    setSelectedDate(date => view === 'month' ? shiftMonth(date, amount) : addDays(date, amount))
  }

  function keyboardDate(event, date) {
    const offsets = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }
    let next
    if (event.key in offsets) next = addDays(date, offsets[event.key])
    if (event.key === 'PageUp') next = shiftMonth(date, -1)
    if (event.key === 'PageDown') next = shiftMonth(date, 1)
    const weekday = (new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7
    if (event.key === 'Home') next = addDays(date, -weekday)
    if (event.key === 'End') next = addDays(date, 6 - weekday)
    if (!next) return
    event.preventDefault()
    const target = document.getElementById(`calendar-day-${next}`)
    if (target) target.focus()
    pendingFocus.current = next !== selectedDate
    setSelectedDate(next)
  }

  function refresh(message = '') {
    setNotice(message)
    setVersion(value => value + 1)
  }

  function rowsFor(date) {
    return reservations.filter(booking => booking.date === date)
  }

  const title = view === 'month'
    ? dateLabel(selectedDate, { month: 'long', year: 'numeric' })
    : dateLabel(selectedDate)

  return <div className="calendar-container">
    <div className="calendar-toolbar">
      <div className="calendar-navigation">
        <button type="button" aria-label={`Previous ${view}`} onClick={() => navigate(-1)}>←</button>
        <button type="button" onClick={() => setSelectedDate(berlinToday())}>Today</button>
        <button type="button" aria-label={`Next ${view}`} onClick={() => navigate(1)}>→</button>
      </div>
      <h2 className="calendar-period" aria-live="polite">{title}</h2>
      <div className="calendar-view-switch" role="group" aria-label="Calendar view">
        <button type="button" aria-pressed={view === 'month'} onClick={() => setView('month')}>Month</button>
        <button type="button" aria-pressed={view === 'day'} onClick={() => setView('day')}>Day</button>
      </div>
    </div>
    <div className="calendar-options">
      <label>Status filter<select value={status} onChange={event => setStatus(event.target.value)}>
        <option value="">All statuses</option>
        {Object.entries(reservationStatuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></label>
      <button type="button" disabled={loading} onClick={() => refresh()}>Refresh calendar</button>
      <ul className="calendar-legend" aria-label="Reservation status legend">
        {Object.keys(reservationStatuses).map(value => <li key={value}><StatusBadge status={value} /></li>)}
      </ul>
    </div>
    <p className="calendar-feedback" role="status">{loading ? 'Loading reservations…' : notice || `${reservations.length} reservations in this view.`}</p>
    {current?.error ? <div role="alert" className="calendar-error">
      <p>Could not load reservations: {current.error}</p>
      <button type="button" onClick={() => refresh()}>Retry calendar</button>
    </div> : <div aria-busy={loading}>
      {view === 'month' ? <>
        <p className="calendar-keyboard-hint">Choose a date for its day view. On date buttons, use arrow keys to move, Home/End for the week, and Page Up/Down for the month.</p>
        <table className="calendar-month" aria-label={title}>
          <thead><tr>{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => <th scope="col" key={day}>{day}</th>)}</tr></thead>
          <tbody>{Array.from({ length: days.length / 7 }, (_, week) => <tr key={week}>
            {days.slice(week * 7, week * 7 + 7).map(date => <td key={date}
              className={`${date.slice(0, 7) !== selectedDate.slice(0, 7) ? 'calendar-outside' : ''} ${date === today ? 'calendar-today' : ''} ${date === selectedDate ? 'calendar-selected' : ''}`}>
              <button type="button" id={`calendar-day-${date}`} className="calendar-date" aria-label={dateLabel(date)}
                aria-current={date === today ? 'date' : undefined} aria-pressed={date === selectedDate}
                onKeyDown={event => keyboardDate(event, date)} onClick={() => openDay(date)}>{Number(date.slice(-2))}</button>
              <ReservationEntries rows={rowsFor(date)} onOpen={setSelectedId} limit={3} onMore={() => openDay(date)} />
            </td>)}
          </tr>)}</tbody>
        </table>
        <div className="calendar-mobile-agenda" aria-label="Monthly agenda">
          {days.filter(date => date.slice(0, 7) === selectedDate.slice(0, 7)).map(date => <div key={date}
            className={`calendar-agenda-date ${date === today ? 'calendar-today' : ''} ${date === selectedDate ? 'calendar-selected' : ''}`}>
            <button type="button" className="calendar-agenda-heading" aria-current={date === today ? 'date' : undefined}
              aria-pressed={date === selectedDate} onClick={() => openDay(date)}>{dateLabel(date, { weekday: 'short', day: 'numeric', month: 'short' })}</button>
            <ReservationEntries rows={rowsFor(date)} onOpen={setSelectedId} limit={3} onMore={() => openDay(date)} />
            {!loading && !rowsFor(date).length && <p className="calendar-empty">No reservations</p>}
          </div>)}
        </div>
      </> : <div className="calendar-day-view">
        <h3 ref={dayHeading} tabIndex={-1}>Reservations for {dateLabel(selectedDate)}</h3>
        <ReservationEntries rows={rowsFor(selectedDate)} onOpen={setSelectedId} />
        {!loading && !reservations.length && <p>No reservations for this date{status ? ' and status' : ''}.</p>}
      </div>}
    </div>}
    {selectedId !== null && <ReservationDetails key={selectedId} id={selectedId} version={version}
      onClose={() => setSelectedId(null)} onChanged={refresh} />}
  </div>
}

function ReservationEntries({ rows, onOpen, limit = Infinity, onMore }) {
  return <>
    <ul className="calendar-reservations">
      {rows.slice(0, limit).map(booking => <li key={booking.id}>
        <button type="button" className="calendar-reservation" onClick={() => onOpen(booking.id)}>
          <span className="calendar-reservation-summary"><strong>{booking.time.slice(0, 5)}</strong> · {booking.name} · {booking.guests} guests</span>
          <StatusBadge status={booking.status} />
        </button>
      </li>)}
    </ul>
    {rows.length > limit && <button type="button" className="calendar-more" onClick={onMore}>+ {rows.length - limit} more<span className="calendar-sr-only"> reservations for this date</span></button>}
  </>
}
