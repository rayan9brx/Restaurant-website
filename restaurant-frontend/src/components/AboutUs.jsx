import { Link } from 'react-router-dom'
import pizza from '../assets/bestsellers/margherita-pizza.png'
import './AboutUs.css'

export default function AboutUs() {
  return (
    <section id="about" aria-labelledby="about-heading">
      <div className="about-story">
        <div className="about-story-copy">
          <p className="about-story-label">OUR STORY</p>
          <h2 id="about-heading">Good Food.<br />Great Moments.</h2>
          <p>Welcome to Rayen Restaurant, where good food brings people together. From juicy burgers and freshly baked pizzas to colourful salads and sweet treats, our menu offers something for every craving.</p>
          <p>Whether you’re stopping by for a quick bite or sharing a relaxed meal with friends and family, we want you to feel welcome. Explore our menu and find your next favourite.</p>
          <Link className="about-story-button" to="/#menu">Explore Our Menu <span aria-hidden="true">↗</span></Link>
        </div>
        {/* This existing food image and the botanical details are decorative. */}
        <div className="about-story-art" aria-hidden="true">
          <span className="about-story-ring" />
          <img src={pizza} alt="" width="1536" height="1024" loading="lazy" />
          <svg className="about-story-sprig" viewBox="0 0 160 220" fill="none" focusable="false">
            <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M40 204C64 158 80 100 112 20" />
              <path d="M58 164C22 153 17 125 22 105C49 110 66 132 58 164ZM72 126C106 135 132 112 136 90C108 86 82 98 72 126ZM85 90C56 84 47 61 52 40C78 47 92 65 85 90ZM99 55C124 60 143 41 145 22C120 22 105 34 99 55" />
            </g>
          </svg>
          <span className="about-story-star">✧</span>
        </div>
      </div>
    </section>
  )
}
