
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Search, Filter, Share2 } from 'lucide-react';
import apiService from '../api/apiService';
import LoadingSpinner from '../components/LoadingSpinner';
import ProductCard from '../components/ProductCard';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const LaunchGroupPublicPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');

    // Fetch Group Details
    const { data: groupDetails, isLoading: isLoadingGroup } = useQuery({
        queryKey: ['launchGroup', id],
        queryFn: async () => {
            // We need an endpoint to get group details by ID, or repurpose existing getProductGroupsDetails
            // Since we don't have a direct "get group by id" public endpoint that returns metadata + items easily...
            // actually `getCustomCollectionProducts` returns products, but maybe not the group name if it's just return products.
            // Let's check `getCustomCollectionProducts` in service.
            // It returns `enrichProductsWithImages(mappedProducts)`.
            // It does NOT return the group name directly in the root object, but maybe we can infer it or we need a specific endpoint.
            // Wait, `getCustomCollectionProducts` in `productService.js`:
            // const rawProducts = await productModel.findCustomCollectionProducts(collectionId);
            // It allows us to get products. 
            // We might need to fetch the group name separately or update the backend to return it.
            // For now, let's assume we fetch products and if we need the name, we might need a separate call or it's included.
            // Actually, `findCustomCollectionProducts` DB query usually joins with collection table.
            // Let's check `productModel.js`.
            return apiService.get(`/products/collection/${id}`);
        },
        retry: false
    });

    // We also need the Group Name. Existing `getCustomCollectionProducts` might not return it if it just returns an array of products.
    // Let's assume for MVP we might display a generic header or we can fetch the group name if available.
    // In `productService.js`: `getCustomCollectionProducts` returns `enrichProductsWithImages(mappedProducts)`.
    // And `enrichProductsWithImages` returns an array.
    // So we get an Array of products. We don't get the group title.
    // That is a small missing piece in backend, but I can work around it or update backend.
    // Updating backend is safer. 
    // BUT, I can also just fetch all `product-groups-details` and find the one with this ID if it's public? 
    // `getProductGroupsDetails` is public? `router.get('/product-groups-details', getProductGroupsDetails);` -> Yes.
    // So I can fetch that to get the name.

    const { data: allGroups } = useQuery({
        queryKey: ['productGroupsDetails'],
        queryFn: () => apiService.get('/products/product-groups-details'),
        staleTime: 1000 * 60 * 60, // 1 hour
    });

    const groupInfo = allGroups?.find(g => g.id === parseInt(id) || g.collection_id === parseInt(id));
    const groupName = groupInfo?.name || 'Colección';

    const products = groupDetails || [];

    const handleShare = () => {
        if (navigator.share) {
            navigator.share({
                title: groupName,
                url: window.location.href
            }).catch(console.error);
        } else {
            navigator.clipboard.writeText(window.location.href);
            toast.success('Enlace copiado al portapapeles');
        }
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (isLoadingGroup) return <LoadingSpinner />;

    if (!products || products.length === 0) {
        return (
            <div className="p-4 flex flex-col items-center justify-center min-h-[50vh]">
                <h2 className="text-xl font-semibold mb-4">Colección no encontrada o vacía</h2>
                <button
                    onClick={() => navigate('/products')}
                    className="text-espint-blue hover:underline flex items-center gap-2"
                >
                    <ArrowLeft size={16} /> Volver a Productos
                </button>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 max-w-7xl">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                    >
                        <ArrowLeft className="w-6 h-6 text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">{groupName}</h1>
                        <p className="text-sm text-gray-500">{products.length} productos</p>
                    </div>
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                    <div className="relative w-full md:w-64">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <Search className="w-5 h-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Buscar en esta colección..."
                            className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-espint-blue focus:border-espint-blue block w-full pl-10 p-2.5"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={handleShare}
                        className="p-2.5 text-gray-500 bg-white rounded-lg border border-gray-300 hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-gray-200"
                        title="Compartir Colección"
                    >
                        <Share2 className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Product Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProducts.map(product => (
                    <ProductCard key={product.id} product={product} />
                ))}
            </div>

            {filteredProducts.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                    No se encontraron productos en esta colección con el filtro actual.
                </div>
            )}
        </div>
    );
};

export default LaunchGroupPublicPage;
