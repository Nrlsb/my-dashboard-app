import React, { useState, useEffect, useRef } from 'react';
import apiService from '../api/apiService';
import './ProductGroupCarousel.css';

const ProductGroupCarousel = ({ onNavigateToCategory }) => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const carouselRef = useRef(null);

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
      const atEnd = carousel.scrollLeft + carousel.offsetWidth >= carousel.scrollWidth - 1;

      if (atEnd) {
        carousel.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        carousel.scrollBy({ left: carousel.offsetWidth, behavior: 'smooth' });
      }
    }, 5000); // Scroll every 5 seconds

    return () => clearInterval(intervalId);
  }, [groups, loading]);

  const handleCardClick = (groupCode) => {
    if (onNavigateToCategory) {
      onNavigateToCategory(groupCode);
    }
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
    <div className="product-group-carousel-container">
      <h2 className="text-2xl font-bold mb-4 text-white">Categorías</h2>
      <div className="product-group-carousel" ref={carouselRef}>
        {groups.map((group) => (
          <div
            key={group.group_code}
            className="product-group-card cursor-pointer transform hover:scale-105 transition-transform duration-200"
            onClick={() => handleCardClick(group.group_code)}
          >
            <img src={group.image_url} alt={group.name} className="product-group-image" />
            <div className="product-group-info">
              <h3 className="product-group-name">{group.name}</h3>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductGroupCarousel;
