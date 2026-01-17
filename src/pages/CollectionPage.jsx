import React, { useState, useEffect } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';
import { useParams, useNavigate } from 'react-router-dom';
import apiService from '../api/apiService';

const CollectionPage = () => {
    const { collectionId } = useParams();
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [collectionName, setCollectionName] = useState('Colección');

    useEffect(() => {
        if (!collectionId) return;

        const fetchProducts = async () => {
            try {
                setLoading(true);
                // We need to fetch collection details (name) too. 
                // Currently getCustomCollectionProducts only returns products.
                // We might need to look up the collection name from the carousel groups list or add an endpoint for collection details.
                // For now, let's just show "Colección" or try to find it if we have the groups loaded in context (we don't).
                // I'll fetch all groups to find the name, or just display "Colección".
                // Better: update getCustomCollectionProducts to return { products, name, image }.
                // But for now, I'll just fetch products.

                const data = await apiService.getCustomCollectionProducts(collectionId);
                setProducts(data);

                // Try to find name from groups list (inefficient but works for now)
                try {
                    // We use getProductGroupsDetails which is public.
                    const publicGroups = await apiService.getProductGroupsDetails();
                    const group = publicGroups.find(g => String(g.id) === String(collectionId) && g.type === 'custom_collection');
                    if (group) {
                        setCollectionName(group.name);
                    }
                } catch (e) {
                    // console.warn("Could not fetch collection name");
                }

                setError(null);
            } catch (err) {
                setError('No se pudieron cargar los productos de la colección.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, [collectionId]);

    const handleViewProductDetails = (productId) => {
        navigate(`/product-detail/${productId}`);
    };

    if (loading) {
        return <LoadingSpinner text="Cargando colección..." />;
    }

    if (error) {
        return <div className="p-4 text-red-500 text-center">{error}</div>;
    }

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <button
                onClick={() => navigate('/dashboard')}
                className="mb-4 text-blue-500 hover:underline"
            >
                &larr; Volver al Dashboard
            </button>
            <h1 className="text-3xl font-bold mb-6 text-gray-800">
                {collectionName}
            </h1>

            {products.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {products.map((product) => (
                        <div
                            key={product.id}
                            className="border p-4 rounded-lg shadow-md bg-white flex flex-col justify-between cursor-pointer hover:shadow-lg transition-shadow"
                            onClick={() => handleViewProductDetails(product.id)}
                        >
                            <div className="w-full h-48 mb-4 bg-gray-100 rounded-md flex items-center justify-center overflow-hidden">
                                {product.imageUrl ? (
                                    <img
                                        src={product.imageUrl}
                                        alt={product.name}
                                        className="w-full h-full object-contain"
                                    />
                                ) : (
                                    <span className="text-gray-400 text-sm">Sin imagen</span>
                                )}
                            </div>
                            <div>
                                <h2 className="text-base font-semibold text-gray-800 h-12 overflow-hidden">
                                    {product.name}
                                </h2>
                                <p className="text-sm text-gray-500">{product.brand}</p>
                            </div>
                            <p className="text-lg font-bold mt-2 text-right text-blue-700">
                                {product.formattedPrice}
                            </p>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12">
                    <p className="text-gray-600">
                        No se encontraron productos en esta colección.
                    </p>
                </div>
            )}
        </div>
    );
};

export default CollectionPage;
