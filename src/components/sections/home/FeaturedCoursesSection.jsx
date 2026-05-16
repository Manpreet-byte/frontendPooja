import { useEffect, useState } from 'react';
import CourseCard from '../../CourseCard';
import SectionHeading from '../../SectionHeading';
import { api } from '../../../api/client';
import { courses as seededCourses } from '../../../data/seededContent';
import { mergeBySlug, sortByDateDesc } from '../../../utils/publicContent';

export default function FeaturedCoursesSection() {
  const [featured, setFeatured] = useState(() => sortByDateDesc(seededCourses).slice(0, 6));

  useEffect(() => {
    let active = true;
    api.public.courses
      .list()
      .then((data) => {
        if (!active) return;
        setFeatured(sortByDateDesc(mergeBySlug(data.courses ?? [], seededCourses)).slice(0, 6));
      })
      .catch(() => {
        if (active) setFeatured(sortByDateDesc(seededCourses).slice(0, 6));
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
