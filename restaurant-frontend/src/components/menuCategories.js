export const categories = [
  { id: 'burgers', name: 'Burgers' },
  { id: 'pizza', name: 'Pizza' },
  { id: 'salads', name: 'Salads' },
  { id: 'drinks', name: 'Drinks' },
  { id: 'desserts', name: 'Desserts' },
]

const aliases = {
  burger: 'burgers', burgers: 'burgers',
  pizza: 'pizza', pizzas: 'pizza',
  salad: 'salads', salads: 'salads',
  drink: 'drinks', drinks: 'drinks',
  beverage: 'drinks', beverages: 'drinks',
  dessert: 'desserts', desserts: 'desserts',
}

export function normalizeCategory(value) {
  const key = typeof value === 'string' ? value.trim().toLowerCase() : ''
  return Object.hasOwn(aliases, key) ? aliases[key] : key
}

export function filterDishes(dishes, selected) {
  return selected === 'all'
    ? dishes
    : dishes.filter((dish) => normalizeCategory(dish.category) === selected)
}
