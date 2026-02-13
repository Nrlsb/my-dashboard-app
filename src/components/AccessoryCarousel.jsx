import React, { useState, useEffect, useCallback } from 'react';
import LoadingSpinner from './LoadingSpinner';
import { useNavigate } from 'react-router-dom';
import apiService from '../api/apiService';
import { useAuth } from '../context/AuthContext';


import CarouselSkeleton from './CarouselSkeleton';

const AccessoryCarousel = () => {
  const [accessories, setAccessories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const fetchAccessories = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiService.getAccessories();

      const filteredAccessories =
        user && user.restricted_groups
          ? data.filter(
            (acc) => !user.restricted_groups.includes(acc.group_code)
          )
          : data;

      setAccessories(filteredAccessories);
      setLoading(false);
    } catch (err) {
      setError('No se pudieron cargar los accesorios.');
      console.error(err);
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAccessories();
  }, [fetchAccessories]);

  const handleAccessoryClick = (productId) => {
    navigate(`/product-detail/${productId}`);
  };

  if (loading && accessories.length === 0) {
    return <CarouselSkeleton title="Accesorios" />;
  }

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  if (accessories.length === 0) {
    return null;
  }

  // Limit to 5 items
  const displayedAccessories = accessories.slice(0, 5);

  return (
    <div className="relative py-4 mt-8">
      <h2 className="text-2xl font-bold mb-4 text-espint-blue">Accesorios</h2>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {displayedAccessories.map((item) => (
          <div
            key={item.id}
            className="w-full bg-white rounded-lg overflow-hidden transition-all duration-200 ease-in-out cursor-pointer hover:-translate-y-1 shadow-sm hover:shadow-md border-b-[3px] border-espint-green group"
            onClick={() => handleAccessoryClick(item.id)}
          >
            <div className="relative">
              <img
                src={item.imageUrl}
                alt={item.name}
                className="w-full h-32 object-contain p-2"
                referrerPolicy="no-referrer"
                loading="lazy"
              />
              <span className="absolute bottom-0 right-0 bg-black/60 text-white text-[7px] px-1.5 py-0.5 pointer-events-none uppercase font-bold rounded-tl-sm">
                Ilustrativa
              </span>
            </div>
            <div className="p-3">
              <h3 className="text-sm font-bold text-espint-blue whitespace-nowrap truncate">{item.name}</h3>
            </div>
          </div>
        ))}
      </div>
      {loading && (
        <div className="absolute top-0 left-0 right-0 bottom-0 bg-gray-900/70 flex justify-center items-center z-10 rounded-lg">
          <LoadingSpinner text="Cargando..." />
        </div>
      )}
    </div>
  );
};

export default AccessoryCarousel;
