import React from 'react';
import { Tag, Star } from 'lucide-react';

const GeneralTab = () => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <a
                href="/manage-offers"
                className="p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow flex flex-col items-center justify-center text-center border border-gray-100 group"
            >
                <div className="p-3 bg-blue-50 rounded-full mb-3 group-hover:bg-blue-100 transition-colors">
                    <Tag className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800">
                    Gestionar Ofertas
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                    Activar/desactivar y personalizar ofertas
                </p>
            </a>

            <a
                href="/manage-new-releases"
                className="p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow flex flex-col items-center justify-center text-center border border-gray-100 group"
            >
                <div className="p-3 bg-purple-50 rounded-full mb-3 group-hover:bg-purple-100 transition-colors">
                    <Star className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800">
                    Gestionar Nuevos Lanzamientos
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                    Destacar productos como nuevos
                </p>
            </a>
        </div>
    );
};

export default GeneralTab;
