import { useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import AuthControls from './AuthControls'
import './AdminLayout.css'

const pages = [
  { to: '/#admin', title: 'Menu Management' },
  { to: '/admin/reservations', title: 'Reservations' },
  { to: '/admin/reservations/calendar', title: 'Reservation Calendar' },
]

export default function AdminLayout({ enabled, auth, children }) {
  const location = useLocation()
  const drawer = useRef(null)
  if (!enabled) return children
  const current = `${location.pathname}${location.hash}`
  const title = pages.find(page => page.to === current)?.title || 'Administration'
  const links = <>
    <Link className="admin-brand" to="/#admin" onClick={() => drawer.current?.close()}>Rayen Restaurant<span>RESTAURANT MANAGEMENT</span></Link>
    <nav aria-label="Admin navigation">
      {auth.user?.role === 'ADMIN' && pages.map(page => <Link key={page.to} to={page.to} aria-current={current === page.to ? 'page' : undefined} onClick={() => drawer.current?.close()}>{page.title}</Link>)}
      <Link className="admin-back" to="/#home" onClick={() => drawer.current?.close()}>← Back to Restaurant</Link>
    </nav>
  </>
  return <div className="admin-shell">
    <aside className="admin-sidebar">{links}</aside>
    <div className="admin-workspace">
      <header className="admin-topbar">
        <div className="admin-topbar-title"><button className="admin-drawer-toggle" type="button" aria-label="Open admin navigation" aria-haspopup="dialog" aria-controls="admin-navigation-drawer" onClick={() => drawer.current.showModal()}>☰</button><span>{title}</span></div>
        <AuthControls auth={auth} />
      </header>
      {children}
    </div>
    {/* The native dialog traps focus and restores it when closed with Escape. */}
    <dialog id="admin-navigation-drawer" className="admin-drawer" ref={drawer} aria-label="Admin navigation drawer">
      <button className="admin-drawer-close" type="button" onClick={() => drawer.current.close()} aria-label="Close admin navigation" autoFocus>×</button>
      {links}
    </dialog>
  </div>
}
