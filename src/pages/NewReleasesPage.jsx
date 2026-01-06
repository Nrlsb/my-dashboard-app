
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiService from '../api/apiService';
import LoadingSpinner from '../components/LoadingSpinner';
import ProductCard from '../components/ProductCard';
import { ArrowLeft, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const NewReleasesPage = () => {
    const navigate = useNavigate();

    const {
        data: products = [],
        isLoading,
        isError,
        error,
    } = useQuery({
        queryKey: ['new-releases'],
        queryFn: async () => {
            const data = await apiService.fetchNewReleases();
            return data;
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center">
                        <button
                            onClick={() => navigate('/')}
                            className="mr-4 p-2 bg-white rounded-full shadow-sm hover:bg-gray-100 transition-colors text-gray-600"
                            aria-label="Volver al inicio"
                        >
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                                <Star className="w-8 h-8 text-purple-600 fill-current" />
                                Nuevos Lanzamientos
                            </h1>
                            <p className="text-gray-600 mt-1">
                                Descubre las últimas novedades y productos destacados.
                            </p>
                        </div>
                    </div>
                </header>

                {isLoading && (
                    <div className="flex justify-center items-center py-20">
                        <LoadingSpinner text="Cargando novedades..." />
                    </div>
                )}

                {isError && (
                    <div className="bg-red-50 border border-red-200 text-red-600 p-6 rounded-lg text-center">
                        <p>Error al cargar los nuevos lanzamientos.</p>
                        <p className="text-sm mt-2 opacity-80">{error?.message}</p>
                    </div>
                )}

                {!isLoading && !isError && products.length === 0 && (
                    <div className="bg-white p-12 rounded-lg shadow-sm text-center">
                        <Star className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-xl font-medium text-gray-900 mb-2">
                            No hay nuevos lanzamientos por ahora
                        </h3>
                        <p className="text-gray-500">
                            Vuelve pronto para ver las últimas incorporaciones a nuestro catálogo.
                        </p>
                    </div>
                )}

                {!isLoading && !isError && products.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {products.map((product) => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default NewReleasesPage;
