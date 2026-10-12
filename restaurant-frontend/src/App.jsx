import './App.css'
import Menu from './components/Menu'

function App() {
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
            {/* Visual button only; login functionality will be added later. */}
            <button type="button" className="login-button">Log In</button>
          </div>
        </nav>
      </header>
      <main className="page-content">
        <section id="home" aria-labelledby="home-heading">
          <h1 id="home-heading">Welcome to Rayen Restaurant</h1>
          <p>We’re happy to have you here. Make yourself at home.</p>
        </section>
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
        {/* **********************************************************+ */}
      </main>
    </>
  )
}

export default App
