function inferSlug(item) {
  return (
    item?.slug ??
    item?.course_slug ??
    item?.courseSlug ??
    item?.post_name ??
    item?.postName ??
    item?.session_slug ??
    item?.sessionSlug ??
    null
  );
}

function normalizeSlug(item) {
  const slug = inferSlug(item);
  if (!slug || item?.slug) return item;
  return { ...item, slug };
}

function isEmptyValue(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

function mergePreferPrimary(primary, fallback) {
  const base = fallback && typeof fallback === 'object' ? fallback : {};
  const over = primary && typeof primary === 'object' ? primary : {};
  const merged = { ...base, ...over };

  // Fill "empty" primary values from fallback for key fields.
  for (const [key, primaryValue] of Object.entries(over)) {
    if (!isEmptyValue(primaryValue)) continue;
    if (base[key] !== undefined) merged[key] = base[key];
  }

  // Taxonomies are nested objects; preserve fallback taxonomy arrays when primary arrays are empty.
  if (base.taxonomies && over.taxonomies && typeof base.taxonomies === 'object' && typeof over.taxonomies === 'object') {
    const nextTaxonomies = { ...base.taxonomies, ...over.taxonomies };
    for (const [taxKey, overValue] of Object.entries(over.taxonomies)) {
      if (!isEmptyValue(overValue)) continue;
      if (base.taxonomies[taxKey] !== undefined) nextTaxonomies[taxKey] = base.taxonomies[taxKey];
    }
    merged.taxonomies = nextTaxonomies;
  }

  // Normalize common content fields even if primary never had them.
  if (isEmptyValue(merged.contentHtml) && !isEmptyValue(base.contentHtml)) merged.contentHtml = base.contentHtml;
  if (isEmptyValue(merged.excerptHtml) && !isEmptyValue(base.excerptHtml)) merged.excerptHtml = base.excerptHtml;
  if (isEmptyValue(merged.featuredImage) && !isEmptyValue(base.featuredImage)) merged.featuredImage = base.featuredImage;
  if (isEmptyValue(merged.title) && !isEmptyValue(base.title)) merged.title = base.title;
  if (isEmptyValue(merged.slug) && !isEmptyValue(base.slug)) merged.slug = base.slug;

  return merged;
}

export function mergeBySlug(primaryItems = [], fallbackItems = []) {
  const merged = new Map();

  for (const item of fallbackItems) {
    const normalized = normalizeSlug(item);
    const key = normalized?.slug ?? normalized?.id;
    if (key !== undefined && key !== null) {
      merged.set(key, normalized);
    }
  }

  for (const item of primaryItems) {
    const normalized = normalizeSlug(item);
    const key = normalized?.slug ?? normalized?.id;
    if (key !== undefined && key !== null) {
      const existing = merged.get(key);
      merged.set(key, existing ? mergePreferPrimary(normalized, existing) : normalized);
    }
  }

  return Array.from(merged.values());
}

export function sortByDateDesc(items = []) {
  return items
    .slice()
    .sort((left, right) => new Date(right?.date ?? 0).getTime() - new Date(left?.date ?? 0).getTime());
}

export function findBySlug(items = [], slug) {
  return items.find((item) => item?.slug === slug);
}
