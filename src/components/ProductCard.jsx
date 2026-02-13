import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, CheckCircle, Package } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

// --- Formateadores ---
const formatCurrency = (amount) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
        amount || 0
    );

const ProductCard = ({ product }) => {
    const navigate = useNavigate();
    const { addToCart } = useCart();
    const { user } = useAuth();
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
                    <>
                        <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-full h-full object-contain p-4 transition-transform duration-500 group-hover:scale-105"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                        />
                        <span className="absolute bottom-0 right-0 bg-black/50 text-white text-[8px] px-1.5 py-0.5 pointer-events-none uppercase tracking-wider font-medium rounded-tl-sm backdrop-blur-sm">
                            Imagen ilustrativa
                        </span>
                    </>
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
                    {product.is_new_release && (
                        <span className="bg-purple-600 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-sm">
                            NUEVO
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

                        {user?.role !== 'vendedor' && (
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
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductCard;
