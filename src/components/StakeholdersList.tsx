import React, { useEffect, useState } from 'react';
import StakeholderForm from './StakeholderForm';
import classes from './StakeholdersList.module.css';

type Stakeholder = {
  id: string;
  firstName: string;
  lastName: string;
  pictureUrl: string;
};

const StakeholdersList: React.FC = () => {
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_SERVER_URL}/stakeholder/findAll`, {
          method: "GET",
        });
  
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
  
        const data = await response.json();
        setStakeholders(data);
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
