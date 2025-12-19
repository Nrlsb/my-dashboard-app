import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import useDolar from '../hooks/useDolar';
import {
  User,
  LogOut,
  ShoppingCart,
  Settings,
  Users,
  UserCog,
  Tag,
  Layers,
  BarChart2,
  ChevronDown,
  Phone,
} from 'lucide-react';
import logo from '../assets/espintBlanco.svg';
import SearchBar from './SearchBar';

const Header = ({ onLogout, currentUser }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { cart } = useCart();
  const { dolar } = useDolar();
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
    <div className="flex flex-col w-full z-50 relative">
      {/* Main Header */}
      <header className="bg-espint-blue shadow-lg">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-40 gap-8">
            {/* Logo */}
            <div className="flex-shrink-0 transition-transform hover:scale-105 duration-300">
              <button onClick={() => handleNavigation('/dashboard')}>
                <img src={logo} alt="Espint Distribuidora" className="h-28" />
              </button>
            </div>

            {/* Search Bar - Centered */}
            <div className="flex-1 max-w-2xl mx-auto hidden md:flex flex-col items-center justify-center relative">
              <div className="w-full transform scale-110">
                <SearchBar />
              </div>
              {dolar && (
                <div className="absolute top-full mt-4 left-1/2 -translate-x-1/2 flex items-center gap-6 font-medium tracking-wide text-sm w-max">
                  <span className="text-espint-green font-bold">Dólar Oficial BNA</span>
                  <div className="flex items-center gap-4">
                    <span className="text-white/90">Compra: <span className="text-white font-bold text-lg ml-1">${Number(dolar.compra).toFixed(2)}</span></span>
                    <span className="text-white/90">Venta: <span className="text-white font-bold text-lg ml-1">${Number(dolar.venta).toFixed(2)}</span></span>
                  </div>
                </div>
              )}
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-6">
              {/* Cart */}
              <button
                onClick={() => handleNavigation('/order-preview')}
                className="relative group p-2 transition-all duration-300"
                aria-label="Ver carrito"
              >
                <ShoppingCart className="w-7 h-7 text-white group-hover:text-espint-green transition-colors" />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-[10px] font-bold text-espint-blue bg-espint-green rounded-full shadow-sm border border-espint-blue">
                    {totalItems}
                  </span>
                )}
              </button>

              {/* User Profile Section */}
              <div className="flex flex-col items-end gap-2">
                <div className="relative">
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-white/5 transition-all duration-300 border border-transparent hover:border-white/10 group"
                  >
                    <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-espint-green to-[#aadd00] flex items-center justify-center shadow-lg shadow-espint-green/20 group-hover:shadow-espint-green/40 transition-all">
                      <span className="text-espint-blue font-bold text-lg">
                        {currentUser?.full_name
                          ? currentUser.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                          : 'U'}
                      </span>
                    </div>

                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-bold text-white leading-tight group-hover:text-espint-green transition-colors">
                        {currentUser?.full_name || 'Usuario'}
                      </p>
                    </div>

                    <ChevronDown
                      className={`w-4 h-4 text-espint-green transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {/* Dropdown Menu */}
                  {isDropdownOpen && (
                    <div
                      className="absolute right-0 mt-3 w-64 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden transform origin-top-right transition-all z-50"
                      onMouseLeave={() => setIsDropdownOpen(false)}
                    >
                      <div className="p-2">
                        <div className="px-4 py-3 border-b border-gray-50 mb-1">
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Mi Cuenta</p>
                        </div>

                        <button
                          onClick={() => handleNavigation('/profile')}
                          className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-espint-blue rounded-lg transition-colors"
                        >
                          <User className="w-4 h-4 mr-3 text-gray-400" />
                          Mi Perfil
                        </button>

                        {(currentUser?.is_admin || currentUser?.role === 'marketing' || hasPermission('manage_offers')) && (
                          <button
                            onClick={() => handleNavigation('/manage-offers')}
                            className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-espint-blue rounded-lg transition-colors"
                          >
                            <Tag className="w-4 h-4 mr-3 text-gray-400" />
                            Gestionar Ofertas
                          </button>
                        )}

                        {(currentUser?.is_admin || currentUser?.role === 'marketing' || hasPermission('manage_content')) && (
                          <button
                            onClick={() => handleNavigation('/manage-content')}
                            className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-espint-blue rounded-lg transition-colors"
                          >
                            <Layers className="w-4 h-4 mr-3 text-gray-400" />
                            Gestionar Contenido
                          </button>
                        )}

                        {(currentUser?.is_admin || hasPermission('view_analytics')) && (
                          <button
                            onClick={() => handleNavigation('/analytics')}
                            className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-espint-blue rounded-lg transition-colors"
                          >
                            <BarChart2 className="w-4 h-4 mr-3 text-gray-400" />
                            Panel de Análisis
                          </button>
                        )}

                        {currentUser?.is_admin && (
                          <>
                            <div className="my-2 border-t border-gray-50"></div>
                            <div className="px-4 py-2">
                              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Administración</p>
                            </div>

                            <button
                              onClick={() => handleNavigation('/dashboard-settings')}
                              className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-espint-blue rounded-lg transition-colors"
                            >
                              <Settings className="w-4 h-4 mr-3 text-gray-400" />
                              Config. Dashboard
                            </button>
                            <button
                              onClick={() => handleNavigation('/client-group-permissions')}
                              className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-espint-blue rounded-lg transition-colors"
                            >
                              <Users className="w-4 h-4 mr-3 text-gray-400" />
                              Permisos Grupos
                            </button>
                            <button
                              onClick={() => handleNavigation('/client-product-permissions')}
                              className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-espint-blue rounded-lg transition-colors"
                            >
                              <Users className="w-4 h-4 mr-3 text-gray-400" />
                              Permisos Productos
                            </button>
                            <button
                              onClick={() => handleNavigation('/upload-images')}
                              className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-espint-blue rounded-lg transition-colors"
                            >
                              <Tag className="w-4 h-4 mr-3 text-gray-400" />
                              Subir Imágenes
                            </button>
                          </>
                        )}

                        {(currentUser?.is_admin || hasPermission('manage_admins')) && (
                          <button
                            onClick={() => handleNavigation('/manage-admins')}
                            className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-espint-blue rounded-lg transition-colors"
                          >
                            <UserCog className="w-4 h-4 mr-3 text-gray-400" />
                            Gestionar Admins
                          </button>
                        )}

                        <div className="my-2 border-t border-gray-50"></div>

                        <button
                          onClick={handleLogoutClick}
                          className="flex items-center w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <LogOut className="w-4 h-4 mr-3" />
                          Cerrar Sesión
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Seller Info - Outside Button */}
                {currentUser?.vendedor_nombre && (
                  <div className="flex flex-col items-end mr-2">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] text-gray-400 uppercase tracking-wider">Vendedor</span>
                      <span className="text-xs text-espint-green font-bold uppercase tracking-wide">
                        {currentUser.vendedor_nombre}
                      </span>
                    </div>
                    {currentUser?.vendedor_telefono && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-espint-green" />
                        <span className="text-[10px] text-white/80 font-medium tracking-wide">
                          {currentUser.vendedor_telefono}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>
    </div>
  );
};

export default Header;
