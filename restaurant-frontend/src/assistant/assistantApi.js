import { api } from '../auth/api.js'

export async function askMenu(message, history, signal) {
  const csrf = await api('/api/auth/csrf', { signal })
  return api('/api/menu-assistant/chat', {
    method: 'POST', signal,
    headers: { [csrf.headerName]: csrf.token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history }),
  })
}

export function recentHistory(messages) {
  return messages.slice(-6).map(({ role, content, answer }) => ({
    role,
    content: `${content}${answer?.dishes?.length ? `\nDishes shown: ${answer.dishes.map(dish => `${dish.id}: ${dish.name}`).join('; ')}` : ''}`.slice(0, 1200),
  }))
}
