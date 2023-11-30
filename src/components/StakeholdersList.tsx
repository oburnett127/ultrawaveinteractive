import React, { useEffect, useState } from 'react';
import axios from 'axios';
import StakeholderForm from './StakeholderForm';
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
        <StakeholderForm key={stakeholder.id} stakeholder={stakeholder} />
      ))}
    </div>
  );
}

export default StakeholdersList;
