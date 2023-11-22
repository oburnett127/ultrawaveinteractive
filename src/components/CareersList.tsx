import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

import classes from './CareersList.module.css';

type Career = {
  id: number;
  title: string;
  description: string;
  requirements: string;
  postDate: Date;
};

const CareersList: React.FC = () => {
  const [careers, setCareers] = useState<Career[]>([]);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_SERVER_URL}/job/findAll`, {
          headers: {
            'Content-Type': 'application/json',
          },
        });

        setCareers(response.data);
      } catch (error) {
        console.error('Error fetching careers:', error);
      }
    };

    fetchData();
  }, []);

  const handleViewDetailsClick = (careerId) => {
    // Construct the URL for the CareerDetailPage
    const careerDetailUrl = `/careers/${careerId}`;
    
    // Use navigate to navigate to the CareerDetailPage
    navigate(careerDetailUrl);
  };

  return (
    <div className={classes["careers-list"]}>
      {careers.map((career) => (
        <React.Fragment key={career.id}>
          <div className={classes["career-item"]}>
            <h2>{career.title}</h2>
            <p>Post Date: {new Date(career.postDate).toLocaleDateString()}</p>
            <button onClick={() => handleViewDetailsClick(career.id)}>
              View Details
            </button>
          </div>
          <hr />
        </React.Fragment>
      ))}
    </div>
  );  
};

export default CareersList;
