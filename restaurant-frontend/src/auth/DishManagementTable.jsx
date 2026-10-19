import DishPhoto from '../components/DishPhoto'
import DishPrice from '../components/DishPrice'
import { isBestseller } from '../components/bestsellerSelection'

export default function DishManagementTable({ category, items, busy, onEdit, onDelete }) {
  return <table className="management-table">
    <caption className="admin-sr-only">{category.name} dishes</caption>
    <thead><tr><th scope="col">Dish</th><th scope="col">Category</th><th scope="col">Price</th><th scope="col">Availability</th><th scope="col">Actions</th></tr></thead>
    <tbody>{items.map(dish => <tr key={dish.id}>
      <th scope="row"><div className="management-dish"><DishPhoto dish={dish} /><div><span className="management-dish-name">{dish.name}</span><div className="management-badges">
        {isBestseller(dish) && <span>Bestseller</span>}{dish.vegan && <span>Vegan</span>}{dish.vegetarian && <span>Vegetarian</span>}
      </div></div></div></th>
      <td data-label="Category">{dish.category || 'Uncategorized'}</td>
      <td data-label="Price"><DishPrice dish={dish} /></td>
      <td data-label="Availability"><span className={dish.available ? 'management-available' : 'management-sold-out'}>{dish.available ? 'Available' : 'Sold out'}</span></td>
      <td><div className="dish-card-actions">
        <button className="menu-retry" type="button" disabled={busy} aria-label={`Edit ${dish.name}`} onClick={() => onEdit(dish)}>Edit</button>
        <button className="dish-delete-button" type="button" disabled={busy} aria-label={`Delete ${dish.name}`} onClick={() => onDelete(dish)}>Delete</button>
      </div></td>
    </tr>)}</tbody>
  </table>
}
