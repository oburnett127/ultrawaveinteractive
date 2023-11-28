import React from 'react';
import { useParams } from 'react-router-dom';
import { Navigate } from 'react-router-dom';
import CareerUpdateForm from '../components/CareerUpdateForm';

function CareerUpdatePage() {
  const { id } = useParams();

  //const numericId = parseInt(id || '', 10);

  return (
      <CareerUpdateForm id={id} />
  );
}

export default CareerUpdatePage;
