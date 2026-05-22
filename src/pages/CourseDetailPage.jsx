import { Link, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import SectionHeading from '../components/SectionHeading';
import { api } from '../api/client';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import SafeImage from '../components/SafeImage';
import { sanitizeHtmlForApp } from '../utils/htmlSanitize';
import { formatDateStandard } from '../utils/formatDate';
import { findCourseBySlug } from '../data/seededContent';

function extractGalleryFromHtml(contentHtml) {
  if (!contentHtml || typeof DOMParser === 'undefined') {
    return { sanitizedHtml: contentHtml ?? '', images: [] };
  }

  const bestFromSrcset = (srcset, fallback) => {
    const raw = String(srcset ?? '').trim();
    if (!raw) return String(fallback ?? '').trim();
    const parts = raw
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
    let bestUrl = '';
    let bestWidth = -1;
    for (const part of parts) {
      const [url, widthToken] = part.split(/\s+/);
      const width = Number(String(widthToken ?? '').replace(/[^\d.]/g, ''));
      if (!url) continue;
      if (Number.isFinite(width) && width > bestWidth) {
        bestWidth = width;
        bestUrl = url;
      } else if (bestWidth < 0) {
        bestUrl = url;
      }
    }
    return String(bestUrl || fallback || '').trim();
  };

  const parser = new DOMParser();
  const document = parser.parseFromString(`<div id="course-html">${contentHtml}</div>`, 'text/html');
  const root = document.getElementById('course-html');
  if (!root) return { sanitizedHtml: contentHtml ?? '', images: [] };

  const images = [];
  const galleries = root.querySelectorAll('.gallery');
  galleries.forEach((gallery) => {
    gallery.querySelectorAll('img').forEach((img) => {
      const src = img.getAttribute('src') || img.getAttribute('data-src') || '';
      const srcset = img.getAttribute('srcset') || img.getAttribute('data-srcset') || '';
      const best = bestFromSrcset(srcset, src);
      if (best) images.push(best);
    });
    gallery.remove();
  });

  return { sanitizedHtml: root.innerHTML, images };
}

export default function CourseDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const addCourse = useCartStore((state) => state.addCourse);
  const removeCourse = useCartStore((state) => state.removeCourse);
  const buyNowCourse = useCartStore((state) => state.buyNowCourse);
  const cartCount = useCartStore((state) => state.items.length);
  const [activeImage, setActiveImage] = useState(null);
  const token = useAuthStore((s) => s.token);
  const [waitlistStatus, setWaitlistStatus] = useState('idle');
  const [waitlistMessage, setWaitlistMessage] = useState('');

  useEffect(() => {
    let active = true;
    setCourse(null);
    api.public.courses
      .detail(slug)
      .then((data) => {
        if (active) setCourse(data.course ?? null);
      })
      .catch(() => {
        if (!active) return;
        const seeded = findCourseBySlug(slug);
        setCourse(seeded ?? null);
      });

    return () => {
      active = false;
    };
  }, [slug]);

  const inCart = useCartStore((state) => state.items.some((item) => item.id === course?.id));
  const categories = course?.taxonomies?.['course-category'] ?? [];

  const { sanitizedHtml, images: galleryImages } = useMemo(
    () => extractGalleryFromHtml(course?.contentHtml ?? ''),
    [course?.contentHtml],
  );
  const safeBodyHtml = useMemo(() => (sanitizedHtml ? sanitizeHtmlForApp(sanitizedHtml) : ''), [sanitizedHtml]);

  const allImages = useMemo(() => {
    const urls = [];
    if (course?.featuredImage) urls.push(course.featuredImage);
    galleryImages.forEach((src) => urls.push(src));
    return Array.from(new Set(urls.filter(Boolean)));
  }, [course?.featuredImage, galleryImages]);

  const fallbackIntro = course?.excerptHtml ?? course?.summary ?? 'Workshop details, access notes, and recordings will appear here once the course is published.';

  useEffect(() => {
    setActiveImage(allImages[0] ?? null);
  }, [allImages]);

  if (!course) {
    return (
      <main className="section course-detail-page page-60">
        <div className="container">
          <SectionHeading badge="Not Found" title="Course not found" subtitle="Try going back to all courses." />
          <Link className="button" to="/courses">
            Back to courses
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="section course-detail-page page-60">
      <div className="container-wide">
        <div className="page-topline">
          <Link className="button" to="/courses">
            ← All courses
          </Link>
        </div>

        <div className="course-detail-grid">
          <aside className="course-detail-sticky" aria-label="Workshop media and purchase">
            {activeImage ? (
              <div className="course-hero" aria-label="Workshop gallery">
                <div className="course-hero-main">
                  <SafeImage src={activeImage} alt={course.title} loading="eager" />
                </div>
                {allImages.length > 1 ? (
                  <div className="course-hero-thumbs" aria-label="Gallery thumbnails">
                    {allImages.map((src) => {
                      const selected = src === activeImage;
                      return (
                        <button
                          key={src}
                          type="button"
                          className={`course-hero-thumb ${selected ? 'is-active' : ''}`}
                          onClick={() => setActiveImage(src)}
                          aria-label={selected ? 'Selected image' : 'View image'}
                        >
                          <SafeImage src={src} alt="" />
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="panel course-purchase-card">
              <div className="course-purchase-head">
                <div>
                  <div className="course-purchase-label">Workshop price</div>
                  {course.priceText ? (
                    <p className="course-detail-price">
                      {course.compareAtPriceText ? <span className="course-detail-original">{course.compareAtPriceText}</span> : null}
                      <span className="course-detail-current">{course.priceText}</span>
                    </p>
                  ) : (
                    <p className="course-detail-price">
                      <span className="course-detail-current">Contact for price</span>
                    </p>
                  )}
                </div>
                <span className="course-purchase-chip">{inCart ? 'In cart' : 'Ready to book'}</span>
              </div>

              <button
                className="button button-solid course-purchase-cta"
                type="button"
                onClick={() => (inCart ? removeCourse(course.id) : addCourse(course))}
              >
                {inCart ? 'Remove from cart' : 'Add to cart'}
              </button>

              <button
                className="button button-ghost"
                type="button"
                style={{ width: '100%', marginTop: 10 }}
                onClick={() => {
                  if (cartCount > 0 && !inCart) {
                    const ok = typeof window === 'undefined' ? true : window.confirm('Buy now will replace your cart with this course. Continue?');
                    if (!ok) return;
                  }
                  buyNowCourse(course);
                  navigate('/checkout');
                }}
              >
                Buy now
              </button>

              <p className="fineprint course-detail-cart-note">
                {inCart ? 'This workshop is already in your cart.' : 'Add it now and continue browsing.'}
              </p>

              <div className="course-purchase-points" aria-label="What you get">
                <div className="course-purchase-point">
                  <span className="course-purchase-dot" aria-hidden="true" />
                  <span>Live session access + updates</span>
                </div>
                <div className="course-purchase-point">
                  <span className="course-purchase-dot" aria-hidden="true" />
                  <span>Recording link after the session</span>
                </div>
                <div className="course-purchase-point">
                  <span className="course-purchase-dot" aria-hidden="true" />
                  <span>Recording visible in dashboard for 1 year</span>
                </div>
              </div>

              <div style={{ marginTop: 14 }}>
                <button
                  className="button button-ghost"
                  type="button"
                  style={{ width: '100%' }}
                  disabled={waitlistStatus === 'loading'}
                  onClick={async () => {
                    if (!course?.id) return;
                    setWaitlistMessage('');
                    if (!token) {
                      navigate('/login');
                      return;
                    }
                    setWaitlistStatus('loading');
                    try {
                      const data = await api.user.waitlist.join(token, course.id);
                      if (data?.created) setWaitlistMessage('Added to waitlist. We will notify you when a seat opens.');
                      else setWaitlistMessage('You are already on the waitlist for this workshop.');
                    } catch (err) {
                      if (err?.status === 401) {
                        navigate('/login');
                        return;
                      }
                      setWaitlistMessage(err?.message ?? 'Failed to join waitlist.');
                    } finally {
                      setWaitlistStatus('idle');
                    }
                  }}
                >
                  {waitlistStatus === 'loading' ? 'Joining…' : 'Join waitlist'}
                </button>
                {waitlistMessage ? (
                  <p className="fineprint" style={{ marginTop: 10 }}>
                    {waitlistMessage}
                  </p>
                ) : null}
              </div>
            </div>
          </aside>

          <div className="course-detail-scroll">
            <SectionHeading align="left" badge="Course" title={course.title} subtitle={null} />

            <div className="course-detail-meta">
              {categories.length ? (
                <div className="course-detail-badges" aria-label="Course categories">
                  {categories.map((c) => (
                    <span key={c.slug ?? c.id} className="pill">
                      {c.name}
                    </span>
                  ))}
                </div>
              ) : null}
              {course.date ? <div className="muted">Published {formatDateStandard(course.date)}</div> : null}
            </div>

            {!safeBodyHtml ? (
              <div className="panel prose-block course-detail-fallback">
                <p dangerouslySetInnerHTML={{ __html: fallbackIntro }} />
                <div className="course-detail-fallback-grid">
                  <div>
                    <strong>Live access</strong>
                    <span>Zoom link and reminders, if scheduled.</span>
                  </div>
                  <div>
                    <strong>Recording</strong>
                    <span>Visible in your dashboard for one year.</span>
                  </div>
                </div>
              </div>
            ) : null}

            {safeBodyHtml ? <div className="panel prose-block" dangerouslySetInnerHTML={{ __html: safeBodyHtml }} /> : null}
          </div>
        </div>
      </div>
    </main>
  );
}
