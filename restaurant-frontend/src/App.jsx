import './App.css'
import Menu from './components/Menu'
import PromoCarousel from './components/PromoCarousel'
import { useEffect, useState } from 'react'
import useAuth from './auth/useAuth'
import AuthControls from './auth/AuthControls'
import AdminDashboard from './auth/AdminDashboard'

function App() {
  const auth = useAuth()
  const [adminPage, setAdminPage] = useState(() => window.location.hash === '#admin')
  useEffect(() => {
    const updatePage = () => setAdminPage(window.location.hash === '#admin')
    window.addEventListener('hashchange', updatePage)
    return () => window.removeEventListener('hashchange', updatePage)
  }, [])
  return (
    <>
      <header className="site-header">
        <nav className="navigation" aria-label="Main navigation">
          <a className="restaurant-name" href="#home">Rayen Restaurant</a>
          <div className="navigation-links">
            <a href="#home">Home</a>
            <a href="#menu">Menu</a>
            <a href="#booking">Make a Booking</a>
            {/* Scroll to the About Us section on this page. */}
            <a href="#about">About Us</a>
            <AuthControls auth={auth} />
          </div>
        </nav>
      </header>
      <main>
        {adminPage && <AdminDashboard user={auth.user} checking={auth.checking} />}
        <div hidden={adminPage}>
        <PromoCarousel />
        <div className="page-content">
        <section id="menu" aria-labelledby="menu-heading">
          <h2 id="menu-heading">Our Menu</h2>
          <Menu />
        </section>
        <section id="booking" aria-labelledby="booking-heading">
          <h2 id="booking-heading">Make a Booking</h2>
          <p>Table reservations will be available soon.</p>
        </section>

        {/* Introduce the restaurant using the existing section styling. */}
        <section id="about" aria-labelledby="about-heading">
          <h2 id="about-heading">About Us</h2>
          <p>Welcome to Rayen Restaurant, a place to enjoy good food and great company.</p>
        </section>
        </div>
        </div>
      </main>
    </>
  )
}

export default App
