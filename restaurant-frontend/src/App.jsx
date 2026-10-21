import './App.css'
import Menu from './components/Menu'
import PromoCarousel from './components/PromoCarousel'
import { useEffect } from 'react'
import { Link, Route, Routes, useLocation } from 'react-router-dom'
import useAuth from './auth/useAuth'
import Header from './components/Header'
import Footer from './components/Footer'
import AdminDashboard from './auth/AdminDashboard'
import AdminLayout from './auth/AdminLayout'
import Bestsellers from './components/Bestsellers'
import useDishes from './components/useDishes'
import CategoryPage from './components/CategoryPage'
import AboutUs from './components/AboutUs'
import useCart from './cart/useCart'

import Booking from './booking/Booking'
import Reservations from './booking/Reservations'
import ReservationCalendar from './booking/ReservationCalendar'

function PagePosition({ loading }) {
  const { pathname, hash, key } = useLocation()
  useEffect(() => {
    // Retry after dishes load so direct dish links can focus their card.
    const target = hash ? document.getElementById(hash.slice(1)) : null
    if (target) {
      target.scrollIntoView({ block: hash.startsWith('#menu-dish-') ? 'center' : 'start' })
      if (hash.startsWith('#menu-dish-')) target.focus({ preventScroll: true })
    } else if (!hash) {
      window.scrollTo(0, 0)
      document.getElementById('category-heading')?.focus({ preventScroll: true })
    }
  }, [pathname, hash, key, loading])
  return null
}

function App() {
  const auth = useAuth()
  const { menu, retry } = useDishes()
  const cart = useCart(menu)
  const location = useLocation()
  // Keep existing owner-dashboard bookmarks working on the home page.
  const adminPage = location.pathname === '/' && location.hash === '#admin'
  const adminArea = adminPage || location.pathname === '/admin/reservations' || location.pathname === '/admin/reservations/calendar'
  return (
    <>
      <PagePosition loading={menu.loading} />
      {!adminArea && <Header auth={auth} cart={cart} menu={menu} retry={retry} />}
      <AdminLayout enabled={adminArea} auth={auth}>
      <main>
        <Routes>
          <Route path="/" element={<>
            {adminPage && <AdminDashboard user={auth.user} checking={auth.checking} onDishCreated={retry} />}
            <div hidden={adminPage}>
              <PromoCarousel />
              <div className="page-content homepage-content">
                <section id="menu" aria-labelledby="menu-heading">
                  <h2 id="menu-heading">Our Menu</h2>
                  <Menu />
                </section>
                <Bestsellers menu={menu} retry={retry} cart={cart} />
                <Booking auth={auth} />
                <AboutUs />
              </div>
            </div>
          </>} />
          <Route path="/menu/:categoryId" element={<CategoryPage menu={menu} retry={retry} cart={cart} />} />
          <Route path="/reservations" element={<Reservations auth={auth} />} />
          <Route path="/admin/reservations" element={<Reservations auth={auth} admin />} />
          <Route path="/admin/reservations/calendar" element={<ReservationCalendar auth={auth} />} />
          <Route path="*" element={<div className="page-content"><section>
            <h1 id="category-heading" tabIndex={-1}>Page not found</h1>
            <Link to="/#menu">Back to Menu</Link>
          </section></div>} />
        </Routes>
      </main>
      </AdminLayout>
      {!adminArea && <Footer />}
      <div className="cart-feedback" role="status" aria-live="polite" aria-atomic="true">{cart.notice.text && <span key={cart.notice.version}>{cart.notice.text}</span>}</div>
    </>
  )
}

export default App
