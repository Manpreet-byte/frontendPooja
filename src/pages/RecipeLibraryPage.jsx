import RecipeCard from '../components/RecipeCard';
import SectionHeading from '../components/SectionHeading';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { posts as seededPosts, terms } from '../data/seededContent';
import { mergeBySlug, sortByDateDesc } from '../utils/publicContent';
import usePageTitle from '../utils/usePageTitle';
import SelectMenu from '../components/SelectMenu';

function normalizeRecipe(recipe) {
  if (!recipe) return null;
  return {
    ...recipe,
    slug: recipe.slug,
    title: recipe.title,
    featuredImage: recipe.featuredImage ?? recipe.thumbnail_url ?? recipe.thumbnailUrl ?? recipe.hero_image ?? recipe.heroImage ?? '',
    excerptHtml:
      recipe.excerptHtml ??
      (recipe.short_description ? String(recipe.short_description) : recipe.shortDescription ? String(recipe.shortDescription) : ''),
    date: recipe.date ?? recipe.published_at ?? recipe.publishedAt ?? recipe.created_at ?? recipe.createdAt ?? null,
    taxonomies:
      recipe.taxonomies ??
      (recipe.category
        ? {
            category: [
              typeof recipe.category === 'string'
                ? { name: recipe.category, slug: recipe.category }
                : { name: recipe.category.name ?? 'Category', slug: recipe.category.slug ?? '' },
            ],
          }
        : { category: [] }),
  };
}

export default function RecipeLibraryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const category = searchParams.get('category') || '';
  const qParam = searchParams.get('q') || '';
  const [query, setQuery] = useState(qParam);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [error, setError] = useState('');
  const [posts, setPosts] = useState([]);
  const debounceRef = useRef(null);
  usePageTitle('Recipe Library · Love & Flour');

  useEffect(() => {
    setQuery(qParam);
  }, [qParam]);

  useEffect(() => {
    let active = true;
    setCategoryLoading(true);
    api.public.recipeCategories
      .list()
      .then((data) => {
        if (!active) return;
        const apiCats = data?.categories ?? data?.recipe_categories ?? data?.recipeCategories ?? [];
        const merged = [...apiCats, ...(terms?.postCategories ?? [])];
        const bySlug = new Map();
        for (const item of merged) {
          const slug = String(item?.slug ?? '');
          if (!slug || slug === 'uncategorized') continue;
          if (!bySlug.has(slug)) bySlug.set(slug, item);
        }
        setCategories(Array.from(bySlug.values()));
      })
      .catch(() => {
        if (!active) return;
        setCategories((terms?.postCategories ?? []).filter((c) => String(c?.slug ?? '') !== 'uncategorized'));
      })
      .finally(() => {
        if (active) setCategoryLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    const run = async () => {
      try {
        const data = await api.public.recipes.list();
        if (!active) return;
        const normalizedApi = (data.recipes ?? []).map(normalizeRecipe).filter(Boolean);
        const normalizedSeed = (seededPosts ?? []).map(normalizeRecipe).filter(Boolean);
        const merged = mergeBySlug(normalizedApi, normalizedSeed);
        setPosts(sortByDateDesc(merged));
      } catch (err) {
        if (!active) return;
        setError(err?.message || 'Unable to load recipes. Showing offline list.');
        const normalizedSeed = (seededPosts ?? []).map(normalizeRecipe).filter(Boolean);
        setPosts(sortByDateDesc(normalizedSeed));
      } finally {
        if (active) setLoading(false);
      }
    };

    run();
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const list = Array.isArray(posts) ? posts : [];
    const q = String(qParam ?? '').trim().toLowerCase();
    return list.filter((p) => {
      if (category && !(p.taxonomies?.category ?? []).some((t) => String(t.slug) === String(category))) return false;
      if (!q) return true;
      const hay = `${p.title ?? ''} ${p.excerptHtml ?? ''} ${p.contentHtml ?? ''}`.replace(/<[^>]*>/g, ' ').toLowerCase();
      return hay.includes(q);
    });
  }, [category, posts, qParam]);

  const categoryName = useMemo(() => {
    if (!category) return null;
    const fromList = filtered.find((p) => (p.taxonomies?.category ?? []).some((t) => String(t.slug) === String(category)))
      ?.taxonomies?.category?.find((t) => String(t.slug) === String(category))?.name;
    const fromCats = (categories ?? []).find((c) => String(c.slug) === String(category))?.name;
    return fromList ?? fromCats ?? category;
  }, [category, filtered, categories]);

  const onChangeCategory = (nextCategory) => {
    const next = new URLSearchParams(searchParams);
    if (nextCategory) next.set('category', nextCategory);
    else next.delete('category');
    setSearchParams(next, { replace: true });
  };

  const onChangeQuery = (value) => {
    setQuery(value);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      const next = new URLSearchParams(searchParams);
      const trimmed = String(value ?? '').trim();
      if (trimmed) next.set('q', trimmed);
      else next.delete('q');
      setSearchParams(next, { replace: true });
    }, 350);
  };

  return (
    <main className="section page-60">
      <div className="container">
        <SectionHeading
          badge="Recipe Library"
          title={categoryName ? `Recipes: ${categoryName}` : 'All Recipes'}
          subtitle={categoryName ? 'Browse recipes in this category.' : 'Browse the full recipe library.'}
        />
        <div className="panel recipe-filters">
          <div className="recipe-filters-grid">
            <label className="field">
              <span className="field-label">Search</span>
              <input className="input" value={query} onChange={(e) => onChangeQuery(e.target.value)} placeholder="Search recipes…" />
            </label>
            <label className="field">
              <span className="field-label">Category</span>
              <SelectMenu
                ariaLabel="Recipe category"
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
          {loading ? <p className="muted recipe-filters-status">Loading recipes…</p> : null}
          {error ? <p className="form-error recipe-filters-status">{error}</p> : null}
          {!loading && !filtered.length ? <p className="muted recipe-filters-status">No recipes found.</p> : null}
        </div>
        <div className="grid cards-grid">
          {filtered.map((post) => (
            <RecipeCard key={post.id} recipe={post} />
          ))}
        </div>
      </div>
    </main>
  );
}
