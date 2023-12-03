import React from 'react';
import { useParams } from 'react-router-dom';
import CareerPostForm from '../components/CareerPostForm';

function CareerPostPage() {
  const { id } = useParams();

  return (
      <CareerPostForm />
  );
}

export default CareerPostPage;
