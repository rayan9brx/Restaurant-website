import assert from 'node:assert/strict'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { createServer } from 'vite'

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
try {
  const { default: Layout } = await server.ssrLoadModule('/src/auth/AdminLayout.jsx')
  const { default: Dashboard } = await server.ssrLoadModule('/src/auth/AdminDashboard.jsx')
  const { default: Table } = await server.ssrLoadModule('/src/auth/DishManagementTable.jsx')
  const { filterDishes } = await server.ssrLoadModule('/src/auth/managementInventory.js')
  const admin = { name: 'Owner', role: 'ADMIN' }
  const render = node => renderToStaticMarkup(h(MemoryRouter, null, node))
  for (const path of ['/#admin', '/admin/reservations', '/admin/reservations/calendar']) {
    const html = renderToStaticMarkup(h(MemoryRouter, { initialEntries: [path] }, h(Layout, { enabled: true, auth: { user: admin } }, h('main', null, 'Page content'))))
    assert.ok(html.match(/<a\b[^>]*>/g).some(tag => tag.includes(`href="${path}"`) && tag.includes('aria-current="page"')), `active route ${path}`)
    assert.match(html, /Admin navigation drawer/)
    assert.match(html, /Back to Restaurant/)
    assert.match(html, /Page content/)
    assert.doesNotMatch(html, /Main navigation|cart-toggle/)
  }
  assert.equal(render(h(Layout, { enabled: false, auth: {} }, h('main', null, 'Customer page'))), '<main>Customer page</main>')
  const denied = render(h(Dashboard, { user: { role: 'CLIENT' }, checking: false }))
  assert.match(denied, /owner account/)
  assert.doesNotMatch(denied, /Add Dish|Menu overview/)
  const loading = render(h(Dashboard, { user: admin, checking: false }))
  assert.match(loading, /Loading dishes/)
  assert.match(loading, /Menu overview/)
  assert.match(loading, /aria-labelledby="delete-dish-heading"/)
  assert.doesNotMatch(loading, /Welcome,|Manage reservations/)
  const dishes = [
    { id: 1, name: 'Garden Salad', category: 'Salads', price: 9.5, available: true, vegan: true, vegetarian: true, bestseller: true, description: 'Long description', ingredients: 'Hidden ingredients', allergens: 'Hidden allergens' },
    { id: 2, name: 'Spicy Pizza', category: 'Pizza', price: 12, salePrice: 10, available: false },
    { id: 3, name: 'Special Plate', category: 'Seasonal', price: 15, available: true },
  ]
  assert.deepEqual(filterDishes(dishes, 'all', '').map(d => d.id), [1, 2, 3])
  assert.deepEqual(filterDishes(dishes, 'all', '  SALAD ').map(d => d.id), [1])
  assert.deepEqual(filterDishes(dishes, 'pizza', 'spicy').map(d => d.id), [2])
  assert.deepEqual(filterDishes(dishes, 'salads', 'pizza'), [])
  assert.deepEqual(filterDishes(dishes, 'other', '').map(d => d.id), [3])
  const table = render(h(Table, { category: { name: 'All' }, items: dishes, onEdit() {}, onDelete() {} }))
  for (const text of ['scope="col"', 'scope="row"', 'Category image', 'Bestseller', 'Vegan', 'Vegetarian', 'Available', 'Sold out', 'Edit Garden Salad', 'Delete Spicy Pizza']) assert.ok(table.includes(text), text)
  for (const text of ['Long description', 'Hidden ingredients', 'Hidden allergens']) assert.ok(!table.includes(text), text)
  assert.match(render(h(Table, { category: { name: 'All' }, items: dishes, busy: true })), /disabled=""/)
  console.log('Admin routes, permission gates, loading states, search/category filters, table details and photo fallbacks passed.')
} finally {
  await server.close()
}
