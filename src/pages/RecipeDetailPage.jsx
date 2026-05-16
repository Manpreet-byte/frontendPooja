import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import SectionHeading from '../components/SectionHeading';
import { findPostBySlug } from '../data/seededContent';
import { api } from '../api/client';
import RecipeCard from '../components/RecipeCard';
import SafeImage from '../components/SafeImage';
import { sanitizeHtmlForApp } from '../utils/htmlSanitize';

function normalizeRecipeDetail(recipe) {
  if (!recipe) return null;
  const contentHtml =
    recipe.contentHtml ??
    recipe.content ??
    recipe.instructions_html ??
    recipe.instructionsHtml ??
    '';

  return {
    ...recipe,
    contentHtml: sanitizeHtmlForApp(String(contentHtml ?? '')),
    excerptHtml:
      recipe.excerptHtml ??
      (recipe.short_description ? String(recipe.short_description) : recipe.shortDescription ? String(recipe.shortDescription) : ''),
    featuredImage:
      recipe.featuredImage ??
      recipe.hero_image ??
      recipe.heroImage ??
      recipe.thumbnail_url ??
      recipe.thumbnailUrl ??
      recipe.featured_image_url ??
      recipe.featuredImageUrl ??
      '',
    date: recipe.date ?? recipe.published_at ?? recipe.publishedAt ?? recipe.created_at ?? recipe.createdAt ?? null,
  };
}

function normalizeText(text) {
  return text.replace(/\s+/g, ' ').trim().toLowerCase();
}

function splitLinesFromHtml(node) {
  return (node.innerHTML ?? '')
    .replace(/<br\s*\/?/gi, '\n')
    .split(/\n+/)
    .map((line) => line.replace(/<[^>]+>/g, '').replace(/&nbsp;/gi, ' ').trim())
    .filter(Boolean);
}

