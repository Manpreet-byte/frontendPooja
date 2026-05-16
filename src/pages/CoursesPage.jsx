import CourseCard from '../components/CourseCard';
import SectionHeading from '../components/SectionHeading';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { sortByDateDesc } from '../utils/publicContent';

export default function CoursesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const category = searchParams.get('category') || '';
  const qParam = searchParams.get('q') || '';
  const [query, setQuery] = useState(qParam);
  const [courses, setCourses] = useState([]);
  const debounceRef = useRef(null);

  useEffect(() => {
    setQuery(qParam);
  }, [qParam]);

  useEffect(() => {
    let active = true;
    api.public.courses
      .list()
      .then((data) => {
        if (!active) return;
        setCourses(sortByDateDesc(data.courses ?? []));
      })
      .catch(() => {
        if (active) setCourses([]);
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
          <label className="field">
            <span className="field-label">Search</span>
            <input className="input" value={query} onChange={(e) => onChangeQuery(e.target.value)} placeholder="Search workshops…" />
          </label>
          {!filtered.length ? <p className="muted" style={{ marginTop: 10 }}>No workshops found.</p> : null}
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
