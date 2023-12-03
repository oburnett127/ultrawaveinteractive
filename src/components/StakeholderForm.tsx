import React, { useEffect, useState, useContext } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { UserContext } from '../components/UserContext';

interface Stakeholder {
  id: string;
  firstName: string;
  lastName: string;
  pictureUrl: string;
}

interface StakeholderFormProps {
  stakeholder: Stakeholder;
}

interface FormValues {
  firstName: string;
  lastName: string;
  pictureUrl?: string;
}

const StakeholderForm: React.FC<StakeholderFormProps> = ({ stakeholder }) => {
  const isLoggedIn = localStorage.getItem('isLoggedIn');
  const [deleteClicked, setDeleteClicked] = useState(false);
  const [message, setMessage] = useState<string>('');

  const { register, handleSubmit, formState: { isSubmitting } } = useForm<FormValues>();

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    const { firstName, lastName, pictureUrl } = data;
    const serverUrl = process.env.REACT_APP_SERVER_URL;

    if (!serverUrl) {
      console.error('Server URL is not defined');
      return;
    }

    try {
      const response = await fetch(`${serverUrl}/stakeholder/update/${stakeholder.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ firstName, lastName, pictureUrl }),
      });

      if (!response.ok) {
        throw new Error('Response was not ok!');
      }

      setMessage('Update successful');
    } catch (error) {
      if (error instanceof Error) {
        console.error('Fetch Error: ', error.message);
      }
    }
  };

  useEffect(() => {
    async function handleDeleteClick() {
      const serverUrl = process.env.REACT_APP_SERVER_URL;
      if (!serverUrl) {
        console.error('Server URL is not defined');
        return;
      }

      try {
        const response = await fetch(`${serverUrl}/stakeholder/deleteStakeholder/${stakeholder.id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Response was not ok!');
        }

        setMessage('Delete successful');
      } catch (error) {
        if (error instanceof Error) {
          console.error('Fetch Error: ', error.message);
        }
      }
    }

    if (deleteClicked) {
      handleDeleteClick();
    }
  }, [deleteClicked, stakeholder.id]);

  return (
    <div>
      {!deleteClicked && (
        <form onSubmit={handleSubmit(onSubmit as SubmitHandler<{
          firstName: string;
          lastName: string;
          pictureUrl?: string;
        }>)}>
          <img
            src={stakeholder.pictureUrl}
            alt={`${stakeholder.firstName} ${stakeholder.lastName}`}
            style={{ maxWidth: '100px', maxHeight: '125px' }}
          />
          <p>
            {stakeholder.firstName} {stakeholder.lastName}
          </p>
          {isLoggedIn && (
            <>
              <button type="button" onClick={() => setDeleteClicked(true)}>
                Delete
              </button>
              <br />
              <input type="text" {...register('firstName', { required: true })} />
              <br />
              <input type="text" {...register('lastName', { required: true })} />
              <br />
              <input type="text" {...register('pictureUrl', { required: false })} />
              <br />
              <button type="submit" disabled={isSubmitting}>
                Save
              </button>
            </>
          )}
        </form>
      )}
      <p>{message}</p>
    </div>
  );
};

export default StakeholderForm;