function extractListItems(node) {
  if (!node) {
    return [];
  }

  if (node.tagName.toLowerCase() === 'ul' || node.tagName.toLowerCase() === 'ol') {
    return Array.from(node.querySelectorAll('li'))
      .map((item) => item.textContent?.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
  }

  return splitLinesFromHtml(node);
}

function splitRecipeContent(contentHtml) {
  if (!contentHtml || typeof DOMParser === 'undefined') {
    return {
      introBlocks: [],
      aboutBlocks: [],
      ingredients: [],
      instructions: [],
      notesBlocks: [],
      extraBlocks: [],
    };
  }

  const parser = new DOMParser();
  const document = parser.parseFromString(`<div id="recipe-content">${contentHtml}</div>`, 'text/html');
  const root = document.getElementById('recipe-content');

  if (!root) {
    return {
      introBlocks: [],
      aboutBlocks: [],
      ingredients: [],
      instructions: [],
      notesBlocks: [],
      extraBlocks: [],
    };
  }

  const sections = {
    introBlocks: [],
    aboutBlocks: [],
    ingredients: [],
    instructions: [],
    notesBlocks: [],
    extraBlocks: [],
  };

  let currentSection = 'intro';
  let introText = '';

  for (const node of Array.from(root.children)) {
    const tagName = node.tagName.toLowerCase();
    const text = normalizeText(node.textContent ?? '');
    const isHeading = /^h[1-6]$/.test(tagName);

    if (isHeading && text.startsWith('recipe')) {
      continue;
    }

    if (text === 'about the recipe') {
      currentSection = 'about';
      continue;
    }

    if (text === 'ingredients') {
      currentSection = 'ingredients';
      continue;
    }

    if (text === 'instructions' || text === 'method') {
      currentSection = 'instructions';
      continue;
    }

    if (text === 'notes') {
      currentSection = 'notes';
      continue;
    }

    if (currentSection === 'intro') {
      sections.introBlocks.push(node.outerHTML);
      if (!introText) {
        introText = node.textContent?.trim() ?? '';
      }
      continue;
    }

    if (currentSection === 'about') {
      sections.aboutBlocks.push(node.outerHTML);
      continue;
    }

    if (currentSection === 'ingredients') {
      sections.ingredients.push(...extractListItems(node));
      continue;
    }

    if (currentSection === 'instructions') {
      sections.instructions.push(...extractListItems(node));
      continue;
    }

    if (currentSection === 'notes') {
      sections.notesBlocks.push(node.outerHTML);
      continue;
    }

    sections.extraBlocks.push(node.outerHTML);
  }

  return {
    introBlocks: sections.introBlocks,
    introText,
    aboutBlocks: sections.aboutBlocks,
    ingredients: sections.ingredients,
    instructions: sections.instructions,
    notesBlocks: sections.notesBlocks,
    extraBlocks: sections.extraBlocks,
  };
}

export default function RecipeDetailPage() {
  const { slug } = useParams();
  const [post, setPost] = useState(() => findPostBySlug(slug));
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.body.classList.add('recipe-detail-theme');
    return () => {
      document.body.classList.remove('recipe-detail-theme');
    };
  }, []);

  useEffect(() => {
    let active = true;
    const seeded = findPostBySlug(slug);
    setPost(seeded);
    setRelated([]);
    setLoading(true);
    api.public.recipes
      .detail(slug)
      .then((data) => {
        if (!active) return;
        const recipe = normalizeRecipeDetail(data.recipe ?? data?.data?.recipe ?? data);
        setPost(recipe ?? seeded);
        setRelated(data?.related_recipes ?? data?.relatedRecipes ?? recipe?.related_recipes ?? []);
      })
      .catch(() => {
        if (active) setPost(seeded);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [slug]);

  useEffect(() => {
    if (!post?.title) return;
    document.title = `${post.title} · Recipe`;
    const description = (post.excerptHtml || '').replace(/<[^>]+>/g, '').trim();
    if (!description) return;
    const meta = document.querySelector('meta[name="description"]');
    if (!meta) return;
    meta.setAttribute('content', description.slice(0, 160));
  }, [post?.title, post?.excerptHtml]);

  const recipeSections = useMemo(() => splitRecipeContent(post?.contentHtml ?? ''), [post?.contentHtml]);
  const relatedRecipes = useMemo(() => {
    const list = Array.isArray(related) ? related : [];
    return list
      .map((r) =>
        r
          ? {
              ...r,
              slug: r.slug,
              title: r.title,
              featuredImage: r.featuredImage ?? r.thumbnail_url ?? r.thumbnailUrl ?? r.hero_image ?? r.heroImage ?? '',
              excerptHtml:
                r.excerptHtml ??
                (r.short_description ? String(r.short_description) : r.shortDescription ? String(r.shortDescription) : ''),
              date: r.date ?? r.published_at ?? r.publishedAt ?? r.created_at ?? r.createdAt ?? null,
              taxonomies:
                r.taxonomies ??
                (r.category
                  ? {
                      category: [
                        typeof r.category === 'string'
                          ? { name: r.category, slug: r.category }
                          : { name: r.category.name ?? 'Category', slug: r.category.slug ?? '' },
                      ],
                    }
                  : { category: [] }),
            }
          : null,
      )
      .filter(Boolean);
  }, [related]);

  if (!post) {
    return (
      <main className="section">
        <div className="container">
          <SectionHeading badge="Not Found" title="Recipe not found" subtitle="Try going back to the library." />
          <Link className="button" to="/recipe-library">
            Back to recipe library
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="section recipe-detail-page">
      <article className="recipe-detail-card recipe-detail-card-split recipe-detail-full-width">
        <div className="recipe-detail-split">
          <div className="recipe-detail-split-media">
            {post.featuredImage ? (
              <div className="recipe-detail-image recipe-detail-image-split">
                <SafeImage src={post.featuredImage} alt={post.title} loading="eager" />
              </div>
            ) : null}
          </div>

          <div className="recipe-detail-split-content">
            <div className="recipe-detail-toolbar">
              <Link className="recipe-detail-backlink" to="/recipe-library">
                ← Recipe library
              </Link>
            </div>

              <h1 className="hero-title recipe-detail-title">{post.title}</h1>
              {recipeSections.introText ? <p className="recipe-detail-subtitle">{recipeSections.introText}</p> : null}
              {loading ? <p className="muted">Loading recipe…</p> : null}

              <div className="recipe-detail-stats">
                <div className="stat">
                  <p className="stat-label">Ingredients</p>
                  <p className="stat-value">{recipeSections.ingredients.length || '—'}</p>
                </div>
                <div className="stat">
                  <p className="stat-label">Steps</p>
                  <p className="stat-value">{recipeSections.instructions.length || '—'}</p>
                </div>
                <div className="stat">
                  <p className="stat-label">Notes</p>
                  <p className="stat-value">{recipeSections.notesBlocks.length || '—'}</p>
                </div>
              </div>

              <div className="recipe-detail-body">
                <div className="recipe-detail-grid-simple">
                  <section className="recipe-block recipe-detail-description">
                    <h3 className="recipe-block-title">Description</h3>
                    <div className="prose-block recipe-prose">
                      {(recipeSections.aboutBlocks.length ? recipeSections.aboutBlocks : recipeSections.introBlocks).map((block, index) => (
                        <div key={`${post.id}-desc-${index}`} dangerouslySetInnerHTML={{ __html: block }} />
                      ))}
                      {!recipeSections.aboutBlocks.length && !recipeSections.introBlocks.length && post.excerptHtml ? (
                        <p dangerouslySetInnerHTML={{ __html: post.excerptHtml }} />
                      ) : null}
                    </div>
                  </section>

                  <section className="recipe-block recipe-detail-ingredients">
                    <h3 className="recipe-block-title">Ingredients</h3>
                    {recipeSections.ingredients.length ? (
                      <ul className="recipe-simple-list">
                        {recipeSections.ingredients.map((ingredient, index) => (
                          <li key={`${post.id}-ingredient-${index}`}>{ingredient}</li>
                        ))}
                      </ul>
                    ) : (
                      <div className="prose-block recipe-prose">
                        <p>Ingredients are not listed in this recipe yet.</p>
                      </div>
                    )}
                  </section>

                  <section className="recipe-block recipe-detail-instructions">
                    <h3 className="recipe-block-title">Step-by-step Instructions</h3>
                    {recipeSections.instructions.length ? (
                      <ol className="recipe-simple-list recipe-simple-steps">
                        {recipeSections.instructions.map((step, index) => (
                          <li key={`${post.id}-step-${index}`}>{step}</li>
                        ))}
                      </ol>
                    ) : (
                      <div className="prose-block recipe-prose">
                        <p>Instructions are not listed in this recipe yet.</p>
                      </div>
                    )}
                  </section>

                  {recipeSections.notesBlocks.length ? (
                    <section className="recipe-block recipe-detail-notes">
                      <h3 className="recipe-block-title">Notes</h3>
                      <div className="prose-block recipe-prose">
                        {recipeSections.notesBlocks.map((block, index) => (
                          <div key={`${post.id}-note-${index}`} dangerouslySetInnerHTML={{ __html: block }} />
                        ))}
                      </div>
                    </section>
                  ) : null}

                  {relatedRecipes.length ? (
                    <section className="recipe-block" style={{ marginTop: 10 }}>
                      <h3 className="recipe-block-title">Related recipes</h3>
                      <div className="grid cards-grid" style={{ marginTop: 12 }}>
                        {relatedRecipes.slice(0, 6).map((r) => (
                          <RecipeCard key={r.id ?? r.slug} recipe={r} to={`/recipes/${encodeURIComponent(r.slug ?? '')}`} />
                        ))}
                      </div>
                    </section>
                  ) : null}
                </div>
              </div>
            </div>
        </div>
      </article>
    </main>
  );
}
