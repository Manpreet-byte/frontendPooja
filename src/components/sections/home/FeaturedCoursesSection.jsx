import { useEffect, useState } from 'react';
import CourseCard from '../../CourseCard';
import SectionHeading from '../../SectionHeading';
import { api } from '../../../api/client';
import { sortByDateDesc } from '../../../utils/publicContent';

export default function FeaturedCoursesSection() {
  const [featured, setFeatured] = useState([]);

  useEffect(() => {
    let active = true;
    api.public.courses
      .list()
      .then((data) => {
        if (!active) return;
        setFeatured(sortByDateDesc(data.courses ?? []).slice(0, 6));
      })
      .catch(() => {
        if (active) setFeatured([]);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="section home-featured">
      <div className="container">
        <div className="home-featured-head">
          <SectionHeading
            badge="Top Products"
            title="Top Products"
            subtitle="A curated selection of workshops to start with."
          />
        </div>

        <div className="grid cards-grid">
          {featured.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      </div>
    </section>
  );
}
