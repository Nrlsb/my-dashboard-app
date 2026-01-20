import React from 'react';
import { ShoppingCart, Trash2, CheckCircle } from 'lucide-react';

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
    }).format(amount || 0);
};

import { useCart } from '../../context/CartContext';

const CartSidebar = ({ cart, productMap, updateQuantity, removeFromCart, totalPrice, handleReviewOrder, handleQuantityChange }) => {
    const { clearCart } = useCart();
    return (
        <div className="lg-col-span-1 hidden lg:block">
            <div className="sticky top-8 bg-white rounded-lg shadow-md flex flex-col max-h-[calc(100vh-4rem)] border-t-4 border-espint-magenta">
                <div className="flex-shrink-0 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                            <ShoppingCart className="w-6 h-6 text-gray-800 mr-3" />
                            <h2 className="text-xl font-bold text-gray-800">
                                Resumen del Pedido
                            </h2>
                        </div>
                        {cart.length > 0 && (
                            <button
                                onClick={clearCart}
                                className="text-xs text-red-500 hover:text-red-700 underline"
                            >
                                Vaciar Carrito
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex-1 divide-y divide-gray-200 overflow-y-auto px-6">
                    {cart.length === 0 && (
                        <p className="py-4 text-center text-gray-500">
                            Tu carrito está vacío.
                        </p>
                    )}
                    {cart.map((item) => {
                        const product = productMap.get(item.id) || item;
                        const rawIndicator = product?.indicator_description;
                        const isRestricted = rawIndicator !== null && rawIndicator !== undefined && (String(rawIndicator).trim() === '0' || Number(rawIndicator) === 0);

                        return (
                            <div
                                key={item.id}
                                className="py-4 flex items-center space-x-3"
                            >
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900">
                                        {item.name}
                                    </p>
                                    {isRestricted && (
                                        <span className="inline-block px-2 py-0.5 mt-1 text-[10px] font-bold text-blue-700 bg-blue-100 rounded-full border border-blue-200">
                                            Pedido por embalaje
                                        </span>
                                    )}
                                    <p className="text-sm text-gray-500 mt-1">
                                        {formatCurrency(item.price)}
                                    </p>
                                    <div className="flex items-center mt-2">
                                        <label
                                            htmlFor={`qty-${item.id}`}
                                            className="text-xs text-gray-600 mr-2"
                                        >
                                            Cant:
                                        </label>
                                        <input
                                            id={`qty-${item.id}`}
                                            key={`qty-${item.id}`}
                                            type="number"
                                            value={item.quantity}
                                            onChange={(e) => {
                                                const newVal = parseInt(e.target.value, 10);
                                                const currentQty = Number(item.quantity);
                                                const stock = Number(product?.stock_disponible) || 0;
                                                const packQty = Number(product?.pack_quantity) > 0 ? Number(product.pack_quantity) : 1;

                                                if (!isNaN(newVal) && isRestricted) {
                                                    // Detectar incremento por flecha (delta +1) en zona restringida
                                                    if (newVal === currentQty + 1 && currentQty >= stock) {
                                                        updateQuantity(item.id, currentQty + packQty);
                                                        return;
                                                    }
                                                    // Detectar decremento por flecha (delta -1) en zona restringida
                                                    if (newVal === currentQty - 1 && currentQty > stock) {
                                                        const nextVal = currentQty - packQty;
                                                        updateQuantity(item.id, Math.max(stock, nextVal));
                                                        return;
                                                    }
                                                }
                                                updateQuantity(item.id, e.target.value);
                                            }}
                                            onBlur={(e) => handleQuantityChange(item.id, e.target.value, productMap.get(item.id) || item)}
                                            className="w-16 border-gray-300 rounded-md shadow-sm focus:ring-espint-blue focus:border-espint-blue text-center"
                                            min="0"
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={() => removeFromCart(item.id)}
                                    className="p-1 text-gray-400 hover:text-red-600"
                                    aria-label="Quitar item"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        );
                    })}
                </div>

                {cart.length > 0 && (
                    <div className="flex-shrink-0 p-6 border-t border-gray-200 space-y-3">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-lg font-medium text-gray-900">
                                Total:
                            </span>
                            <span className="text-2xl font-bold text-gray-900">
                                {formatCurrency(totalPrice)}
                            </span>
                        </div>
                        <button
                            onClick={handleReviewOrder}
                            disabled={cart.length === 0}
                            className="w-full inline-flex items-center justify-center px-6 py-3 font-semibold text-white bg-[#8CB818] rounded-md shadow-sm hover:bg-[#7aa315] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Revisar Pedido
                        </button>
                        <p className="text-xs text-gray-500 mt-2 text-center">
                            Precio con IVA incluído
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CartSidebar;
