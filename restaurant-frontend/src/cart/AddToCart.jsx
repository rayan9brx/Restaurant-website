import { canAdd, MAX_QUANTITY } from './cartModel'

export default function AddToCart({ dish, onAdd, quantity = 0 }) {
  const available = canAdd(dish)
  return <button className="auth-submit add-to-cart" type="button" disabled={!available || quantity >= MAX_QUANTITY}
    aria-label={available ? `Add ${dish.name} to cart` : `${dish.name} is unavailable`}
    onClick={() => onAdd?.(dish)}>
    {dish.available === false ? 'Sold out' : !available ? 'Unavailable' : quantity >= MAX_QUANTITY ? 'Limit reached' : 'Add to Cart'}
  </button>
}
