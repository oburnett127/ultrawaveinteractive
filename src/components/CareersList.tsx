import React, { useEffect, useState } from 'react';
import axios from 'axios';
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

  return (
      <div className={classes["careers-list"]}>
        {careers.map((career) => (
          <>
            <div key={career.id} className={classes["career-item"]}>
              <h2>{career.title}</h2>
              <p><b>Post Date: </b> {new Date(career.postDate).toLocaleDateString()}</p>
              <p><b>Description: </b> {career.description}</p>
              <p><b>Requirements: </b> {career.requirements}</p>
            </div>
          <hr></hr>
          </>
        ))}
      </div>
  );
};

export default CareersList;

