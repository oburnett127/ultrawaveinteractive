import styles from "../styles/home.module.css";
import StarIcon from "@mui/icons-material/Star";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import TimerIcon from "@mui/icons-material/Timer";
import CheckIcon from "@mui/icons-material/Check";
import { List, ListItem, ListItemIcon, ListItemText, Box, Stack, Typography } from "@mui/material";
import ContactForm from "../components/ContactForm";
import Head from "next/head";
import Link from "next/link";
import BusinessCard from "../components/BusinessCard.jsx";
import FeatureItem from "../components/FeatureItem.jsx";
import Image from "next/image";

function Home({ posts }) {
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
    "Electrical",
  ];

  const jsonLd = `{
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
    "description": "Providing customized websites and technology solutions across the United States. Dedicated to quality and client satisfaction.",
    "telephone": "+14055198318",
    "areaServed": "United States",
    "url": "https://ultrawaveinteractive.com",
    "openingHours": "Su-Sa 08:00-20:00"
  }`;

  return (
    <>
      <Head>
        <title>Ultrawave Interactive Web Design | Home</title>
        <meta
          name="description"
          content="Ultrawave Interactive provides custom web design/development and technology solutions tailored to your unique business needs. Based in the USA, we offer affordable and quality services nationwide."
        />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      </Head>

      <main id="main-content" className={styles.content}>
        <Image src="/images/rocketclock.jpg" alt="Flying rocket clock." loading="lazy" width="32" height="16" />

        <p className="centered-text margin-top">
          I replace slow website builders with high-performance custom websites!
        </p>
        <p className="centered-text margin-top">
          Web design and development services for any business in the USA!
        </p>
        <p className="centered-text margin-top">
          Web design and development services in Oklahoma City, OK!
        </p>

        <section>
          <h2>Blog</h2>

          {posts.length === 0 ? (
            <p>No posts found.</p>
          ) : (
            <ul className="large-text">
              {posts.map((post) => (
                <li key={post.id} className="large-text">
                  <Link href={`/blog/${post.slug}`} className="large-text">
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

        <div className={styles.businessGrid}>
          <div className={styles.card}>
            <Image
              src="/images/meeting.jpg"
              alt="Business people in a meeting smiling."
              loading="lazy"
              width="32"
              height="16"
            />
          </div>
        </div>

        <div className={styles.blockContainer}>
          <a className={styles.flexCenter} href="#contact-form">
            <button className={styles.button}>
              Schedule a Free Consultation and Website Audit - Contact Us
            </button>
          </a>

          <a
            className={styles.flexCenter}
            href="tel:+14055198318"
            aria-label="Call Me at +14055198318"
          >
            <button className={styles.button}>or call me at 405-519-8318</button>
          </a>

          <p className="centered-text">
            You don&apos;t pay me until you are satisfied with the quality of my work!
          </p>
          <p className="centered-text">
            Fully customized websites, tailored to your business&apos;s unique needs!
          </p>

          <Link
            className={styles.flexCenter}
            href="/privacypolicy"
            aria-label="Read our privacy policy"
          >
            <button className={styles.button}>Read our privacy policy</button>
          </Link>
        </div>

        <Box display="flex" justifyContent="center" alignItems="center" minHeight="20vh">
          <Stack direction="row" spacing={6}>
            <FeatureItem icon={<StarIcon />} label="Quality Work" />
            <FeatureItem icon={<AttachMoneyIcon />} label="Affordable Prices" />
            <FeatureItem icon={<TimerIcon />} label="Timely Service" />
          </Stack>
        </Box>

        <p className="centered-text">
          I believe in maintaining excellent relationships with my clients. When doing business with me, you are entering into a partnership. I am dedicated to your success.
        </p>

        <p className="centered-text">I work with a wide variety of businesses:</p>

        <Box display="flex" justifyContent="center" alignItems="center" minHeight="30vh">
          <List>
            {items.map((item, index) => (
              <ListItem key={index}>
                <ListItemIcon>
                  <CheckIcon color="success" />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="body1" fontSize="20px" fontWeight="500">
                      {item}
                    </Typography>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Box>

        <p className="centered-text">Let me help increase your business revenue!</p>

        <p className="centered-text">
          Contact me using the form below or call 405-519-8318 to schedule a free consultation!
        </p>

        <hr />

        <div id="contact-form">
          <ContactForm />
        </div>

        <div className={styles.businessGrid}>
          <BusinessCard
            src="/images/petcare.jpg"
            alt="Dog having fur groomed."
            text="We would love to work on a website for your pet care business!"
          />
          <BusinessCard
            src="/images/dentalhygienist.jpg"
            alt="Dental hygienist at work."
            text="We work with dentists and medical practices!"
          />
          <BusinessCard
            src="/images/peopleingym.jpg"
            alt="People in a gym."
            text="Your gym or fitness business could really benefit from our expertise!"
          />
          <BusinessCard
            src="/images/plumberlookingatpipe.jpg"
            alt="Plumber looking at a pipe."
            text="Increasing the revenue of your plumbing business sounds like a good idea to us!"
          />
          <BusinessCard
            src="/images/hvacmenu.jpg"
            alt="Technician touches HVAC menu."
            text="Your HVAC business deserves expert care!"
          />
          <BusinessCard
            src="/images/electricalreadingdevice.jpg"
            alt="Technician takes electrical reading using a device."
            text="We have something special in store for your electrical business!"
          />
        </div>
      </main>
    </>
  );
}

export default Home;

// 🧊 SSG Fetch — runs at build time only
export async function getStaticProps() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/blog/list`);
    const data = await res.json();

    return {
      props: {
        posts: Array.isArray(data.posts) ? data.posts : []
      }
    };
  } catch (err) {
    console.error("❌ Failed to fetch posts during build:", err.message);

    return {
      props: {
        posts: []
      }
    };
  }
}