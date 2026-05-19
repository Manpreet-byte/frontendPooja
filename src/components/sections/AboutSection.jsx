import SectionHeading from '../SectionHeading';
import mediaMap from '../../data/seed/media-map.json';
import SafeImage from '../SafeImage';

const DEFAULT_ABOUT_IMAGE =
  mediaMap['https://loveandflourbypooja.com/wp-content/uploads/2025/10/Home-Banner-Image.webp'] ??
  '/seed-media/accbad363cc9f4ff9ccbc04833046ebde7acb79d.webp';

export default function AboutSection({ featuredImage } = {}) {
  return (
    <section id="about" className="section section-about">
      <div className="container about-grid">
        <div>
          <SectionHeading
            align="left"
            badge="About Me"
            title="Meet Pooja"
            subtitle="Welcome to Love & Flour, where every recipe is crafted with passion and perfection."
          />
          <div className="prose">
            <p>
              What started as a hobby in my small kitchen has blossomed into a community of thousands of baking
              enthusiasts.
            </p>
            <p>
              From classic cookies to elaborate celebration cakes, each recipe is tested and perfected to ensure you get
              the best results every time.
            </p>
            <p>
              My philosophy is simple: baking should be joyful, not stressful. Whether you're a beginner or an
              experienced baker, you'll find clear instructions, helpful tips, and plenty of encouragement here.
            </p>
          </div>
        </div>

        <div className="about-media">
          <SafeImage src={featuredImage || DEFAULT_ABOUT_IMAGE} alt="Baking workspace" loading="lazy" />
          <div className="about-float">
            <p className="about-float-number">10K+</p>
            <p className="about-float-label">Happy Bakers</p>
          </div>
        </div>
      </div>

      <div className="container about-stats">
        <div className="stat-card">
          <div className="stat-icon">★</div>
          <h3 className="h3">162+ Recipes</h3>
          <p className="muted">Tested and perfected recipes for every occasion.</p>
        </div>
        <div className="stat-card">
          <div className="stat-icon">☻</div>
          <h3 className="h3">50K+ Community</h3>
          <p className="muted">Baking enthusiasts sharing their creations.</p>
        </div>
        <div className="stat-card">
          <div className="stat-icon">❤</div>
          <h3 className="h3">100% Love</h3>
          <p className="muted">Every recipe made with care and attention.</p>
        </div>
      </div>
    </section>
  );
}
