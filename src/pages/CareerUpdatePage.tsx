import React from 'react';
import { useParams } from 'react-router-dom';
import { Navigate } from 'react-router-dom';
import CareerUpdateForm from '../components/CareerUpdateForm';

function CareerUpdatePage() {
  const { id } = useParams();

  return (
      <CareerUpdateForm id={String(id)} />
  );
}

export default CareerUpdatePage;
