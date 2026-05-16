import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <main className="not-found-page">
      <div className="not-found-container">
        <div className="not-found-header">
          <h1 className="not-found-code">404</h1>
          <h2 className="not-found-title">Page Not Found</h2>
          <p className="not-found-subtitle">
            It looks like this page has cooled off and disappeared from our bakery. 
            Let's get you back to exploring amazing baking content.
          </p>
        </div>

        <div className="not-found-actions">
          <Link className="button button-lg" to="/">
            Back to Home
          </Link>
          <Link className="button button-ghost button-lg" to="/recipe-library">
            Browse Recipes
          </Link>
        </div>

        <div className="not-found-suggestion">
          <h3 className="not-found-suggestion-label">Explore Something Else</h3>
          <div className="not-found-suggestion-links">
            <Link className="not-found-link" to="/courses">Explore Workshops</Link>
            <Link className="not-found-link" to="/recipe-library">Recipe Library</Link>
            <Link className="not-found-link" to="/about">About Pooja</Link>
            <Link className="not-found-link" to="/contact">Get In Touch</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
