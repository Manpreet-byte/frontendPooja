import SectionHeading from '../../SectionHeading';

const features = [
  {
    title: 'Focused Workshops',
    description: 'Step-by-step sessions designed for home bakers to master technique with clarity.',
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <path
          fill="currentColor"
          d="M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm0 2v14h10V5H7zm2 2h6v2H9V7zm0 4h6v2H9v-2zm0 4h4v2H9v-2z"
        />
      </svg>
    ),
  },
  {
    title: 'Live & Interactive',
    description: 'Join live classes, ask questions, and learn in real time with a warm community.',
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <path
          fill="currentColor"
          d="M7.5 7a4.5 4.5 0 1 1 7.6 3.2l1.7 1.7a3.5 3.5 0 0 1 4.2 5.5l-1.4 1.4a3.5 3.5 0 0 1-5.5-4.2l-1.7-1.7A4.5 4.5 0 0 1 7.5 7zm4.5-2.5A2.5 2.5 0 1 0 14.5 7 2.5 2.5 0 0 0 12 4.5zm6.4 10.8-3.1 3.1a1.5 1.5 0 0 0 2.1 2.1l3.1-3.1a1.5 1.5 0 0 0-2.1-2.1z"
        />
      </svg>
    ),
  },
  {
    title: 'All-in-One Resources',
    description: 'Access recipes, notes, and video lessons — neatly organized to revisit anytime.',
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <path
          fill="currentColor"
          d="M4 5a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v14a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V5zm3-1a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1H7zm1 3h8v2H8V7zm0 4h8v2H8v-2zm0 4h5v2H8v-2z"
        />
      </svg>
    ),
  },
  {
    title: 'Exclusive Access',
    description: 'Insider content, workshop replays, and member-only guidance — available only here.',
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 2a6 6 0 0 1 6 6v1h1a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2h1V8a6 6 0 0 1 6-6zm-4 7h8V8a4 4 0 0 0-8 0v1zm4 4a2 2 0 0 0-1 3.7V18a1 1 0 0 0 2 0v-1.3A2 2 0 0 0 12 13z"
        />
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

