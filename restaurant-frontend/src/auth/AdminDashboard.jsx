import { useEffect, useState } from 'react'
import { api } from './api'
import MenuManagement from './MenuManagement'

export default function AdminDashboard({ user, checking, onDishCreated }) {
  const [result, setResult] = useState({ message: '', error: '' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    if (user?.role === 'ADMIN') {
      // The backend checks ADMIN before returning any dashboard data.
      api('/api/admin/dashboard').then(
        (data) => { if (active) setResult({ message: data.message, error: '' }) },
        (failure) => { if (active) setResult({ message: '', error: failure.message }) },
      )
    }
    return () => { active = false }
  }, [user, attempt])

  return (
    <div className="page-content">
      <section className="admin-page" aria-labelledby="admin-heading">
        <h1 id="admin-heading">Admin Dashboard</h1>
        <p role="status">{checking ? 'Checking login…' : user?.role !== 'ADMIN'
          ? 'This page is available to the restaurant owner. Please log in with your owner account.'
          : result.error || result.message || 'Loading dashboard…'}</p>
        {user?.role === 'ADMIN' && result.error && <button className="auth-submit" type="button" onClick={() => {
          setResult({ message: '', error: '' })
          setAttempt((current) => current + 1)
        }}>Retry</button>}
        <a href="#home">Back to the restaurant</a>
        {user?.role === 'ADMIN' && <MenuManagement onCreated={onDishCreated} />}
      </section>
    </div>
  )
}
