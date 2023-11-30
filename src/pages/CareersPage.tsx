import React from 'react';
import CareersList from '../components/CareersList';
import { useNavigate, Link } from 'react-router-dom';
import classes from './CareersPage.module.css';

function CareersPage() {

  const navigate = useNavigate();

  function handleAddNewCareerClick() {
    const careerPostPageUrl = `/careers/add`;
    navigate(careerPostPageUrl);
  };

  return (
    <>
      <h1 className={classes["pageTitle"]}>Careers</h1>
      <p className={classes["p-text"]}>Check out the career opportunities below!</p>
      <CareersList />
      <button type="button" onClick={() => handleAddNewCareerClick()}>
        Add New
      </button>
    </>
  );
}

export default CareersPage;
