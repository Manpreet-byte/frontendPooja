function decodeHtmlEntities(value) {
  const text = String(value ?? '');

  if (!text) return '';

  if (typeof document !== 'undefined') {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
  }

  return text
    .replace(/&#x([0-9a-fA-F]+);?/g, (_, hex) => {
      const codePoint = Number.parseInt(hex, 16);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : '';
    })
    .replace(/&#([0-9]+);?/g, (_, dec) => {
      const codePoint = Number.parseInt(dec, 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : '';
    })
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export function cleanDisplayName(value) {
  return decodeHtmlEntities(value)
    .replace(/[_/\\|•·–—−-]+/g, '')
    .replace(/[’'`“”"!?.,:;()[\]{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
