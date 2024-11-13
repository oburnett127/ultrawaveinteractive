import React from 'react';
import styles from "./Home.module.css";
import StarIcon from "@mui/icons-material/Star";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import TimerIcon from "@mui/icons-material/Timer";
import CheckIcon from "@mui/icons-material/Check";
import { List, ListItem, ListItemIcon, ListItemText } from "@mui/material";
import { Box, Stack, Typography } from "@mui/material";
function HomePage() {
  const items = ["Marketing", "Landscaping", "Catering", "Pet Care", "Dental Care", "Gyms", "Fitness Training", "Plumbing", "Cleaning", "HVAC", "Electrical"];

  return (
    <>
      <h1 className={styles.headerText}>Ultrawave Interactive Web Design</h1>
      <p>I make websites and technology solutions for less!</p>

      <div className={styles.centerImage}>
        <img className={styles.meetingImage} src="/images/meeting.jpg" alt="Business people in a meeting smiling." />
      </div>

      <div className={styles.blockContainer}>
        <div className={styles.flexCenter}>
          <button className={styles.button}>Schedule a Free Consultation</button>
        </div>

        <Box display="flex" justifyContent="center" alignItems="center" minHeight="20vh">
          <Stack direction="row" spacing={6}>
            <Box display="flex" flexDirection="column" alignItems="center">
              <StarIcon fontSize="large" />
              <Typography variant="subtitle1">Quality Work</Typography>
            </Box>
            <Box display="flex" flexDirection="column" alignItems="center">
              <AttachMoneyIcon fontSize="large" />
              <Typography variant="subtitle1">Affordable Prices</Typography>
            </Box>
            <Box display="flex" flexDirection="column" alignItems="center">
              <TimerIcon fontSize="large" />
              <Typography variant="subtitle1">Timely Service</Typography>
            </Box>
          </Stack>
        </Box>

        <p>I believe in maintaining excellent relationships with my clients. When doing business with me you are entering into a partnership. I am dedicated to the success of your business.</p>

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
        <div className={styles.formContainer}>
          <form className={styles.contactForm}>
            <label htmlFor="fname">First name:</label>
            <input type="text" id="fname" name="fname" />

            <label htmlFor="lname">Last name:</label>
            <input type="text" id="lname" name="lname" />

            <label htmlFor="email">Email:</label>
            <input type="email" id="email" name="email" />

            <label htmlFor="phone">Phone:</label>
            <input type="tel" id="phone" name="phone" />

            <label htmlFor="message">Message:</label>
            <textarea id="message" name="message"></textarea>

            <div className={styles.centerButton}>
              <button type="submit" className={styles.button}>Submit</button>
            </div>
          </form>
        </div>

                {/* <img className={styles.img} src="/images/ladyatcomputer.jpg" alt="A lady typing on a laptop and smiling">
        </img>
        <img className={styles.img} src="/images/manonphone.jpg" alt="A man on a phone smiling" >
        </img> */}
      </div>
    </>
  );
}







export default HomePage;
