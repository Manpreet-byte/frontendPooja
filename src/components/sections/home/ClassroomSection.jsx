import SectionHeading from '../../SectionHeading';

const features = [
  {
    title: 'Focused Workshops',
    description: 'Step-by-step sessions designed for home bakers to master technique with clarity.',
    image: '/Frame%20139.svg',
  },
  {
    title: 'Live & Interactive',
    description: 'Join live classes, ask questions, and learn in real time with a warm community.',
    image: '/Frame%20140.svg',
  },
  {
    title: 'All-in-One Resources',
    description: 'Access recipes, notes, and video lessons — neatly organized to revisit anytime.',
    image: '/Frame%20141.svg',
  },
  {
    title: 'Exclusive Access',
    description: 'Insider content, workshop replays, and member-only guidance — available only here.',
    image: '/Frame%20142.svg',
  },
];

export default function ClassroomSection() {
  return (
    <section className="section home-classroom" aria-label="Classroom features">
      <div className="container">
        <SectionHeading
          badge="Classroom"
          title="Your Complete Baking Classroom"
          subtitle="Exclusive access to workshops, live sessions, course materials — all in one place."
        />

        <div className="classroom-grid">
          {features.map((feature) => (
            <div key={feature.title} className="classroom-card">
              <div className="classroom-icon" aria-hidden="true">
                <img src={feature.image} alt="" aria-hidden="true" />
              </div>
              <h3 className="h3">{feature.title}</h3>
              <p className="muted">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
