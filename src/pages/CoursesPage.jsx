import CourseCard from '../components/CourseCard';
import SectionHeading from '../components/SectionHeading';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { courses as seededCourses, terms } from '../data/seededContent';
import { mergeBySlug, sortByDateDesc } from '../utils/publicContent';
import usePageTitle from '../utils/usePageTitle';
import SelectMenu from '../components/SelectMenu';

export default function CoursesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const category = searchParams.get('category') || '';
  const qParam = searchParams.get('q') || '';
  const [query, setQuery] = useState(qParam);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState([]);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const debounceRef = useRef(null);
  usePageTitle('Courses · Love & Flour');

  const allowedCategorySlugs = useMemo(
    () => ['upcoming-live-workshops', 'upcoming-live-session', 'recorded-live-workshop', 'e-book', 'hands-on-classes'],
    [],
  );
  const categoryLabelBySlug = useMemo(
    () =>
      new Map([
        ['upcoming-live-workshops', 'Upcoming Live Workshops'],
        ['upcoming-live-session', 'Upcoming Live Workshops'],
        ['recorded-live-workshop', 'Recorded Live Workshops'],
        ['e-book', 'E-Books'],
        ['hands-on-classes', 'Hands-On Classes'],
      ]),
    [],
  );

  useEffect(() => {
    setQuery(qParam);
  }, [qParam]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api.public.courses
      .list()
      .then((data) => {
        if (!active) return;
        const merged = mergeBySlug(data.courses ?? [], seededCourses ?? []);
        setCourses(sortByDateDesc(merged));
      })
      .catch(() => {
        if (!active) return;
        setCourses(sortByDateDesc(seededCourses ?? []));
        setError('Unable to load workshops right now. Showing offline list.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setCategoryLoading(true);
    api.public.categories
      .list('workshop')
      .then((data) => {
        if (!active) return;
        const apiList = data?.categories ?? [];
        const merged = [
          ...apiList,
          ...(terms?.courseCategories ?? []),
        ];
        const bySlug = new Map();
        for (const item of merged) {
          const slug = String(item?.slug ?? '');
          if (!slug) continue;
          if (!bySlug.has(slug)) bySlug.set(slug, item);
        }
        setCategories(Array.from(bySlug.values()).filter((c) => allowedCategorySlugs.includes(String(c.slug))));
      })
      .catch(() => {
        if (!active) return;
        setCategories((terms?.courseCategories ?? []).filter((c) => allowedCategorySlugs.includes(String(c.slug))));
      })
      .finally(() => {
        if (active) setCategoryLoading(false);
      });
    return () => {
      active = false;
    };
  }, [allowedCategorySlugs]);

  const onChangeQuery = (value) => {
    setQuery(value);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      const next = new URLSearchParams(searchParams);
      const trimmed = String(value ?? '').trim();
      if (trimmed) next.set('q', trimmed);
      else next.delete('q');
      setSearchParams(next, { replace: true });
    }, 300);
  };

  const onChangeCategory = (nextCategory) => {
    const next = new URLSearchParams(searchParams);
    if (nextCategory) next.set('category', nextCategory);
    else next.delete('category');
    setSearchParams(next, { replace: true });
  };

  const deriveWorkshopCategorySlug = (course) => {
    const forcedRecordedSlugs = new Set([
      'the-grazing-table-workshop-2025',
      'bakers-business-bootcamp-a-4-day-online-workshop',
      'pre-recorded-raksha-bandhan-workshop-2025',
      'pre-recorded-eggfree-layered-brownies-workshop-2025',
      'savoury-stuffed-buns-workshop',
      'korean-cream-cheese-buns-workshop',
      'protein-and-energy-bites-workshop',
      'eggless-viral-butter-cakes-workshop-2025',
      'eggless-viral-cookie-tin-workshop',
      'eggless-christmas-plum-cake-workshop-2025',
      'eggless-christmas-cookie-box-workshop-2025',
      'wholesome-salad-bowls-workshop-2026',
      'eggless-tres-leches-masterclass',
      'eggless-millet-cookie-workshop-live-online-workshop-2026',
      'eggless-new-york-style-baked-cheesecakes-workshop',
      'the-crumble-edit-live-online-workshop',
    ]);
    if (forcedRecordedSlugs.has(String(course?.slug ?? ''))) return 'recorded-live-workshop';

    const forcedUpcomingSlugs = new Set(['high-protein-meal-bowl']);
    if (forcedUpcomingSlugs.has(String(course?.slug ?? ''))) return 'upcoming-live-workshops';

    const taxSlugs = (course?.taxonomies?.['course-category'] ?? []).map((t) => String(t?.slug ?? '').toLowerCase());
    if (taxSlugs.includes('hands-on-classes') || taxSlugs.includes('hands-on-classes-upcoming')) return 'hands-on-classes';
    if (taxSlugs.includes('e-book')) return 'e-book';
    if (taxSlugs.includes('recorded-live-workshop') || taxSlugs.includes('pre-recorded-courses')) return 'recorded-live-workshop';

    const joined = `${course?.title ?? ''} ${course?.summary ?? ''} ${course?.excerptHtml ?? ''} ${course?.contentHtml ?? ''}`.toLowerCase();

    if (
      joined.includes('recorded') ||
      joined.includes('pre-recorded') ||
      joined.includes('pre recorded') ||
      joined.includes('recording') ||
      taxSlugs.includes('recorded-live-workshop') ||
      taxSlugs.includes('pre-recorded-courses')
    ) {
      return 'recorded-live-workshop';
    }
    if (joined.includes('e-book') || joined.includes('ebook') || joined.includes('e book')) return 'e-book';
    return 'recorded-live-workshop';
  };

  const filtered = useMemo(() => {
    const list = Array.isArray(courses) ? courses : [];
    const q = String(qParam ?? '').trim().toLowerCase();
    return list.filter((c) => {
      if (category) {
        const matches = (c.taxonomies?.['course-category'] ?? []).some((t) => t.slug === category);
        if (!matches && deriveWorkshopCategorySlug(c) !== category) return false;
      }
      if (!q) return true;
      const hay =
        `${c.title ?? ''} ${c.summary ?? ''} ${c.excerptHtml ?? ''} ${c.contentHtml ?? ''}`.replace(/<[^>]*>/g, ' ').toLowerCase();
      return hay.includes(q);
    });
  }, [category, courses, qParam]);

  const normalizedCategories = useMemo(() => {
    const list = Array.isArray(categories) ? categories : [];
    const picked = allowedCategorySlugs
      .map((slug) => list.find((c) => String(c.slug) === slug))
      .filter(Boolean);
    // Keep only one "upcoming live" entry.
    const hasUpcoming = picked.some((c) => c.slug === 'upcoming-live-workshops');
    if (hasUpcoming) return picked.filter((c) => c.slug !== 'upcoming-live-session');
    return picked;
  }, [allowedCategorySlugs, categories]);

  const showGroupedByCategory = useMemo(() => !category && !String(qParam ?? '').trim(), [category, qParam]);
  const groupedByCategory = useMemo(() => {
    const groups = new Map();
    for (const c of filtered) {
      const slug = deriveWorkshopCategorySlug(c);
      if (!allowedCategorySlugs.includes(slug)) continue;
      const list = groups.get(slug) ?? [];
      list.push(c);
      groups.set(slug, list);
    }
    return groups;
  }, [allowedCategorySlugs, filtered]);

  const categoryName = category ? categoryLabelBySlug.get(category) ?? category : null;

  return (
    <main className="section page-60">
      <div className="container-wide">
        <SectionHeading
          badge="Online Workshops"
          title={categoryName ? `Courses: ${categoryName}` : 'All Courses'}
          subtitle={categoryName ? 'Browse workshops by format and category.' : 'Browse all workshops.'}
        />
        <div className="courses-layout">
          <aside className="panel courses-sidebar" aria-label="Workshop filters">
            <div className="courses-filter-grid">
              <label className="field">
                <span className="field-label">Search</span>
                <div className="courses-search">
                  <input
                    className="input courses-search-input"
                    value={query}
                    onChange={(e) => onChangeQuery(e.target.value)}
                    placeholder="Search workshops"
                  />
                  {query ? (
                    <button
                      type="button"
                      className="courses-search-clear"
                      onClick={() => onChangeQuery('')}
                      aria-label="Clear search"
                    >
                      ×
                    </button>
                  ) : (
                    <span className="courses-search-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                        <path d="M10.8 18.2a7.4 7.4 0 1 1 0-14.8 7.4 7.4 0 0 1 0 14.8Z" stroke="currentColor" strokeWidth="2" />
                        <path d="M16.4 16.4 21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </span>
                  )}
                </div>
              </label>
              <label className="field">
                <span className="field-label">Category</span>
                <SelectMenu
                  ariaLabel="Workshop category"
                  value={category}
                  disabled={categoryLoading}
                  placeholder={categoryLoading ? 'Loading…' : 'All categories'}
                  options={[
                    { value: '', label: 'All categories' },
                    ...(normalizedCategories ?? []).map((c) => ({
                      value: c.slug ?? '',
                      label: categoryLabelBySlug.get(c.slug) ?? c.name ?? c.slug ?? '',
                    })),
                  ]}
                  onChange={(val) => onChangeCategory(val)}
                />
              </label>
            </div>

            {loading ? <p className="muted courses-status">Loading workshops…</p> : null}
            {error ? <p className="form-error courses-status">{error}</p> : null}
            {!loading && !error && !filtered.length ? <p className="muted courses-status">No workshops found.</p> : null}
          </aside>

          <section className="courses-results" aria-label="Workshops">
            {showGroupedByCategory ? (
              <div className="courses-grouped">
                {normalizedCategories.map((cat) => {
                  const slug = String(cat.slug);
                  const list = groupedByCategory.get(slug) ?? [];
                  if (!list.length) return null;
                  return (
                    <section key={slug} aria-label={cat.name ?? slug}>
                      <div className="h3 courses-group-title">{categoryLabelBySlug.get(slug) ?? cat.name ?? slug}</div>
                      <div className="grid cards-grid">
                        {list.map((course) => (
                          <CourseCard key={course.id} course={course} />
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            ) : (
              <div className="grid cards-grid">
                {filtered.map((course) => (
                  <CourseCard key={course.id} course={course} />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
