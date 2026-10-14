export async function api(path, options = {}) {
  let response
  try {
    response = await fetch(path, { credentials: 'same-origin', ...options })
  } catch {
    throw new Error('Cannot reach the server. Please try again.')
  }
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const error = new Error(data?.message || 'The server is unavailable. Please try again.')
    error.status = response.status
    error.fields = data?.errors || {}
    throw error
  }
  if (!data) throw new Error('The server returned an unexpected response.')
  return data
}

export async function post(path, body, form = false) {
  // Get a fresh token because login and logout replace the session's CSRF token.
  const csrf = await api('/api/auth/csrf')
  return api(path, {
    method: 'POST',
    headers: {
      [csrf.headerName]: csrf.token,
      'Content-Type': form ? 'application/x-www-form-urlencoded' : 'application/json',
    },
    body: form ? new URLSearchParams(body).toString() : JSON.stringify(body),
  })
}
