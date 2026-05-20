import SectionHeading from '../../SectionHeading';

const features = [
  {
    title: 'Focused Workshops',
    description: 'Step-by-step sessions designed for home bakers to master technique with clarity.',
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <path
          fill="currentColor"
          d="M6.2 14.3a2.1 2.1 0 0 1 0-3l4.8-4.8a2.1 2.1 0 0 1 3 0l3.5 3.5a2.1 2.1 0 0 1 0 3l-4.8 4.8a2.1 2.1 0 0 1-3 0l-3.5-3.5Zm6-6.4-4.6 4.6a.8.8 0 0 0 0 1.1l3.4 3.4c.3.3.8.3 1.1 0l4.6-4.6a.8.8 0 0 0 0-1.1l-3.4-3.4a.8.8 0 0 0-1.1 0Z"
        />
        <path
          fill="currentColor"
          d="M3 20.5a1 1 0 0 1 1-1h7.5a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1Z"
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
          d="M4 6.5A2.5 2.5 0 0 1 6.5 4h9A2.5 2.5 0 0 1 18 6.5v6A2.5 2.5 0 0 1 15.5 15H10l-3.6 3.1A1.1 1.1 0 0 1 4.6 17v-2.2A2.5 2.5 0 0 1 4 12.5v-6Zm2.5-.5a.5.5 0 0 0-.5.5v6c0 .2.1.4.3.5.2.1.2.4.2.6v.9L9.1 13c.2-.2.4-.2.7-.2h5.7a.5.5 0 0 0 .5-.5v-6a.5.5 0 0 0-.5-.5h-9Z"
        />
        <path
          fill="currentColor"
          d="M8 8.1a1 1 0 0 1 1.5-.9l4 2.3a1 1 0 0 1 0 1.7l-4 2.3A1 1 0 0 1 8 12.6V8.1Z"
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
          d="M6.5 4.2h9.8c1 0 1.7.8 1.7 1.7v12.3c0 1-.8 1.7-1.7 1.7H6.5c-1 0-1.7-.8-1.7-1.7V5.9c0-1 .8-1.7 1.7-1.7Zm0 2a.3.3 0 0 0-.3.3v11.1c0 .2.1.3.3.3h9.8c.2 0 .3-.1.3-.3V6.5c0-.2-.1-.3-.3-.3H6.5Z"
        />
        <path
          fill="currentColor"
          d="M8 7.7h7v1.8H8V7.7Zm0 3.6h7v1.8H8v-1.8Zm0 3.6h4.5v1.8H8v-1.8Z"
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
          d="M12 3.2l2.1 4.3 4.7.7-3.4 3.3.8 4.7-4.2-2.2-4.2 2.2.8-4.7-3.4-3.3 4.7-.7L12 3.2Z"
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
