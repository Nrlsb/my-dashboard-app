import React from 'react';
import { AlertTriangle } from 'lucide-react';

const SessionExpiredModal = ({
    isOpen,
    onConfirm,
    confirmText = 'Ir al Login'
}) => {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm"
        >
            <div
                className="relative bg-white rounded-lg shadow-xl w-full max-w-md p-6 m-4 animate-in fade-in zoom-in duration-200"
            >
                <div className="text-center">
                    <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                        Sesión Expirada
                    </h3>
                    <p className="text-gray-600 mb-8">
                        Tu sesión ha caducado por seguridad. Por favor, inicia sesión nuevamente para continuar.
                    </p>

                    <div className="flex justify-center">
                        <button
                            onClick={onConfirm}
                            className="px-6 py-2 rounded-lg text-white font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500"
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SessionExpiredModal;
