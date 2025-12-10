import Image from 'next/image';

function BusinessCard({ src, alt, text }) {
  return (
    <div className="card">
      <Image src={src} alt={alt} loading="lazy" width="32" height="16" />
      <p className="centered-text">{text}</p>
    </div>
  );
}

export default BusinessCard;