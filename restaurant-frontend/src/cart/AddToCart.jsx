import { canAdd, MAX_QUANTITY } from './cartModel'

export default function AddToCart({ dish, onAdd, quantity = 0, showIcon = false }) {
  const available = canAdd(dish)
  return <button className="auth-submit add-to-cart" type="button" disabled={!available || quantity >= MAX_QUANTITY}
    aria-label={available ? `Add ${dish.name} to cart` : `${dish.name} is unavailable`}
    onClick={() => onAdd?.(dish)}>
    {showIcon && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 3h2l3 12h11l2-8H6" /><circle cx="9" cy="20" r="1" /><circle cx="18" cy="20" r="1" /></svg>}
    {dish.available === false ? 'Sold out' : !available ? 'Unavailable' : quantity >= MAX_QUANTITY ? 'Limit reached' : 'Add to Cart'}
  </button>
}
