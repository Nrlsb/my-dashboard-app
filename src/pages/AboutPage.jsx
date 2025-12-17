import React from 'react';
import { CheckCircle } from 'lucide-react';

const AboutPage = () => {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      {/* Header Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-8">
        <div className="bg-espint-blue/95 p-6 text-center">
          <h1 className="text-3xl font-bold text-white tracking-wide uppercase">
            Distribuidora Espint
          </h1>
        </div>
        <div className="p-8 md:p-10">
          <p className="text-slate-600 text-lg leading-relaxed text-center max-w-3xl mx-auto">
            Mediante el departamento de venta mayorista ESPINT, ofrecemos una atención exclusiva a comerciantes del rubro; teniendo como meta construir relaciones duraderas en el tiempo brindando para ello asesoramiento, beneficios exclusivos y respuesta inmediata.
          </p>
        </div>
      </div>

      {/* Services Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="bg-espint-blue/95 p-4 text-center">
          <h2 className="text-2xl font-bold text-white tracking-wide uppercase">
            Servicios
          </h2>
        </div>
        <div className="p-8 md:p-10">
          <ul className="space-y-4">
            {[
              "Contamos con un amplio stock que nos permite dar respuesta inmediata a sus requerimientos.",
              "Disponibilidad de marcas líderes del mercado de la pintura y derivados.",
              "Amplio asesoramiento con vendedores especializados y capacitados en el rubro.",
              "Posibilidad de realizar pedidos sin moverse de su negocio vía telefónica, e-mail o fax.",
              "Envíos a todo el país."
            ].map((item, index) => (
              <li key={index} className="flex items-start group">
                <CheckCircle className="w-6 h-6 text-blue-500 mr-4 flex-shrink-0 mt-0.5 group-hover:text-blue-600 transition-colors" />
                <span className="text-slate-700 text-lg">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
