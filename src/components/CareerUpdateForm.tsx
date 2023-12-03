import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import classes from './CareerUpdateForm.module.css';

interface CareerUpdateFormProps {
  id: string;
}

const CareerUpdateForm: React.FC<CareerUpdateFormProps> = ({ id }) => {
  const navigate = useNavigate();
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const { register, handleSubmit, formState: { errors } } = useForm<{
    title: string;
    description: string;
    requirements: string;
  }>();

  const onSubmit = async (data: {
    title: string;
    description: string;
    requirements: string;
  }) => {
    const { title, description, requirements } = data;

    setIsSubmitting(true);

    try {
      const response = await fetch(`${process.env.REACT_APP_SERVER_URL}/job/update/${id}`, {
        method: 'PUT',
        headers: {
          // 'Authorization': `Bearer ${jwtToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, description, requirements }),
      });

      if (!response.ok) {
        setMessage('Update failed.');
        console.error('Update failed.');
      } else {
        setMessage("Update was successful.");
      }
    } catch (error) {
      setMessage('Update failed due to network error.');
      console.error('Network error:', error);
    }

    setIsSubmitting(false);
  }

  const handleCancel = () => {
    navigate('..');
  }

  return (
    <>
      <p className={classes.message}>{message}</p>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label htmlFor="title">Title:</label>
          <input type="text" {...register("title", { required: true })} />
        </div>
        {errors?.title && <span>The title is required.</span>}
        <div>
          <label htmlFor="description">Description:</label>
          <textarea {...register("description", { required: true })} />
        </div>
        {errors?.description && <span>The description is required.</span>}
        <div>
          <label htmlFor="description">Requirements:</label>
          <textarea {...register("requirements", { required: true })} />
        </div>
        {errors?.requirements && <span>The requirements are required.</span>}
        <button type="button" onClick={handleCancel} disabled={isSubmitting}>
          Cancel
        </button>
        <button type="submit">Submit</button>
      </form>
    </>
  );
};

export default CareerUpdateForm;
