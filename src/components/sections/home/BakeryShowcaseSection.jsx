import { Link } from 'react-router-dom';

const cards = [
  {
    id: '1',
    title: 'Artisan Sourdough',
    copy: 'Crusty outside, airy crumb, and deep flavor for everyday baking.',
    image: '/seed-media/0029411272af87eaf6746fc9a3eb6fb3b2e3533b.jpg',
  },
  {
    id: '2',
    title: 'Chocolate Babka',
    copy: 'Layered chocolate folds with a rich, soft pull-apart texture.',
    image: '/seed-media/003a4afcf1cf8ce93b64c43673dc122c5f7a9408.jpg',
  },
  {
    id: '3',
    title: 'Brioche Buns',
    copy: 'Buttery and light buns designed for premium bakery menus.',
    image: '/seed-media/004f34dcb788f85961d700095fbcb7f098a4f6a6.jpg',
  },
];

export default function BakeryShowcaseSection() {
  return (
    <section className="section bakery-showcase" aria-label="Bakery showcase">
      <div className="container">
        <div className="bakery-showcase-shell">
          <div className="bakery-showcase-head">
            <p />
            <h2 />
          </div>

          <div className="bakery-showcase-bar">
            <img src="/brand/logo.png" alt="Love & Flour by Pooja" />
          </div>

          <div className="bakery-showcase-hero">
            <img src="/hero.jpeg" alt="Whole grain bread" loading="lazy" />
            <div className="bakery-showcase-overlay" />
            <div className="bakery-showcase-copy">
              <h3>
                Whole Grain Goodness
                <br />
                in Every Slice
              </h3>
              <p>
                One bite and you&apos;ll switch to whole wheat bread. Practical recipes, premium texture, and repeatable
                home-bakery methods.
              </p>
              <Link className="button button-solid" to="/courses">
                Learn More
              </Link>
            </div>

            <div className="bakery-showcase-cards">
              {cards.map((card) => (
                <article key={card.id} className="bakery-mini-card">
                  <span className="bakery-mini-price">$3</span>
                  <img src={card.image} alt={card.title} loading="lazy" />
                  <h4>{card.title}</h4>
                  <p>{card.copy}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
