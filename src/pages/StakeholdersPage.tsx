import React from 'react';
import StakeholdersList from '../components/StakeholdersList';
import classes from './StakeholdersPage.module.css';

function StakeholdersPage() {
  return (
    <>
      <h1 className={classes.pageTitle}>Stakeholders</h1>
      <StakeholdersList />
    </>
  );
}

export default StakeholdersPage;
