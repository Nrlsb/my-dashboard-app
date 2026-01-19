import React from 'react';
import { Mail, Phone, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { brands } from '../data/brands';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-espint-blue/95 text-slate-300 pt-16 pb-8 mt-auto border-t border-slate-800">
      <div className="max-w-6xl mx-auto px-6">
        {/* Brand Logos Section */}
        <div className="mb-12 border-b border-slate-800 pb-8">
          <h4 className="text-white font-semibold mb-6 text-center">Nuestras Marcas</h4>

          <div className="flex flex-wrap justify-center gap-4">
            {brands.map((brand) => (
              <Link
                key={brand.name}
                to={`/products?brand=${encodeURIComponent(brand.value)}`}
                className="bg-white w-20 h-20 rounded-full hover:bg-gray-200 transition-all duration-300 flex items-center justify-center group shadow-lg hover:shadow-xl hover:scale-105"
              >
                <img
                  src={brand.img}
                  alt={brand.name}
                  className="max-w-[85%] max-h-[85%] object-contain transition-transform duration-300 group-hover:scale-110"
                />
              </Link>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
          {/* Brand Section */}
          <div className="space-y-4">
            <h3 className="text-2xl font-bold text-white tracking-tight">
              Distribuidora <span className="text-blue-500">Espint</span>
            </h3>
            <p className="text-sm leading-relaxed text-slate-400">
              Transformamos espacios con color y calidad. Tu socio confiable en pintura y decoración desde hace más de 45 años.
            </p>

          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-6">Enlaces Rápidos</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link to="/" className="hover:text-blue-400 transition-colors duration-200 flex items-center">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2 opacity-0 hover:opacity-100 transition-opacity"></span>
                  Inicio
                </Link>
              </li>
              <li>
                <Link to="/products" className="hover:text-blue-400 transition-colors duration-200 flex items-center">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2 opacity-0 hover:opacity-100 transition-opacity"></span>
                  Productos
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-blue-400 transition-colors duration-200 flex items-center">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2 opacity-0 hover:opacity-100 transition-opacity"></span>
                  Nosotros
                </Link>
              </li>
            </ul>
          </div>




        </div>

        {/* Bottom Bar */}
        <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-slate-500">
          <p>&copy; {currentYear} Distribuidora Espint. Todos los derechos reservados.</p>
          <div className="flex items-center mt-4 md:mt-0">
            <span>Desarrollado por el área de sistemas de Pinturería Mercurio</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
