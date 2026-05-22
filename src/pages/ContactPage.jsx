import ContactSection from '../components/sections/ContactSection';
import usePageTitle from '../utils/usePageTitle';

export default function ContactPage() {
  usePageTitle('Contact · Love & Flour');
  return (
    <main>
      <ContactSection />
    </main>
  );
}
