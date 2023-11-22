import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
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
          <Link to={{ pathname: `/careers/${career.id}` }}>
            <div key={career.id} className={classes["career-item"]}>
              <h2>{career.title}</h2>
              <p><b>Post Date: </b> {new Date(career.postDate).toLocaleDateString()}</p>
            </div>
            <hr></hr>
          </Link>
        ))}
      </div>
  );
};

export default CareersList;
