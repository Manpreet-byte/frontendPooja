import rawCourses from './seed/courses.json';
import posts from './seed/posts.json';
import pages from './seed/pages.json';
import terms from './seed/terms.json';
import homeTestimonials from './seed/home-testimonials.json';

function rewriteLegacyHostToRelative(value) {
  let out = String(value ?? '');
  out = out.replace(/https?:\/\/loveandflourbypooja\.com/gi, '');
  return out;
}

function rewriteObjectLegacyLinks(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(rewriteObjectLegacyLinks);
  const next = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string') next[k] = rewriteLegacyHostToRelative(v);
    else next[k] = rewriteObjectLegacyLinks(v);
  }
  return next;
}

function parseInrPriceFromHtml(contentHtml) {
  const html = String(contentHtml ?? '');
  if (!html) return null;

  const patterns = [
    /Class Fee:\s*₹\s*([\d,]+)/i,
    /Event Fee:\s*₹\s*([\d,]+)/i,
    /Regular Price:\s*₹\s*([\d,]+)/i,
    /Price:\s*₹\s*([\d,]+)/i,
    /Fee:\s*₹\s*([\d,]+)/i,
  ];

  for (const re of patterns) {
    const match = html.match(re);
    const value = match?.[1]?.replace(/,/g, '') ?? '';
    const amount = Number(value);
    if (Number.isFinite(amount) && amount > 0) {
      return amount;
    }
  }

  return null;
}

function stripHtml(contentHtml) {
  return String(contentHtml ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatInr(amount) {
  if (!Number.isFinite(amount) || amount <= 0) return '';
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function parseWorkshopPrices(contentHtml) {
  const text = stripHtml(contentHtml);
  if (!text) return { priceInr: null, compareAtPriceInr: null };

  const earlyBird = text.match(/Early Bird Fee:\s*₹\s*([\d,]+)/i)?.[1];
  const regular = text.match(/Regular Price:\s*₹\s*([\d,]+)/i)?.[1];
  const classFee = text.match(/Class Fee:\s*₹\s*([\d,]+)/i)?.[1];
  const fee = text.match(/Fees?:\s*₹\s*([\d,]+)/i)?.[1] ?? text.match(/Price:\s*₹\s*([\d,]+)/i)?.[1];

  const toAmount = (value) => {
    const amount = Number(String(value ?? '').replace(/,/g, ''));
    return Number.isFinite(amount) && amount > 0 ? amount : null;
  };

  const priceInr = toAmount(earlyBird ?? classFee ?? fee ?? regular);
  const compareAtPriceInr =
    earlyBird && regular && toAmount(regular) && toAmount(regular) > (priceInr ?? 0) ? toAmount(regular) : null;

  return { priceInr, compareAtPriceInr };
}

export const courses = rawCourses.map((course) => {
  course = rewriteObjectLegacyLinks(course);
  const { priceInr, compareAtPriceInr } = parseWorkshopPrices(course.contentHtml);
  return {
    ...course,
    priceInr,
    compareAtPriceInr,
    priceText: formatInr(priceInr),
    compareAtPriceText: formatInr(compareAtPriceInr),
  };
});

export const cleanedPosts = posts.map(rewriteObjectLegacyLinks);
export const cleanedPages = pages.map(rewriteObjectLegacyLinks);
export const cleanedTerms = rewriteObjectLegacyLinks(terms);

export { cleanedTerms as terms, homeTestimonials };
export { cleanedPosts as posts, cleanedPages as pages };

export function findCourseBySlug(slug) {
  return courses.find((c) => c.slug === slug);
}

export function findPostBySlug(slug) {
  return posts.find((p) => p.slug === slug);
}

export function findPageBySlug(slug) {
  return pages.find((p) => p.slug === slug);
}
