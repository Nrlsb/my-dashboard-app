import React, { useState, useEffect, useRef } from 'react';
import { apiService } from '../api/apiService';
import './AccessoryCarousel.css';

const AccessoryCarousel = () => {
  const [accessories, setAccessories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const carouselRef = useRef(null);

  useEffect(() => {
    const fetchAccessories = async () => {
      try {
        setLoading(true);
        const data = await apiService.getAccessories();
        setAccessories(data);
        setLoading(false);
      } catch (err) {
        setError('No se pudieron cargar los accesorios.');
        console.error(err);
        setLoading(false);
      }
    };

    fetchAccessories();
  }, []);

  // Effect for auto-scrolling
  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    const intervalId = setInterval(() => {
      // A tolerance of 1px for floating point inaccuracies
      const atEnd = carousel.scrollLeft + carousel.offsetWidth >= carousel.scrollWidth - 1;

      if (atEnd) {
        carousel.scrollTo({
          left: 0,
          behavior: 'smooth',
        });
      } else {
        carousel.scrollBy({
          left: carousel.offsetWidth,
          behavior: 'smooth',
        });
      }
    }, 15000); // Scroll every 15 seconds

    // Cleanup interval on component unmount
    return () => clearInterval(intervalId);
  }, [accessories]); // Rerun if accessories change

  if (loading) {
    return <div className="p-4">Cargando accesorios...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  // Do not render the component if there are no accessories
  if (accessories.length === 0) {
    return null;
  }

  return (
    <div className="accessory-carousel-container">
      <h2 className="text-2xl font-bold mb-4 text-white">Accesorios</h2>
      <div className="accessory-carousel" ref={carouselRef}>
        {accessories.map((item) => (
          <div key={item.id} className="accessory-card">
            <img src={item.image_url} alt={item.name} className="accessory-image" />
            <div className="accessory-info">
              <h3 className="accessory-name">{item.name}</h3>
              <p className="accessory-price">{item.formattedPrice}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AccessoryCarousel;
