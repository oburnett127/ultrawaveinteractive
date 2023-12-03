import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, SubmitHandler } from 'react-hook-form';

type CareerFormData = {
  title: string;
  description: string;
  requirements: string;
};

function CareerPostForm() {
  const navigate = useNavigate();
  const [message, setMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors },
  } = useForm<CareerFormData>(); // Add type for form data

  const onSubmit: SubmitHandler<CareerFormData> = async (data) => {
    // const jwtToken = localStorage.getItem('jwtToken');

    const response = await fetch(`${process.env.REACT_APP_SERVER_URL}/job/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 'Authorization': `Bearer ${jwtToken}`,
      },
      body: JSON.stringify(data), // Use data directly
    });

    if (!response.ok) {
      setMessage('An error occurred. Career could not be created.');
      console.error('An error occurred. Career could not be created.');
      return;
    } else {
      setMessage('Career was successfully created.');
    }
  };

  function handleCancel() {
    navigate('..');
  }

  return (
    <>
      <p>{message}</p>
      <form onSubmit={handleSubmit(onSubmit)}>
        <p>
          <label htmlFor="title">Title</label>
          <input type="text" {...register('title', { required: true })} />
        </p>
        {errors?.title && <span>The title is required.</span>}
        <p>
          <label htmlFor="description">Description</label>
          <textarea {...register('description', { required: false })} />
        </p>
        <p>
          <label htmlFor="requirements">Requirements</label>
          <textarea {...register('requirements', { required: false })} />
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
