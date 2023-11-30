import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

function StakeholderForm({ stakeholder }) {
  const [deleteClicked, setDeleteClicked] = useState(false);
  const [message, setMessage] = useState('');

  const { register, handleSubmit } = useForm();

  function onSubmit(data) {
    console.log(data);
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
          <button type="button" onClick={() => setDeleteClicked(true)}>Delete</button><br />
          <input type="text" {...register('firstName', { required: true })} /><br />
          <input type="text" {...register('lastName', { required: true })} /><br />
          <input type="text" {...register('pictureUrl', { required: false })} /><br />
          <input type="text" {...register('orderNumber', { required: true })} /><br />
          <button type="submit">Save</button>
        </form>
      )}
      <p>{message}</p>
    </div>
  );
}

export default StakeholderForm;
