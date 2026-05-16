import { Link } from 'react-router-dom';

export default function HeroSection() {
  return (
    <section id="home" className="hero">
      <div
        className="hero-bg"
        style={{
          backgroundImage:
            "url(https://images.unsplash.com/photo-1754294437651-2a79a3f1888b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1400)",
        }}
      />
      <div className="hero-scrim" />
      <div className="container hero-inner">
        <h1 className="hero-title">Love &amp; Flour by Pooja</h1>
        <p className="hero-subtitle">Trusted online baking academy for eggless &amp; eggfree recipes.</p>
        <div className="hero-actions">
          <Link className="button button-solid" to="/courses">
            Explore online workshops
          </Link>
        </div>
      </div>
    </section>
  );
}
