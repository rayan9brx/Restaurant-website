import { useEffect, useRef, useState } from 'react'
import { api, post } from './api'
import './Auth.css'

export default function AuthControls({ auth }) {
  const { user, setUser, checking, error: restoreError, restore } = auth
  const [mode, setMode] = useState(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [fields, setFields] = useState({})
  const dialog = useRef(null)
  const form = useRef(null)

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
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await post('/api/auth/logout', {})
      setUser(null)
      if (window.location.hash === '#admin') window.location.hash = '#home'
      setMessage('You have been logged out.')
    } catch (failure) {
      setError(failure.message)
    } finally {
      setBusy(false)
    }
  }

  const inputError = (field) => fields[field] && <span className="auth-field-error" id={`${field}-error`}>{fields[field]}</span>
  const invalidProps = (field) => ({ 'aria-invalid': !!fields[field], 'aria-describedby': fields[field] ? `${field}-error` : undefined })

  return (
    <>
      <div className="auth-controls">
        {checking ? <span role="status">Checking login…</span> : user ? (
          <>
            <span className="auth-user">Hello, {user.name}</span>
            {user.role === 'ADMIN' && <a href="#admin">Admin Dashboard</a>}
            <button type="button" className="login-button" disabled={busy} onClick={logout}>{busy ? 'Logging out…' : 'Log Out'}</button>
          </>
        ) : <button type="button" className="login-button" onClick={() => open('login')}>Log In</button>}
        {restoreError && <span className="auth-nav-feedback" role="status">Could not check login. <button type="button" disabled={checking} onClick={restore}>Retry</button></span>}
        {!mode && (error || message) && <span className="auth-nav-feedback" role="status">{error || message}</span>}
      </div>
      <dialog className="auth-dialog" ref={dialog} onCancel={(event) => {
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
            <label>Password<input name="password" type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required minLength={mode === 'signup' ? 8 : undefined} maxLength={72} {...invalidProps('password')} />{inputError('password')}</label>
            {mode === 'signup' && <>
              <p className="auth-hint">Use at least 8 characters (maximum 72 UTF-8 bytes).</p>
              <label>Confirm password<input name="confirmPassword" type="password" autoComplete="new-password" required minLength={8} maxLength={72} {...invalidProps('confirmPassword')} />{inputError('confirmPassword')}</label>
            </>}
            <button className="auth-submit" type="submit">{busy ? 'Please wait…' : mode === 'signup' ? 'Sign Up' : 'Log In'}</button>
          </fieldset>
        </form>
        <p className="auth-switch">{mode === 'signup' ? 'Already have an account?' : 'New here?'}{' '}
          <button type="button" disabled={busy} onClick={() => open(mode === 'signup' ? 'login' : 'signup')}>{mode === 'signup' ? 'Log in' : 'Sign up'}</button>
        </p>
      </dialog>
    </>
  )
}
