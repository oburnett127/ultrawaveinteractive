import React from 'react';
import CareerItem from '../components/CareerItem';
import { useParams } from 'react-router-dom';
import { Navigate } from 'react-router-dom';

function CareerDetailPage() {
  const { id } = useParams();

  const numericId = parseInt(id || '', 10);

  if (isNaN(numericId)) {
    return <Navigate to="/error" replace />;
  }    

  return (
      <CareerItem id={numericId} />
  );
}

export default CareerDetailPage;
