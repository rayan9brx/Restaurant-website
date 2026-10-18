import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, post } from '../auth/api'
import './Booking.css'

function berlinToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
}

export default function Booking({ auth }) {
  const [values, setValues] = useState({ name: '', email: '', phone: '', date: berlinToday(), time: '', guests: '2', specialRequests: '' })
  const [availability, setAvailability] = useState({ slots: [], loading: true, maxPartySize: 8 })
  const [attempt, setAttempt] = useState(0)
  const [error, setError] = useState('')
  const [fields, setFields] = useState({})
  const [busy, setBusy] = useState(false)
  const [resume, setResume] = useState(false)
  const [success, setSuccess] = useState(null)
  const saving = useRef(false)
  const request = useRef(null)
  const form = useRef(null)

  useEffect(() => {
    const controller = new AbortController()
    api(`/api/reservations/availability?date=${values.date}&guests=${values.guests}`, { signal: controller.signal }).then(
      data => {
        if (!controller.signal.aborted) setAvailability({ ...data, loading: false })
      },
      failure => {
        if (!controller.signal.aborted) {
          setAvailability(current => ({ ...current, slots: [], loading: false, error: failure.message }))
        }
      },
    )
    return () => controller.abort()
  }, [values.date, values.guests, attempt])

  // Empty contact fields inherit account details without replacing visitor input.
  const name = values.name || auth.user?.name || ''
  const email = values.email || auth.user?.email || ''
  const formValues = { ...values, name, email }

  useEffect(() => {
    if (resume && auth.user) {
      setResume(false)
      form.current?.requestSubmit()
    }
  }, [resume, auth.user])

  function change(event) {
    const { name: key, value } = event.target
    const availabilityChanged = key === 'date' || key === 'guests'
    setValues(current => {
      const next = { ...current, [key]: value }
      if (availabilityChanged) next.time = ''
      return next
    })
    if (availabilityChanged) {
      setAvailability(current => ({ ...current, loading: true, error: '' }))
    }
    setResume(false)
    setSuccess(null)
    setFields({})
  }

  function requestLogin() {
    setResume(true)
    window.dispatchEvent(new Event('booking-login'))
  }

  async function submit(event) {
    event.preventDefault()
    if (saving.current) return
    if (!auth.user) {
      requestLogin()
      return
    }
    const body = { ...formValues, guests: Number(values.guests) }
    const fingerprint = JSON.stringify(body)
    // Keep the same key on retries, including an uncertain network response.
    if (request.current?.fingerprint !== fingerprint) {
      request.current = { fingerprint, key: crypto.randomUUID() }
    }
    saving.current = true
    setBusy(true)
    setError('')
    setFields({})
    try {
      const result = await post('/api/reservations', { ...body, requestKey: request.current.key })
      setSuccess(result)
      setAttempt(a => a + 1)
    } catch (failure) {
      setError(failure.message)
      setFields(failure.fields || {})
      if (failure.status === 401) {
        auth.setUser(null)
        requestLogin()
      }
      if (failure.status === 409) {
        setValues(current => ({ ...current, time: '' }))
        setAttempt(current => current + 1)
      }
    } finally {
      saving.current = false
      setBusy(false)
    }
  }

  function input(key, label, type = 'text', extra = {}) {
    const errorId = `booking-${key}-error`
    return (
      <label>
        {label}
        <input name={key} type={type} value={formValues[key]} onChange={change} required
          aria-invalid={!!fields[key]} aria-describedby={fields[key] ? errorId : undefined} {...extra} />
        {fields[key] && <span id={errorId} className="booking-error">{fields[key]}</span>}
      </label>
    )
  }

  let availabilityMessage = 'Choose an available time above.'
  if (availability.loading) {
    availabilityMessage = 'Finding available tables…'
  } else if (availability.error) {
    availabilityMessage = availability.error
  } else if (!availability.slots.length) {
    availabilityMessage = 'No tables available for this date and party size. Try another date or fewer guests.'
  }
  return <section id="booking" aria-labelledby="booking-heading">
    <div className="booking-box">
      <div className="booking-copy">
        <p className="booking-eyebrow">SAVE YOUR SEAT</p>
        <h2 id="booking-heading">A Table for Your Next Great Moment.</h2>
        <p>Good food tastes even better together. Choose your date, time, and party size, and send us your table reservation request.</p>
        <div className="booking-ornament" aria-hidden="true">✧ ───── ❧</div>
        <p>All reservation times are in Europe/Berlin. Our team reviews each request.</p>
        {auth.user && <Link to="/reservations">View my reservations →</Link>}
      </div>
      <div className="booking-panel">
        {success ? (
          <div role="status">
            <h3>Thank you, {success.name}.</h3>
            <p><strong>Pending confirmation</strong></p>
            <p>Reference: <strong>{success.reference}</strong></p>
            <p>{success.date} at {success.time.slice(0, 5)} · {success.guests} guests</p>
            <p>Your request has been saved. The restaurant still needs to confirm your table.</p>
            <Link to="/reservations">View my reservations</Link>
          </div>
        ) : <form ref={form} onSubmit={submit}>
          <h3>Make a Booking</h3>
          <fieldset disabled={busy}>
            <div className="booking-grid">
              {input('name', 'Full name', 'text', { maxLength: 100, autoComplete: 'name' })}
              {input('email', 'Email', 'email', { maxLength: 254, autoComplete: 'email' })}
              {input('phone', 'Phone number', 'tel', { maxLength: 30, minLength: 6, pattern: '[+0-9() .\\-]{6,30}', autoComplete: 'tel' })}
              {input('date', 'Date', 'date', { min: berlinToday() })}
              {input('guests', 'Number of guests', 'number', { min: 1, max: availability.maxPartySize, step: 1 })}
              <label>
                Available time slot
                <select name="time" required value={values.time} onChange={change}
                  disabled={availability.loading || !availability.slots.length}>
                  <option value="">Choose a time</option>
                  {availability.slots.map(time => <option key={time} value={time}>{time.slice(0, 5)}</option>)}
                </select>
                {fields.time && <span className="booking-error">{fields.time}</span>}
              </label>
            </div>
            <label>
              Special requests (optional)
              <textarea name="specialRequests" maxLength={500} rows={3} value={values.specialRequests}
                onChange={change} aria-describedby="booking-requests-hint" />
              <small id="booking-requests-hint">{values.specialRequests.length}/500 characters</small>
              {fields.specialRequests && <span className="booking-error">{fields.specialRequests}</span>}
            </label>
            <p role="status">{availabilityMessage}</p>
            {availability.error && <button type="button" onClick={() => setAttempt(current => current + 1)}>Retry availability</button>}
            {!auth.user && <p>{resume ? 'Log in to resume your request. Your details are kept while this page stays open.' : 'You can explore the form. Log in to send your request.'}</p>}
            {error && <p className="booking-error" role="alert">{error}</p>}
            <button className="auth-submit" disabled={auth.checking || busy || availability.loading || !availability.slots.includes(values.time)}>
              {busy ? 'Saving request…' : 'Request a Table'}
            </button>
          </fieldset>
        </form>}
      </div>
    </div>
  </section>
}
