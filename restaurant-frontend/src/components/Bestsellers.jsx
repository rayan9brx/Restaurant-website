import { Link } from 'react-router-dom'
import { normalizeCategory } from './menuCategories'
import { dishAnchor } from './dishDisplay'
import DishPrice from './DishPrice'
import DishPhoto from './DishPhoto'
import { isBestseller } from './bestsellerSelection'
import './Bestsellers.css'

export default function Bestsellers({ menu, retry }) {
  const selections = menu.dishes.filter(isBestseller)
  return (
    <section id="bestsellers" aria-labelledby="bestsellers-heading">
      <p className="bestsellers-label">CUSTOMER FAVOURITES</p>
      <h2 id="bestsellers-heading">Our Bestsellers</h2>
      {menu.loading ? <p role="status">Loading our favourites…</p> : menu.error ? (
        <div role="status">
          <p>Our favourites couldn’t be loaded. Please try again.</p>
          <button className="menu-retry" type="button" onClick={retry}>Retry</button>
        </div>
      ) : selections.length === 0 ? <p>No favourites selected yet. Explore our menu to find yours.</p> : (
        <div className="bestsellers-grid">
          {selections.map((dish) => {
            return (
              <article className="bestseller-card" key={dish.id}>
                <DishPhoto dish={dish} />
                <div className="bestseller-copy">
                  <h3>{dish.name}</h3>
                  <p className="bestseller-description">{dish.description || 'No description available.'}</p>
                  <div className="bestseller-details">
                    <span className="bestseller-price"><DishPrice dish={dish} /></span>
                    <span className={`menu-availability${dish.available === false ? ' is-sold-out' : ''}`}>
                      {dish.available === false ? 'Sold out' : 'Available'}
                    </span>
                  </div>
                  <Link className="bestseller-button" aria-label={`View ${dish.name} in Menu`} to={`/menu/${normalizeCategory(dish.category)}#${dishAnchor(dish.id)}`}>View in Menu <span aria-hidden="true">↗</span></Link>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
