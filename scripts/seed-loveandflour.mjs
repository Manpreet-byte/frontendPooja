import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const SITE = 'https://loveandflourbypooja.com';

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: {
      accept: 'application/json',
      'user-agent': 'LoveAndFlourSeeder/1.0 (+local dev)',
    },
  });
  if (!res.ok) throw new Error(`Request failed ${res.status} for ${url}`);
  return res.json();
}

async function fetchAllPaged(endpoint, { perPage = 100, maxPages = 50 } = {}) {
  const items = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const url = `${SITE}${endpoint}${endpoint.includes('?') ? '&' : '?'}per_page=${perPage}&page=${page}&_embed=1`;
    // eslint-disable-next-line no-console
    console.log('GET', url);
    const pageItems = await fetchJson(url);
    if (!Array.isArray(pageItems) || pageItems.length === 0) break;
    items.push(...pageItems);
    if (pageItems.length < perPage) break;
  }
  return items;
}

function compactHtml(html) {
  if (!html) return '';
  return String(html).replace(/\s+\n/g, '\n').trim();
}

function normalizeUrl(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    u.hash = '';
    return u.toString();
  } catch {
    return null;
  }
}

function sha1(text) {
  return crypto.createHash('sha1').update(text).digest('hex');
}

function fileExtFromUrl(url) {
  try {
    const u = new URL(url);
    const pathname = u.pathname || '';
    const m = pathname.match(/\.([a-zA-Z0-9]+)$/);
    if (m) return `.${m[1].toLowerCase()}`;
  } catch {
    // ignore
  }
  return '.jpg';
}

function collectImageUrlsFromHtml(html) {
  if (!html) return [];
  const urls = new Set();
  const srcRegex = /\s(?:src|data-src)=["']([^"']+)["']/gi;
  const srcsetRegex = /\ssrcset=["']([^"']+)["']/gi;

  let m;
  while ((m = srcRegex.exec(html))) {
    const u = normalizeUrl(m[1]);
    if (u) urls.add(u);
  }
  while ((m = srcsetRegex.exec(html))) {
    const parts = String(m[1])
      .split(',')
      .map((p) => p.trim().split(/\s+/)[0])
      .filter(Boolean);
    for (const p of parts) {
      const u = normalizeUrl(p);
      if (u) urls.add(u);
    }
  }
  return [...urls];
}

