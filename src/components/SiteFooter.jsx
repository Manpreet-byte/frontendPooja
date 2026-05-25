import { Link } from 'react-router-dom';

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <div className="footer-brand" aria-label="Love & Flour by Pooja">
            <img className="footer-logo" src="/brand/logo.png" alt="Love & Flour by Pooja" loading="lazy" />
          </div>
          <p className="footer-muted">Curated workshops, refined recipes, and modern baking guidance with a warm handmade touch.</p>
          <ul className="footer-list" aria-label="Contact email">
            <li>
              <a href="mailto:contact@loveandflourbypooja.com">contact@loveandflourbypooja.com</a>
            </li>
          </ul>
          <h3 className="footer-heading footer-follow-heading">Follow</h3>
          <p className="footer-fineprint footer-follow-text">Join 50K+ baking enthusiasts</p>
          <div className="footer-social">
            <a
              className="icon-button icon-button-dark footer-social-icon"
              href="https://www.instagram.com/loveandflourbypooja/?hl=en"
              aria-label="Instagram"
              target="_blank"
              rel="noreferrer"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M7.8 2h8.4A5.8 5.8 0 0 1 22 7.8v8.4A5.8 5.8 0 0 1 16.2 22H7.8A5.8 5.8 0 0 1 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2Zm0 2A3.8 3.8 0 0 0 4 7.8v8.4A3.8 3.8 0 0 0 7.8 20h8.4a3.8 3.8 0 0 0 3.8-3.8V7.8A3.8 3.8 0 0 0 16.2 4H7.8Zm4.2 3.7a4.3 4.3 0 1 1 0 8.6 4.3 4.3 0 0 1 0-8.6Zm0 2a2.3 2.3 0 1 0 0 4.6 2.3 2.3 0 0 0 0-4.6ZM17.6 6.7a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z"
                />
              </svg>
            </a>
            <a
              className="icon-button icon-button-dark footer-social-icon"
              href="https://www.facebook.com/loveandflourbypooja/"
              aria-label="Facebook"
              target="_blank"
              rel="noreferrer"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M13.5 22v-7h2.5l.4-3H13.5V9.9c0-.9.3-1.6 1.7-1.6h1.3V5.6c-.6-.1-1.6-.2-2.8-.2-2.8 0-4.6 1.7-4.6 4.9V12H6.7v3h2.4v7h4.4Z"
                />
              </svg>
            </a>
            <Link className="icon-button icon-button-dark footer-social-icon" to="/newsletter" aria-label="Newsletter">
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M4.5 6h15A2.5 2.5 0 0 1 22 8.5v8A2.5 2.5 0 0 1 19.5 19h-15A2.5 2.5 0 0 1 2 16.5v-8A2.5 2.5 0 0 1 4.5 6Zm0 2v.3l7.2 4.5a.6.6 0 0 0 .6 0L19.5 8.3V8h-15Zm15 2.7-6.2 3.9a2.6 2.6 0 0 1-2.6 0L4.5 10.7v5.8c0 .3.2.5.5.5h14c.3 0 .5-.2.5-.5v-5.8Z"
                />
              </svg>
            </Link>
          </div>
        </div>

        <div>
          <h3 className="footer-heading">Quick Links</h3>
          <ul className="footer-list">
            <li>
              <Link to="/">Home</Link>
            </li>
            <li>
              <Link to="/recipe-library">Recipe Library</Link>
            </li>
            <li>
              <Link to="/about">About</Link>
            </li>
            <li>
              <Link to="/contact">Contact</Link>
            </li>
            <li>
              <Link to="/work-with-us">Work With Us</Link>
            </li>
            <li>
              <Link to="/elementor-7819">From Passion to Purpose: Pooja's Journey</Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="footer-heading">Categories</h3>
          <ul className="footer-list">
            <li><Link to="/recipe-library">Cakes</Link></li>
            <li><Link to="/recipe-library">Cookies</Link></li>
            <li><Link to="/recipe-library">Pastries</Link></li>
            <li><Link to="/recipe-library">Desserts</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="footer-heading">Legal</h3>
          <ul className="footer-list">
            <li><Link to="/terms">Terms &amp; Conditions</Link></li>
            <li><Link to="/privacy">Privacy Policy</Link></li>
            <li><Link to="/shipping">Shipping &amp; Delivery</Link></li>
            <li><Link to="/cancellation">Cancellation &amp; Refund</Link></li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <p className="footer-fineprint footer-bottom-line">
          © 2026 Love &amp; Flour by Pooja. All rights reserved. Designed &amp; Developed by Innovins
        </p>
      </div>
    </footer>
  );
}
