import SafeImage from '../components/SafeImage';
import usePageTitle from '../utils/usePageTitle';

export default function Elementor7819Page() {
  usePageTitle("From Passion to Purpose: Pooja's Journey · Love & Flour");

  return (
    <main className="section page-white page-60 page-story page-legal page-typography">
      <div className="container">
        <div className="two-column-layout" style={{ display: 'grid', gap: 'clamp(20px, 4vw, 36px)', alignItems: 'start', gridTemplateColumns: 'minmax(0, 1.15fr) minmax(280px, 0.85fr)' }}>
          <article
            className="panel prose-block"
            style={{
              padding: 'clamp(20px, 3vw, 36px)',
              background: 'linear-gradient(180deg, rgba(255,255,255,0.97) 0%, rgba(252,245,238,0.98) 100%)',
              border: '1px solid rgba(136, 86, 59, 0.12)',
              boxShadow: '0 24px 60px rgba(43, 39, 48, 0.08)',
            }}
          >
            <p className="badge" style={{ marginBottom: 14 }}>My Story</p>
            <h1 className="h1" style={{ marginBottom: 18 }}>From Passion to Purpose: Pooja&apos;s Journey</h1>

            <p className="lead" style={{ color: 'var(--muted)', marginBottom: 18 }}>
              Hi, I&apos;m Pooja Ganeriwala, baker, mentor, and founder of Love &amp; Flour by Pooja.
            </p>

            <p>
              If you had told me years ago that one day I&apos;d be teaching thousands of bakers across the
              country, I would have probably laughed.
            </p>

            <p>
              What began as a simple love for desserts slowly turned into something much bigger, a space where
              passion, learning, and community came together.
            </p>

            <p>
              My journey with baking started at home, in the quiet comfort of my kitchen. I wasn&apos;t professionally
              trained, just endlessly curious. I spent years experimenting, failing, trying again, and learning from
              bakers I admired around the world. Each success and even the failures taught me something new, not just
              about baking, but about patience, creativity, and the joy of sharing something made with love.
            </p>

            <p>
              Over time, that love evolved into a purpose, to make professional-quality, egg-free baking accessible
              to everyone. Today, Love &amp; Flour by Pooja has grown into one of India&apos;s most loved online baking
              education platforms, where thousands of students have learned to turn their passion into confidence and
              for many, even into thriving businesses.
            </p>

            <blockquote
              style={{
                margin: 'clamp(18px, 3vw, 28px) 0',
                padding: '18px 20px',
                borderLeft: '4px solid var(--accent)',
                background: 'rgba(140, 87, 60, 0.06)',
                borderRadius: 12,
                color: 'var(--text)',
                fontSize: '1.05rem',
                lineHeight: 1.8,
              }}
            >
              Teaching, for me, is more than just sharing recipes. It&apos;s about creating a safe, encouraging space
              where people, especially women, can believe in themselves, explore their creativity, and find
              independence through their craft.
            </blockquote>

            <p>
              Watching my students grow, experiment, and find their voice in the kitchen has been the most
              fulfilling part of this journey.
            </p>

            <p>
              Whether you&apos;re here to learn your first cake or to build your own baking brand, I&apos;m so glad you
              found your way here. Because at Love &amp; Flour, it&apos;s not just about baking. It&apos;s about creating with
              heart, learning with joy, and discovering what&apos;s possible when you mix a little courage with a lot of
              flour.
            </p>

            <p style={{ marginTop: 28, letterSpacing: '0.18em', fontWeight: 700 }}>POOJA GANERIWALA</p>
          </article>

          <aside
            style={{
              position: 'sticky',
              top: 'calc(var(--header-height) + 20px)',
              alignSelf: 'start',
            }}
          >
            <div
              className="panel"
              style={{
                padding: 14,
                background: 'linear-gradient(180deg, rgba(43,39,48,0.98) 0%, rgba(76,47,33,0.98) 100%)',
                boxShadow: '0 24px 60px rgba(43, 39, 48, 0.18)',
              }}
            >
              <div style={{ borderRadius: 20, overflow: 'hidden', background: '#f4e8de' }}>
                <SafeImage
                  src="https://loveandflourbypooja.com/wp-content/uploads/2025/08/IMG_0346-scaled.jpg"
                  alt="Pooja Ganeriwala"
                  loading="eager"
                  style={{ width: '100%', height: 'auto', display: 'block' }}
                />
              </div>
              <div style={{ padding: '16px 14px 6px', color: '#f8efe7' }}>
                <p style={{ margin: 0, fontSize: '0.92rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.9)' }}>
                  Founder, Mentor, Baker
                </p>
                <p style={{ margin: '8px 0 0', lineHeight: 1.7, color: 'rgba(248,239,231,0.9)' }}>
                  Building a warm, practical space where bakers can learn, grow, and turn creativity into a real
                  craft.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
