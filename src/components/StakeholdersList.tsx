import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import EditIcon from '@mui/icons-material/Edit';
import ClearIcon from '@mui/icons-material/Clear';
import classes from './StakeholdersList.module.css';

type Stakeholder = {
  id: number;
  firstName: string;
  lastName: string;
  pictureUrl: string;
};

const StakeholdersList: React.FC = () => {
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);

  useEffect(() => {
    
    const fetchData = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_SERVER_URL}/stakeholder/findAll`, {
          headers: {
            'Content-Type': 'application/json',
          },
        });

        setStakeholders(response.data);  
      } catch (error) {
        console.error('Error fetching stakeholders:', error);
      }
    };

    fetchData();
  }, []);

  return (
    <div className={classes["flex-container"]}>
      {stakeholders.map((stakeholder) => (
        <div>
          <div key={stakeholder.id}>
            <img className={classes["image"]} src={stakeholder.pictureUrl} alt={`${stakeholder.firstName} ${stakeholder.lastName}` } />
            <p className={classes["stakeholderName"]}>{stakeholder.firstName} {stakeholder.lastName}</p>
          </div>
            <Link to={{ pathname: `/stakeholder/${stakeholder.id}/edit` }}>
              <EditIcon />
            </Link>
            <Link to={{ pathname: `/stakeholder/${stakeholder.id}/delete` }}>
              <ClearIcon />
            </Link>
          </div>
      ))}
    </div>
  );
};

export default StakeholdersList;
