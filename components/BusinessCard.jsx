function BusinessCard({ src, alt, text }) {
  return (
    <div className="card">
      <img src={src} alt={alt} loading="lazy" />
      <p className="centered-text">{text}</p>
    </div>
  );
}

export default BusinessCard;