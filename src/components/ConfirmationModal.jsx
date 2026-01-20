import React from 'react';
import { X, AlertTriangle, AlertCircle, Info } from 'lucide-react';

const ConfirmationModal = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    variant = 'danger' // 'danger', 'warning', 'info'
}) => {
    if (!isOpen) return null;

    const getIcon = () => {
        switch (variant) {
            case 'danger':
                return <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />;
            case 'warning':
                return <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />;
            case 'info':
            default:
                return <Info className="w-12 h-12 text-blue-500 mx-auto mb-4" />;
        }
    };

    const getConfirmButtonClass = () => {
        const baseClass = "px-4 py-2 rounded-lg text-white font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2";
        switch (variant) {
            case 'danger':
                return `${baseClass} bg-red-600 hover:bg-red-700 focus:ring-red-500`;
            case 'warning':
                return `${baseClass} bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500`;
            case 'info':
            default:
                return `${baseClass} bg-blue-600 hover:bg-blue-700 focus:ring-blue-500`;
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="relative bg-white rounded-lg shadow-xl w-full max-w-md p-6 m-4 animate-in fade-in zoom-in duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="text-center">
                    {getIcon()}
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {title}
                    </h3>
                    <p className="text-gray-600 mb-8 whitespace-pre-wrap">
                        {message}
                    </p>

                    <div className="flex justify-center space-x-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg text-gray-700 bg-gray-100 hover:bg-gray-200 font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={onConfirm}
                            className={getConfirmButtonClass()}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
