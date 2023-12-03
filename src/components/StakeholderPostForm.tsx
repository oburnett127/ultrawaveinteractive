import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, SubmitHandler } from 'react-hook-form';

interface FormData {
  firstName: string;
  lastName: string;
  pictureUrl?: string;
}

function StakeholderPostForm() {
  const navigate = useNavigate();
  const [message, setMessage] = useState<string | null>(null);

  const { register, handleSubmit, formState: { isSubmitting, errors } } = useForm<FormData>();

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    // const jwtToken = localStorage.getItem('jwtToken') || '';
    const serverUrl = process.env.REACT_APP_SERVER_URL;

    if (!serverUrl) {
      console.error('Server URL is not defined');
      return;
    }

    try {
      const response = await fetch(`${serverUrl}/stakeholder/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 'Authorization': `Bearer ${jwtToken}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        setMessage('An error occurred. Stakeholder could not be added.');
        console.error('An error occurred. Stakeholder could not be added.');
        return;
      } else {
        setMessage('Stakeholder was successfully added.');
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error('Fetch Error: ', error.message);
      } else {
        console.error('An unexpected error occurred');
      }
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
          <input type="text" {...register("firstName", { required: true })} />
        </p>
        {errors?.firstName && <span>The first name is required.</span>}
        <p>
          <label htmlFor="lastName">Last Name</label>
          <input type="text" {...register("lastName", { required: true })} />
        </p>
        {errors?.lastName && <span>The last name is required.</span>}
        <p>
          <label htmlFor="pictureUrl">Picture URL</label>
          <input type="text" {...register("pictureUrl", { required: false })} />
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
