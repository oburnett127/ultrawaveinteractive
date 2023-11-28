import React from 'react';
import CareersList from '../components/CareersList';
import AddIcon from "@mui/icons-material/Add";
import { Link } from 'react-router-dom';
import classes from './CareersPage.module.css';

function CareersPage() {
  return (
    <>
      <h1 className={classes["pageTitle"]}>Careers</h1>
      <p className={classes["p-text"]}>Check out the career opportunities below!</p>
      <CareersList />
      <Link to={{ pathname: `/careers/add` }}>
        <AddIcon>Add Career</AddIcon>
      </Link>
    </>
  );
}

export default CareersPage;
