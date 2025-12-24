import React from 'react';
import { Facebook, Instagram, Twitter, Mail, Phone, MapPin, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-espint-blue/95 text-slate-300 pt-16 pb-8 mt-auto border-t border-slate-800">
      <div className="max-w-6xl mx-auto px-6">
        {/* Brand Logos Section */}
        <div className="mb-12 border-b border-slate-800 pb-8">
          <h4 className="text-white font-semibold mb-6 text-center">Nuestras Marcas</h4>
          <div className="flex flex-wrap justify-center gap-6">
            {[
              {
                name: 'Alba',
                value: 'ALBA HOGAR,ALBA INDUSTRIA,ALBA PLUS PROTECTION,ALBA TINTING,ALBAMIX',
                img: 'https://res.cloudinary.com/dstuwukxl/image/upload/v1766496083/Alba_hd7poq.png'
              },
              {
                name: 'Tersuave',
                value: 'TERSUAVE,TERSUAVE DILUYENTES,TERSUAVE INDUSTRIA,TERSUAVE SISTEMA',
                img: 'https://res.cloudinary.com/dstuwukxl/image/upload/v1766495828/LogoTersuave_q6v1gw.png'
              },
              { name: 'Rosarpin', value: 'ROSARPIN', img: 'https://res.cloudinary.com/dstuwukxl/image/upload/v1766495868/rosarpin_2_fxcejt.webp' },
              { name: 'Doble A', value: 'ABRASIVOS ARGENTINOS', img: 'https://res.cloudinary.com/dstuwukxl/image/upload/v1766495908/Recurso_1_myl2oj.png' },
              { name: 'Megaflex', value: 'MEGAFLEX', img: 'https://res.cloudinary.com/dstuwukxl/image/upload/v1766495768/megaflex_adns8d.png' },
              {
                name: 'Weber',
                value: 'WEBER CONSTRUCCIONES,WEBER PINTURA Y AFINES',
                img: 'https://res.cloudinary.com/dstuwukxl/image/upload/v1766496186/weber2_wccjyw.png'
              },
              { name: 'Cetol', value: 'AKZO NOBEL - CETOL', img: 'https://res.cloudinary.com/dstuwukxl/image/upload/v1766495632/Cetol_bt7kvk.png' },
              { name: 'Lumar', value: 'LUMAR', img: 'https://res.cloudinary.com/dstuwukxl/image/upload/v1766495729/fSj32K3OOShrXD1ooaDT8sjiaRuR5x4aJf2lvu3c_nactdj.png' },
            ].map((brand) => (
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
            </ul>
          </div>




        </div>

        {/* Bottom Bar */}
        <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-slate-500">
          <p>&copy; {currentYear} Distribuidora Espint. Todos los derechos reservados.</p>
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
