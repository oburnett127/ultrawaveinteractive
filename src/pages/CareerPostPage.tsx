import React from 'react';
import { useParams } from 'react-router-dom';
import CareerPostForm from '../components/CareerPostForm';

function CareerPostPage() {
  const { id } = useParams();

  //const numericId = parseInt(id || '', 10);

  return (
      <CareerPostForm />
  );
}

export default CareerPostPage;
