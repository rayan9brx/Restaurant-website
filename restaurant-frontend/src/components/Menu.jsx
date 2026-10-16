import { Link } from 'react-router-dom'
import { categories } from './menuCategories'
import './Menu.css'

export default function Menu() {
  return (
    <div className="menu-category-grid" aria-label="Menu categories">
      {categories.filter((category) => category.id !== 'all').map((category) => (
        <Link key={category.id} className="menu-category" to={`/menu/${category.id}`}>
          <img src={`/images/categories/${category.id}.png`} alt="" width="400" height="400" loading="lazy" />
          <span>{category.name}</span>
        </Link>
      ))}
    </div>
  )
}
