import { useEffect } from 'react';
import { api } from '../api/client';

function setMeta(name, content) {
  if (typeof document === 'undefined') return null;
  const head = document.head || document.getElementsByTagName('head')[0];
  if (!head) return null;

  const selector = `meta[name="${name}"]`;
  let tag = head.querySelector(selector);
  if (!content) {
    if (tag) tag.remove();
    return null;
  }

  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute('name', name);
    head.appendChild(tag);
  }
  tag.setAttribute('content', content);
  return tag;
}

function setPropertyMeta(property, content) {
  if (typeof document === 'undefined') return null;
  const head = document.head || document.getElementsByTagName('head')[0];
  if (!head) return null;

  const selector = `meta[property="${property}"]`;
  let tag = head.querySelector(selector);
  if (!content) {
    if (tag) tag.remove();
    return null;
  }

  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute('property', property);
    head.appendChild(tag);
  }
  tag.setAttribute('content', content);
  return tag;
}

function setCanonical(href) {
  if (typeof document === 'undefined') return null;
  const head = document.head || document.getElementsByTagName('head')[0];
  if (!head) return null;

  let tag = head.querySelector('link[rel="canonical"]');
  if (!href) {
    if (tag) tag.remove();
    return null;
  }

  if (!tag) {
    tag = document.createElement('link');
    tag.setAttribute('rel', 'canonical');
    head.appendChild(tag);
  }
  tag.setAttribute('href', href);
  return tag;
}

export default function usePageSeo(pageKey, fallbackTitle = '') {
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const key = String(pageKey ?? '').trim();
    if (!key) return undefined;

    let active = true;
    api.public.seo
      .get(key)
      .then((data) => {
        if (!active) return;
        const seo = data?.seo ?? null;
        if (seo?.meta_title) document.title = String(seo.meta_title);
        const description = String(seo?.meta_description ?? '').trim();
        const image = String(seo?.og_image_url ?? '').trim();
        const canonical = String(seo?.canonical_url ?? '').trim();

        setMeta('description', description);
        setPropertyMeta('og:title', seo?.meta_title ? String(seo.meta_title) : String(fallbackTitle ?? '').trim());
        setPropertyMeta('og:description', description);
        setPropertyMeta('og:image', image);
        setCanonical(canonical);
      })
      .catch(() => {
        if (!active) return;
        setMeta('description', '');
        setPropertyMeta('og:title', String(fallbackTitle ?? '').trim());
      });

    return () => {
      active = false;
    };
  }, [pageKey, fallbackTitle]);
}