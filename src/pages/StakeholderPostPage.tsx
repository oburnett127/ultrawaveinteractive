import React from 'react';
import StakeholderPostForm from '../components/StakeholderPostForm';
import classes from './StakeholdersPage.module.css';

function StakeholderPostPage() {
  return (
    <>
      <h1 className={classes.pageTitle}>Add Stakeholder</h1>
      <StakeholderPostForm />
    </>
  );
}

export default StakeholderPostPage;
