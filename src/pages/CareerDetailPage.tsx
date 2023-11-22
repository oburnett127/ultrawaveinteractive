import React from 'react';
import CareerItem from '../components/CareerItem';
import { useParams } from "react-router-dom";
import classes from './CareersPage.module.css';

function CareerDetailPage() {
  const { id } = useParams();

  const numericId = parseInt(id, 10);

  console.log(numericId);

  return (
      <CareerItem id={numericId} />
  );
}

export default CareerDetailPage;
