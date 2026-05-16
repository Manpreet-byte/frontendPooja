import { Link } from 'react-router-dom';
import SectionHeading from '../../SectionHeading';

export default function FaqCtaSection() {
  return (
    <section className="section home-faq">
      <div className="container faq-split">
        <div>
          <SectionHeading
            badge="FAQs"
            title="Questions before you enroll?"
            subtitle="Find answers about workshop access, timings, support groups, and policies."
            align="left"
          />
        </div>
        <div className="faq-card">
          <div className="faq-card-inner">
            <h3 className="h3">FAQs About Love &amp; Flour Workshops</h3>
            <p className="muted">
              See the most common questions students ask before joining — and the detailed answers.
            </p>
            <Link className="button button-solid" to="/pages/frequently-asked-questions">
              Read FAQs
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

