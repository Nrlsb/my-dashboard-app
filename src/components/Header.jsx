import React from 'react';
import { Building, ChevronDown } from 'lucide-react';

// --- Componente de Header ---
// Movido a su propio archivo ya que es reutilizable
const Header = () => {
  return (
    <header className="bg-white shadow-md">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <div className="flex-shrink-0">
            <span className="text-2xl font-bold text-blue-600">Pintureria Mercurio</span>
          </div>
          
          {/* Perfil de Usuario */}
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gray-100 rounded-full">
              <Building className="w-6 h-6 text-gray-600" />
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-800">Nombre de la Empresa</p>
              <p className="text-xs text-gray-500">Usuario Logueado</p>
            </div>
            <button className="p-2 rounded-full hover:bg-gray-100">
              <ChevronDown className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
