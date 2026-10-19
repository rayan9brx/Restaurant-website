import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import AuthControls from '../auth/AuthControls'
import Cart from '../cart/Cart'

export default function Header({ auth, cart, menu, retry }) {
  const [expanded, setExpanded] = useState(false)
  const toggle = useRef(null)
  return <header className="site-header">
    <nav className="navigation" aria-label="Main navigation" onKeyDown={(event) => {
      if (event.key === 'Escape' && expanded) { setExpanded(false); toggle.current.focus() }
    }}>
      <Link className="restaurant-name" to="/#home" onClick={() => setExpanded(false)}>Rayen Restaurant</Link>
      <button ref={toggle} className="mobile-toggle" aria-expanded={expanded} aria-controls="header-content" onClick={() => setExpanded(!expanded)}>{expanded ? 'Close' : 'Menu'} <span aria-hidden="true">☰</span></button>
      <div id="header-content" className={`header-content${expanded ? ' is-open' : ''}`}>
        <div className="navigation-links" onClick={(event) => { if (event.target.closest('a')) setExpanded(false) }}>
          <Link to="/#home">Home</Link>
          <Link to="/#menu">Menu</Link>
          <Link to="/#booking">Make a Booking</Link>
          <Link to="/#about">About Us</Link>
        </div>
        <div className="navigation-actions">
          <Cart cart={cart} menu={menu} retry={retry} />
          <AuthControls auth={auth} onNavigate={() => setExpanded(false)} />
        </div>
      </div>
    </nav>
  </header>
}
