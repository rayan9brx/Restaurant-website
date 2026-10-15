import burger from '../assets/bestsellers/beef-burger.png'
import pizza from '../assets/bestsellers/margherita-pizza.png'
import { euroPrice } from './dishDisplay'
import './Bestsellers.css'

const featured = [
  { name: 'Beef Burger', image: burger, alt: 'Beef cheeseburger with lettuce and tomato on a wooden surface' },
  { name: 'Margherita Pizza', image: pizza, alt: 'Fresh Margherita pizza with mozzarella and basil' },
]
const normalizeName = (name) => typeof name === 'string' ? name.trim().toLowerCase().replace(/\s+/g, ' ') : ''

export default function Bestsellers({ menu, retry, onViewDish }) {
  return (
    <section id="bestsellers" aria-labelledby="bestsellers-heading">
      <p className="bestsellers-label">CUSTOMER FAVOURITES</p>
      <h2 id="bestsellers-heading">Our Bestsellers</h2>
      {menu.loading ? <p role="status">Loading our favourites…</p> : menu.error ? (
        <div role="status">
          <p>Our favourites couldn’t be loaded. Please try again.</p>
          <button className="menu-retry" type="button" onClick={retry}>Retry</button>
        </div>
      ) : (
        <div className="bestsellers-grid">
          {featured.map((feature) => {
            // These are manually selected dishes, not a ranking based on sales.
            const dish = menu.dishes.find((item) => normalizeName(item.name) === normalizeName(feature.name))
            return (
              <article className="bestseller-card" key={feature.name}>
                <img src={feature.image} alt={feature.alt} width="1536" height="1024" loading="lazy" />
                <div className="bestseller-copy">
                  <h3>{dish?.name || feature.name}</h3>
                  <p className="bestseller-description">{dish ? dish.description || 'No description available.' : 'This favourite is not currently listed on our menu. Please check back soon.'}</p>
                  {dish ? (
                    <>
                      <div className="bestseller-details">
                        <span className="bestseller-price">{dish.price != null ? euroPrice.format(dish.price) : 'Price unavailable'}</span>
                        <span className={`menu-availability${dish.available === false ? ' is-sold-out' : ''}`}>
                          {dish.available === false ? 'Sold out' : 'Available'}
                        </span>
                      </div>
                      <button className="bestseller-button" type="button" aria-label={`View ${dish.name} in Menu`} onClick={() => onViewDish(dish)}>View in Menu <span aria-hidden="true">↗</span></button>
                    </>
                  ) : <span className="menu-availability is-sold-out">Currently unlisted</span>}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
