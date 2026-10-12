import { useEffect, useState } from 'react'
import { categories, filterDishes } from './menuCategories'
import './Menu.css'

export default function Menu() {
  const [selected, setSelected] = useState('burgers')
  const [menu, setMenu] = useState({ dishes: [], loading: true, error: '' })

  useEffect(() => {
    const controller = new AbortController()

    async function loadDishes() {
      try {
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
  }, [])

  const visibleDishes = filterDishes(menu.dishes, selected)
  const selectedName = categories.find((category) => category.id === selected)?.name
  const message = menu.loading
    ? 'Loading our menu…'
    : menu.error || (visibleDishes.length === 0
      ? `No dishes are listed in ${selectedName} right now. Try another category.`
      : `${visibleDishes.length} ${visibleDishes.length === 1 ? 'dish' : 'dishes'} in ${selectedName}.`)

  return (
    <div className="menu-browser">
      <div role="group" aria-label="Filter menu by category">
        <div className="menu-category-grid">
          {categories.map((category) => (
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
      {!menu.loading && !menu.error && visibleDishes.length > 0 && (
        <div className="menu-dish-grid">
          {visibleDishes.map((dish) => (
            <article className="menu-dish" key={dish.id}>
              <h3>{dish.name}</h3>
              {dish.description && <p>{dish.description}</p>}
              {dish.price != null && <p className="menu-dish-price">Price: {dish.price}</p>}
              {dish.available === false && <p>Currently unavailable</p>}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
