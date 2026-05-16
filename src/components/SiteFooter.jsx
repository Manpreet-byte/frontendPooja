import { Link } from 'react-router-dom';

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <div className="footer-brand">
            <img className="footer-logo" src="/brand/logo.png" alt="Love & Flour by Pooja" />
          </div>
          <p className="footer-muted">Curated workshops, refined recipes, and modern baking guidance with a warm handmade touch.</p>
          <p className="footer-fineprint">© 2026 Love &amp; Flour by Pooja. All rights reserved.</p>
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
          <h3 className="footer-heading">Follow</h3>
          <div className="footer-social">
            <a className="icon-button icon-button-dark" href="#" aria-label="Instagram">
              IG
            </a>
            <a className="icon-button icon-button-dark" href="#" aria-label="Facebook">
              FB
            </a>
            <a className="icon-button icon-button-dark" href="#" aria-label="YouTube">
              YT
            </a>
            <Link className="icon-button icon-button-dark" to="/newsletter" aria-label="Newsletter">
              ✉
            </Link>
          </div>
          <p className="footer-fineprint">Join 50K+ baking enthusiasts</p>
        </div>
      </div>
    </footer>
  );
}
