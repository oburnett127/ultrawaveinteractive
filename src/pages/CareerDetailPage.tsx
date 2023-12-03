import React from 'react';
import CareerItem from '../components/CareerItem';
import { useParams } from 'react-router-dom';
import { Navigate } from 'react-router-dom';

function CareerDetailPage() {
  const { id } = useParams();  

  return (
      <CareerItem idNum={String(id)} />
  );
}

export default CareerDetailPage;
