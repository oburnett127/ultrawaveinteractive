import React, { useState } from 'react';
import { useNavigate, useNavigation } from 'react-router-dom';
import { useForm } from 'react-hook-form';

function CareerPostForm() {
  const navigate = useNavigate();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';
  const [message, setMessage] = useState(null);

  const {register, handleSubmit, formState: {errors}} = useForm();

  const onSubmit = async (data) => {
  
    //const jwtToken = localStorage.getItem('jwtToken');

    const response = await fetch(process.env.REACT_APP_SERVER_URL + '/job/create', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
      //  'Authorization': `Bearer ${jwtToken}`,
      },
      body: JSON.stringify({ title: data.title, description: data.description, requirements: data.requirements}),
    });
      
    if(!response.ok) {
      setMessage('An error occurred. Career could not be created.');
      console.error('An error occurred. Career could not be created.');
      return;
    } else {
      setMessage('Career was successfully created.');
    }
  }

  function handleCancel() {
    navigate('..');
  }

  return (
    <>
      <p>{message}</p>
      <form onSubmit={handleSubmit(onSubmit)}>
        <p>
          <label htmlFor="title">Title</label>
          <input type="text" {...register("title", {required: true})} />
        </p>
        {errors?.title && <span>The title is required.</span>}
        <p>
          <label htmlFor="description">Description</label>
          <textarea {...register("description", {required: false})} />
        </p>
        <p>
          <label htmlFor="requirements">Requirements</label>
          <textarea {...register("requirements", {required: false})} />
        </p>
        <div>
          <button type="button" onClick={handleCancel} disabled={isSubmitting}>
            Cancel
          </button>
          <button type="submit">Submit</button>
        </div>
      </form>
    </>
  );
}

export default CareerPostForm;
