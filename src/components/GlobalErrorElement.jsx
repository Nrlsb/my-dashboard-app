import React from 'react';
import { useRouteError } from 'react-router-dom';

const GlobalErrorElement = () => {
    const error = useRouteError();

    // Check if the error is a dynamic import error
    if (error?.message?.includes('dynamically imported module') ||
        error?.message?.includes('Importing a module script failed')) {
        // Reload the page to fetch the latest chunks
        window.location.reload();
        return null;
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
            <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
                <h1 className="text-2xl font-bold text-red-600 mb-4">¡Ups! Algo salió mal</h1>
                <p className="text-gray-600 mb-6">
                    Ha ocurrido un error inesperado en la aplicación.
                </p>
                <p className="text-sm text-gray-500 mb-4 bg-gray-100 p-2 rounded overflow-auto max-h-32">
                    {error?.message || 'Error desconocido'}
                </p>
                <button
                    onClick={() => window.location.reload()}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-200"
                >
                    Recargar Página
                </button>
            </div>
        </div>
    );
};

export default GlobalErrorElement;
