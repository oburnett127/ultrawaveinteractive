import React from 'react';
import styles from "./Home.module.css";

function HomePage() {
  return (
    <>
      <h1 className={styles.headerText}>Ultrawave Interactive Web Design</h1>
      <p>I make websites and technology solutions for less!</p>
      <div style={{
        display: "flex",
        justifyContent: "center" 
      }}>
        <img src="/images/meeting.jpg" alt="Business people in a meeting smiling." />
      </div>
      <div style={{ clear: "both" }}></div>
      <hr></hr>
      <div className={styles.blockContainer}>
        <img className={styles.img} src="/images/ladyatcomputer.jpg" alt="A lady typing on a laptop and smiling">
        </img>
        <div className={styles.flexCenter}>
          <button className={styles.button}>Schedule a Free Consultation</button>
        </div>
      </div>
      <div style={{ clear: "both" }}></div>
      <hr></hr>
      <div className={styles.blockContainer}>
        <img className={styles.img} src="/images/manonphone.jpg" alt="A man on a phone smiling." >
        </img>
        <div className={styles.flexCenter}>
          <a href="tel:+14055198318" aria-label="or you can call me at +1 405-519-8318">
            <button className={styles.button}>or you can call me at +1 405-519-8318</button>
          </a>
        </div>
      </div>
      <div style={{ clear: "both" }}></div>
    </>
  );
}

export default HomePage;
