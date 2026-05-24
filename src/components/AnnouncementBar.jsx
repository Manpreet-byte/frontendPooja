import { useEffect, useState } from 'react';
import { api } from '../api/client';

export default function AnnouncementBar() {
  const [announcement, setAnnouncement] = useState(null);

  useEffect(() => {
    let active = true;
    api.public.announcements
      .list()
      .then((data) => {
        if (!active) return;
        setAnnouncement((data?.announcements ?? [])[0] ?? null);
      })
      .catch(() => {
        if (active) setAnnouncement(null);
      });

    return () => {
      active = false;
    };
  }, []);

  if (!announcement?.message) return null;

  const ctaUrl = String(announcement.cta_url ?? '').trim();
  const isExternal = /^https?:\/\//i.test(ctaUrl);

  return (
    <div
      className="banner panel announcement-bar"
      role="status"
      aria-live="polite"
      style={{ margin: '0 auto', borderRadius: 0, borderLeft: 0, borderRight: 0, boxShadow: 'none' }}
    >
      <div className="container" style={{ display: 'flex', gap: 16, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <p style={{ margin: 0 }}>
          <strong>Announcement:</strong> {announcement.message}
        </p>
        {announcement.cta_label && ctaUrl ? (
          isExternal ? (
            <a className="button button-solid" href={ctaUrl} target="_blank" rel="noreferrer noopener">
              {announcement.cta_label}
            </a>
          ) : (
            <a className="button button-solid" href={ctaUrl}>
              {announcement.cta_label}
            </a>
          )
        ) : null}
      </div>
    </div>
  );
}