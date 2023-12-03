import React, { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import EditIcon from "@mui/icons-material/Edit";
import ClearIcon from "@mui/icons-material/Clear";
import { UserContext } from "./UserContext";

type Career = {
  title: string;
  postDate: string; // Changed to string as it's assigned to new Date()
  description: string;
  requirements: string;
  id: string;
};

interface CareerItemProps {
  idNum: string; // Change to string since it's used in the URL
}

function CareerItem({ idNum }: CareerItemProps) {
  const context = useContext(UserContext);
  const [career, setCareer] = useState<Career | undefined>();
  const isLoggedIn = context?.isLoggedIn || false; // Use optional chaining

  useEffect(() => {
    const fetchCareer = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_SERVER_URL}/job/findOne/${idNum}`, {
          method: "GET",
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: Career = await response.json(); // Annotate data as Career type

        setCareer(data);
      } catch (error) {
        console.error('Error fetching career details:', error);
      }
    };

    fetchCareer();
  }, [idNum]);

  const { id, title, postDate, description, requirements } = career || {};

  const formattedPostDate = career?.postDate ? new Date(career.postDate).toLocaleDateString() : '';

  return (
    <React.Fragment>
      <h2>{title}</h2>
      <p><b>Post Date: </b> {formattedPostDate}</p>
      <p><b>Description: </b>{description}</p>
      <p><b>Requirements: </b>{requirements}</p>
      {isLoggedIn && (
        <menu>
          <Link to={{ pathname: `/careers/${id}/edit` }} state={{ title, postDate, description, requirements }}>
            <EditIcon />
          </Link>
          <Link to={{ pathname: `/careers/${id}/delete` }}>
            <ClearIcon />
          </Link>
        </menu>
      )}
    </React.Fragment>
  );
}

export default CareerItem;
