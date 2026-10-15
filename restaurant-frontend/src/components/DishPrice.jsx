import { euroPrice } from './dishDisplay'
import './DishPrice.css'

export default function DishPrice({ dish }) {
  if (dish.price == null) return <span>Price unavailable</span>
  const onSale = dish.salePrice != null && Number(dish.salePrice) > 0 && Number(dish.salePrice) < Number(dish.price)
  return onSale ? <span className="dish-price">
    <del aria-label={`Regular price ${euroPrice.format(dish.price)}`}>{euroPrice.format(dish.price)}</del>
    <strong aria-label={`Sale price ${euroPrice.format(dish.salePrice)}`}>{euroPrice.format(dish.salePrice)}</strong>
    <span className="dish-sale-badge">Sale</span>
  </span> : <span>{euroPrice.format(dish.price)}</span>
}
