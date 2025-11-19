import React, { useState } from 'react';
// (TYPO CORREGIDO) La ruta correcta es '../' para subir de 'components' a 'src'
import { useCart } from '../context/CartContext.jsx';
import { Building, ChevronDown, User, LogOut, ShoppingCart, Settings, Users, UserCog } from 'lucide-react';

// --- Componente de Header (Corregido) ---
// (MODIFICADO) Acepta 'onLogout' y 'currentUser'
const Header = ({ onNavigate, onLogout, currentUser }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // Obtenemos el carrito desde el contexto
  const { cart } = useCart();

  // Calculamos el total de items en el carrito
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Manejador para el botón de perfil
  const handleProfileClick = () => {
    if (onNavigate) {
      onNavigate('profile');
    }
    setIsDropdownOpen(false);
  };

  // (NUEVO) Manejador para el botón de configuración
  const handleSettingsClick = () => {
    if (onNavigate) {
      onNavigate('dashboard-settings');
    }
    setIsDropdownOpen(false);
  };

  // (NUEVO) Manejador para el botón de permisos
  const handlePermissionsClick = () => {
    if (onNavigate) {
      onNavigate('client-group-permissions');
    }
    setIsDropdownOpen(false);
  };

  // (NUEVO) Manejador para la gestión de administradores
  const handleManageAdminsClick = () => {
    if (onNavigate) {
      onNavigate('manage-admins');
    }
    setIsDropdownOpen(false);
  };

  // Manejador para cerrar sesión
  const handleLogoutClick = () => {
    if (onLogout) {
      onLogout(); // Llama a la función de App.jsx
    }
    setIsDropdownOpen(false);
  };

  return (
    <header className="bg-white shadow-md relative">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <div className="flex-shrink-0">
            <button 
              onClick={() => onNavigate('dashboard')} 
              className="text-2xl font-bold text-blue-600 hover:text-blue-700 transition-colors"
            >
              Pintureria Mercurio
            </button>
          </div>
          
          {/* Agrupamos Carrito y Perfil */}
          <div className="flex items-center space-x-4">
            
            {/* Botón del Carrito */}
            <button
              onClick={() => onNavigate('order-preview')} // (RUTA CORREGIDA)
              className="relative p-2 text-gray-600 hover:text-red-600 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Ver carrito"
            >
              <ShoppingCart className="w-6 h-6" />
              {totalItems > 0 && (
                <span className="absolute top-0 right-0 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-600 rounded-full">
                  {totalItems}
                </span>
              )}
            </button>

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
                  {/* (MODIFICADO) Muestra el nombre y email del usuario real */}
                  <p className="text-sm font-medium text-gray-800">{currentUser?.full_name || 'Usuario'}</p>
                  <p className="text-xs text-gray-500">{currentUser?.email || 'Mi Cuenta'}</p>
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
                    {currentUser?.is_admin && (
                      <>
                        <button
                          onClick={handleSettingsClick}
                          className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <Settings className="w-5 h-5 mr-3 text-gray-500" />
                          Config. Dashboard
                        </button>
                        <button
                          onClick={handlePermissionsClick}
                          className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <Users className="w-5 h-5 mr-3 text-gray-500" />
                          Permisos Clientes
                        </button>
                        <button
                          onClick={handleManageAdminsClick}
                          className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <UserCog className="w-5 h-5 mr-3 text-gray-500" />
                          Gestionar Admins
                        </button>
                      </>
                    )}
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
      </div>
    </header>
  );
};

export default Header;