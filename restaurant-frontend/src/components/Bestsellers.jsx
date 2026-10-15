import burger from '../assets/bestsellers/beef-burger.png'
import pizza from '../assets/bestsellers/margherita-pizza.png'
import DishPrice from './DishPrice'
import DishPhoto from './DishPhoto'
import { isBestseller } from './bestsellerSelection'
import './Bestsellers.css'

const originalPhotos = { 'beef burger': burger, 'margherita pizza': pizza }

export default function Bestsellers({ menu, retry, onViewDish }) {
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
            const originalPhoto = originalPhotos[dish.name.trim().toLowerCase()]
            return (
              <article className="bestseller-card" key={dish.id}>
                {dish.photoUrl || !originalPhoto ? <DishPhoto dish={dish} /> : <img src={originalPhoto} alt={dish.name} width="1536" height="1024" loading="lazy" />}
                <div className="bestseller-copy">
                  <h3>{dish.name}</h3>
                  <p className="bestseller-description">{dish.description || 'No description available.'}</p>
                  <div className="bestseller-details">
                    <span className="bestseller-price"><DishPrice dish={dish} /></span>
                    <span className={`menu-availability${dish.available === false ? ' is-sold-out' : ''}`}>
                      {dish.available === false ? 'Sold out' : 'Available'}
                    </span>
                  </div>
                  <button className="bestseller-button" type="button" aria-label={`View ${dish.name} in Menu`} onClick={() => onViewDish(dish)}>View in Menu <span aria-hidden="true">↗</span></button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
