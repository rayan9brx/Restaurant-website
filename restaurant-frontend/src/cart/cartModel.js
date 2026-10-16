export const CART_KEY = 'rayen-restaurant-cart-v1'
export const MAX_QUANTITY = 99

export function priceInCents(dish) {
  const regular = Number(dish?.price)
  if (!Number.isFinite(regular) || regular <= 0) return null
  const sale = Number(dish.salePrice)
  return Math.round((Number.isFinite(sale) && sale > 0 && sale < regular ? sale : regular) * 100)
}

export function canAdd(dish) {
  return !!dish && Number.isSafeInteger(dish.id) && dish.id > 0 && dish.available !== false && priceInCents(dish) > 0
}

export function restoreItems(value) {
  if (!Array.isArray(value)) return []
  const items = []
  for (const item of value) {
    if (!item || !Number.isSafeInteger(item.id) || item.id <= 0 || !Number.isInteger(item.quantity) || item.quantity < 1) continue
    const existing = items.find((entry) => entry.id === item.id)
    if (existing) existing.quantity = Math.min(MAX_QUANTITY, existing.quantity + item.quantity)
    else items.push({ id: item.id, name: typeof item.name === 'string' ? item.name.slice(0, 255) : 'Dish', quantity: Math.min(MAX_QUANTITY, item.quantity) })
  }
  return items
}

export function addItem(items, dish) {
  if (!canAdd(dish)) return items
  const existing = items.find((item) => item.id === dish.id)
  return existing ? items.map((item) => item.id === dish.id ? { ...item, name: dish.name, quantity: Math.min(MAX_QUANTITY, item.quantity + 1) } : item)
    : [...items, { id: dish.id, name: dish.name, quantity: 1 }]
}
