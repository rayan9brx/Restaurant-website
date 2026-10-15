import { categories, filterDishes } from './menuCategories'
import { dishAnchor, euroPrice } from './dishDisplay'
import './Menu.css'

export default function Menu({ menu, retry, selected, setSelected }) {
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
        <button className="menu-retry" type="button" onClick={retry}>Retry</button>
      )}
      {!menu.loading && !menu.error && visibleDishes.length > 0 && (
        <div className="menu-dish-grid">
          {visibleDishes.map((dish) => (
            <article className="menu-dish" key={dish.id} id={dishAnchor(dish.id)} tabIndex={-1}>
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
