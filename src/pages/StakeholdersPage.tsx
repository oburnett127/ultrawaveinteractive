import React from 'react';
import StakeholdersList from '../components/StakeholdersList';
import { Link } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';
import classes from './StakeholdersPage.module.css';

function StakeholdersPage() {
  return (
    <>
      <h1 className={classes.pageTitle}>Stakeholders</h1>
      <StakeholdersList /><br></br>
      <Link to={{ pathname: `/stakeholder/add` }}>
        <AddIcon />
      </Link>
    </>
  );
}

export default StakeholdersPage;
