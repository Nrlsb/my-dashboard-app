import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Package, Minus, Plus, ShoppingCart, CheckCircle } from 'lucide-react';
import { useProductQuantity } from '../../hooks/useProductQuantity';

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
    }).format(amount || 0);
};

const ProductModal = ({ product, onClose, onAddToCart }) => {
    const {
        quantity,
        increment,
        decrement,
        handleInputChange,
        handleBlur,
        stock,
    } = useProductQuantity(product);

    const [isAdded, setIsAdded] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        setIsAdded(false);
    }, [product]);

    const handleAddToCartClick = () => {
        onAddToCart(product, quantity);
        setIsAdded(true);
        setTimeout(() => {
            onClose();
        }, 1500);
    };

    const handleViewDetails = (productId) => {
        navigate(`/product-detail/${productId}`);
        onClose();
    };

    if (!product) return null;

    return (
        <div
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="relative bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col md:flex-row overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-800 bg-gray-100 rounded-full z-10"
                >
                    <X className="w-6 h-6" />
                </button>

                <div className="w-full md:w-1/2 flex items-center justify-center bg-gray-100 p-8">
                    {product.imageUrl ? (
                        <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="max-h-64 object-contain rounded-lg"
                        />
                    ) : (
                        <Package className="w-48 h-48 text-gray-400" />
                    )}
                </div>

                <div className="w-full md:w-1/2 p-8 flex flex-col justify-center overflow-y-auto">
                    <span className="text-sm font-medium text-blue-600 uppercase">
                        {product.brand || 'Marca'}
                    </span>
                    <h2 className="text-2xl font-bold text-gray-900 mt-1">
                        {product.name}
                    </h2>

                    <p className="text-3xl font-extrabold text-gray-800 mt-3">
                        {formatCurrency(product.price)}
                    </p>

                    <div className="flex items-center space-x-4 my-4">
                        <span className="font-medium text-gray-700">Cantidad:</span>
                        <div className="flex items-center border border-gray-300 rounded-lg">
                            <button
                                onClick={decrement}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-l-lg"
                            >
                                <Minus className="w-4 h-4" />
                            </button>
                            <input
                                type="number"
                                value={quantity}
                                onChange={handleInputChange}
                                onBlur={handleBlur}
                                className="w-16 text-center border-y-0 border-x focus:ring-0"
                            />
                            <button
                                onClick={increment}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-r-lg"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                        {stock <= 0 ? (
                            <div className="flex items-center ml-2">
                                <span className="text-sm font-medium text-red-600">
                                    Sin Stock
                                </span>
                                {product.stock_de_seguridad > 0 && (
                                    <span className="ml-2 text-xs text-blue-600 font-medium">
                                        | Previsto de ingreso
                                    </span>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center ml-2">
                                <span className="text-sm font-medium text-gray-600">
                                    Stock: {stock > 100 ? '+100' : stock}
                                </span>
                                {product.stock_de_seguridad > 0 && (
                                    <span className="ml-2 text-xs text-blue-600 font-medium">
                                        | Previsto de ingreso
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleAddToCartClick}
                        disabled={isAdded}
                        className={`w-full py-3 px-6 rounded-lg text-white font-semibold transition-colors duration-300 ${isAdded
                            ? 'bg-espint-green hover:bg-green-600'
                            : 'bg-espint-blue hover:bg-blue-700'
                            }`}
                    >
                        {isAdded ? (
                            <span className="flex items-center justify-center">
                                <CheckCircle className="w-5 h-5 mr-2" />
                                Agregado
                            </span>
                        ) : (
                            <span className="flex items-center justify-center">
                                <ShoppingCart className="w-5 h-5 mr-2" />
                                Agregar al Carrito
                            </span>
                        )}
                    </button>

                    <button
                        onClick={() => handleViewDetails(product.id)}
                        className="mt-4 text-center text-sm text-blue-600 hover:underline"
                    >
                        Ver detalles completos del producto
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProductModal;
