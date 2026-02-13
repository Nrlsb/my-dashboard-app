import React from 'react';
import { Package } from 'lucide-react';

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
    }).format(amount || 0);
};

const ProductCard = ({ product, setSelectedProduct, handleAddToCartClick }) => {
    return (
        <div
            className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-white rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-shadow gap-4 md:gap-0"
            onClick={() => setSelectedProduct(product)}
        >
            <div className="flex items-start md:items-center space-x-4 w-full md:w-auto">
                <div className="flex-shrink-0 p-3 bg-gray-100 rounded-lg">
                    {product.imageUrl ? (
                        <div className="relative">
                            <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="w-16 h-16 object-cover rounded-md"
                            />
                            <span className="absolute bottom-0 right-0 bg-black/60 text-white text-[7px] px-1 py-0.5 pointer-events-none uppercase font-bold rounded-tl-sm">
                                Ilustrativa
                            </span>
                        </div>
                    ) : (
                        <Package className="w-6 h-6 text-gray-600" />
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 line-clamp-2 md:line-clamp-2">
                        {product.name}
                    </p>
                    <p className="text-xs md:text-sm text-gray-500 mt-1">
                        {product.brand} <span className="mx-1">•</span> Cód: {product.code}
                    </p>
                    <div className="flex items-center mt-1">
                        {product.stock_disponible <= 0 ? (
                            <div className="flex items-center">
                                <span className="text-xs md:text-sm font-medium text-red-600">
                                    Sin Stock
                                </span>
                                {product.stock_de_seguridad > 0 && (
                                    <span className="ml-2 text-[10px] md:text-xs text-blue-600 font-medium">
                                        | Previsto de ingreso
                                    </span>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center">
                                <span className="text-xs md:text-sm font-medium text-gray-600">
                                    Stock: {product.stock_disponible > 100 ? '+100' : product.stock_disponible}
                                </span>
                                {product.stock_de_seguridad > 0 && (
                                    <span className="ml-2 text-[10px] md:text-xs text-blue-600 font-medium">
                                        | Previsto de ingreso
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between md:flex-col md:items-end md:justify-center w-full md:w-auto mt-2 md:mt-0 pt-3 md:pt-0 border-t md:border-t-0 border-gray-100">
                <p className="text-lg font-bold text-[#0B3D68]">
                    {formatCurrency(product.price)}
                </p>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        handleAddToCartClick(product);
                    }}
                    className="px-6 py-2 md:px-4 md:py-1 text-sm font-medium text-white bg-[#8CB818] rounded-md hover:bg-[#7aa315] transition-colors cursor-pointer md:mt-2"
                >
                    Añadir
                </button>
            </div>
        </div>
    );
};

export default ProductCard;
