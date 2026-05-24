import { useEffect, useMemo, useState } from 'react';
import SafeImage from '../components/SafeImage';
import { api } from '../api/client';
import usePageTitle from '../utils/usePageTitle';
import usePageSeo from '../utils/usePageSeo';

const galleryImages = [
  {
    src: 'https://loveandflourbypooja.com/wp-content/uploads/2025/09/IMG_8226.jpg',
    alt: 'Love and Flour by Pooja team image 1',
  },
  {
    src: 'https://loveandflourbypooja.com/wp-content/uploads/2025/09/IMG_2791.jpg',
    alt: 'Love and Flour by Pooja team image 2',
  },
  {
    src: 'https://loveandflourbypooja.com/wp-content/uploads/2025/09/IMG_5634.jpg',
    alt: 'Love and Flour by Pooja team image 3',
  },
  {
    src: 'https://loveandflourbypooja.com/wp-content/uploads/2025/09/IMG_2790.jpg',
    alt: 'Love and Flour by Pooja team image 4',
  },
  {
    src: 'https://loveandflourbypooja.com/wp-content/uploads/2025/09/IMG_2789.jpg',
    alt: 'Love and Flour by Pooja team image 5',
  },
  {
    src: 'https://loveandflourbypooja.com/wp-content/uploads/2025/09/IMG_1179.jpg',
    alt: 'Love and Flour by Pooja team image 6',
  },
  {
    src: 'https://loveandflourbypooja.com/wp-content/uploads/2025/09/IMG_3561.jpg',
    alt: 'Love and Flour by Pooja team image 7',
  },
  {
    src: 'https://loveandflourbypooja.com/wp-content/uploads/2025/09/IMG_2795.jpg',
    alt: 'Love and Flour by Pooja team image 8',
  },
  {
    src: 'https://loveandflourbypooja.com/wp-content/uploads/2025/09/IMG_2793.jpg',
    alt: 'Love and Flour by Pooja team image 9',
  },
];

export default function WorkWithUsPage() {
  usePageTitle('Work With Us · Love & Flour');
  usePageSeo('work-with-us', 'Work With Us · Love & Flour');
  const [activeSlide, setActiveSlide] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [remoteImages, setRemoteImages] = useState([]);

  useEffect(() => {
    let active = true;
    api.public.gallery
      .list()
      .then((data) => {
        if (!active) return;
        const items = (data?.gallery ?? [])
          .filter((item) => String(item?.image_url ?? '').trim())
          .map((item, index) => ({
            src: String(item.image_url).trim(),
            alt: String(item.alt_text ?? item.caption ?? `Gallery image ${index + 1}`),
          }));
        setRemoteImages(items);
      })
      .catch(() => {
        if (active) setRemoteImages([]);
      });

    return () => {
      active = false;
    };
  }, []);

  const images = remoteImages.length ? remoteImages : galleryImages;

  useEffect(() => {
    if (images.length < 2 || isHovered) return undefined;
    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % images.length);
    }, 4200);
    return () => window.clearInterval(timer);
  }, [images.length, isHovered]);

  const activeImage = useMemo(() => images[activeSlide] ?? images[0], [activeSlide, images]);

  return (
    <main className="section page-white page-60 page-work-with-us page-legal page-typography">
      <div className="container">
        <div className="story-layout">
          <article className="story-card panel prose-block">
            <p className="badge" style={{ marginBottom: 14 }}>Careers</p>
            <h1 className="h1" style={{ marginBottom: 18 }}>Join the Team That&apos;s Baking Up Change</h1>

            <div className="story-scroller" aria-hidden="true">
              <div className="story-scroller-track">
                <span>Creative &amp; supportive environment</span>
                <span>Meaningful work</span>
                <span>Room to grow</span>
                <span>Real ownership</span>
                <span>Creative &amp; supportive environment</span>
                <span>Meaningful work</span>
                <span>Room to grow</span>
                <span>Real ownership</span>
              </div>
            </div>

            <p className="lead">
              At Love &amp; Flour by Pooja, we&apos;re more than a baking school. We&apos;re a creative, purpose-driven
              team that believes in doing meaningful work.
            </p>

            <p>
              Every workshop, every story, and every recipe we share is built with heart, and behind it all is a
              small, passionate team that loves what they do.
            </p>

            <p>
              If you&apos;re someone who thrives in a collaborative environment, enjoys learning, and wants to be part
              of something that inspires others, we&apos;d love to have you on board.
            </p>

            <h2>Why You&apos;ll Love Working With Us</h2>
            <p>
              <strong>Creative &amp; Supportive Environment</strong><br />
              We&apos;re a close-knit team that values ideas, curiosity, and initiative.
            </p>
            <p>
              <strong>Meaningful Work</strong><br />
              Everything you do here contributes to empowering bakers and creators across India.
            </p>
            <p>
              <strong>Room to Grow</strong><br />
              You&apos;ll learn, experiment, and build new skills as part of a fast-evolving brand.
            </p>
            <p>
              <strong>Real Ownership</strong><br />
              We trust you to take charge, think independently, and make an impact.
            </p>

            <h2>Where You Can Contribute</h2>
            <p>
              We&apos;re always looking for talented, passionate people to join us in areas like:
            </p>

            <ul>
              <li>Business Development &amp; Partnerships - Drive student registrations, collaborations, and new opportunities.</li>
              <li>Kitchen Trials &amp; Innovation - Support recipe testing, prep, and seasonal product development.</li>
              <li>Social Media &amp; Digital Marketing - Create content, manage campaigns, and grow our online community.</li>
              <li>Photography &amp; Videography - Capture workshops, visuals, and behind-the-scenes stories.</li>
              <li>Content &amp; Communication - Update course pages, write clear, engaging copy, and manage our online platforms.</li>
            </ul>

            <p>
              If you don&apos;t see a role that fits you but believe you can contribute in your own way, we&apos;d still
              love to hear from you.
            </p>

            <p style={{ marginTop: 24 }}>
              Send us your CV and a few lines about yourself at{' '}
              <a href="mailto:careers@loveandflourbypooja.com">careers@loveandflourbypooja.com</a>
            </p>
          </article>

          <aside className="story-aside">
            <div className="story-carousel">
              <div
                className="story-carousel-media"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
              >
                <div className="story-carousel-badge">Team Life</div>
                <div className="story-carousel-stage">
                  <div key={activeImage.src} className="story-carousel-frame">
                    <SafeImage src={activeImage.src} alt={activeImage.alt} loading="eager" />
                  </div>
                </div>

                <div className={`story-carousel-nav${isHovered ? ' is-visible' : ''}`}>
                  <button
                    type="button"
                    className="story-carousel-arrow"
                    onClick={() => setActiveSlide((current) => (current - 1 + images.length) % images.length)}
                    aria-label="Previous image"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    className="story-carousel-arrow"
                    onClick={() => setActiveSlide((current) => (current + 1) % images.length)}
                    aria-label="Next image"
                  >
                    ›
                  </button>
                </div>
              </div>
              <div className="story-carousel-controls">
                <div className="story-carousel-dots" aria-label="Gallery navigation">
                  {images.map((image, index) => (
                    <button
                      key={image.src}
                      type="button"
                      className={`story-carousel-dot${index === activeSlide ? ' is-active' : ''}`}
                      onClick={() => setActiveSlide(index)}
                      aria-label={`Show image ${index + 1}`}
                    />
                  ))}
                </div>
              </div>
              <p className="story-carousel-caption">
                We build a creative, supportive environment where every contribution matters and every person gets to grow.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
