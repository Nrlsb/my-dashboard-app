import React from 'react';
import { Facebook, Instagram, Twitter, Mail, Phone, MapPin, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-8 mt-auto border-t border-slate-800">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Brand Section */}
          <div className="space-y-4">
            <h3 className="text-2xl font-bold text-white tracking-tight">
              Pinturerías <span className="text-blue-500">Mercurio</span>
            </h3>
            <p className="text-sm leading-relaxed text-slate-400">
              Transformamos espacios con color y calidad. Tu socio confiable en pintura y decoración desde hace más de 20 años.
            </p>
            <div className="flex space-x-4 pt-2">
              <a href="#" className="hover:text-blue-400 transition-colors duration-300">
                <Facebook size={20} />
              </a>
              <a href="#" className="hover:text-pink-500 transition-colors duration-300">
                <Instagram size={20} />
              </a>
              <a href="#" className="hover:text-blue-400 transition-colors duration-300">
                <Twitter size={20} />
              </a>
            </div>
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
              <li>
                <Link to="/contact" className="hover:text-blue-400 transition-colors duration-200 flex items-center">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2 opacity-0 hover:opacity-100 transition-opacity"></span>
                  Contacto
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-white font-semibold mb-6">Contacto</h4>
            <ul className="space-y-4 text-sm">
              <li className="flex items-start">
                <MapPin size={18} className="mr-3 text-blue-500 shrink-0 mt-0.5" />
                <span>Av. Principal 1234,<br />Ciudad, Provincia</span>
              </li>
              <li className="flex items-center">
                <Phone size={18} className="mr-3 text-blue-500 shrink-0" />
                <span>+54 11 1234-5678</span>
              </li>
              <li className="flex items-center">
                <Mail size={18} className="mr-3 text-blue-500 shrink-0" />
                <span>info@pintureriasmercurio.com</span>
              </li>
            </ul>
          </div>

          {/* Newsletter / Extra */}
          <div>
            <h4 className="text-white font-semibold mb-6">Horarios</h4>
            <ul className="space-y-3 text-sm text-slate-400">
              <li className="flex justify-between">
                <span>Lunes - Viernes:</span>
                <span className="text-slate-200">8:00 - 18:00</span>
              </li>
              <li className="flex justify-between">
                <span>Sábados:</span>
                <span className="text-slate-200">9:00 - 13:00</span>
              </li>
              <li className="flex justify-between">
                <span>Domingos:</span>
                <span className="text-slate-200">Cerrado</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-slate-500">
          <p>&copy; {currentYear} Pinturerías Mercurio. Todos los derechos reservados.</p>
          <div className="flex items-center mt-4 md:mt-0">
            <span>Hecho con</span>
            <Heart size={12} className="mx-1 text-red-500 fill-current" />
            <span>por el equipo de desarrollo</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
