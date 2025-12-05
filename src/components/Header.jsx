import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Importar useNavigate
import { useCart } from '../context/CartContext.jsx';
import {
  Building,
  ChevronDown,
  User,
  LogOut,
  ShoppingCart,
  Settings,
  Users,
  UserCog,
  Tag,
  Layers,
} from 'lucide-react';
import logo from '../assets/espintBlanco.svg';

const Header = ({ onLogout, currentUser }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const navigate = useNavigate(); // Usar el hook
  const { cart } = useCart();
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleNavigation = (path) => {
    navigate(path);
    setIsDropdownOpen(false);
  };

  const handleLogoutClick = () => {
    if (onLogout) {
      onLogout();
    }
    setIsDropdownOpen(false);
  };

  return (
    <header className="bg-espint-blue/95 backdrop-blur-sm shadow-md relative z-50">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex-shrink-0">
            <button
              onClick={() => handleNavigation('/dashboard')}
            >
              <img src={logo} alt="Espint Distribuidora" className="h-12" />
            </button>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => handleNavigation('/order-preview')}
              className="relative p-2 text-white hover:text-espint-green hover:bg-white/10 rounded-full transition-colors"
              aria-label="Ver carrito"
            >
              <ShoppingCart className="w-6 h-6" />
              {totalItems > 0 && (
                <span className="absolute top-0 right-0 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-espint-green rounded-full">
                  {totalItems}
                </span>
              )}
            </button>

            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center space-x-3 p-2 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <div className="p-2 bg-white/20 rounded-full">
                  <Building className="w-6 h-6 text-white" />
                </div>
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-white">
                    {currentUser?.full_name || 'Usuario'}
                  </p>
                  <p className="text-xs text-gray-200">
                    {currentUser?.email || 'Mi Cuenta'}
                  </p>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-white transition-transform ${isDropdownOpen ? 'rotate-180' : ''
                    }`}
                />
              </button>

              {isDropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-100 z-50 overflow-hidden"
                  onMouseLeave={() => setIsDropdownOpen(false)}
                >
                  <div className="py-1">
                    <button
                      onClick={() => handleNavigation('/profile')}
                      className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                    >
                      <User className="w-5 h-5 mr-3 text-gray-500" />
                      Mi Perfil
                    </button>
                    {(currentUser?.is_admin || currentUser?.role === 'marketing') && (
                      <>
                        <button
                          onClick={() => handleNavigation('/manage-offers')}
                          className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                        >
                          <Tag className="w-5 h-5 mr-3 text-gray-500" />
                          Gestionar Ofertas
                        </button>
                        <button
                          onClick={() => handleNavigation('/manage-content')}
                          className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                        >
                          <Layers className="w-5 h-5 mr-3 text-gray-500" />
                          Gestionar Contenido
                        </button>
                      </>
                    )}
                    {currentUser?.is_admin && (
                      <>
                        <button
                          onClick={() => handleNavigation('/dashboard-settings')}
                          className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                        >
                          <Settings className="w-5 h-5 mr-3 text-gray-500" />
                          Config. Dashboard
                        </button>
                        <button
                          onClick={() =>
                            handleNavigation('/client-group-permissions')
                          }
                          className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                        >
                          <Users className="w-5 h-5 mr-3 text-gray-500" />
                          Permisos Clientes
                        </button>
                        <button
                          onClick={() => handleNavigation('/manage-admins')}
                          className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                        >
                          <UserCog className="w-5 h-5 mr-3 text-gray-500" />
                          Gestionar Admins
                        </button>
                      </>
                    )}
                    <button
                      onClick={handleLogoutClick}
                      className="flex items-center w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 border-t border-gray-100 cursor-pointer"
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
    </header >
  );
};

export default Header;
