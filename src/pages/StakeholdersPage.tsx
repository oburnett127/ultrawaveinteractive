import React from 'react';
import StakeholdersList from '../components/StakeholdersList';
import { useNavigate, Link } from 'react-router-dom';
import classes from './StakeholdersPage.module.css';

function StakeholdersPage() {

  const navigate = useNavigate();

  function handleAddNewStakeholderClick() {
    const stakeholderPostPageUrl = `/stakeholders/add`;
    navigate(stakeholderPostPageUrl);
  };
  return (
    <>
      <h1 className={classes.pageTitle}>Stakeholders</h1>
      <StakeholdersList /><br></br>
      <button onClick={handleAddNewStakeholderClick}>
        Add New
      </button>
    </>
  );
}

export default StakeholdersPage;
