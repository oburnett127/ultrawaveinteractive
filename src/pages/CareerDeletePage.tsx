import React from 'react';
import { useParams } from 'react-router-dom';
import CareerDeleteForm from '../components/CareerDeleteForm';

function CareerDeletePage() {
  const { id } = useParams();

  return (
      <CareerDeleteForm id={id} />
  );
}

export default CareerDeletePage;
