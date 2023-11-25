import React, { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import EditIcon from "@mui/icons-material/Edit";
import ClearIcon from "@mui/icons-material/Clear";
import { UserContext } from "./UserContext";
import axios from 'axios';

type Career = {
  title: string;
  postDate: Date;
  description: string;
  requirements: string;
  idNum: number;
};

function CareerItem({ id }) {
  const context = useContext(UserContext);
  const [career, setCareer] = useState<Career | undefined>();
  let isLoggedIn = false;
  
  if(context && context.isLoggedIn) {
    isLoggedIn = context.isLoggedIn;
  }

  useEffect(() => {
    const fetchCareer = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_SERVER_URL}/job/findOne/${id}`, {
          headers: {
            'Content-Type': 'application/json',
          },
        });

        setCareer(response.data);
      } catch (error) {
        console.error('Error fetching career details:', error);
      }
    };

    const numericId = parseInt(id, 10);

    if (!isNaN(numericId)) {
      fetchCareer();
    }
  }, [id]);

  const { title, postDate, description, requirements, idNum } = career || {};

  const formattedPostDate = career?.postDate ? new Date(career.postDate).toLocaleDateString() : '';

  return (
    <React.Fragment>
      <h2>{title}</h2>
      <p><b>Post Date: </b> {new Date(formattedPostDate).toLocaleDateString()}</p>
      <p><b>Description: </b>{description}</p>
      <p><b>Requirements: </b>{requirements}</p>
      {isLoggedIn && (
        <menu>
          <Link to={{ pathname: `/careers/${idNum}/edit` }} state={{ title, postDate, description, requirements }}>
            <EditIcon />
          </Link>
          <Link to={{ pathname: `/careers/${idNum}/delete` }}>
            <ClearIcon />
          </Link>
        </menu>
      )}
    </React.Fragment>
  );
}

export default CareerItem;
