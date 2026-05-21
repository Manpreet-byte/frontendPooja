import SectionHeading from '../../SectionHeading';

const features = [
  {
    title: 'Focused Workshops',
    description: 'Step-by-step sessions designed for home bakers to master technique with clarity.',
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none">
        <path
          d="M7.2 5.5h7.4c.8 0 1.4.6 1.4 1.4v11.2c0 .8-.6 1.4-1.4 1.4H7.2c-.8 0-1.4-.6-1.4-1.4V6.9c0-.8.6-1.4 1.4-1.4Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="M8.6 9h6.1M8.6 12h6.1M8.6 15h4.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: 'Live & Interactive',
    description: 'Join live classes, ask questions, and learn in real time with a warm community.',
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none">
        <path
          d="M7 7.4h7.3a2 2 0 0 1 2 2v4.2a2 2 0 0 1-2 2H9.8l-2.7 2.2v-2.2H7a2 2 0 0 1-2-2V9.4a2 2 0 0 1 2-2Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="M10 10.4l3.2 1.9-3.2 1.9v-3.8Z" fill="currentColor" />
        <path
          d="M16.8 9.8l2.2-1.4v7l-2.2-1.4"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    title: 'All-in-One Resources',
    description: 'Access recipes, notes, and video lessons — neatly organized to revisit anytime.',
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none">
        <path
          d="M8 5.8h9a2 2 0 0 1 2 2v10.4a2 2 0 0 1-2 2H8"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M8 5.8H7a2 2 0 0 0-2 2v10.4a2 2 0 0 0 2 2h1V5.8Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="M10.2 10.2h6.2M10.2 13.2h6.2M10.2 16.2h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: 'Exclusive Access',
    description: 'Insider content, workshop replays, and member-only guidance — available only here.',
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none">
        <path
          d="M8 11V9.4a4 4 0 0 1 8 0V11"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M7.2 11h9.6c.9 0 1.6.7 1.6 1.6v6c0 .9-.7 1.6-1.6 1.6H7.2c-.9 0-1.6-.7-1.6-1.6v-6c0-.9.7-1.6 1.6-1.6Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="M12 14.4v2.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
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
                {feature.icon}
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
