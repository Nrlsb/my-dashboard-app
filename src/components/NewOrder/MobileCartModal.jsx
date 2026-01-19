import React from 'react';
import { ShoppingCart, Trash2, X } from 'lucide-react';

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
    }).format(amount || 0);
};

const MobileCartModal = ({
    cart,
    isOpen,
    onClose,
    productMap,
    updateQuantity,
    removeFromCart,
    totalPrice,

    handleQuantityChange,
    clearCart
}) => {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[80vh] flex flex-col shadow-xl overflow-hidden animate-in slide-in-from-bottom duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
                    <div className="flex items-center">
                        <ShoppingCart className="w-5 h-5 text-espint-blue mr-2" />
                        <h2 className="text-lg font-bold text-gray-800">
                            Tu Carrito ({cart.length})
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-500 hover:text-gray-700 bg-white rounded-full shadow-sm"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Cart Items */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {cart.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p>Tu carrito está vacío</p>
                        </div>
                    ) : (
                        <>
                            <div className="flex justify-end mb-2">
                                <button
                                    onClick={clearCart}
                                    className="text-xs text-red-500 hover:text-red-700 underline"
                                >
                                    Vaciar Carrito
                                </button>
                            </div>
                            {(cart.map((item) => {
                                const product = productMap.get(item.id) || item;
                                const rawIndicator = product?.indicator_description;
                                const isRestricted = rawIndicator !== null && rawIndicator !== undefined && (String(rawIndicator).trim() === '0' || Number(rawIndicator) === 0);

                                return (
                                    <div key={item.id} className="flex gap-3 bg-white border border-gray-100 rounded-lg p-3 shadow-sm">
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold text-gray-900 line-clamp-2">
                                                {item.name}
                                            </p>

                                            {isRestricted && (
                                                <span className="inline-block px-2 py-0.5 mt-1 text-[10px] font-bold text-blue-700 bg-blue-100 rounded-full border border-blue-200">
                                                    Pedido por embalaje
                                                </span>
                                            )}

                                            <div className="flex items-center justify-between mt-2">
                                                <span className="text-sm font-bold text-espint-blue">
                                                    {formatCurrency(item.price)}
                                                </span>

                                                <div className="flex items-center gap-2">
                                                    <div className="flex items-center border border-gray-300 rounded-md bg-gray-50 h-8">
                                                        <input
                                                            type="number"
                                                            value={item.quantity}
                                                            onChange={(e) => updateQuantity(item.id, e.target.value)}
                                                            onBlur={(e) => handleQuantityChange(item.id, e.target.value, product)}
                                                            className="w-12 text-center bg-transparent border-none p-0 text-sm focus:ring-0"
                                                            min="0"
                                                        />
                                                    </div>
                                                    <button
                                                        onClick={() => removeFromCart(item.id)}
                                                        className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }))}
                        </>
                    )}
                </div>

                {/* Footer Totals - Only visible if has items */}
                {cart.length > 0 && (
                    <div className="p-4 border-t border-gray-100 bg-gray-50">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-gray-600">Total Estimado</span>
                            <span className="text-xl font-bold text-espint-blue">
                                {formatCurrency(totalPrice)}
                            </span>
                        </div>
                        <p className="text-xs text-gray-400 text-center mb-3">
                            Incluye IVA
                        </p>
                        <button
                            onClick={onClose}
                            className="w-full py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
                        >
                            Seguir Comprando
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MobileCartModal;
