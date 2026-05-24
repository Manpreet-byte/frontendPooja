import HomeHero from '../components/sections/home/HomeHero';
import ClassroomSection from '../components/sections/home/ClassroomSection';
import BakeryShowcaseSection from '../components/sections/home/BakeryShowcaseSection';
import CourseValueSection from '../components/sections/home/CourseValueSection';
import FeaturedCoursesSection from '../components/sections/home/FeaturedCoursesSection';
import CommunityTogetherSection from '../components/sections/home/CommunityTogetherSection';
import FaqCtaSection from '../components/sections/home/FaqCtaSection';
import PathwaysSection from '../components/sections/home/PathwaysSection';
import RecipeHighlightsSection from '../components/sections/home/RecipeHighlightsSection';
import TestimonialsSection from '../components/sections/home/TestimonialsSection';
import NewsletterSection from '../components/sections/NewsletterSection';
import { useEffect, useState } from 'react';
import { api } from '../api/client';
import usePageTitle from '../utils/usePageTitle';
import usePageSeo from '../utils/usePageSeo';

export default function HomePage() {
  const [cms, setCms] = useState(null);
  usePageTitle('Love & Flour by Pooja');
  usePageSeo('home', 'Love & Flour by Pooja');

  useEffect(() => {
    let active = true;
    api.public.content
      .homepage()
      .then((data) => {
        if (!active) return;
        setCms(data?.homepage?.content ?? null);
      })
      .catch(() => {
        if (active) setCms(null);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <main>
      <HomeHero cms={cms?.hero ?? null} />
      <ClassroomSection />
      <BakeryShowcaseSection />
      <PathwaysSection />
      <CourseValueSection />
      <FeaturedCoursesSection />
      <CommunityTogetherSection />
      <RecipeHighlightsSection />
      <TestimonialsSection cms={cms?.testimonials ?? null} />
      <FaqCtaSection />
      <NewsletterSection />
    </main>
  );
}
