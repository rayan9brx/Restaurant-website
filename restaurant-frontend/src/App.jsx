import './App.css'
import Menu from './components/Menu'
import PromoCarousel from './components/PromoCarousel'
import { useEffect } from 'react'
import { Link, Route, Routes, useLocation } from 'react-router-dom'
import useAuth from './auth/useAuth'
import AuthControls from './auth/AuthControls'
import AdminDashboard from './auth/AdminDashboard'
import Bestsellers from './components/Bestsellers'
import useDishes from './components/useDishes'
import CategoryPage from './components/CategoryPage'
import AboutUs from './components/AboutUs'

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
  const location = useLocation()
  // Keep existing owner-dashboard bookmarks working on the home page.
  const adminPage = location.pathname === '/' && location.hash === '#admin'
  return (
    <>
      <PagePosition loading={menu.loading} />
      <header className="site-header">
        <nav className="navigation" aria-label="Main navigation">
          <Link className="restaurant-name" to="/#home">Rayen Restaurant</Link>
          <div className="navigation-links">
            <Link to="/#home">Home</Link>
            <Link to="/#menu">Menu</Link>
            <Link to="/#booking">Make a Booking</Link>
            <Link to="/#about">About Us</Link>
            <AuthControls auth={auth} />
          </div>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<>
            {adminPage && <AdminDashboard user={auth.user} checking={auth.checking} onDishCreated={retry} />}
            <div hidden={adminPage}>
              <PromoCarousel />
              <div className="page-content">
                <section id="menu" aria-labelledby="menu-heading">
                  <h2 id="menu-heading">Our Menu</h2>
                  <Menu />
                </section>
                <Bestsellers menu={menu} retry={retry} />
                <section id="booking" aria-labelledby="booking-heading">
                  <h2 id="booking-heading">Make a Booking</h2>
                  <p>Table reservations will be available soon.</p>
                </section>
                <AboutUs />
              </div>
            </div>
          </>} />
          <Route path="/menu/:categoryId" element={<CategoryPage menu={menu} retry={retry} />} />
          <Route path="*" element={<div className="page-content"><section>
            <h1 id="category-heading" tabIndex={-1}>Page not found</h1>
            <Link to="/#menu">Back to Menu</Link>
          </section></div>} />
        </Routes>
      </main>
    </>
  )
}

export default App
