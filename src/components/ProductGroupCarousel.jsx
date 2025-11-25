import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../api/apiService';


const ProductGroupCarousel = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const carouselRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchGroupDetails = async () => {
      try {
        setLoading(true);
        const data = await apiService.getProductGroupsDetails();
        setGroups(data);
        setLoading(false);
      } catch (err) {
        setError('No se pudieron cargar los grupos de productos.');
        console.error(err);
        setLoading(false);
      }
    };

    fetchGroupDetails();
  }, []);

  // Auto-scrolling effect
  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel || loading) return;

    const intervalId = setInterval(() => {
      const atEnd =
        carousel.scrollLeft + carousel.offsetWidth >= carousel.scrollWidth - 1;

      if (atEnd) {
        carousel.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        carousel.scrollBy({ left: carousel.offsetWidth, behavior: 'smooth' });
      }
    }, 5000); // Scroll every 5 seconds

    return () => clearInterval(intervalId);
  }, [groups, loading]);

  const handleCardClick = (groupCode) => {
    navigate(`/category/${groupCode}`);
  };

  if (loading) {
    return <div className="p-4">Cargando grupos...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  if (groups.length === 0) {
    return null;
  }

  return (
    <div className="relative py-4 mt-8">
      <h2 className="text-2xl font-bold mb-4 text-white">Categorías</h2>
      <div className="flex overflow-x-auto gap-4 pb-4" ref={carouselRef}>
        {groups.map((group) => (
          <div
            key={group.group_code}
            className="flex-none w-44 bg-gray-800 rounded-lg overflow-hidden cursor-pointer transition-transform duration-200 ease-in-out hover:-translate-y-1"
            onClick={() => handleCardClick(group.group_code)}
          >
            <img
              src={group.image_url}
              alt={group.name}
              className="w-full h-32 object-cover"
            />
            <div className="p-4">
              <h3 className="text-base font-semibold text-white whitespace-nowrap overflow-hidden text-ellipsis">{group.name}</h3>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductGroupCarousel;
