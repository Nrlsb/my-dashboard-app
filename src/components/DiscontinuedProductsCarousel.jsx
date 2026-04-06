import React, { useState, useEffect, useCallback } from 'react';
import LoadingSpinner from './LoadingSpinner';
import { useNavigate } from 'react-router-dom';
import apiService from '../api/apiService';
import { useAuth } from '../context/AuthContext';
import CarouselSkeleton from './CarouselSkeleton';

import { ChevronRight } from 'lucide-react';

const DiscontinuedProductsCarousel = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const { user } = useAuth();

    const fetchDiscontinuedProducts = useCallback(async () => {
        try {
            setLoading(true);
            const data = await apiService.getDiscontinuedProducts();

            const filteredProducts =
                user && user.restricted_groups
                    ? data.filter(
                        (p) => !user.restricted_groups.includes(p.group_code)
                    )
                    : data;

            setProducts(filteredProducts);
            setLoading(false);
        } catch (err) {
            setError('No se pudieron cargar los productos discontinuados.');
            console.error(err);
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchDiscontinuedProducts();
    }, [fetchDiscontinuedProducts]);

    const handleProductClick = (productId) => {
        navigate(`/product-detail/${productId}`);
    };

    if (loading && products.length === 0) {
        return <CarouselSkeleton title="Productos Discontinuados" />;
    }

    if (error) {
        return <div className="p-4 text-red-500">{error}</div>;
    }

    if (products.length === 0) {
        return null;
    }

    // Limit to 5 items to mirror other carousels
    const displayedProducts = products.slice(0, 5);

    return (
        <div className="relative py-4 mt-8">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-espint-blue">
                    Productos Discontinuados
                </h2>
                <button
                    onClick={() => navigate('/category/0902')}
                    className="flex items-center gap-2 bg-[#0B3D68] hover:bg-[#0a3459] text-white font-semibold px-5 py-2 rounded-xl transition-all shadow-md active:scale-95 group/btn"
                >
                    <span>Ver todos</span>
                    <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {displayedProducts.map((item) => (
                    <div
                        key={item.id}
                        className="w-full bg-white rounded-lg overflow-hidden transition-all duration-200 ease-in-out cursor-pointer hover:-translate-y-1 shadow-sm hover:shadow-md border-b-[3px] border-red-500 group"
                        onClick={() => handleProductClick(item.id)}
                    >
                        <div className="relative">
                            {item.imageUrl ? (
                                <img
                                    src={item.imageUrl}
                                    alt={item.name}
                                    className="w-full h-32 object-contain p-2"
                                    referrerPolicy="no-referrer"
                                    loading="lazy"
                                />
                            ) : (
                                <div className="w-full h-32 flex items-center justify-center bg-gray-50 text-gray-400 text-xs text-center p-4">
                                    {item.name}
                                </div>
                            )}
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

export default DiscontinuedProductsCarousel;
