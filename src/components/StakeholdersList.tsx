import React, { useEffect, useState } from 'react';
import axios from 'axios';

type Stakeholder = {
  id: number;
  firstName: string;
  lastName: string;
  pictureUrl: string;
};

const StakeholdersList: React.FC = () => {
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);

  useEffect(() => {

    console.log("line 1");
    
    const fetchData = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_SERVER_URL}/stakeholder/findAll`, {
          headers: {
            'Content-Type': 'application/json',
          },
        });

        //console.log('response.data: ', response.data);
        setStakeholders(response.data);  
      } catch (error) {
        console.error('Error fetching stakeholders:', error);
      }
    };

    fetchData();
  }, []);

  return (
    <div>
      <h1>Stakeholders</h1>
      <div className="stakeholder-list">
        {stakeholders.map((stakeholder) => (
          <div key={stakeholder.id} className="stakeholder">
            <img src={stakeholder.pictureUrl} alt={`${stakeholder.firstName} ${stakeholder.lastName}`} />
            <p>{stakeholder.firstName} {stakeholder.lastName}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StakeholdersList;
