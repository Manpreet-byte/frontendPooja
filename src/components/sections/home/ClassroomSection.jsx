import SectionHeading from '../../SectionHeading';

const features = [
  {
    title: 'Focused Workshops',
    description: 'Step-by-step sessions designed for home bakers to master technique with clarity.',
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none">
        <circle cx="12" cy="12" r="7.5" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="12" cy="12" r="0.9" fill="currentColor" />
        <path d="M12 3.4v2.2M12 18.4v2.2M3.4 12h2.2M18.4 12h2.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: 'Live & Interactive',
    description: 'Join live classes, ask questions, and learn in real time with a warm community.',
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none">
        <path
          d="M5.2 7.2A2.2 2.2 0 0 1 7.4 5h7.2a2.2 2.2 0 0 1 2.2 2.2v4.4a2.2 2.2 0 0 1-2.2 2.2H10l-3.2 2.7c-.7.6-1.6.1-1.6-.8v-1.9a2.2 2.2 0 0 1 0-8.6Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="M10 8.3l3.4 2-3.4 2v-4Z" fill="currentColor" />
        <path d="M17.6 9.6h1.1a1.7 1.7 0 0 1 1.7 1.7v2.2a1.7 1.7 0 0 1-1.7 1.7h-.8l-1.8 1.5v-1.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: 'All-in-One Resources',
    description: 'Access recipes, notes, and video lessons — neatly organized to revisit anytime.',
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none">
        <path
          d="M4.6 8.2V6.6c0-.9.7-1.6 1.6-1.6h4l1.2 1.6h6.4c.9 0 1.6.7 1.6 1.6v9.2c0 .9-.7 1.6-1.6 1.6H6.2c-.9 0-1.6-.7-1.6-1.6V8.2Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="M8 11h8M8 14h8M8 17h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: 'Exclusive Access',
    description: 'Insider content, workshop replays, and member-only guidance — available only here.',
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none">
        <path
          d="M7.5 11V9.2a4.5 4.5 0 0 1 9 0V11"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M6.6 11h10.8c.8 0 1.5.7 1.5 1.5v6.2c0 .8-.7 1.5-1.5 1.5H6.6c-.8 0-1.5-.7-1.5-1.5v-6.2c0-.8.7-1.5 1.5-1.5Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="M12 14.4v2.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M19.2 6.6l.5 1.1 1.2.2-.9.8.2 1.2-1-.5-1 .5.2-1.2-.9-.8 1.2-.2.5-1.1Z" fill="currentColor" />
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
