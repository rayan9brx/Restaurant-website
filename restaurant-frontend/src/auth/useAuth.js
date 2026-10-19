import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from './api'

export default function useAuth() {
  const [session, setSession] = useState({ status: 'loading', user: null, error: '' })
  const revision = useRef(0)
  const setUser = useCallback((user) => {
    // Ignore verification responses started before a login, logout or expiry.
    revision.current += 1
    setSession({ status: user ? 'authenticated' : 'unauthenticated', user, error: '' })
  }, [])
  const restore = useCallback(async () => {
    const request = ++revision.current
    setSession({ status: 'loading', user: null, error: '' })
    try {
      const user = await api('/api/auth/me')
      if (request === revision.current) setSession({ status: 'authenticated', user, error: '' })
    } catch (failure) {
      if (request === revision.current) setSession({
        status: failure.status === 401 ? 'unauthenticated' : 'verification-error',
        user: null, error: failure.status === 401 ? '' : failure.message,
      })
    }
  }, [])
  useEffect(() => {
    const expire = () => setUser(null)
    const refresh = () => { if (document.visibilityState === 'visible') void restore() }
    window.addEventListener('session-expired', expire)
    document.addEventListener('visibilitychange', refresh)
    const timer = setTimeout(() => { void restore() }, 0)
    return () => {
      clearTimeout(timer)
      revision.current += 1
      window.removeEventListener('session-expired', expire)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [restore, setUser])
  return { ...session, checking: session.status === 'loading', setUser, restore }
}
