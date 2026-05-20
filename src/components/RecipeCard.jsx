import { Link } from 'react-router-dom';
import SafeImage from './SafeImage';
import { formatDateStandard } from '../utils/formatDate';

export default function RecipeCard({ recipe, to }) {
  const href = to ?? `/recipes/${recipe.slug ?? recipe.id}`;
  const categoryName = recipe?.taxonomies?.category?.[0]?.name ?? 'Recipe';
  return (
    <Link className="card recipe-card" to={href}>
      <div className="recipe-card-media">
        {recipe.featuredImage ? (
          <SafeImage src={recipe.featuredImage} alt={recipe.title} />
        ) : (
          <div className="recipe-card-fallback" aria-hidden="true" />
        )}
      </div>
      <div className="recipe-card-body">
        <div className="recipe-card-topline">
          <span className="pill">{categoryName}</span>
          <span className="muted recipe-card-date">
            <svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14" fill="none">
              <path
                d="M7 3.8V6M17 3.8V6M4.8 9.2h14.4M6.2 5.5h11.6A1.8 1.8 0 0 1 19.6 7.3v10A1.8 1.8 0 0 1 17.8 19.1H6.2A1.8 1.8 0 0 1 4.4 17.3v-10A1.8 1.8 0 0 1 6.2 5.5Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>{formatDateStandard(recipe.date ?? Date.now())}</span>
          </span>
        </div>
        <h3 className="h3">{recipe.title}</h3>
        {recipe.excerptHtml ? (
          <p className="muted" dangerouslySetInnerHTML={{ __html: recipe.excerptHtml }} />
        ) : null}
        <div className="recipe-card-footer" aria-hidden="true">
          <span>Read More</span>
          <span className="recipe-card-footer-arrow">→</span>
        </div>
      </div>
    </Link>
  );
}
