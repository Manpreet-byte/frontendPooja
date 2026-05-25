import { Link, useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import SafeImage from './SafeImage';

function CartIcon({ size = 18 } = {}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M7.2 6.6h14l-1.8 7.2a2 2 0 0 1-1.94 1.52H9.2a2 2 0 0 1-1.95-1.54L5.7 3.6H3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 20.3a.9.9 0 1 0 0-1.8.9.9 0 0 0 0 1.8ZM17.4 20.3a.9.9 0 1 0 0-1.8.9.9 0 0 0 0 1.8Z"
        fill="currentColor"
      />
    </svg>
  );
}

function RupeeIcon({ size = 18 } = {}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M7.5 6.6h8.6M7.5 10.2h8.6M7.6 6.6c2.9 0 5.2 1.5 5.2 3.8 0 2.2-2.3 3.8-5.2 3.8h-.1l6.8 6.2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function CourseCard({ course }) {
  const navigate = useNavigate();
  const addCourse = useCartStore((state) => state.addCourse);
  const removeCourse = useCartStore((state) => state.removeCourse);
  const hasCourse = useCartStore((state) => state.hasCourse(course.id));
  const buyNowCourse = useCartStore((state) => state.buyNowCourse);
  const cartCount = useCartStore((state) => state.items.length);
  const priceLabel = Number.isFinite(course?.priceInr) ? `${Math.round(course.priceInr)}` : course.priceText;
  const compareAtLabel =
    Number.isFinite(course?.compareAtPriceInr) && course.compareAtPriceInr > 0
      ? `${Math.round(course.compareAtPriceInr)}`
      : course.compareAtPriceText;
  const courseSlug = course?.slug ? encodeURIComponent(String(course.slug)) : '';
  const courseHref = courseSlug ? `/courses/${courseSlug}` : '#';

  return (
    <article className="card course-card">
      <div className="course-card-media">
        {course.featuredImage ? (
          <SafeImage src={course.featuredImage} alt={course.title} />
        ) : (
          <div className="course-card-fallback" aria-hidden="true" />
        )}
      </div>
      <div className="course-card-body">
        <Link className="course-card-link" to={courseHref} aria-disabled={!courseSlug}>
          <div className="course-card-kicker">course</div>
          <h3 className="h3">{course.title}</h3>
          {course.excerptHtml ? (
            <p className="muted" dangerouslySetInnerHTML={{ __html: course.excerptHtml }} />
          ) : (
            <p className="muted" aria-hidden="true">
              &nbsp;
            </p>
          )}
        </Link>
        {priceLabel ? (
          <div className="course-card-pricing">
            <button
              className={`course-card-cart-icon${hasCourse ? ' is-active' : ''}`}
              type="button"
              onClick={() => (hasCourse ? removeCourse(course.id) : addCourse(course))}
              aria-label={hasCourse ? 'Remove from cart' : 'Add to cart'}
              title={hasCourse ? 'Remove from cart' : 'Add to cart'}
            >
              <CartIcon size={20} />
            </button>
            {compareAtLabel ? (
              <span className="course-card-original">
                <RupeeIcon size={18} />
                <span>{compareAtLabel}</span>
              </span>
            ) : null}
            <span className="course-card-price">
              <RupeeIcon size={18} />
              <span>{priceLabel}</span>
            </span>
          </div>
        ) : null}
        <div className="course-card-footer">
          <div className="course-card-actions">
            <Link className="button button-ghost course-card-view" to={courseHref} aria-disabled={!courseSlug}>
              View details
            </Link>
            <button
              className="button button-solid"
              type="button"
              onClick={() => {
                if (cartCount > 0 && !hasCourse) {
                  const ok = typeof window === 'undefined' ? true : window.confirm('Buy now will replace your cart with this course. Continue?');
                  if (!ok) return;
                }
                buyNowCourse(course);
                navigate('/checkout');
              }}
            >
              Buy now
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
