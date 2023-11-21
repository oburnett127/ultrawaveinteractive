import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import classes from './careerItem.module.css';
import EditIcon from "@mui/icons-material/Edit";
import ClearIcon from "@mui/icons-material/Clear";
import { UserContext } from "./UserContext";

function CareerItem({ career }) {
    const user = useContext(UserContext);

    if(user === undefined) return;

    const userIsAdmin = user.isAdmin;
    const careerData = career.data;

    //console.log("user.empId: " + user?.employerId);
    //console.log("career.empId: " + career.employerId);

    return (
         <article className={classes.career}>
            <h2>{career.data.title}</h2>
            <time>{career.data.postDate}</time>
            <p>{career.data.description}</p>
            <p>{career.data.requirements}</p>
            <menu className={classes.actions}>
                {
                  userIsAdmin === true && (
                    <>
                        <Link to={{ pathname: `/careers/${career.data.id}/edit` }} state={{careerData}}>
                            <EditIcon />
                        </Link>
                        <Link to={{ pathname: `/careers/${career.data.id}/delete` }}>
                            <ClearIcon />
                        </Link>
                    </>
                  )
                }
            </menu>
        </article>
    );
}

export default CareerItem;
