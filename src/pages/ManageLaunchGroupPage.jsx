
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
    const [searchResults, setSearchResults] = useState([]);
    const [isSearchingProduct, setIsSearchingProduct] = useState(false);

    // Fetch Group Details to show name
    const { data: groups } = useQuery({
        queryKey: ['adminCarouselGroups'],
        queryFn: () => apiService.getCarouselGroups(),
    });
    const currentGroup = groups?.find(g => g.id.toString() === id);

    // Fetch Group Products
    const { data: groupProducts, isLoading } = useQuery({
        queryKey: ['customCollectionProducts', id],
        queryFn: () => apiService.getCustomCollectionProducts(id),
    });

    const addProductMutation = useMutation({
        mutationFn: (productId) => apiService.addCustomGroupItem(id, productId),
        onSuccess: () => {
            queryClient.invalidateQueries(['customCollectionProducts', id]);
            toast.success('Producto agregado');
            // Keep search results but show success
        },
        onError: (err) => {
            console.error(err);
            toast.error('Error al agregar producto');
        }
    });

    const removeProductMutation = useMutation({
        mutationFn: (productId) => apiService.removeCustomGroupItem(id, productId),
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
            // General search (code or name)
            const res = await apiService.fetchProducts(1, searchTerm);
            if (res.products && res.products.length > 0) {
                setSearchResults(res.products);
            } else {
                toast.error('No se encontraron productos');
                setSearchResults([]);
            }
        } catch (error) {
            toast.error('Error al buscar producto');
            setSearchResults([]);
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
                                placeholder="Buscar por nombre o código..."
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

                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                        {searchResults.map(product => (
                            <div key={product.id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                                <div className="flex gap-3 mb-2">
                                    <div className="w-16 h-16 bg-gray-100 rounded-md overflow-hidden flex-shrink-0">
                                        {product.imageUrl ? (
                                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain mix-blend-multiply" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs text-center p-1">Sin Imagen</div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold text-sm line-clamp-2 leading-tight mb-1" title={product.name}>{product.name}</h4>
                                        <p className="text-xs text-blue-600 font-bold">{product.code}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => addProductMutation.mutate(product.id)}
                                    className="w-full bg-white border border-espint-blue text-espint-blue py-1.5 rounded-md text-sm font-medium hover:bg-espint-blue hover:text-white transition-colors flex items-center justify-center gap-2"
                                    disabled={addProductMutation.isLoading}
                                >
                                    <Plus size={16} />
                                    Agregar
                                </button>
                            </div>
                        ))}
                        {searchResults.length === 0 && !isSearchingProduct && searchTerm && (
                            <p className="text-center text-gray-500 text-sm py-4">
                                No hay resultados
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ManageLaunchGroupPage;
