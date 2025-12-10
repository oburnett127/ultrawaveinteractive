// // components/GlobalBackground.js
// export default function GlobalBackground() {
//   return (
//     <div className="bgFixed" aria-hidden="true">
//       <picture>
//         {/* Best quality/size first */}
//         <source
//           type="image/avif"
//           srcSet="/images/hero-640.avif 640w, /images/hero-1280.avif 1280w, /images/hero-1920.avif 1920w"
//           sizes="100vw"
//         />
//         <source
//           type="image/webp"
//           srcSet="/images/hero-640.webp 640w, /images/hero-1280.webp 1280w, /images/hero-1920.webp 1920w"
//           sizes="100vw"
//         />
//         <img
//           src="/images/hero-1280.jpg"
//           srcSet="/images/hero-640.jpg 640w, /images/hero-1280.jpg 1280w, /images/hero-1920.jpg 1920w"
//           sizes="100vw"
//           width="1920"
//           height="1080"
//           alt=""
//           loading="eager"
//           fetchpriority="high"
//           decoding="async"
//         />
//       </picture>

//       {/* Optional global overlay for readability over the whole site */}
//       <div className="bgOverlay" />
//     </div>
//   );
// }
   