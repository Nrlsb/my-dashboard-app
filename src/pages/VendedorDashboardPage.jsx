import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import apiService from '../api/apiService';

const VendedorDashboardPage = () => {
  const navigate = useNavigate();

  const { data: offers, isLoading } = useQuery({
    queryKey: ['offers'],
    queryFn: () => apiService.fetchOffers(),
    staleTime: 1000 * 60 * 5,
  });

  const hasOffers = !isLoading && offers && offers.length > 0;

  return (
    <div className="p-8 bg-gray-50 min-h-screen font-sans">
      <div className="mb-10 text-center">
        <p className="text-lg text-gray-600 max-w-xl mx-auto">
          Bienvenido. Desde aquí puedes gestionar tus clientes, pedidos y
          cuentas corrientes.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        <div
          onClick={() => navigate('/vendedor-cuentas-corrientes')}
          className="bg-white border border-gray-200 rounded-xl p-8 text-center text-inherit transition-all duration-300 ease-in-out cursor-pointer shadow-lg hover:-translate-y-2 hover:shadow-xl hover:border-blue-500"
        >
          <h2 className="text-xl font-semibold text-blue-600 mb-4">
            Cuentas Corrientes
          </h2>
          <p className="text-base text-gray-700 leading-relaxed">
            Consulta los saldos y movimientos de tus clientes.
          </p>
        </div>
        <div
          onClick={() => navigate('/vendedor-pedidos-ventas')}
          className="bg-white border border-gray-200 rounded-xl p-8 text-center text-inherit transition-all duration-300 ease-in-out cursor-pointer shadow-lg hover:-translate-y-2 hover:shadow-xl hover:border-blue-500"
        >
          <h2 className="text-xl font-semibold text-blue-600 mb-4">
            Pedidos de Ventas
          </h2>
          <p className="text-base text-gray-700 leading-relaxed">
            Visualiza el historial de pedidos y crea nuevos.
          </p>
        </div>
        <div
          onClick={() => navigate('/vendedor-clients')}
          className="bg-white border border-gray-200 rounded-xl p-8 text-center text-inherit transition-all duration-300 ease-in-out cursor-pointer shadow-lg hover:-translate-y-2 hover:shadow-xl hover:border-blue-500"
        >
          <h2 className="text-xl font-semibold text-blue-600 mb-4">
            Clientes
          </h2>
          <p className="text-base text-gray-700 leading-relaxed">
            Gestiona y visualiza la información detallada de tus clientes.
          </p>
        </div>
        <div
          onClick={() => navigate('/vendedor-price-list')}
          className="bg-white border border-gray-200 rounded-xl p-8 text-center text-inherit transition-all duration-300 ease-in-out cursor-pointer shadow-lg hover:-translate-y-2 hover:shadow-xl hover:border-blue-500"
        >
          <h2 className="text-xl font-semibold text-blue-600 mb-4">
            Lista de Precios
          </h2>
          <p className="text-base text-gray-700 leading-relaxed">
            Consulta la lista de precios actualizada.
          </p>
        </div>

        {/* Tarjeta condicional de Ofertas */}
        {hasOffers && (
          <div
            onClick={() => navigate('/offers')}
            className="bg-white border border-gray-200 rounded-xl p-8 text-center text-inherit transition-all duration-300 ease-in-out cursor-pointer shadow-lg hover:-translate-y-2 hover:shadow-xl hover:border-blue-500"
          >
            <h2 className="text-xl font-semibold text-blue-600 mb-4">
              Ofertas
            </h2>
            <p className="text-base text-gray-700 leading-relaxed">
              Explora los productos con descuentos especiales.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VendedorDashboardPage;
