import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../api/apiService';
import CarouselSkeleton from './CarouselSkeleton';
import { ArrowRight } from 'lucide-react';

const LaunchGroupCarousel = () => {
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchLaunchGroups = async () => {
            try {
                setLoading(true);
                // Use public endpoint so sellers can see it too
                const allGroups = await apiService.getProductGroupsDetails();
                const launchGroups = allGroups.filter(g => g.is_launch_group);
                setGroups(launchGroups);
                setLoading(false);
            } catch (err) {
                setError('No se pudieron cargar los lanzamientos.');
                console.error(err);
                setLoading(false);
            }
        };

        fetchLaunchGroups();
    }, []);

    const handleCardClick = (group) => {
        navigate(`/collection/${group.id}`);
    };

    if (loading) return null; // Or skeleton if preferred, but existing skeleton might be improper size
    if (error) return null;   // Fail gracefully
    if (groups.length === 0) return null;

    return (
        <div className="relative py-4 mt-4 mb-8">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-espint-blue">Nuevos Lanzamientos</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groups.map((group) => (
                    <div
                        key={group.id}
                        className="group relative h-64 md:h-72 rounded-2xl overflow-hidden cursor-pointer shadow-md hover:shadow-xl transition-all duration-300"
                        onClick={() => handleCardClick(group)}
                    >
                        {/* Background Image */}
                        <div className="absolute inset-0">
                            {group.imageUrl ? (
                                <img
                                    src={group.imageUrl}
                                    alt={group.name}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    referrerPolicy="no-referrer"
                                />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-espint-blue to-espint-blue-dark" />
                            )}
                            {/* Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-90" />
                        </div>

                        {/* Content */}
                        <div className="absolute bottom-0 left-0 right-0 p-6 text-white transform transition-transform duration-300 translate-y-2 group-hover:translate-y-0">
                            <span className="inline-block px-3 py-1 bg-espint-green text-xs font-bold rounded-full mb-3 uppercase tracking-wider">
                                Nuevo
                            </span>
                            <h3 className="text-2xl font-bold mb-2 leading-tight">{group.name}</h3>
                            {group.description && (
                                <p className="text-gray-200 text-sm line-clamp-2 mb-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
                                    {group.description}
                                </p>
                            )}
                            <div className="flex items-center gap-2 text-espint-green font-semibold text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                Ver Colección <ArrowRight size={16} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default LaunchGroupCarousel;
