import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../api/apiService';
import { useAuth } from '../context/AuthContext';


const AccessoryCarousel = () => {
  const [accessories, setAccessories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const carouselRef = useRef(null);
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

      if (carouselRef.current) {
        carouselRef.current.scrollTo({ left: 0, behavior: 'auto' });
      }
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

  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel || loading) return;

    const intervalId = setInterval(() => {
      const atEnd =
        carousel.scrollLeft + carousel.offsetWidth >= carousel.scrollWidth - 1;

      if (atEnd) {
        fetchAccessories();
      } else {
        carousel.scrollBy({
          left: carousel.offsetWidth,
          behavior: 'smooth',
        });
      }
    }, 15000);

    return () => clearInterval(intervalId);
  }, [accessories, loading, fetchAccessories]);

  const handleAccessoryClick = (productId) => {
    navigate(`/product-detail/${productId}`);
  };

  if (loading && accessories.length === 0) {
    return <div className="p-4">Cargando accesorios...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  if (accessories.length === 0) {
    return null;
  }

  return (
    <div className="relative py-4 mt-8">
      <h2 className="text-2xl font-bold mb-4 text-white">Accesorios</h2>
      <div className="flex overflow-x-auto gap-4 pb-4" ref={carouselRef}>
        {accessories.map((item) => (
          <div
            key={item.id}
            className="flex-none w-40 bg-gray-800 rounded-lg overflow-hidden transition-transform duration-200 ease-in-out cursor-pointer hover:-translate-y-[5px]"
            onClick={() => handleAccessoryClick(item.id)}
          >
            <img
              src={item.image_url}
              alt={item.name}
              className="w-full h-30 object-cover"
            />
            <div className="p-3">
              <h3 className="text-sm font-semibold text-white whitespace-nowrap truncate">{item.name}</h3>
              <p className="text-sm text-gray-400 mt-1">{item.formattedPrice}</p>
            </div>
          </div>
        ))}
      </div>
      {loading && <div className="absolute top-0 left-0 right-0 bottom-0 bg-gray-900/70 text-white flex justify-center items-center text-[1.2rem] rounded-lg z-10 transition-opacity duration-300 ease-in-out">Cargando...</div>}
    </div>
  );
};

export default AccessoryCarousel;
