import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../api/apiService';


import CarouselSkeleton from './CarouselSkeleton';

const ProductGroupCarousel = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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

  // Limit to 5 items
  const displayedGroups = groups.slice(0, 5);

  return (
    <div className="relative py-4 mt-8">
      <h2 className="text-2xl font-bold mb-4 text-espint-blue">Categorías</h2>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {displayedGroups.map((group) => (
          <div
            key={group.id || group.group_code}
            className="w-full bg-white rounded-lg overflow-hidden cursor-pointer transition-all duration-200 ease-in-out hover:-translate-y-1 shadow-sm hover:shadow-md border-b-[3px] border-espint-green group flex flex-col h-auto aspect-square md:aspect-auto md:h-auto"
            onClick={() => handleCardClick(group)}
          >
            {group.imageUrl ? (
              <img
                src={group.imageUrl}
                alt={group.name}
                className="w-full h-32 md:h-32 object-cover"
              />
            ) : (
              <div className="w-full h-full md:h-32 bg-[#183B64] flex items-center justify-center p-4">
                {/* Fallback Icon */}
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
