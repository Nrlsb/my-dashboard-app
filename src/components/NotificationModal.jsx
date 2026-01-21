import React from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

const NotificationModal = ({
    isOpen,
    onClose,
    title,
    message,
    buttonText = 'Aceptar',
    variant = 'info' // 'success', 'error', 'info'
}) => {
    if (!isOpen) return null;

    const getIcon = () => {
        switch (variant) {
            case 'success':
                return <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />;
            case 'error':
                return <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />;
            case 'info':
            default:
                return <Info className="w-12 h-12 text-blue-500 mx-auto mb-4" />;
        }
    };

    const getButtonClass = () => {
        const baseClass = "px-6 py-2 rounded-lg text-white font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2";
        switch (variant) {
            case 'success':
                return `${baseClass} bg-green-600 hover:bg-green-700 focus:ring-green-500`;
            case 'error':
                return `${baseClass} bg-red-600 hover:bg-red-700 focus:ring-red-500`;
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
                className="relative bg-white rounded-lg shadow-xl w-full max-w-sm p-6 m-4 animate-in fade-in zoom-in duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="absolute top-4 right-4">
                    <button
                        onClick={onClose}
                        className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="text-center">
                    {getIcon()}
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {title}
                    </h3>
                    <p className="text-gray-600 mb-8 whitespace-pre-wrap leading-relaxed">
                        {message}
                    </p>

                    <div className="flex justify-center">
                        <button
                            onClick={onClose}
                            className={getButtonClass()}
                        >
                            {buttonText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NotificationModal;
