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
                className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm p-8 m-4 animate-in fade-in zoom-in duration-300 border border-gray-100"
            >
                <div className="text-center">
                    <div className="bg-yellow-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertTriangle className="w-10 h-10 text-yellow-500" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">
                        Sesión Expirada
                    </h3>
                    <p className="text-gray-600 mb-8 leading-relaxed">
                        Tu sesión ha caducado por seguridad. Por favor, inicia sesión nuevamente para continuar.
                    </p>

                    <div className="flex justify-center">
                        <button
                            onClick={onConfirm}
                            className="w-full sm:w-auto px-10 py-3 rounded-full text-white font-bold text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-magenta-500/50 bg-[#EB2891] hover:bg-[#d11d7a]"
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
