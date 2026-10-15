export function isBestseller(dish) {
  // Preserve the original favourites until the owner explicitly changes their selection.
  return dish.bestseller ?? ['beef burger', 'margherita pizza'].includes(dish.name?.trim().toLowerCase())
}
