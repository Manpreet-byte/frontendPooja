import { useEffect } from 'react';

export default function usePageTitle(title) {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const next = String(title ?? '').trim();
    if (next) document.title = next;
  }, [title]);
}

