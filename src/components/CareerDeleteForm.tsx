import React from 'react';
import { useState } from 'react';
import { useNavigate } from "react-router-dom";

function CareerDeleteForm(id) {
    const navigate = useNavigate();
    const [careerDeleted, setCareerDeleted] = useState(false);
    const [message, setMessage] = useState("Are you sure you want to delete this career?");

    //const jwtToken = localStorage.getItem('jwtToken');

    async function handleDelete() {
        try {
            const response = await fetch(process.env.REACT_APP_SERVER_URL + `/job/deleteJob/${id.id}`, {
                method: 'DELETE',
                headers: {
      //              'Authorization': `Bearer ${jwtToken}`,
                    'Content-Type': 'application/json',
                },
            });
    
            if(!response.ok) {
                setMessage('Delete failed.');
                console.error('Delete failed.');
            } else {
                setMessage("Delete was successful.");
            }
        } catch (error) {
            setMessage('Delete failed due to network error.');
            console.error('Network error:', error);
        }
    };

    const handleCancel = () => {
        navigate('..');
    }

    return (
        <>
            <p>{message}</p>
            { !careerDeleted &&
                <>
                    <button onClick={handleCancel}>
                        Cancel
                    </button>
                    <button onClick={handleDelete}>
                        Yes, I am sure
                    </button>
                </>
            }
        </>
    );
};

export default CareerDeleteForm;
