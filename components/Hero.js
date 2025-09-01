// components/Hero.js
export default function Hero() {
  return (
    <section className="hero">
      <div className="hero__imgWrap">
        {/* Use <picture> for modern formats + responsive sizes */}
        <picture>
          {/* Modern formats first (optional but recommended) */}
          <source
            type="image/avif"
            srcSet="/images/hero-640.avif 640w, /images/hero-1280.avif 1280w, /images/hero-1920.avif 1920w"
            sizes="100vw"
          />
          <source
            type="image/webp"
            srcSet="/images/hero-640.webp 640w, /images/hero-1280.webp 1280w, /images/hero-1920.webp 1920w"
            sizes="100vw"
          />
          <img
            src="/images/hero-1280.jpg"
            srcSet="/images/hero-640.jpg 640w, /images/hero-1280.jpg 1280w, /images/hero-1920.jpg 1920w"
            sizes="100vw"
            width="1920" height="1080"
            alt=""               /* decorative background */
            fetchPriority="high" /* above-the-fold */
            decoding="async"
            loading="eager"
          />
        </picture>
      </div>

      <div className="hero__overlay" />
      <div className="hero__content">
        <h1>Ultrawave Interactive</h1>
        <p>Fast, secure, and scalable websites & apps.</p>
      </div>
    </section>
  );
}
