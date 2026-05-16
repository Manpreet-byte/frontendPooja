export default function SectionHeading({ badge, title, subtitle, align = 'center' }) {
  return (
    <div className={`section-heading section-heading-${align}`}>
      {badge ? <div className="badge">{badge}</div> : null}
      <h2 className="h2">{title}</h2>
      {subtitle ? <p className="subtitle section-heading-subtitle">{subtitle}</p> : null}
    </div>
  );
}

