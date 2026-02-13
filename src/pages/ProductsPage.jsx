import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { VirtuosoGrid } from 'react-virtuoso';
import {
    Loader2,
    ArrowLeft,
    Search,
    X,
    ChevronDown,
    ShoppingCart,
    CheckCircle,

    Package,
    ArrowUp
} from 'lucide-react';
import apiService from '../api/apiService';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

// --- Formateadores ---

const formatCurrency = (amount) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
        amount || 0
    );

// --- Componentes de UI Internos ---
const ProductCard = ({ product }) => {
    const navigate = useNavigate();
    const { addToCart } = useCart();
    const [isAdded, setIsAdded] = useState(false);

    const handleAddToCart = (e) => {
        e.stopPropagation();
        addToCart(product, 1);
        setIsAdded(true);
        setTimeout(() => setIsAdded(false), 2000);
    };

    return (
        <div
            className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 overflow-hidden group flex flex-col h-full cursor-pointer"
            onClick={() => navigate(`/product-detail/${product.id}`)}
        >
            {/* Image Container */}
            <div className="relative aspect-square bg-gray-50 overflow-hidden">
                {product.imageUrl ? (
                    <div className="relative w-full h-full">
                        <img
                            src={product.thumbnailUrl || product.imageUrl}
                            alt={product.name}
                            className="w-full h-full object-contain p-4 transition-transform duration-500 group-hover:scale-105"
                            loading="lazy"
                        />
                        <span className="absolute bottom-0 right-0 bg-black/50 text-white text-[8px] px-1.5 py-0.5 pointer-events-none uppercase tracking-wider font-medium rounded-tl-sm backdrop-blur-sm">
                            Imagen ilustrativa
                        </span>
                    </div>
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                        <Package className="w-12 h-12 mb-2" />
                        <span className="text-xs">Sin imagen</span>
                    </div>
                )}

                {/* Badges */}
                <div className="absolute top-2 left-2 flex flex-col gap-1">
                    {product.oferta && (
                        <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-sm">
                            OFERTA
                        </span>
                    )}
                    {product.recentlyChanged && (
                        <span className="bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-1 rounded-full shadow-sm">
                            NUEVO PRECIO
                        </span>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="p-4 flex flex-col flex-grow">
                <div className="mb-1">
                    <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                        {product.brand}
                    </span>
                </div>

                <h3 className="text-sm font-medium text-gray-800 line-clamp-2 mb-2 flex-grow" title={product.name}>
                    {product.name}
                </h3>

                <div className="mt-auto pt-2 border-t border-gray-50">
                    <div className="flex items-end justify-between gap-2">
                        <div className="flex flex-col">
                            <span className="text-xs text-gray-400 font-mono">{product.code}</span>
                            <span className="text-lg font-bold text-gray-900">
                                {formatCurrency(product.price)}
                            </span>
                        </div>

                        <button
                            onClick={handleAddToCart}
                            className={`p-2 rounded-full transition-colors shadow-sm ${isAdded
                                ? 'bg-green-100 text-green-600'
                                : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                                }`}
                            title="Agregar al carrito"
                        >
                            {isAdded ? <CheckCircle className="w-5 h-5" /> : <ShoppingCart className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ProductSkeleton = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-pulse h-full">
        <div className="aspect-square bg-gray-200"></div>
        <div className="p-4 space-y-3">
            <div className="h-3 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="pt-2 flex justify-between items-end">
                <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
            </div>
        </div>
    </div>
);

// --- Componente Principal ---
export default function ProductsPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    // State for filters
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedBrands, setSelectedBrands] = useState([]);
    const [isBrandDropdownOpen, setIsBrandDropdownOpen] = useState(false);
    const [debounceSearchTerm, setDebounceSearchTerm] = useState('');

    const [showScrollTop, setShowScrollTop] = useState(false);

    const brandDropdownRef = useRef(null);
    const debounceTimeout = useRef(null);
    const virtuosoRef = useRef(null);



    // Initialize filters from URL
    useEffect(() => {
        const brandParam = searchParams.get('brand');
        if (brandParam) {
            const brands = decodeURIComponent(brandParam).split(',');
            setSelectedBrands(brands);
        }
    }, [searchParams]);

    // Debounce search
    useEffect(() => {
        if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
        debounceTimeout.current = setTimeout(
            () => setDebounceSearchTerm(searchTerm),
            500
        );
        return () => clearTimeout(debounceTimeout.current);
    }, [searchTerm]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (brandDropdownRef.current && !brandDropdownRef.current.contains(event.target)) {
                setIsBrandDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Queries
    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        isError,
        error
    } = useInfiniteQuery({
        queryKey: ['products-grid', debounceSearchTerm, selectedBrands, user?.id],
        queryFn: ({ pageParam = 1 }) => {
            return apiService.fetchProducts(pageParam, debounceSearchTerm, selectedBrands, false, 20, '');
        },
        getNextPageParam: (lastPage, allPages) => {
            const productsLoaded = allPages.reduce((acc, page) => acc + page.products.length, 0);
            return productsLoaded < lastPage.totalProducts ? allPages.length + 1 : undefined;
        },
        initialPageParam: 1,
        staleTime: 1000 * 60 * 5, // 5 minutes
        enabled: !!user,
    });

    const { data: brandsData, isLoading: isBrandsLoading } = useQuery({
        queryKey: ['brands', user?.id],
        queryFn: () => apiService.fetchProtheusBrands(),
        staleTime: 1000 * 60 * 60,
        enabled: !!user,
    });

    // Handlers
    const handleSearchChange = (e) => setSearchTerm(e.target.value);

    const handleBrandChange = (brand) => {
        const newBrands = selectedBrands.includes(brand)
            ? selectedBrands.filter(b => b !== brand)
            : [...selectedBrands, brand];

        setSelectedBrands(newBrands);

        // Update URL
        const params = new URLSearchParams(searchParams);
        if (newBrands.length > 0) {
            params.set('brand', encodeURIComponent(newBrands.join(',')));
        } else {
            params.delete('brand');
        }
        setSearchParams(params);
    };

    const handleClearFilters = () => {
        setSearchTerm('');
        setSelectedBrands([]);
        setSearchParams({});
    };

    const allProducts = data?.pages.flatMap((page) => page.products) || [];
    const hasFilters = searchTerm.length > 0 || selectedBrands.length > 0;

    const getBrandButtonLabel = () => {
        if (isBrandsLoading) return 'Cargando marcas...';
        if (selectedBrands.length === 0) return 'Todas las marcas';
        if (selectedBrands.length === 1) return selectedBrands[0];
        return `${selectedBrands.length} marcas seleccionadas`;
    };

    return (
        <div className="min-h-screen bg-gray-50/50">
            <div className="max-w-7xl mx-auto p-4 md:p-6">

                {/* Header & Filters */}
                <div className="flex flex-col gap-6 mb-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="p-2 bg-white text-gray-600 rounded-full shadow-sm hover:bg-gray-50 hover:shadow transition-all"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <div>
                                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Nuestros Productos</h1>
                                <p className="text-sm text-gray-500 mt-1">Explora nuestro catálogo completo</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Search */}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={handleSearchChange}
                                    placeholder="Buscar por nombre, código..."
                                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-transparent focus:bg-white border focus:border-espint-blue rounded-xl transition-all outline-none"
                                />
                            </div>

                            {/* Brand Filter */}
                            <div className="relative" ref={brandDropdownRef}>
                                <button
                                    onClick={() => setIsBrandDropdownOpen(!isBrandDropdownOpen)}
                                    className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 border border-transparent hover:bg-gray-100 rounded-xl transition-all outline-none"
                                >
                                    <span className={`truncate ${selectedBrands.length > 0 ? 'text-espint-blue font-medium' : 'text-gray-600'}`}>
                                        {getBrandButtonLabel()}
                                    </span>
                                    <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isBrandDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {isBrandDropdownOpen && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 max-h-80 overflow-y-auto z-20 p-2">
                                        {brandsData?.map((brand) => (
                                            <label
                                                key={brand}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    handleBrandChange(brand);
                                                }}
                                                className="flex items-center px-3 py-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                                            >
                                                <div className={`w-5 h-5 rounded border flex items-center justify-center mr-3 transition-colors ${selectedBrands.includes(brand) ? 'bg-espint-blue border-espint-blue' : 'border-gray-300'
                                                    }`}>
                                                    {selectedBrands.includes(brand) && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                                                </div>
                                                <span className="text-sm text-gray-700">{brand}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>



                        {hasFilters && (
                            <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end">
                                <button
                                    onClick={handleClearFilters}
                                    className="text-sm text-red-500 hover:text-red-600 font-medium flex items-center gap-1 px-3 py-1.5 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                    Limpiar filtros
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Product Grid Virtualized */}
                {allProducts.length > 0 && (
                    <div className="w-full min-h-screen">
                        <VirtuosoGrid
                            ref={virtuosoRef}
                            useWindowScroll
                            data={allProducts}
                            endReached={() => {
                                if (hasNextPage && !isFetchingNextPage) {
                                    fetchNextPage();
                                }
                            }}
                            overscan={200}
                            itemContent={(index, product) => (
                                <div className="p-2 h-full">
                                    <ProductCard product={product} />
                                </div>
                            )}
                            components={{
                                List: React.forwardRef(({ style, children, ...props }, ref) => (
                                    <div
                                        ref={ref}
                                        {...props}
                                        style={{ ...style }}
                                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 mb-20 pb-20"
                                    >
                                        {children}
                                    </div>
                                )),
                                Footer: () => (
                                    <div className="py-8 flex justify-center w-full col-span-full">
                                        {isFetchingNextPage ? (
                                            <div className="flex items-center gap-2 text-gray-500">
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                <span>Cargando más productos...</span>
                                            </div>
                                        ) : hasNextPage ? (
                                            <span className="text-gray-400 text-sm">Desliza para ver más</span>
                                        ) : (
                                            <span className="text-gray-400 text-sm">Has llegado al final del catálogo</span>
                                        )}
                                    </div>
                                )
                            }}
                        />
                    </div>
                )}

                {/* Empty State */}
                {!isLoading && allProducts.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                            <Search className="w-10 h-10 text-gray-400" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">No se encontraron productos</h3>
                        <p className="text-gray-500 max-w-md mx-auto">
                            Intenta ajustar los filtros de búsqueda o prueba con otros términos.
                        </p>
                        {hasFilters && (
                            <button
                                onClick={handleClearFilters}
                                className="mt-6 px-6 py-2 bg-espint-blue text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md"
                            >
                                Limpiar filtros
                            </button>
                        )}
                    </div>
                )}

                {/* Error State */}
                {isError && (
                    <div className="text-center py-20">
                        <p className="text-red-500 font-medium mb-4">Ocurrió un error al cargar los productos</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Reintentar
                        </button>
                    </div>
                )}

                {/* Scroll to Top Button */}
                {showScrollTop && (
                    <button
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        className="fixed bottom-8 right-8 p-3 bg-espint-blue text-white rounded-full shadow-lg hover:bg-blue-700 transition-all z-50 animate-bounce"
                    >
                        <ArrowUp className="w-6 h-6" />
                    </button>
                )}
            </div>
        </div >
    );
}
