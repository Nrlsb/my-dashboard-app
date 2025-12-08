import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../api/apiService';


import CarouselSkeleton from './CarouselSkeleton';

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

  const handleCardClick = (group) => {
    if (group.type === 'custom_collection') {
      navigate(`/collection/${group.collection_id}`);
    } else {
      navigate(`/category/${group.group_code}`);
    }
  };

  if (loading) {
    return <CarouselSkeleton title="Categorías" />;
  }

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  if (groups.length === 0) {
    return null;
  }

  return (
    <div className="relative py-4 mt-8">
      <h2 className="text-2xl font-bold mb-4 text-espint-blue">Categorías</h2>
      <div className="grid grid-cols-2 gap-4 md:flex md:overflow-x-auto md:gap-4 md:pb-4" ref={carouselRef}>
        {groups.map((group) => (
          <div
            key={group.id || group.group_code}
            className="flex-none w-full md:w-44 bg-white rounded-lg overflow-hidden cursor-pointer transition-all duration-200 ease-in-out hover:-translate-y-1 shadow-sm hover:shadow-md border-b-[3px] border-espint-green group flex flex-col h-auto aspect-square md:aspect-auto md:h-auto"
            onClick={() => handleCardClick(group)}
          >
            {group.image_url ? (
              <img
                src={group.image_url}
                alt={group.name}
                className="w-full h-32 md:h-32 object-cover"
              />
            ) : (
              <div className="w-full h-full md:h-32 bg-[#183B64] flex items-center justify-center p-4">
                {/* Fallback Icon - using a generic box/grid icon or similar if available, otherwise just text/color as requested. 
                     User suggested: "Usa iconos grandes blancos sobre el fondo azul oscuro". 
                     Since I don't have dynamic icons per category in the data yet, I'll use a generic one or the first letter? 
                     Actually, I can import a generic icon like 'Package' or 'Grid' from lucide-react if I add it to imports, 
                     or just use a placeholder SVG. Let's check imports. 
                     The file imports nothing from lucide-react currently. I should add it.
                     Wait, I can't easily add imports with replace_file_content in the same call if it's far away.
                     I'll stick to a simple SVG or just the background for now, or maybe I can add the import in a separate call.
                     Let's use a simple SVG directly here to avoid import issues for now, or just the background as a base and then add icon.
                     User said: "Usa iconos grandes blancos".
                 */}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </div>
            )}
            <div className="p-3 md:p-4 flex-grow flex items-center justify-center md:block bg-white">
              <h3 className="text-sm md:text-base font-bold text-espint-blue text-center md:text-left md:whitespace-nowrap md:overflow-hidden md:text-ellipsis line-clamp-2 md:line-clamp-1">{group.name}</h3>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductGroupCarousel;
