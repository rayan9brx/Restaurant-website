import { useRef } from 'react'
import { euroPrice } from '../components/dishDisplay'
import { canAdd, MAX_QUANTITY, priceInCents } from './cartModel'
import './Cart.css'

export default function Cart({ cart, menu, retry }) {
  const dialog = useRef(null)
  const ready = !menu.loading && !menu.error
  const lines = cart.items.map((item) => {
    const dish = menu.dishes.find((entry) => entry.id === item.id)
    return { ...item, dish, available: ready && canAdd(dish), cents: priceInCents(dish) }
  })
  // Integer cents prevent rounding errors when adding several items.
  const total = lines.reduce((sum, line) => sum + (line.available ? line.cents * line.quantity : 0), 0)
  return <>
    <button className="login-button cart-toggle" type="button" onClick={() => dialog.current.showModal()} aria-haspopup="dialog">
      Cart <span className="cart-count">{cart.count}</span>
    </button>
    <dialog className="auth-dialog cart-dialog" ref={dialog} aria-labelledby="cart-heading">
      <button className="auth-close" type="button" aria-label="Close cart" onClick={() => dialog.current.close()}>×</button>
      <h2 id="cart-heading">Your Cart</h2>
      {cart.items.length === 0 ? <p>Your cart is empty. Explore the menu to add a dish.</p> : <>
        {menu.loading && <p role="status">Checking current prices and availability…</p>}
        {menu.error && <div role="status"><p>We couldn’t check current prices.</p><button className="menu-retry" onClick={retry}>Retry</button></div>}
        <ul className="cart-items">
          {lines.map((line) => <li className="cart-item" key={line.id}>
            <div className="cart-item-heading"><h3>{line.dish?.name || line.name}</h3>
              {line.available && <strong>{euroPrice.format(line.cents * line.quantity / 100)}</strong>}
            </div>
            {ready && !line.available && <p className="cart-unavailable">Currently unavailable. Remove this item or check again later.</p>}
            <div className="cart-item-controls">
              <div className="cart-quantity" role="group" aria-label={`Quantity for ${line.dish?.name || line.name}`}>
                <button type="button" aria-label={`Decrease quantity of ${line.name}`} disabled={line.quantity <= 1} onClick={() => cart.changeQuantity(line.id, -1)}>−</button>
                <span aria-label={`Quantity ${line.quantity}`}>{line.quantity}</span>
                <button type="button" aria-label={`Increase quantity of ${line.name}`} disabled={!line.available || line.quantity >= MAX_QUANTITY} onClick={() => cart.changeQuantity(line.id, 1)}>+</button>
              </div>
              <button className="cart-remove" type="button" aria-label={`Remove ${line.name} from cart`} onClick={() => cart.remove(line.id)}>Remove</button>
            </div>
          </li>)}
        </ul>
        {ready && <div className="cart-total"><span>{lines.some((line) => !line.available) ? 'Available items total' : 'Total'}</span><strong>{euroPrice.format(total / 100)}</strong></div>}
      </>}
      <button className="auth-submit" type="button" onClick={() => dialog.current.close()}>Continue browsing</button>
    </dialog>
  </>
}
