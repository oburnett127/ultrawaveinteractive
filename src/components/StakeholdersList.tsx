import React, { useEffect, useState } from 'react';
import axios from 'axios';

type Stakeholder = {
  id: number;
  firstName: string;
  lastName: string;
  photoUrl: string;
};

const StakeholdersList: React.FC = () => {
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);

  useEffect(() => {
    axios.get('/stakeholder/findAll')
      .then((response) => {
        setStakeholders(response.data);
      })
      .catch((error) => {
        console.error('Error fetching stakeholders:', error);
      });
  }, []);

  return (
    <div>
      <h1>Stakeholders List</h1>
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
