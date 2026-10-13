import { useEffect, useState } from 'react'
import burger from '../assets/promotions/cheeseburger.png'
import pizza from '../assets/promotions/margherita.png'
import dessert from '../assets/promotions/chocolate-dessert.png'
import './PromoCarousel.css'

const slides = [
  { image: burger, title: 'Your next favourite burger', description: 'Juicy cheeseburger, melted cheese and golden fries.', alt: 'Juicy cheeseburger served with golden fries' },
  { image: pizza, title: 'Fresh from the oven', description: 'Margherita pizza with mozzarella, tomato and fresh basil.', alt: 'Freshly baked Margherita pizza with basil' },
  { image: dessert, title: 'A little chocolate bliss', description: 'Rich chocolate dessert paired with delicious berries.', alt: 'Chocolate dessert topped with fresh berries' },
]

function PromoCarousel() {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = (event) => setReducedMotion(event.matches)
    preference.addEventListener('change', update)
    return () => preference.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (paused || hovered || focused || reducedMotion) return
    // Advance every three seconds; clear the timer when paused or unmounted.
    const timer = window.setInterval(() => setActive((current) => (current + 1) % slides.length), 3000)
    return () => window.clearInterval(timer)
  }, [paused, hovered, focused, reducedMotion])

  const move = (direction) => setActive((current) => (current + direction + slides.length) % slides.length)

  return (
    <section id="home" className="promo-carousel" aria-label="Food promotions" aria-roledescription="carousel"
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false) }}>
      {slides.map((slide, index) => (
        <div key={slide.title} className={`promo-slide${index === active ? ' is-active' : ''}`}
          role="group" aria-roledescription="slide" aria-label={`${index + 1} of ${slides.length}`}
          aria-hidden={index !== active} inert={index !== active}>
          <img src={slide.image} alt={slide.alt} />
          <div className="promo-copy">
            <p className="promo-eyebrow">Made to enjoy · Rayen Restaurant</p>
            <h1>{slide.title}</h1>
            <p>{slide.description}</p>
            <a className="promo-order" href="#menu">Order Now</a>
          </div>
        </div>
      ))}
      <button className="promo-arrow promo-previous" type="button" aria-label="Previous slide" onClick={() => move(-1)}>‹</button>
      <button className="promo-arrow promo-next" type="button" aria-label="Next slide" onClick={() => move(1)}>›</button>
      <div className="promo-controls">
        <div className="promo-indicators" aria-label="Choose a slide">
          {slides.map((slide, index) => <button key={slide.title} type="button" aria-label={`Show slide ${index + 1}: ${slide.title}`}
            aria-current={index === active ? 'true' : undefined} onClick={() => setActive(index)}><span /></button>)}
        </div>
        <button type="button" className="promo-play" disabled={reducedMotion} onClick={() => setPaused((current) => !current)}
          aria-label={reducedMotion ? 'Automatic rotation disabled by reduced motion preference' : paused ? 'Play automatic rotation' : 'Pause automatic rotation'}>
          {reducedMotion ? 'Auto-play off' : paused ? '▶ Play' : 'Ⅱ Pause'}
        </button>
      </div>
    </section>
  )
}

export default PromoCarousel
