import { Link } from 'react-router-dom';
import SectionHeading from '../../SectionHeading';
import SafeImage from '../../SafeImage';

const highlights = [
  { title: '1-Year Access', desc: 'Revisit videos and notes anytime.' },
  { title: 'Detailed Notes & Recipes', desc: 'Foolproof, step-by-step guides.' },
  { title: 'Certificate of Completion', desc: 'Showcase your skills.' },
  { title: 'Pricing, Shelf-life & Storage', desc: 'Guidance for profitable, long-lasting bakes.' },
  { title: 'Ingredient Brand List', desc: 'Trusted recommendations.' },
  { title: 'Q&A + Community Access', desc: 'Learn and connect with bakers.' },
  { title: 'Extended DM Support', desc: 'Get help even after class.' },
];

const collage = [
  { src: '/seed-media/68081c6d2cbb2c52d8aaede83bb062509f3805f1.jpg', alt: 'Workshop bake' },
  { src: '/seed-media/c45d2e39558b334c377915887b680459358af704.jpg', alt: 'Dessert slice' },
  { src: '/seed-media/5365ca71689a3503e2ffccbc7e0dbb26c8c51d1e.jpg', alt: 'Premium bake' },
  { src: '/seed-media/b54b4bc2ef585fd092a5e99df75feca9522e01b8.jpg', alt: 'Bakery-style plating' },
];

export default function CourseValueSection() {
  return (
    <section className="section home-course-value">
      <div className="container">
        <div className="course-value-grid">
          <div className="course-value-collage" aria-label="Workshop highlights">
            {collage.map((img, idx) => (
              <div key={img.src} className={`course-value-tile tile-${idx + 1}`}>
                <SafeImage src={img.src} alt={img.alt} loading="lazy" />
              </div>
            ))}
          </div>

          <div className="course-value-content">
            <SectionHeading
              align="left"
              badge="What you’ll get inside every course"
              title="Bake Better, Learn Smarter"
              subtitle="Every workshop is designed to build confidence — not just give a recipe."
            />

            <ul className="course-value-list" aria-label="Course benefits">
              {highlights.map((item) => (
                <li key={item.title} className="course-value-item">
                  <span className="course-value-icon" aria-hidden="true" />
                  <div>
                    <div className="course-value-item-title">{item.title}</div>
                    <div className="course-value-item-desc">{item.desc}</div>
                  </div>
                </li>
              ))}
            </ul>

            <Link className="button button-solid course-value-cta" to="/courses">
              Start Learning Today
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
