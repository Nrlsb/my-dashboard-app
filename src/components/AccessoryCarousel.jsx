import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiService } from '../api/apiService';
import './AccessoryCarousel.css';

const AccessoryCarousel = ({ onViewProductDetails }) => {
  const [accessories, setAccessories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const carouselRef = useRef(null);

  const fetchAccessories = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiService.getAccessories();
      // Al recargar, nos aseguramos de que el scroll vuelva al inicio
      if (carouselRef.current) {
        carouselRef.current.scrollTo({ left: 0, behavior: 'auto' });
      }
      setAccessories(data);
      setLoading(false);
    } catch (err) {
      setError('No se pudieron cargar los accesorios.');
      console.error(err);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccessories();
  }, [fetchAccessories]);

  // Effect for auto-scrolling
  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel || loading) return; // No hacer nada si está cargando

    const intervalId = setInterval(() => {
      const atEnd = carousel.scrollLeft + carousel.offsetWidth >= carousel.scrollWidth - 1;

      if (atEnd) {
        fetchAccessories(); // Cargar nuevos accesorios
      } else {
        carousel.scrollBy({
          left: carousel.offsetWidth,
          behavior: 'smooth',
        });
      }
    }, 15000); // Scroll every 15 seconds

    return () => clearInterval(intervalId);
  }, [accessories, loading, fetchAccessories]); // Depender de 'loading' para reiniciar el intervalo

  const handleAccessoryClick = (productId) => {
    if (onViewProductDetails) {
      onViewProductDetails(productId);
    }
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
    <div className="accessory-carousel-container">
      <h2 className="text-2xl font-bold mb-4 text-white">Accesorios</h2>
      <div className="accessory-carousel" ref={carouselRef}>
        {accessories.map((item) => (
          <div 
            key={item.id} 
            className="accessory-card cursor-pointer transform hover:scale-105 transition-transform"
            onClick={() => handleAccessoryClick(item.id)}
          >
            <img src={item.image_url} alt={item.name} className="accessory-image" />
            <div className="accessory-info">
              <h3 className="accessory-name">{item.name}</h3>
              <p className="accessory-price">{item.formattedPrice}</p>
            </div>
          </div>
        ))}
      </div>
      {loading && <div className="carousel-loading-overlay">Cargando...</div>}
    </div>
  );
};

export default AccessoryCarousel;
