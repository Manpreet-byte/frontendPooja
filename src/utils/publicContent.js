export function mergeBySlug(primaryItems = [], fallbackItems = []) {
  const merged = new Map();

  for (const item of fallbackItems) {
    const key = item?.slug ?? item?.id;
    if (key !== undefined && key !== null) {
      merged.set(key, item);
    }
  }

  for (const item of primaryItems) {
    const key = item?.slug ?? item?.id;
    if (key !== undefined && key !== null) {
      merged.set(key, item);
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