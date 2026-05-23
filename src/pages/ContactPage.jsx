import ContactSection from '../components/sections/ContactSection';
import NewsletterSection from '../components/sections/NewsletterSection';
import usePageTitle from '../utils/usePageTitle';

export default function ContactPage() {
  usePageTitle('Contact · Love & Flour');
  return (
    <main className="page-contact page-white page-60">
      <ContactSection />
      <NewsletterSection />
    </main>
  );
}
