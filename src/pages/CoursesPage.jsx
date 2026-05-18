import CourseCard from '../components/CourseCard';
import SectionHeading from '../components/SectionHeading';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { sortByDateDesc } from '../utils/publicContent';
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
        setCourses(sortByDateDesc(data.courses ?? []));
      })
      .catch(() => {
        if (!active) return;
        setCourses([]);
        setError('Unable to load workshops right now.');
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
      .list('course')
      .then((data) => {
        if (!active) return;
        setCategories(data?.categories ?? []);
      })
      .catch(() => {
        if (active) setCategories([]);
      })
      .finally(() => {
        if (active) setCategoryLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

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

  const filtered = useMemo(() => {
    const list = Array.isArray(courses) ? courses : [];
    const q = String(qParam ?? '').trim().toLowerCase();
    return list.filter((c) => {
      if (category && !(c.taxonomies?.['course-category'] ?? []).some((t) => t.slug === category)) return false;
      if (!q) return true;
      const hay =
        `${c.title ?? ''} ${c.summary ?? ''} ${c.excerptHtml ?? ''} ${c.contentHtml ?? ''}`.replace(/<[^>]*>/g, ' ').toLowerCase();
      return hay.includes(q);
    });
  }, [category, courses, qParam]);

  const categoryName = category
    ? filtered
        .find((c) => (c.taxonomies?.['course-category'] ?? []).some((t) => t.slug === category))
        ?.taxonomies?.['course-category']?.find((t) => t.slug === category)?.name ?? category
    : null;

  return (
    <main className="section">
      <div className="container">
        <SectionHeading
          badge="Online Workshops"
          title={categoryName ? `Courses: ${categoryName}` : 'All Courses'}
          subtitle={categoryName ? 'Browse workshops by format and category.' : 'Browse all workshops.'}
        />
        <div className="panel" style={{ marginBottom: 16 }}>
          <div className="grid" style={{ gap: 12 }}>
            <label className="field">
              <span className="field-label">Search</span>
              <input className="input" value={query} onChange={(e) => onChangeQuery(e.target.value)} placeholder="Search workshops…" />
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
                  ...(categories ?? []).map((c) => ({ value: c.slug ?? '', label: c.name ?? c.slug ?? '' })),
                ]}
                onChange={(val) => onChangeCategory(val)}
              />
            </label>
          </div>
          {loading ? <p className="muted" style={{ marginTop: 10 }}>Loading workshops…</p> : null}
          {error ? <p className="form-error" style={{ marginTop: 10 }}>{error}</p> : null}
          {!loading && !error && !filtered.length ? <p className="muted" style={{ marginTop: 10 }}>No workshops found.</p> : null}
        </div>
        <div className="grid cards-grid">
          {filtered.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      </div>
    </main>
  );
}
