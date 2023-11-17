import React from 'react';
import CareersList from '../components/CareersList';
import classes from './CareersPage.module.css';

function CareersPage() {
  return (
    <>
      <h1 className={classes.pageTitle}>Careers</h1>
      <p className={classes["p-text"]}>Check out the career opportunities below!</p>
      <CareersList />
    </>
  );
}

export default CareersPage;
