import React, { useContext }from 'react';
import StakeholdersList from '../components/StakeholdersList';
import { useNavigate, Link } from 'react-router-dom';
import { UserContext } from '../components/UserContext';
import classes from './StakeholdersPage.module.css';

function StakeholdersPage() {
  const isLoggedIn = localStorage.getItem('isLoggedIn');
  const navigate = useNavigate();

  function handleAddNewStakeholderClick() {
    const stakeholderPostPageUrl: string = `/stakeholders/add`;
    navigate(stakeholderPostPageUrl);
  };
  return (
    <>
      <h1 className={classes.pageTitle}>Stakeholders</h1>
      <StakeholdersList /><br />
      {isLoggedIn && (
        <button onClick={handleAddNewStakeholderClick}>
          Add New
        </button>
      )}
    </>
  );
}

export default StakeholdersPage;
