import styles from "../styles/home.module.css";
import StarIcon from "@mui/icons-material/Star";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import TimerIcon from "@mui/icons-material/Timer";
import CheckIcon from "@mui/icons-material/Check";
import { List, ListItem, ListItemIcon, ListItemText } from "@mui/material";
import { Box, Stack, Typography } from "@mui/material";
import ContactForm from '../components/ContactForm';
import Head from 'next/head';
import { useRouter } from "next/router";
import Link from 'next/link';
import { useEffect, useState } from 'react';

function Home() {

  //console.log('Loaded reCAPTCHA site key:', process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY);

  const router = useRouter();

  const items = ["Marketing", "Landscaping", "Catering", "Pet Care", "Dental Care", "Gyms", "Fitness Training", "Plumbing", "Cleaning", "HVAC", "Electrical"];

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
  
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    fetch('/api/blog/list')
      .then(res => res.json())
      .then(setPosts)
      .catch(console.error);
  }, []);

  return (
    <>
      <Head>
        <title>Ultrawave Interactive Web Design | Home</title>
        <meta
          name="description"
          content="Ultrawave Interactive provides custom web design and technology solutions tailored to meet your unique business needs. Based in the USA, we offer affordable and quality services nationwide."
        />
      </Head>

      {/* Your normal content continues below */}
      <div className={styles.content}>
        <p>I replace slow website builders with high-performance custom websites!</p>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd }}
        />

      <section>
          <h2>Blog Posts</h2>
          {posts.length === 0 ? (
            <p>No posts found.</p>
          ) : (
            <ul>
              {posts.map(post => (
                <li key={post.id}>
                  <Link href={`/blog/${post.slug}`}>
                    {post.title}
                  </Link>{" "}
                  <small>
                    ({new Date(post.createdAt).toLocaleDateString()})
                  </small>
                </li>
              ))}
            </ul>
          )}
        </section>
        <div className={styles.businessGrid}>
          <div className={styles.card}>
            <img
              src={"/images/meeting.jpg"}
              alt="Business people in a meeting smiling."
            />
          </div>
        </div>
        <div className={styles.blockContainer}>
          <a className={styles.flexCenter} href="#contact-form">
            <button className={styles.button}>Schedule a Free Consultation</button>
          </a>

          <a
            className={styles.flexCenter}
            href="tel:+14055198318"
            aria-label="Call Me at +14055198318"
          >
            <button className={styles.button}>
              or call me at 405-519-8318
            </button>
          </a>

          <p>
            You don&apos;t pay me until you are satisfied with the quality of my
            work!
          </p>
          <p>
            Fully customized websites, tailored to the specific and unique needs
            of your business!
          </p>

          <Link
            className={styles.flexCenter}
            href="/privacypolicy"
            aria-label="Read our privacy policy"
          >
            <button className={styles.button}>Read our privacy policy</button>
          </Link>
        </div>
      </div>
      <div>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="20vh">
            <Stack direction="row" spacing={6}>
              <Box display="flex" flexDirection="column" alignItems="center">
                <StarIcon fontSize="large" />
                <Typography
                  variant="subtitle1"
                  textAlign="center"
                  fontSize={{ xs: '16px', sm: '18px', md: '20px' }}
                  fontWeight={500}
                >
                  Quality Work
                </Typography>
              </Box>
              <Box display="flex" flexDirection="column" alignItems="center">
                <AttachMoneyIcon fontSize="large" />
                <Typography
                  variant="subtitle1"
                  textAlign="center"
                  fontSize={{ xs: '16px', sm: '18px', md: '20px' }}
                  fontWeight={500}
                >
                  Affordable Prices
                </Typography>
              </Box>
              <Box display="flex" flexDirection="column" alignItems="center">
                <TimerIcon fontSize="large" />
                <Typography
                  variant="subtitle1"
                  textAlign="center"
                  fontSize={{ xs: '16px', sm: '18px', md: '20px' }}
                  fontWeight={500}
                >
                  Timely Service
                </Typography>
              </Box>
            </Stack>
          </Box>

          <p>I believe in maintaining excellent relationships with my clients. When doing business with me you are entering into a partnership. I am dedicated to the success of your business.</p>

          <p>I work with a wide variety of businesses:</p>

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

          <p>Let me help to increase the revenue of your business!</p>

          {/* <a className={styles.centerButton} href="https://ultrawavesample.com">
            <button className={styles.button}>See a sample of my work</button>
          </a> */}

          <p>Contact me using the below form or call 405-519-8318 to schedule a free consultation!</p>

          <hr />
          <div id="contact-form">
            <ContactForm />
          </div>

        </div>
        <div className={styles.businessGrid}>
          <div className={styles.card}>
            <img src="/images/petcare.jpg" alt="Dog having fur groomed." />
            <p>We would love to work on a website for your pet care business!</p>
          </div>

          <div className={styles.card}>
            <img src="/images/dentalhygienist.jpg" alt="Dental hygienist at work." />
            <p>We work with dentists and some medical practices!</p>
          </div>

          <div className={styles.card}>
            <img src="/images/peopleingym.jpg" alt="People in a gym." />
            <p>Your gym or fitness training business could really benefit from our expertise!</p>
          </div>

          <div className={styles.card}>
            <img src="/images/plumberlookingatpipe.jpg" alt="Plumber looking at a pipe." />
            <p>Increasing the revenue of your plumbing business sounds like a good idea to us! Get ready!</p>
          </div>

          <div className={styles.card}>
            <img src="/images/hvacmenu.jpg" alt="Technician touches HVAC menu." />
            <p>Your HVAC business needs the care it deserves!</p>
          </div>

          <div className={styles.card}>
            <img src="/images/electricalreadingdevice.jpg" alt="Technician takes electrical reading using a device." />
            <p>We have something special in store for your electrical business!</p>
          </div>
        </div>

    </>
  );
}

export default Home;