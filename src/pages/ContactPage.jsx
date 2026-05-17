import ContactSection from '../components/sections/ContactSection';
import NewsletterSection from '../components/sections/NewsletterSection';
import usePageTitle from '../utils/usePageTitle';

export default function ContactPage() {
  usePageTitle('Contact · Love & Flour');
  return (
    <main>
      <ContactSection />
      <NewsletterSection />
    </main>
  );
}
