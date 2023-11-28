import React, { useState } from 'react';
import { useNavigate, useNavigation } from 'react-router-dom';
import { useForm } from 'react-hook-form';

function StakeholderPostForm() {
  const navigate = useNavigate();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';
  const [message, setMessage] = useState(null);

  const {register, handleSubmit, formState: {errors}} = useForm();

  const onSubmit = async (data) => {
  
    //const jwtToken = localStorage.getItem('jwtToken');

    const response = await fetch(process.env.REACT_APP_SERVER_URL + '/stakeholder/create', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
      //  'Authorization': `Bearer ${jwtToken}`,
      },
      body: JSON.stringify({ firstName: data.firstName, lastName: data.lastName, pictureUrl: data.pictureUrl }),
    });
      
    if(!response.ok) {
      setMessage('An error occurred. Stakeholder could not be added.');
      console.error('An error occurred. Stakeholder could not be added.');
      return;
    } else {
      setMessage('Stakeholder was successfully added.');
    }
  }

  const handleCancel = () => {
    navigate('..');
  }

  return (
    <>
      <p>{message}</p>
      <form onSubmit={handleSubmit(onSubmit)}>
        <p>
          <label htmlFor="firstName">First Name</label>
          <input type="text" {...register("firstName", {required: true})} />
        </p>
        {errors?.title && <span>The first name is required.</span>}
        <p>
          <label htmlFor="lastName">Last Name</label>
          <input type="text" {...register("lastName", {required: true})} />
        </p>
        {errors?.title && <span>The last name is required.</span>}
        <p>
          <label htmlFor="pictureUrl">Picture URL</label>
          <input type="text" {...register("pictureUrl", {required: false})} />
        </p>
        <div>
          <button type="button" onClick={handleCancel} disabled={isSubmitting}>
            Cancel
          </button>
          <button type="submit">Add Stakeholder</button>
        </div>
      </form>
    </>
  );
}

export default StakeholderPostForm;
