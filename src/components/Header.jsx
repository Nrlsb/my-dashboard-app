import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Importar useNavigate
import { useAuth } from '../context/AuthContext.jsx';
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
  BarChart2,
} from 'lucide-react';
import logo from '../assets/espintBlanco.svg';

import SearchBar from './SearchBar';

const Header = ({ onLogout, currentUser }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const navigate = useNavigate(); // Usar el hook
  const { hasPermission } = useAuth();
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
        <div className="flex justify-between items-center h-20 gap-8">
          <div className="flex-shrink-0">
            <button
              onClick={() => handleNavigation('/dashboard')}
            >
              <img src={logo} alt="Espint Distribuidora" className="h-12" />
            </button>
          </div>

          <div className="flex-1 flex justify-center max-w-2xl mx-auto hidden md:flex">
            <SearchBar />
          </div>

          <div className="flex items-center space-x-6">
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
                className="flex items-center space-x-3 p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer border border-transparent hover:border-white/10"
              >
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-espint-green to-emerald-600 flex items-center justify-center shadow-md border-2 border-white/20">
                  <span className="text-white font-bold text-sm">
                    {currentUser?.full_name
                      ? currentUser.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                      : 'U'}
                  </span>
                </div>
                <div className="text-right hidden sm:block pr-2">
                  <p className="text-sm font-bold text-white leading-tight">
                    {currentUser?.full_name || 'Usuario'}
                  </p>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-gray-300 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''
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
                    {(currentUser?.is_admin || currentUser?.role === 'marketing' || hasPermission('manage_offers')) && (
                      <button
                        onClick={() => handleNavigation('/manage-offers')}
                        className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                      >
                        <Tag className="w-5 h-5 mr-3 text-gray-500" />
                        Gestionar Ofertas
                      </button>
                    )}
                    {(currentUser?.is_admin || currentUser?.role === 'marketing' || hasPermission('manage_content')) && (
                      <button
                        onClick={() => handleNavigation('/manage-content')}
                        className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                      >
                        <Layers className="w-5 h-5 mr-3 text-gray-500" />
                        Gestionar Contenido
                      </button>
                    )}
                    {(currentUser?.is_admin || hasPermission('view_analytics')) && (
                      <button
                        onClick={() => handleNavigation('/analytics')}
                        className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                      >
                        <BarChart2 className="w-5 h-5 mr-3 text-gray-500" />
                        Panel de Análisis
                      </button>
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
                          Permisos Grupos
                        </button>
                        <button
                          onClick={() =>
                            handleNavigation('/client-product-permissions')
                          }
                          className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                        >
                          <Users className="w-5 h-5 mr-3 text-gray-500" />
                          Permisos Productos
                        </button>
                      </>
                    )}
                    {(currentUser?.is_admin || hasPermission('manage_admins')) && (
                      <button
                        onClick={() => handleNavigation('/manage-admins')}
                        className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                      >
                        <UserCog className="w-5 h-5 mr-3 text-gray-500" />
                        Gestionar Admins
                      </button>
                    )}
                    {currentUser?.is_admin && (
                      <button
                        onClick={() => handleNavigation('/upload-images')}
                        className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                      >
                        <Tag className="w-5 h-5 mr-3 text-gray-500" />
                        Subir Imágenes
                      </button>
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
