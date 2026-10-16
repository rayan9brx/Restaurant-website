import { Link, useParams } from 'react-router-dom'
import { categories, filterDishes } from './menuCategories'
import { dishAnchor } from './dishDisplay'
import DishPhoto from './DishPhoto'
import DishPrice from './DishPrice'
import AddToCart from '../cart/AddToCart'

export default function CategoryPage({ menu, retry, cart }) {
  const { categoryId } = useParams()
  const category = categories.find((item) => item.id !== 'all' && item.id === categoryId)
  const dishes = category ? filterDishes(menu.dishes, category.id) : []

  return (
    <div className="page-content">
      <section className="category-page" aria-labelledby="category-heading">
        <Link className="back-to-menu" to="/#menu">← Back to Menu</Link>
        <h1 id="category-heading" tabIndex={-1}>{category ? category.name : 'Category not found'}</h1>
        {!category ? <p>This menu category does not exist. Choose a category from our menu.</p>
          : menu.loading ? <p className="menu-status" role="status">Loading {category.name.toLowerCase()}…</p>
          : menu.error ? <div role="status"><p>{menu.error}</p><button className="menu-retry" onClick={retry}>Retry</button></div>
          : dishes.length === 0 ? <p role="status">No dishes are listed in {category.name} right now. Please check back soon.</p>
          : <div className="menu-dish-grid">
            {dishes.map((dish) => (
              <article className="menu-dish" key={dish.id} id={dishAnchor(dish.id)} tabIndex={-1}>
                <DishPhoto dish={dish} />
                <h2>{dish.name}</h2>
                <p className="menu-dish-category">{dish.category}</p>
                <p>{dish.description || 'No description available.'}</p>
                {(dish.vegan || dish.vegetarian) && <p>{dish.vegan ? 'Vegan' : 'Vegetarian'}</p>}
                {dish.ingredients && <p>Ingredients: {dish.ingredients}</p>}
                {dish.allergens && <p>Allergens: {dish.allergens}</p>}
                <div className="menu-dish-footer">
                  <p className="menu-dish-price"><DishPrice dish={dish} /></p>
                  <span className={`menu-availability${dish.available === false ? ' is-sold-out' : ''}`}>
                    {dish.available === false ? 'Sold out' : 'Available'}
                  </span>
                </div>
                <AddToCart dish={dish} onAdd={cart?.add} quantity={cart?.items.find((item) => item.id === dish.id)?.quantity} />
              </article>
            ))}
          </div>}
      </section>
    </div>
  )
}
