import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, ArrowRight, ChevronRight, ChevronLeft, Package } from 'lucide-react';
import apiService from '../api/apiService';

const NewReleasesBanner = ({ products: propProducts }) => {
    const navigate = useNavigate();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isHovered, setIsHovered] = useState(false);

    const { data: fetchedProducts = [], isLoading } = useQuery({
        queryKey: ['new-releases-banner'],
        queryFn: () => apiService.fetchNewReleases(),
        staleTime: 1000 * 60 * 5, // 5 minutes
        enabled: !propProducts, // Only fetch if not provided via props
    });

    const products = propProducts || fetchedProducts;

    useEffect(() => {
        if (products.length <= 1 || isHovered) return;

        const interval = setInterval(() => {
            setCurrentIndex((prevIndex) => (prevIndex + 1) % products.length);
        }, 5000); // Change every 5 seconds

        return () => clearInterval(interval);
    }, [products.length, isHovered]);

    const handleNext = (e) => {
        e.stopPropagation();
        setCurrentIndex((prev) => (prev + 1) % products.length);
    };

    const handlePrev = (e) => {
        e.stopPropagation();
        setCurrentIndex((prev) => (prev - 1 + products.length) % products.length);
    };

    if (isLoading) {
        return (
            <div className="w-full md:w-64 lg:w-72 h-[400px] md:h-auto md:flex-grow rounded-3xl bg-gray-100 animate-pulse flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-gray-300" />
            </div>
        );
    }

    if (products.length === 0) {
        // Fallback state if no releases
        return (
            <div
                onClick={() => navigate('/new-releases')}
                className="
                group cursor-pointer 
                bg-gradient-to-b from-indigo-600 to-purple-700 
                text-white 
                rounded-3xl p-6 
                shadow-lg hover:shadow-2xl 
                transition-all duration-300 transform hover:scale-[1.02]
                flex flex-col items-center justify-center
                w-full md:w-64 lg:w-72
                h-[400px] md:h-auto md:flex-grow min-h-[500px]
                relative overflow-hidden
            "
            >
                <div className="absolute top-0 left-0 w-full h-full bg-white opacity-5 rounded-3xl pointer-events-none"></div>
                <div className="p-3 bg-white/20 rounded-full backdrop-blur-sm mb-4">
                    <Sparkles className="w-8 h-8 text-yellow-300" />
                </div>
                <h3 className="text-xl font-bold text-center mb-2">Nuevos Lanzamientos</h3>
                <p className="text-white/80 text-center text-sm">Descubre las novedades</p>
            </div>
        );
    }

    const currentProduct = products[currentIndex];

    return (
        <div
            onClick={() => navigate(`/product-detail/${currentProduct.id}`)}
            className="
            group cursor-pointer 
            bg-gradient-to-b from-indigo-600 to-purple-700 
            text-white 
            rounded-3xl p-0 
            shadow-lg hover:shadow-2xl 
            transition-all duration-300 transform hover:scale-[1.02]
            flex flex-col
            w-full md:w-64 lg:w-72
            h-[400px] md:h-auto md:flex-grow min-h-[500px]
            relative overflow-hidden
        "
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Background Decor */}
            <div className="absolute top-0 left-0 w-full h-full bg-white opacity-5 pointer-events-none"></div>
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-400 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity"></div>

            {/* Badge */}
            <div className="absolute top-4 right-4 z-20">
                <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    NUEVO
                </span>
            </div>

            {/* Image Area */}
            <div className="w-full h-1/2 bg-white/10 p-6 flex items-center justify-center relative">
                {currentProduct.custom_image_url || currentProduct.imageUrl ? (
                    <img
                        src={currentProduct.custom_image_url || currentProduct.imageUrl}
                        alt={currentProduct.name}
                        className="w-full h-full object-contain drop-shadow-xl transition-transform duration-500 group-hover:scale-110"
                        referrerPolicy="no-referrer"
                    />
                ) : (
                    <div className="flex flex-col items-center text-white/50">
                        <Package className="w-16 h-16 mb-2" />
                        <span className="text-xs">Sin imagen</span>
                    </div>
                )}
            </div>

            {/* Content Area */}
            <div className="p-6 flex flex-col flex-grow relative z-10">
                <div className="mb-2">
                    <span className="text-xs font-medium text-white/70 uppercase tracking-wider">
                        {currentProduct.brand}
                    </span>
                </div>

                <h3 className="text-xl font-bold leading-tight mb-2 line-clamp-3" title={currentProduct.custom_title || currentProduct.name}>
                    {currentProduct.custom_title || currentProduct.name}
                </h3>

                <p className="text-sm text-white/80 line-clamp-2 mb-4">
                    {currentProduct.custom_description || currentProduct.capacityDesc || "Un nuevo producto destacado para ti."}
                </p>

                <div className="mt-auto flex items-center justify-between">
                    <div className="flex flex-col">
                        <span className="text-2xl font-bold text-white">
                            {currentProduct.formattedPrice}
                        </span>
                    </div>
                    <div className="bg-white/20 p-2 rounded-full backdrop-blur-sm group-hover:bg-white/30 transition-colors">
                        <ArrowRight className="w-5 h-5" />
                    </div>
                </div>
            </div>

            {/* Navigation Dots */}
            {products.length > 1 && (
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2 z-20">
                    {products.map((_, idx) => (
                        <div
                            key={idx}
                            className={`w-2 h-2 rounded-full transition-all duration-300 ${idx === currentIndex ? 'bg-white w-6' : 'bg-white/40'
                                }`}
                        />
                    ))}
                </div>
            )}

            {/* Navigation Arrows */}
            {products.length > 1 && (
                <>
                    <button
                        onClick={handlePrev}
                        className={`absolute left-2 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 p-2 rounded-full backdrop-blur-sm z-30 transition-all duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
                        aria-label="Previous"
                    >
                        <ChevronLeft className="w-5 h-5 text-white" />
                    </button>
                    <button
                        onClick={handleNext}
                        className={`absolute right-2 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 p-2 rounded-full backdrop-blur-sm z-30 transition-all duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
                        aria-label="Next"
                    >
                        <ChevronRight className="w-5 h-5 text-white" />
                    </button>
                </>
            )}
        </div>
    );
};

export default NewReleasesBanner;
