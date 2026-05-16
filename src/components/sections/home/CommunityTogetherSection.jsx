import SectionHeading from '../../SectionHeading';

export default function CommunityTogetherSection() {
  return (
    <section className="section home-together" aria-label="Community">
      <div className="container-wide">
        <div className="panel home-together-panel">
          <SectionHeading
            badge="Community"
            title="Bake Better, Together"
            subtitle="Friendly lessons, practical tips, and a supportive community cheering you on."
          />

          <div className="home-together-features" aria-label="Community benefits">
            <div className="home-together-feature">
              <div className="home-together-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                  <path
                    d="M7 11.5a3 3 0 1 1 6 0v1.2a3 3 0 0 1-6 0v-1.2Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M4.5 19.2a6.5 6.5 0 0 1 13 0"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M15.5 8.2h4.2m-2.1-2.1v4.2"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div>
                <p className="home-together-title">Supportive community</p>
                <p className="muted home-together-copy">Ask questions, share wins, and get gentle guidance.</p>
              </div>
            </div>

            <div className="home-together-feature">
              <div className="home-together-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                  <path
                    d="M6.5 7.5h11a2 2 0 0 1 2 2v7.2a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2V9.5a2 2 0 0 1 2-2Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M9 6.2v2.6M15 6.2v2.6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M7.2 12.2h9.6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div>
                <p className="home-together-title">Practical learning</p>
                <p className="muted home-together-copy">Clear steps, real techniques, and repeatable results.</p>
              </div>
            </div>

            <div className="home-together-feature">
              <div className="home-together-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                  <path
                    d="M7.5 13.2a4.5 4.5 0 0 1 9 0v4.3H7.5v-4.3Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M9 10.2 12 7l3 3.2"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M6 19.8h12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div>
                <p className="home-together-title">Grow with confidence</p>
                <p className="muted home-together-copy">From first bake to proud gifting—one milestone at a time.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
