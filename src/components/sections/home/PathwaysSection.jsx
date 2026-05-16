import { Link } from 'react-router-dom';
import SectionHeading from '../../SectionHeading';

const pathways = [
  {
    title: 'Upcoming Live Workshops',
    description: 'Real-time classes with Q&A, demos, and guided recreations.',
    to: '/courses?category=upcoming-live-workshops',
  },
  {
    title: 'Upcoming Live Session',
    description: 'Limited-seat sessions for deeper focus and close support.',
    to: '/courses?category=upcoming-live-session',
  },
  {
    title: 'Hands-On Classes',
    description: 'In-person learning for craft, technique, and confidence.',
    to: '/courses?category=hands-on-classes',
  },
  {
    title: 'E-Books',
    description: 'Clean recipes, notes, and references to keep you consistent.',
    to: '/courses?category=e-book',
  },
];

export default function PathwaysSection() {
  return (
    <section className="section home-pathways">
      <div className="container">
        <SectionHeading
          badge="Online Workshops"
          title="Choose your baking path"
          subtitle="Different formats for different seasons of life — live, recorded, hands-on, and e-books."
        />

        <div className="pathways-grid">
          {pathways.map((p) => (
            <Link key={p.title} className="pathway-card" to={p.to}>
              <div className="pathway-card-top">
                <h3 className="h3">{p.title}</h3>
                <span className="pathway-chip">Explore</span>
              </div>
              <p className="muted">{p.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

