import { useEffect, useState } from 'react'
import { addItem, canAdd, CART_KEY, MAX_QUANTITY, restoreItems } from './cartModel'

export default function useCart(menu) {
  const [items, setItems] = useState(() => {
    try { return restoreItems(JSON.parse(localStorage.getItem(CART_KEY))) } catch { return [] }
  })
  const [notice, setNotice] = useState({ text: '', version: 0 })
  useEffect(() => {
    // Persist quantities, not prices; totals always use the latest menu response.
    try { localStorage.setItem(CART_KEY, JSON.stringify(items)) } catch { /* The cart still works when browser storage is blocked. */ }
  }, [items])
  useEffect(() => {
    if (!notice.text) return
    const timer = setTimeout(() => setNotice((previous) => ({ ...previous, text: '' })), 4000)
    return () => clearTimeout(timer)
  }, [notice])

  function add(dish) {
    const current = menu.dishes.find((item) => item.id === dish.id)
    if (menu.loading || menu.error || !canAdd(current)) return
    setItems((previous) => addItem(previous, current))
    setNotice((previous) => ({ text: `${current.name} added to your cart.`, version: previous.version + 1 }))
  }

  function changeQuantity(id, amount) {
    setItems((previous) => previous.map((item) => item.id === id ? { ...item, quantity: Math.max(1, Math.min(MAX_QUANTITY, item.quantity + amount)) } : item))
  }
  function remove(id) { setItems((previous) => previous.filter((item) => item.id !== id)) }
  return { items, add, changeQuantity, remove, notice, count: items.reduce((sum, item) => sum + item.quantity, 0) }
}
