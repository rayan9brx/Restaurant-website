import { useEffect, useState } from 'react'
import { categories, filterDishes } from './menuCategories'
import './Menu.css'

const euroPrice = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' })

export default function Menu() {
  const [selected, setSelected] = useState('all')
  const [attempt, setAttempt] = useState(0)
  const [menu, setMenu] = useState({ dishes: [], loading: true, error: '' })

  useEffect(() => {
    const controller = new AbortController()

    async function loadDishes() {
      try {
        // Use the Vite proxy and cancel requests when this effect is cleaned up.
        const response = await fetch('/api/dishes', { signal: controller.signal })
        if (!response.ok) throw new Error('Unable to load menu')
        const dishes = await response.json()
        if (!Array.isArray(dishes)) throw new Error('Unexpected menu response')
        if (!controller.signal.aborted) {
          setMenu({ dishes, loading: false, error: '' })
        }
      } catch {
        if (!controller.signal.aborted) {
          setMenu({
            dishes: [], loading: false,
            error: 'We couldn’t load the menu.',
          })
        }
      }
    }

    loadDishes()
    return () => controller.abort()
  }, [attempt])

  const visibleDishes = filterDishes(menu.dishes, selected)
  const selectedName = categories.find((category) => category.id === selected)?.name
  const message = menu.loading
    ? 'Loading our menu…'
    : menu.error || (visibleDishes.length === 0
      ? selected === 'all'
        ? 'Our menu is currently empty. Please check back soon.'
        : `No dishes are listed in ${selectedName} right now. Try another category.`
      : `${visibleDishes.length} ${visibleDishes.length === 1 ? 'dish' : 'dishes'} in ${selectedName}.`)

  return (
    <div className="menu-browser">
      <div role="group" aria-label="Filter menu by category">
        <button className="menu-all" type="button" aria-pressed={selected === 'all'}
          onClick={() => setSelected('all')}>All</button>
        <div className="menu-category-grid">
          {categories.filter((category) => category.id !== 'all').map((category) => (
            <button
              key={category.id} className="menu-category" type="button"
              aria-pressed={selected === category.id}
              onClick={() => setSelected(category.id)}
            >
              <img
                src={`${import.meta.env.BASE_URL}images/categories/${category.id}.png`}
                alt="" width="400" height="400" loading="lazy"
              />
              <span>{category.name}</span>
            </button>
          ))}
        </div>
      </div>
      <p className="menu-status" role="status" aria-live="polite" aria-atomic="true">
        {message}
      </p>
      {menu.error && (
        <button className="menu-retry" type="button" onClick={() => {
          setMenu({ dishes: [], loading: true, error: '' })
          setAttempt((current) => current + 1)
        }}>Retry</button>
      )}
      {!menu.loading && !menu.error && visibleDishes.length > 0 && (
        <div className="menu-dish-grid">
          {visibleDishes.map((dish) => (
            <article className="menu-dish" key={dish.id}>
              <h3>{dish.name}</h3>
              <p className="menu-dish-category">{dish.category || 'Uncategorized'}</p>
              <p>{dish.description || 'No description available.'}</p>
              <div className="menu-dish-footer">
                <p className="menu-dish-price">{dish.price != null ? euroPrice.format(dish.price) : 'Price unavailable'}</p>
                <span className={`menu-availability${dish.available === false ? ' is-sold-out' : ''}`}>
                  {dish.available === false ? 'Sold out' : 'Available'}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
