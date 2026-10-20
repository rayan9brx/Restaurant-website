import { Link } from 'react-router-dom'
import { footerContact, footerSocials } from './footerSettings'
import './Footer.css'

function SocialIcon({ name }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {name === 'Instagram' ? <>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r=".75" fill="currentColor" stroke="none" />
    </> : name === 'Facebook' ? <path d="M14 21v-8h3l.5-4H14V7c0-1 .5-2 2-2h2V2h-3c-3 0-5 2-5 5v2H7v4h3v8" /> : <>
      <rect x="3" y="9" width="4" height="12" /><circle cx="5" cy="4.5" r="2" />
      <path d="M11 21V9h4v2c1-2 6-3 6 3v7h-4v-7c0-2-2-2-2 0v7" />
    </>}
  </svg>
}

export default function Footer() {
  return <footer className="site-footer">
    <div className="site-footer-inner">
      <div className="site-footer-columns">
        <div className="site-footer-brand">
          <Link className="site-footer-name" to="/#home">Rayen Restaurant</Link>
          <p className="site-footer-tagline">Good food. Great moments.</p>
          <p>Find your next favourite on our menu, or book a table and make yourself at home.</p>
        </div>
        <section aria-labelledby="footer-contact-heading">
          <h2 id="footer-contact-heading">Contact Us</h2>
          <address className="site-footer-contact">
            <div><span className="site-footer-detail-label">Email</span>
              {footerContact.email ? <a href={`mailto:${footerContact.email}`}>{footerContact.email}</a> : <span className="site-footer-placeholder">Placeholder — add email</span>}
            </div>
            <div><span className="site-footer-detail-label">Phone</span>
              {footerContact.phone ? <a href={`tel:${footerContact.phone.replace(/[^+\d]/g, '')}`}>{footerContact.phone}</a> : <span className="site-footer-placeholder">Placeholder — add phone number</span>}
            </div>
            <div><span className="site-footer-detail-label">Address</span>
              <span className={!footerContact.address ? 'site-footer-placeholder' : undefined}>{footerContact.address || 'Placeholder — add restaurant address'}</span>
            </div>
          </address>
        </section>
        <section aria-labelledby="footer-social-heading">
          <h2 id="footer-social-heading">Follow Us</h2>
          <ul className="site-footer-socials">
            {footerSocials.map(({ name, url }) => <li key={name}>
              {url ? <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`${name} (opens in a new tab)`}><SocialIcon name={name} />{name}</a>
                : <span className="site-footer-social-placeholder"><SocialIcon name={name} /><span>{name}<small>Profile URL needed</small></span></span>}
            </li>)}
          </ul>
        </section>
      </div>
      <div className="site-footer-bottom">
        <p>© {new Date().getFullYear()} Rayen Restaurant. All rights reserved.</p>
        <nav aria-label="Footer navigation">
          <Link to="/#home">Home</Link>
          <Link to="/#menu">Menu</Link>
          <Link to="/#booking">Make a Booking</Link>
          <Link to="/#about">About Us</Link>
        </nav>
      </div>
    </div>
  </footer>
}
