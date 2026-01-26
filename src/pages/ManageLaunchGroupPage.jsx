
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Search, Plus, Trash2, ExternalLink } from 'lucide-react';
import apiService from '../api/apiService';
import LoadingSpinner from '../components/LoadingSpinner';
import ProductCard from '../components/ProductCard';
import toast from 'react-hot-toast';

const ManageLaunchGroupPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResult, setSearchResult] = useState(null);
    const [isSearchingProduct, setIsSearchingProduct] = useState(false);

    // Fetch Group Details to show name
    const { data: groups } = useQuery({
        queryKey: ['adminCarouselGroups'],
        queryFn: () => apiService.get('/admin/carousel-groups'),
    });
    const currentGroup = groups?.find(g => g.id.toString() === id);

    // Fetch Group Products
    const { data: groupProducts, isLoading } = useQuery({
        queryKey: ['customCollectionProducts', id],
        queryFn: () => apiService.get(`/products/collection/${id}`),
    });

    const addProductMutation = useMutation({
        mutationFn: (productId) => apiService.post(`/admin/custom-collection/${id}/items`, { productId }),
        onSuccess: () => {
            queryClient.invalidateQueries(['customCollectionProducts', id]);
            toast.success('Producto agregado');
            setSearchResult(null);
            setSearchTerm('');
        },
        onError: (err) => {
            console.error(err);
            toast.error('Error al agregar producto');
        }
    });

    const removeProductMutation = useMutation({
        mutationFn: (productId) => apiService.delete(`/admin/custom-collection/${id}/items/${productId}`),
        onSuccess: () => {
            queryClient.invalidateQueries(['customCollectionProducts', id]);
            toast.success('Producto eliminado del grupo');
        },
        onError: (err) => {
            console.error(err);
            toast.error('Error al eliminar producto');
        }
    });

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchTerm.trim()) return;

        setIsSearchingProduct(true);
        try {
            // Find product by code exact match usually better for admin adding
            // Reusing getProductByCode public endpoint
            const product = await apiService.get(`/products/code/${searchTerm.trim()}`);
            setSearchResult(product);
        } catch (error) {
            toast.error('Producto no encontrado');
            setSearchResult(null);
        } finally {
            setIsSearchingProduct(false);
        }
    };

    if (isLoading) return <LoadingSpinner />;

    return (
        <div className="container mx-auto p-4 max-w-6xl">
            <button
                onClick={() => navigate('/admin/launch-groups')}
                className="flex items-center text-gray-500 hover:text-gray-700 mb-6"
            >
                <ArrowLeft size={18} className="mr-2" />
                Volver a Grupos de Lanzamiento
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Product List */}
                <div className="lg:col-span-2">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h2 className="text-xl font-bold">Productos en: {currentGroup?.name || 'Cargando...'}</h2>
                        </div>
                        <span className="text-gray-500 text-sm">{groupProducts?.length || 0} productos</span>
                    </div>

                    <div className="space-y-3">
                        {groupProducts?.map(product => (
                            <div key={product.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-gray-100 rounded-md flex items-center justify-center overflow-hidden">
                                        {product.imageUrl ? (
                                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-xs text-gray-400">Sin img</span>
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900 line-clamp-1">{product.name}</p>
                                        <p className="text-sm text-gray-500">{product.code} - {product.formattedPrice}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => removeProductMutation.mutate(product.id)}
                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Quitar del grupo"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}

                        {(!groupProducts || groupProducts.length === 0) && (
                            <div className="p-8 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                                Este grupo está vacío. Agrega productos usando el buscador.
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Add Product */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-fit">
                    <h3 className="text-lg font-bold mb-4">Agregar Producto</h3>
                    <form onSubmit={handleSearch} className="mb-6">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Buscar Código Exacto..."
                                className="w-full border border-gray-300 rounded-lg pl-3 pr-10 py-2 focus:ring-2 focus:ring-espint-blue focus:border-transparent outline-none"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <button
                                type="submit"
                                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-espint-blue"
                                disabled={isSearchingProduct}
                            >
                                <Search size={20} />
                            </button>
                        </div>
                    </form>

                    {searchResult && (
                        <div className="border border-gray-200 rounded-lg p-3 animate-fadeIn">
                            <div className="w-full h-32 bg-gray-100 rounded-md overflow-hidden mb-3">
                                {searchResult.imageUrl ? (
                                    <img src={searchResult.imageUrl} alt={searchResult.name} className="w-full h-full object-contain mix-blend-multiply" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">Sin Imagen</div>
                                )}
                            </div>
                            <h4 className="font-semibold text-sm line-clamp-2 mb-1">{searchResult.name}</h4>
                            <p className="text-xs text-gray-500 mb-2">{searchResult.code}</p>
                            <button
                                onClick={() => addProductMutation.mutate(searchResult.id)}
                                className="w-full bg-espint-blue text-white py-2 rounded-lg text-sm font-medium hover:bg-espint-blue-dark transition-colors flex items-center justify-center gap-2"
                                disabled={addProductMutation.isLoading}
                            >
                                <Plus size={16} />
                                {addProductMutation.isLoading ? 'Agregando...' : 'Agregar al Grupo'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ManageLaunchGroupPage;
