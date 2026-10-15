import { useEffect, useState } from 'react'

export default function useDishes() {
  const [attempt, setAttempt] = useState(0)
  const [menu, setMenu] = useState({ dishes: [], loading: true, error: '' })

  useEffect(() => {
    const controller = new AbortController()
    async function loadDishes() {
      try {
        // Menu and Bestsellers share one request through the existing Vite proxy.
        const response = await fetch('/api/dishes', { signal: controller.signal })
        if (!response.ok) throw new Error('Unable to load menu')
        const dishes = await response.json()
        if (!Array.isArray(dishes)) throw new Error('Unexpected menu response')
        if (!controller.signal.aborted) setMenu({ dishes, loading: false, error: '' })
      } catch {
        if (!controller.signal.aborted) {
          setMenu({ dishes: [], loading: false, error: 'We couldn’t load the menu.' })
        }
      }
    }
    loadDishes()
    return () => controller.abort()
  }, [attempt])

  function retry() {
    setMenu({ dishes: [], loading: true, error: '' })
    setAttempt((current) => current + 1)
  }
  return { menu, retry }
}
