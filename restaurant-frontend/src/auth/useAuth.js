import { useCallback, useEffect, useState } from 'react'
import { api } from './api'

export default function useAuth() {
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState('')

  const restore = useCallback(async () => {
    setChecking(true)
    setError('')
    try {
      // The HttpOnly session cookie restores login without storing credentials in React.
      setUser(await api('/api/auth/me'))
    } catch (failure) {
      if (failure.status === 401) setUser(null)
      else setError(failure.message)
    } finally {
      setChecking(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    api('/api/auth/me', { signal: controller.signal }).then(
      (account) => { if (!controller.signal.aborted) setUser(account) },
      (failure) => {
        if (!controller.signal.aborted && failure.status !== 401) setError(failure.message)
      },
    ).finally(() => { if (!controller.signal.aborted) setChecking(false) })
    return () => controller.abort()
  }, [])
  return { user, setUser, checking, error, restore }
}
