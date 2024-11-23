import React from 'react';
import styles from "./Home.module.css";
import StarIcon from "@mui/icons-material/Star";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import TimerIcon from "@mui/icons-material/Timer";
import CheckIcon from "@mui/icons-material/Check";
import { List, ListItem, ListItemIcon, ListItemText } from "@mui/material";
import { Box, Stack, Typography } from "@mui/material";
import ContactForm from '../components/ContactForm';

function HomePage() {
  const items = ["Marketing", "Landscaping", "Catering", "Pet Care", "Dental Care", "Gyms", "Fitness Training", "Plumbing", "Cleaning", "HVAC", "Electrical"];

  return (
    <>
      <h1 className={styles.headerText}>Ultrawave Interactive Web Design</h1>
      <p>I make websites and technology solutions for less!</p>

      <img src="/images/meeting.jpg" alt="Business people in a meeting smiling." />
  
      <div className={styles.blockContainer}>
        <a className={styles.flexCenter} href="#contact-form">
          <button className={styles.button}>Schedule a Free Consultation</button>
        </a>

        <a className={styles.flexCenter} href="tel:+14055198318" aria-label="Call Me at +14055198318">
          <button className={styles.button}>or call me at 405-519-8318</button>
        </a>

        <p>You don't pay me until you are satisfied with the quality of my work!</p>
        <p>Fully customized websites, tailored to the specific and unique needs of your business!</p>

        <Box display="flex" justifyContent="center" alignItems="center" minHeight="20vh">
          <Stack direction="row" spacing={6}>
            <Box display="flex" flexDirection="column" alignItems="center">
              <StarIcon fontSize="large" />
              <Typography variant="subtitle1" textAlign="center">Quality Work</Typography>
            </Box>
            <Box display="flex" flexDirection="column" alignItems="center">
              <AttachMoneyIcon fontSize="large" />
              <Typography variant="subtitle1" textAlign="center">Affordable Prices</Typography>
            </Box>
            <Box display="flex" flexDirection="column" alignItems="center">
              <TimerIcon fontSize="large" />
              <Typography variant="subtitle1" textAlign="center">Timely Service</Typography>
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
                <ListItemText primary={item} />
              </ListItem>
            ))}
          </List>
        </Box>

        <p>Let me help to increase the revenue of your business!</p>

        <a className={styles.centerButton} href="https://ultrawavesample.com">
          <button className={styles.button}>See a sample of my work</button>
        </a>

        <p>Contact me using the below form or call 405-519-8318 to schedule a free consultation!</p>

        <hr />
        <div id="contact-form">
          <ContactForm />
        </div>

      </div>
      <div>
        <img className={styles.image} src="/images/petcare.jpg" alt="Dog having fur groomed." />
        <p>We would love to work on a website for your pet care business!</p><br />
        <img className={styles.image} src="/images/dentalhygienist.jpg" alt="Dental hygienist at work." />
        <p>We work with dentists and some medical practices!</p><br />
        <img className={styles.image} src="/images/peopleingym.jpg" alt="People in a gym." />
        <p>Your gym or fitness training business could really benefit from our expertise!</p><br />
        <img className={styles.image} src="/images/plumberlookingatpipe.jpg" alt="Plumber looking at a pipe." />
        <p>Increasing the revenue of your plumbing business sounds like a good idea to us! Get ready!</p><br />
        <img className={styles.image} src="/images/carpetcleaning.jpg" alt="The carpet is being cleaned." />
        <p>Cleaning service websites with a touch of creativity!</p><br />
        <img className={styles.image} src="/images/hvacmenu.jpg" alt="Technician touches HVAC menu." />
        <p>Your HVAC business needs the care it deserves!</p><br />
        <img className={styles.image} src="/images/electricalreadingdevice.jpg" alt="Technician takes electrical reading using a device." />
        <p>We have something special in store for your electrical business!</p>
      </div>
    </>
  );
}

export default HomePage;