async function downloadBinary(url) {
  const res = await fetch(url, { headers: { 'user-agent': 'LoveAndFlourSeeder/1.0 (+local dev)' } });
  if (!res.ok) throw new Error(`Media download failed ${res.status} for ${url}`);
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

function pickFeaturedImage(node) {
  const embedded = node?._embedded;
  const featured = embedded?.['wp:featuredmedia']?.[0];
  const src =
    featured?.media_details?.sizes?.large?.source_url ??
    featured?.media_details?.sizes?.medium_large?.source_url ??
    featured?.source_url ??
    null;
  return src;
}

function groupEmbeddedTerms(node) {
  const groups = node?._embedded?.['wp:term'] ?? [];
  const allTerms = groups.flat().filter(Boolean);
  const byTaxonomy = {};
  for (const term of allTerms) {
    const taxonomy = term.taxonomy ?? 'unknown';
    byTaxonomy[taxonomy] ??= [];
    byTaxonomy[taxonomy].push({
      id: term.id,
      name: decodeHtmlEntities(term.name),
      slug: term.slug,
      link: term.link,
      taxonomy,
    });
  }
  return byTaxonomy;
}

function decodeHtmlEntities(text) {
  return String(text ?? '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function normalizeCourses(rawCourses) {
  return rawCourses.map((course) => ({
    id: course.id,
    slug: course.slug,
    title: decodeHtmlEntities(course.title?.rendered),
    link: course.link,
    date: course.date,
    modified: course.modified,
    excerptHtml: compactHtml(course.excerpt?.rendered),
    contentHtml: compactHtml(course.content?.rendered),
    featuredImage: pickFeaturedImage(course),
    taxonomies: groupEmbeddedTerms(course),
  }));
}

function normalizePosts(rawPosts) {
  return rawPosts.map((post) => ({
    id: post.id,
    slug: post.slug,
    title: decodeHtmlEntities(post.title?.rendered),
    link: post.link,
    date: post.date,
    modified: post.modified,
    excerptHtml: compactHtml(post.excerpt?.rendered),
    contentHtml: compactHtml(post.content?.rendered),
    featuredImage: pickFeaturedImage(post),
    taxonomies: groupEmbeddedTerms(post),
  }));
}

function normalizePages(rawPages) {
  return rawPages.map((page) => ({
    id: page.id,
    slug: page.slug,
    title: decodeHtmlEntities(page.title?.rendered),
    link: page.link,
    date: page.date,
    modified: page.modified,
    excerptHtml: compactHtml(page.excerpt?.rendered),
    contentHtml: compactHtml(page.content?.rendered),
    featuredImage: pickFeaturedImage(page),
    taxonomies: groupEmbeddedTerms(page),
  }));
}

function uniqueTerms(items, taxonomy) {
  const map = new Map();
  for (const item of items) {
    const terms = item?.taxonomies?.[taxonomy] ?? [];
    for (const term of terms) map.set(term.slug, term);
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function normalizeTerm(term) {
  return {
    id: term.id,
    name: decodeHtmlEntities(term.name),
    slug: term.slug,
    link: term.link,
    taxonomy: term.taxonomy ?? term?.type ?? 'term',
    count: term.count ?? 0,
  };
}

async function main() {
  const outDir = path.join(process.cwd(), 'src', 'data', 'seed');
  const publicMediaDir = path.join(process.cwd(), 'public', 'seed-media');
  await fs.mkdir(outDir, { recursive: true });
  await fs.mkdir(publicMediaDir, { recursive: true });

  const rawCourses = await fetchAllPaged('/wp-json/wp/v2/courses', { perPage: 100, maxPages: 20 });
  const courses = normalizeCourses(rawCourses);

  const rawPosts = await fetchAllPaged('/wp-json/wp/v2/posts', { perPage: 100, maxPages: 20 });
  const posts = normalizePosts(rawPosts);
  
  const rawPages = await fetchAllPaged('/wp-json/wp/v2/pages', { perPage: 100, maxPages: 20 });
  const pages = normalizePages(rawPages);

  const rawCourseCategories = await fetchAllPaged('/wp-json/wp/v2/course-category', { perPage: 100, maxPages: 10 });
  const rawPostCategories = await fetchAllPaged('/wp-json/wp/v2/categories', { perPage: 100, maxPages: 10 });

  const terms = {
    courseCategories: rawCourseCategories.map(normalizeTerm).sort((a, b) => a.name.localeCompare(b.name)),
    postCategories: rawPostCategories.map(normalizeTerm).sort((a, b) => a.name.localeCompare(b.name)),
    // Derived (only categories currently used in our seeded snapshot)
    courseCategoriesUsed: uniqueTerms(courses, 'course-category'),
    postCategoriesUsed: uniqueTerms(posts, 'category'),
  };

  const allItems = [
    ...courses.map((x) => ({ kind: 'course', ...x })),
    ...posts.map((x) => ({ kind: 'post', ...x })),
    ...pages.map((x) => ({ kind: 'page', ...x })),
  ];

  const mediaUrls = new Set();
  for (const item of allItems) {
    const featured = normalizeUrl(item.featuredImage);
    if (featured) mediaUrls.add(featured);
    for (const u of collectImageUrlsFromHtml(item.contentHtml)) mediaUrls.add(u);
    for (const u of collectImageUrlsFromHtml(item.excerptHtml)) mediaUrls.add(u);
  }

  const mediaMap = {};
  for (const url of mediaUrls) {
    if (!url.includes('/wp-content/uploads/')) continue;
    const ext = fileExtFromUrl(url);
    const filename = `${sha1(url)}${ext}`;
    const rel = `/seed-media/${filename}`;
    const dest = path.join(publicMediaDir, filename);
    mediaMap[url] = rel;
    try {
      await fs.access(dest);
    } catch {
      // eslint-disable-next-line no-console
      console.log('DOWNLOAD', url, '->', rel);
      const buf = await downloadBinary(url);
      await fs.writeFile(dest, buf);
    }
  }

  function relinkHtml(html) {
    if (!html) return '';
    let out = html;
    for (const [from, to] of Object.entries(mediaMap)) {
      out = out.split(from).join(to);
    }
    return out;
  }

  function relinkItem(item) {
    const featured = normalizeUrl(item.featuredImage);
    return {
      ...item,
      featuredImage: featured && mediaMap[featured] ? mediaMap[featured] : item.featuredImage,
      excerptHtml: relinkHtml(item.excerptHtml),
      contentHtml: relinkHtml(item.contentHtml),
    };
  }

  const coursesOut = courses.map(relinkItem);
  const postsOut = posts.map(relinkItem);
  const pagesOut = pages.map(relinkItem);

  await fs.writeFile(path.join(outDir, 'courses.json'), JSON.stringify(coursesOut, null, 2));
  await fs.writeFile(path.join(outDir, 'posts.json'), JSON.stringify(postsOut, null, 2));
  await fs.writeFile(path.join(outDir, 'pages.json'), JSON.stringify(pagesOut, null, 2));
  await fs.writeFile(path.join(outDir, 'terms.json'), JSON.stringify(terms, null, 2));
  await fs.writeFile(path.join(outDir, 'media-map.json'), JSON.stringify(mediaMap, null, 2));

  // eslint-disable-next-line no-console
  console.log(
    `Wrote ${coursesOut.length} courses, ${postsOut.length} posts, ${pagesOut.length} pages, ${Object.keys(mediaMap).length} media files, ${terms.courseCategories.length} course categories, ${terms.postCategories.length} post categories to ${outDir}`,
  );
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});
