import styles from "../styles/home.module.css";
import StarIcon from "@mui/icons-material/Star";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import TimerIcon from "@mui/icons-material/Timer";
import CheckIcon from "@mui/icons-material/Check";
import {
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Box,
  Stack,
  Typography
} from "@mui/material";
import ContactForm from "../components/ContactForm";
import Link from "next/link";
import BusinessCard from "../components/BusinessCard.jsx";
import FeatureItem from "../components/FeatureItem.jsx";
import Image from "next/image";

/* ----------------------------------
   SEO (App Router way)
---------------------------------- */
export const metadata = {
  title: "Ultrawave Interactive Web Design | Home",
  description:
    "Ultrawave Interactive provides custom web design/development and technology solutions tailored to your unique business needs. Based in the USA, we offer affordable and quality services nationwide."
};

/* ----------------------------------
   Server-side data fetch
---------------------------------- */
async function getPosts() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/blog/list`, {
      cache: "force-cache"
    });

    const data = await res.json();
    return Array.isArray(data.posts) ? data.posts : [];
  } catch (err) {
    console.error("❌ Failed to load posts:", err);
    return [];
  }
}

export default async function Home() {
  const posts = await getPosts();

  const items = [
    "Marketing",
    "Landscaping",
    "Catering",
    "Pet Care",
    "Dental Care",
    "Gyms",
    "Fitness Training",
    "Plumbing",
    "Cleaning",
    "HVAC",
    "Electrical"
  ];

  const jsonLd = {
    "@context": "http://schema.org",
    "@type": "ProfessionalService",
    "name": "Ultrawave Interactive Web Design",
    "image": "/images/meeting.jpg",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "5620 NW 103rd Street",
      "addressLocality": "Oklahoma City",
      "addressRegion": "OK",
      "addressCountry": "USA"
    },
    "description":
      "Providing customized websites and technology solutions across the United States. Dedicated to quality and client satisfaction.",
    "telephone": "+14055198318",
    "areaServed": "United States",
    "url": "https://ultrawaveinteractive.com",
    "openingHours": "Su-Sa 08:00-20:00"
  };

  return (
    <>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main id="main-content" className={styles.content}>
        <Image
          src="/images/rocketclock.jpg"
          alt="Flying rocket clock."
          loading="lazy"
          width={32}
          height={16}
        />

        <p className="centered-text margin-top">
          I replace slow website builders with high-performance custom websites!
        </p>

        <section>
          <h2>Blog</h2>

          {posts.length === 0 ? (
            <p>No posts found.</p>
          ) : (
            <ul className="large-text">
              {posts.map((post) => (
                <li key={post.id}>
                  <Link href={`/blog/${post.slug}`}>
                    {post.title || "Untitled Post"}
                  </Link>{" "}
                  <span className="white-text">
                    ({new Date(post.createdAt).toLocaleDateString()})
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <Box display="flex" justifyContent="center" minHeight="20vh">
          <Stack direction="row" spacing={6}>
            <FeatureItem icon={<StarIcon />} label="Quality Work" />
            <FeatureItem icon={<AttachMoneyIcon />} label="Affordable Prices" />
            <FeatureItem icon={<TimerIcon />} label="Timely Service" />
          </Stack>
        </Box>

        <Box display="flex" justifyContent="center" minHeight="30vh">
          <List>
            {items.map((item) => (
              <ListItem key={item}>
                <ListItemIcon>
                  <CheckIcon color="success" />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography fontSize="20px" fontWeight="500">
                      {item}
                    </Typography>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Box>

        <div id="contact-form">
          <ContactForm />
        </div>

        <div className={styles.businessGrid}>
          <BusinessCard
            src="/images/petcare.jpg"
            alt="Dog having fur groomed."
            text="We would love to work on a website for your pet care business!"
          />
          <BusinessCard src="/images/dentalhygienist.jpg" 
            alt="Dental hygienist at work." 
            text="We work with dentists and medical practices!" 
          />
          <BusinessCard src="/images/peopleingym.jpg"
            alt="People in a gym." 
            text="Your gym or fitness business could really benefit from our expertise!" 
          />
          <BusinessCard src="/images/plumberlookingatpipe.jpg" 
            alt="Plumber looking at a pipe."
            text="Increasing the revenue of your plumbing business sounds like a good idea to us!" 
          />
          <BusinessCard src="/images/hvacmenu.jpg"
            alt="Technician touches HVAC menu." 
            text="Your HVAC business deserves expert care!" 
          />
          <BusinessCard src="/images/electricalreadingdevice.jpg"
            alt="Technician takes electrical reading using a device."
            text="We have something special in store for your electrical business!"
          />
        </div>
      </main>
    </>
  );
}