import React, { useState }from 'react';
import { Building, ChevronDown, User, LogOut } from 'lucide-react';

// --- Componente de Header (Actualizado con Dropdown) ---
// Ahora acepta 'onNavigate' para manejar las acciones del menú
const Header = ({ onNavigate }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Manejador para el botón de perfil
  const handleProfileClick = () => {
    if (onNavigate) {
      onNavigate('profile');
    }
    setIsDropdownOpen(false);
  };

  // Manejador para cerrar sesión
  const handleLogoutClick = () => {
    if (onNavigate) {
      onNavigate('login'); // Vuelve a la página de login
    }
    setIsDropdownOpen(false);
  };

  return (
    <header className="bg-white shadow-md relative">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <div className="flex-shrink-0">
            <span className="text-2xl font-bold text-blue-600">Pintureria Mercurio</span>
          </div>
          
          {/* Perfil de Usuario (Clickable) */}
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="p-2 bg-gray-100 rounded-full">
                <Building className="w-6 h-6 text-gray-600" />
              </div>
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-800">Nombre de la Empresa</p>
                <p className="text-xs text-gray-500">Usuario Logueado</p>
              </div>
              <ChevronDown 
                className={`w-5 h-5 text-gray-600 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} 
              />
            </button>

            {/* Menú Desplegable */}
            {isDropdownOpen && (
              <div 
                className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-100 z-50 overflow-hidden"
                onMouseLeave={() => setIsDropdownOpen(false)} // Se cierra si el mouse sale
              >
                <div className="py-1">
                  <button
                    onClick={handleProfileClick}
                    className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <User className="w-5 h-5 mr-3 text-gray-500" />
                    Mi Perfil
                  </button>
                  <button
                    onClick={handleLogoutClick}
                    className="flex items-center w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 border-t border-gray-100"
                  >
                    <LogOut className="w-5 h-5 mr-3" />
                    Cerrar Sesión
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;