import assert from 'node:assert/strict'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { createServer } from 'vite'

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
try {
  const { default: CategoryPage } = await server.ssrLoadModule('/src/components/CategoryPage.jsx')
  const { default: Menu } = await server.ssrLoadModule('/src/components/Menu.jsx')
  const { default: DishPhoto } = await server.ssrLoadModule('/src/components/DishPhoto.jsx')
  const { default: Bestsellers } = await server.ssrLoadModule('/src/components/Bestsellers.jsx')
  const { default: AddToCart } = await server.ssrLoadModule('/src/cart/AddToCart.jsx')
  const { default: Cart } = await server.ssrLoadModule('/src/cart/Cart.jsx')
  const dish = { id: 7, name: 'Test salad', category: 'Salads', price: 10.5, description: 'Fresh leaves', ingredients: 'Lettuce', allergens: 'Sesame', vegan: true, available: false, bestseller: true }
  function renderCategory(categoryId, overrides = {}) {
    return renderToStaticMarkup(h(MemoryRouter, { initialEntries: [`/menu/${categoryId}`] },
      h(Routes, null, h(Route, { path: '/menu/:categoryId', element: h(CategoryPage, { menu: { loading: false, error: '', dishes: [dish, { ...dish, id: 8, name: 'Other category', category: 'Pizza' }], ...overrides }, retry() {} }) }))))
  }
  const html = renderCategory('salads')
  for (const text of ['Test salad', 'Fresh leaves', 'Ingredients:', 'Lettuce', 'Sesame', 'Vegan', 'Sold out', '10,50', '€', 'Category image', 'href="/#menu"']) assert.ok(html.includes(text), text)
  assert.ok(!html.includes('Other category'))
  assert.match(renderCategory('salads', { loading: true }), /Loading salads/)
  assert.match(renderCategory('salads', { error: 'Failed request' }), /Failed request.*Retry/)
  assert.match(renderCategory('salads', { dishes: [] }), /No dishes are listed/)
  assert.match(renderCategory('unknown'), /Category not found/)
  assert.match(renderCategory('all'), /Category not found/)
  const cards = renderToStaticMarkup(h(MemoryRouter, null, h(Menu)))
  for (const category of ['burgers', 'pizza', 'salads', 'drinks', 'desserts']) assert.ok(cards.includes(`href="/menu/${category}"`))
  assert.ok(!cards.includes('menu-dish-grid'))
  const uploaded = renderToStaticMarkup(h(DishPhoto, { dish: { ...dish, photoUrl: '/api/dish-photos/upload.png' } }))
  assert.ok(uploaded.includes('src="/api/dish-photos/upload.png"'))
  assert.ok(!uploaded.includes('Category image'))
  const bestseller = renderToStaticMarkup(h(MemoryRouter, null, h(Bestsellers, { menu: { dishes: [dish] }, retry() {} })))
  assert.ok(bestseller.includes('href="/menu/salads#menu-dish-7"'))
  assert.match(renderToStaticMarkup(h(AddToCart, { dish })), /disabled=""/)
  assert.ok(!renderToStaticMarkup(h(AddToCart, { dish: { ...dish, available: true } })).includes('disabled=""'))
  const cart = { count: 2, items: [{ id: 7, name: dish.name, quantity: 2 }] }
  const cartHtml = renderToStaticMarkup(h(Cart, { cart, menu: { dishes: [{ ...dish, available: true, salePrice: 8.25 }] } }))
  assert.ok(cartHtml.includes('16,50'))
  const removedDish = renderToStaticMarkup(h(Cart, { cart, menu: { dishes: [] } }))
  assert.ok(removedDish.includes('Currently unavailable'))
  console.log('Menu checks passed: category links/filtering, loading/error/empty/unknown states, details, photo priority, and dish links.')
} finally {
  await server.close()
}
