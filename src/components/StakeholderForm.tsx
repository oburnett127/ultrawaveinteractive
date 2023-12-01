import React, { useEffect, useState, useContext } from 'react';
import { useForm } from 'react-hook-form';
import { UserContext } from '../components/UserContext';

function StakeholderForm({ stakeholder }) {
  const { isLoggedIn } = useContext(UserContext);
  const [deleteClicked, setDeleteClicked] = useState(false);
  const [message, setMessage] = useState('');

  const { register, handleSubmit } = useForm();

  function onSubmit(data) {
    const { firstName, lastName, pictureUrl } = data;

    fetch(`${process.env.REACT_APP_SERVER_URL}/stakeholder/update/${(stakeholder.id).toString()}`, {
      method: 'PUT',
      headers: {
        //              'Authorization': `Bearer ${jwtToken}`,
                      'Content-Type': 'application/json',
                },
      body: JSON.stringify({ firstName, lastName, pictureUrl }),
    })
    .then(response => {
      if (!response.ok) throw new Error('Response was not ok!');
      setMessage('Update successful');
    })
    .catch(error => {
      console.error('Fetch Error: ', error);
    });
  };

  useEffect(() => {
    function handleDeleteClick() {
      fetch(`${process.env.REACT_APP_SERVER_URL}/stakeholder/deleteStakeholder/${(stakeholder.id).toString()}`, {
        method: 'DELETE',
      })
      .then(response => {
        if (!response.ok) throw new Error('Response was not ok!');
        setMessage('Delete successful');
      })
      .catch(error => {
        console.error('Fetch Error: ', error);
      });
    }

    if (deleteClicked) {
      handleDeleteClick();
    }
  }, [deleteClicked, stakeholder.id]);

  return (
    <div>
      { !deleteClicked && (
        <form onSubmit={handleSubmit(onSubmit)}>
          <img
            src={stakeholder.pictureUrl}
            alt={`${stakeholder.firstName} ${stakeholder.lastName}`}
            style={{ maxWidth: '100px', maxHeight: '125px' }}
          />
          <p>{stakeholder.firstName} {stakeholder.lastName}</p>
          { isLoggedIn && (
            <React.Fragment>
              <button type="button" onClick={() => setDeleteClicked(true)}>Delete</button><br />
              <input type="text" {...register('firstName', { required: true })} /><br />
              <input type="text" {...register('lastName', { required: true })} /><br />
              <input type="text" {...register('pictureUrl', { required: false })} /><br />
              <button type="submit">Save</button>
            </React.Fragment>
          )}
        </form>
      )}
      <p>{message}</p>
    </div>
  );
}

export default StakeholderForm;
