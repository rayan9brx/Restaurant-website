import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { api, post } from './api'
import './Auth.css'
import { Link, useNavigate } from 'react-router-dom'

function PasswordField({ name, label, autoComplete, invalid, error }) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="auth-password-field">
      <label htmlFor={`auth-${name}`}>{label}</label>
      <div className="auth-password-input">
        <input id={`auth-${name}`} name={name} type={visible ? 'text' : 'password'} autoComplete={autoComplete} required maxLength={72} {...invalid} />
        <button className="auth-password-toggle" type="button" aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`} aria-controls={`auth-${name}`} onClick={() => setVisible(!visible)}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
            <circle cx="12" cy="12" r="3" />
            {visible && <path d="m3 3 18 18" />}
          </svg>
        </button>
      </div>
      {error}
    </div>
  )
}

export default function AuthControls({ auth, onNavigate }) {
  const navigate = useNavigate()
  const { user, setUser, checking, error: restoreError, restore } = auth
  const [mode, setMode] = useState(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [fields, setFields] = useState({})
  const dialog = useRef(null)
  const form = useRef(null)
  const account = useRef(null)
  const accountToggle = useRef(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    const close = (event) => { if (!account.current?.contains(event.target)) setExpanded(false) }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [])

  useEffect(() => {
    if (mode || !(message || error)) return
    const timer = setTimeout(() => { setMessage(''); setError('') }, 5000)
    return () => clearTimeout(timer)
  }, [message, error, mode])

  useEffect(() => {
    const login = () => { setError(''); setMessage(''); setFields({}); setMode('login') }
    window.addEventListener('booking-login', login)
    return () => window.removeEventListener('booking-login', login)
  }, [])

  useEffect(() => {
    if (mode && !dialog.current.open) dialog.current.showModal()
    if (!mode && dialog.current.open) dialog.current.close()
  }, [mode])

  function open(nextMode) {
    setError('')
    setMessage('')
    setFields({})
    form.current?.reset()
    setMode(nextMode)
  }

  async function submit(event) {
    event.preventDefault()
    const values = Object.fromEntries(new FormData(event.currentTarget))
    setError('')
    setMessage('')
    setFields({})
    if (mode === 'signup' && values.password !== values.confirmPassword) {
      setFields({ confirmPassword: 'Passwords do not match.' })
      return
    }
    setBusy(true)
    try {
      if (mode === 'signup') {
        await post('/api/auth/register', { name: values.name, email: values.email, password: values.password })
        form.current.reset()
        setMode('login')
        setMessage('Account created. Please log in.')
      } else {
        await post('/api/auth/login', { email: values.email, password: values.password }, true)
        const account = await api('/api/auth/me')
        setUser(account)
        form.current.reset()
        setMode(null)
        setMessage(`Welcome, ${account.name}.`)
      }
    } catch (failure) {
      setError(failure.message)
      setFields(failure.fields || {})
    } finally {
      setBusy(false)
    }
  }

  async function logout() {
    setExpanded(false)
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await post('/api/auth/logout', {})
      setUser(null)
      navigate('/#home')
      setMessage('You have been logged out.')
    } catch (failure) {
      setError(failure.message)
    } finally {
      setBusy(false)
    }
  }

  const inputError = (field) => fields[field] && <span className="auth-field-error" id={`${field}-error`}>{fields[field]}</span>
  const invalidProps = (field) => ({ 'aria-invalid': !!fields[field], 'aria-describedby': fields[field] ? `${field}-error` : undefined })
  // Keep the dialog available when the mobile navigation is collapsed.
  const overlay = (content) => typeof document === 'undefined' ? content : createPortal(content, document.body)

  return (
    <>
      <div className="auth-controls">
        {checking ? <span role="status">Checking login…</span> : user ? (
          <div className="account" ref={account} onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setExpanded(false)
          }} onKeyDown={(event) => {
            if (event.key === 'Escape' && expanded) { event.stopPropagation(); setExpanded(false); accountToggle.current.focus() }
          }}>
            <button ref={accountToggle} type="button" className="account-toggle" aria-expanded={expanded} aria-controls="account-links" onClick={() => setExpanded(!expanded)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 22v-2a8 8 0 0 1 16 0v2" /></svg>
              <span className="auth-user">{user.name}</span><span aria-hidden="true">⌄</span>
            </button>
            <div id="account-links" hidden={!expanded} className="account-dropdown" onClick={(event) => {
              if (event.target.closest('a')) { setExpanded(false); onNavigate?.() }
            }}>
              <Link to="/reservations">My Reservations</Link>
              {user.role === 'ADMIN' && <><Link to="/#admin">Admin Dashboard</Link><Link to="/admin/reservations/calendar">Reservation Calendar</Link></>}
              <button type="button" disabled={busy} onClick={logout}>{busy ? 'Logging out…' : 'Log Out'}</button>
            </div>
          </div>
        ) : !restoreError && <button type="button" className="login-button" onClick={() => open('login')}>Log In</button>}
        {restoreError && <div className="auth-connection" role="status"><span>Login unavailable</span><button type="button" disabled={checking} onClick={restore}>Retry</button><span className="auth-connection-detail">{restoreError}</span></div>}
      </div>
      {!mode && (error || message) && overlay(<div className="auth-notification" role="status">{error || message}</div>)}
      {overlay(<dialog className="auth-dialog" ref={dialog} onCancel={(event) => {
        if (busy) event.preventDefault()
        else setMode(null)
      }} onClose={() => setMode(null)} aria-labelledby="auth-title">
        <button className="auth-close" type="button" aria-label="Close login form" disabled={busy} onClick={() => setMode(null)}>×</button>
        <h2 id="auth-title">{mode === 'signup' ? 'Create an account' : 'Welcome back'}</h2>
        <p>{mode === 'signup' ? 'Sign up to join Rayen Restaurant.' : 'Log in to your Rayen Restaurant account.'}</p>
        {message && <p className="auth-success" role="status">{message}</p>}
        {error && <p className="auth-error" role="alert">{error}</p>}
        <form ref={form} onSubmit={submit}>
          <fieldset disabled={busy}>
            {mode === 'signup' && <label>Name<input name="name" autoComplete="name" required maxLength={100} {...invalidProps('name')} />{inputError('name')}</label>}
            <label>Email<input name="email" type="email" autoComplete="email" required maxLength={254} {...invalidProps('email')} />{inputError('email')}</label>
            <PasswordField key={mode || 'closed'} name="password" label="Password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} invalid={invalidProps('password')} error={inputError('password')} />
            {mode === 'signup' && <>
              <p className="auth-hint">Maximum 72 UTF-8 bytes.</p>
              <PasswordField name="confirmPassword" label="Confirm password" autoComplete="new-password" invalid={invalidProps('confirmPassword')} error={inputError('confirmPassword')} />
            </>}
            <button className="auth-submit" type="submit">{busy ? 'Please wait…' : mode === 'signup' ? 'Sign Up' : 'Log In'}</button>
          </fieldset>
        </form>
        <p className="auth-switch">{mode === 'signup' ? 'Already have an account?' : 'New here?'}{' '}
          <button type="button" disabled={busy} onClick={() => open(mode === 'signup' ? 'login' : 'signup')}>{mode === 'signup' ? 'Log in' : 'Sign up'}</button>
        </p>
      </dialog>)}
    </>
  )
}
