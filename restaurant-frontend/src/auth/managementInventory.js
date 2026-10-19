import { categories, normalizeCategory } from '../components/menuCategories'

export function filterDishes(dishes, selected, search) {
  const groups = categories.filter(category => category.id !== 'all')
  return dishes.filter(dish => dish.name.toLowerCase().includes(search.trim().toLowerCase())
    && (selected === 'all' || (selected === 'other'
      ? !groups.some(category => normalizeCategory(dish.category) === category.id)
      : normalizeCategory(dish.category) === selected)))
}
