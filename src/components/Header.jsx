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
  Mail,
  AlertCircle
} from 'lucide-react';
import logoWhite from '../assets/espintBlanco.svg';
import logoColor from '../assets/logo.svg';
import SearchBar from './SearchBar';

const Header = ({ onLogout, currentUser }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSellerInfoOpen, setIsSellerInfoOpen] = useState(false);
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { cart } = useCart();
  const { dolar } = useDolar();
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleNavigation = (path) => {
    navigate(path);
    setIsDropdownOpen(false);
    setIsSellerInfoOpen(false);
  };

  const handleLogoutClick = () => {
    if (onLogout) {
      onLogout();
    }
    setIsDropdownOpen(false);
    setIsSellerInfoOpen(false);
  };

  return (
    <div className="flex flex-col w-full z-50 sticky top-0 md:relative font-sans">
      {/* Top Bar - Institutional/Admin Info */}
      <div className="bg-[#002244] text-white py-1.5 border-b border-white/10">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-center md:justify-between items-center text-xs gap-2 md:gap-0">

          {/* Left: Dollar Rate */}
          <div className="flex items-center justify-center gap-4 w-full md:w-auto">
            {dolar && (
              <div className="flex items-center gap-3">
                <span className="text-espint-green font-bold tracking-wide hidden md:inline">DÓLAR BNA</span>
                <div className="flex items-center gap-3 text-white/80">
                  <span className="md:border-none">USD/BNA <span className="text-white font-bold ml-1">${Number(dolar.billetes.venta).toFixed(2)}</span></span>
                  <span className="w-px h-3 bg-white/20"></span>
                  <span>DIVISA <span className="text-white font-bold ml-1">${Number(dolar.divisas.venta).toFixed(2)}</span></span>
                </div>
              </div>
            )}
          </div>

          {/* Right: User & Seller Info */}
          <div className="flex items-center gap-4 md:gap-6">
            {/* Seller Name (Visible) */}
            {currentUser?.vendedor?.nombre && (
              <div className="flex items-center gap-2 text-white/70">
                <span className="uppercase tracking-wider text-[10px] hidden md:inline">Tu Vendedor:</span>
                <span className="text-espint-green font-semibold">{currentUser.vendedor.nombre}</span>
              </div>
            )}

            {/* Contacto Dropdown */}
            <div className="relative pl-4 md:pl-6 border-l border-white/10">
              <button
                onClick={() => setIsSellerInfoOpen(!isSellerInfoOpen)}
                className="flex items-center gap-2 text-white/90 hover:text-white transition-colors group"
              >
                <span className="font-medium hover:underline decoration-espint-green underline-offset-4">Contacto</span>
                <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${isSellerInfoOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Seller Dropdown Content */}
              {isSellerInfoOpen && (
                <div
                  className="absolute right-0 top-full mt-3 w-64 md:w-72 bg-white rounded-xl shadow-2xl border border-gray-100 p-4 md:p-5 z-[100] text-gray-800 transform origin-top-right animate-in fade-in slide-in-from-top-2"
                  onMouseLeave={() => setIsSellerInfoOpen(false)}
                >
                  {currentUser?.vendedor?.nombre && (
                    <div className="space-y-3">
                      {currentUser.vendedor.telefono && (
                        <div className="flex items-start gap-3 group/item">
                          <div className="mt-0.5 p-1.5 rounded-lg bg-gray-50 group-hover/item:bg-espint-blue/5 transition-colors">
                            <Phone className="w-3.5 h-3.5 text-gray-400 group-hover/item:text-espint-blue transition-colors" />
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Teléfono</p>
                            <p className="text-sm font-medium text-gray-700">{currentUser.vendedor.telefono}</p>
                          </div>
                        </div>
                      )}

                      <div className="flex items-start gap-3 group/item">
                        <div className="mt-0.5 p-1.5 rounded-lg bg-gray-50 group-hover/item:bg-espint-blue/5 transition-colors">
                          <Mail className="w-3.5 h-3.5 text-gray-400 group-hover/item:text-espint-blue transition-colors" />
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Email</p>
                          <p className="text-sm font-medium text-gray-700 break-all">
                            {currentUser.vendedor.email || <span className="text-red-400 italic">Email no disponible</span>}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Header - Operational */}
      <header className="bg-espint-blue shadow-lg relative z-20">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20 md:h-32 gap-4 md:gap-8">

            {/* Logo */}
            <div className="flex-shrink-0 transition-transform hover:scale-105 duration-300">
              <button onClick={() => handleNavigation('/dashboard')}>
                {/* Logo blanco para móvil y escritorio para mantener colores originales */}
                <img src={logoWhite} alt="Espint Distribuidora" className="h-10 md:h-28" />
              </button>
            </div>

            {/* Search Bar - Centered & Clean */}
            <div className="flex-1 max-w-3xl mx-auto hidden md:block">
              <SearchBar />
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-4">

              {/* Cart - Hidden for Vendors */}
              {currentUser?.role !== 'vendedor' && (
                <button
                  onClick={() => handleNavigation('/order-preview')}
                  className="relative group p-2 rounded-full hover:bg-white/10 transition-all duration-300"
                  aria-label="Ver carrito"
                >
                  <ShoppingCart className="w-6 h-6 text-white group-hover:text-espint-green transition-colors" />
                  {totalItems > 0 && (
                    <span className="absolute top-0 right-0 flex items-center justify-center w-5 h-5 text-[10px] font-bold text-espint-blue bg-espint-green rounded-full shadow-sm border-2 border-espint-blue">
                      {totalItems}
                    </span>
                  )}
                </button>
              )}

              {/* User Menu Trigger */}
              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-1 md:gap-2 p-1 rounded-lg hover:bg-white/10 transition-all duration-300 group"
                >
                  <div className="h-8 w-8 md:h-9 md:w-9 rounded-full bg-gradient-to-br from-espint-green to-[#aadd00] flex items-center justify-center shadow-md group-hover:shadow-lg transition-all">
                    <span className="text-espint-blue font-bold text-xs md:text-sm">
                      {currentUser?.full_name
                        ? currentUser.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                        : <User className="w-4 h-4 text-espint-blue" />}
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-3 h-3 md:w-4 md:h-4 text-white/70 group-hover:text-white transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <div
                    className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden transform origin-top-right transition-all z-50"
                    onMouseLeave={() => setIsDropdownOpen(false)}
                  >
                    <div className="p-2">
                      <div className="px-4 py-3 border-b border-gray-50 mb-1">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Mi Cuenta</p>
                        <p className="text-sm font-bold text-gray-800 truncate">{currentUser?.full_name}</p>
                      </div>

                      <button
                        onClick={() => handleNavigation('/profile')}
                        className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-espint-blue rounded-lg transition-colors"
                      >
                        <User className="w-4 h-4 mr-3 text-gray-400" />
                        Mi Perfil
                      </button>



                      {(currentUser?.is_admin || currentUser?.role === 'marketing' || hasPermission('manage_content')) && (
                        <button
                          onClick={() => handleNavigation('/manage-content')}
                          className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-espint-blue rounded-lg transition-colors"
                        >
                          <Layers className="w-4 h-4 mr-3 text-gray-400" />
                          Gestionar Contenido
                        </button>
                      )}

                      {/* (NUEVO) Enlace para Vendedores */}
                      {currentUser?.role === 'vendedor' && (
                        <button
                          onClick={() => handleNavigation('/vendedor-test-users')}
                          className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-espint-blue rounded-lg transition-colors"
                        >
                          <Users className="w-4 h-4 mr-3 text-gray-400" />
                          Usuarios de Prueba
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
                            Gestión de Catálogo
                          </button>
                          <button
                            onClick={() => handleNavigation('/admin/settings/price-alerts')}
                            className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-espint-blue rounded-lg transition-colors"
                          >
                            <AlertCircle className="w-4 h-4 mr-3 text-gray-400" />
                            Alertas de Precio
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

                      {(currentUser?.is_admin || hasPermission('manage_admins')) && (
                        <button
                          onClick={() => handleNavigation('/manage-users')}
                          className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-espint-blue rounded-lg transition-colors"
                        >
                          <Users className="w-4 h-4 mr-3 text-gray-400" />
                          Gestionar Usuarios
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
            </div>
          </div>
        </div>
      </header>
    </div>
  );
};

export default Header;
