import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import apiService from '../api/apiService';

import LoadingSpinner from '../components/LoadingSpinner';
import NovedadesModal from '../components/NovedadesModal';

const FALLBACK_PANELS = [
  { id: 'clients', title: 'Mis Clientes', subtitle: 'Gestioná tus clientes asignados y sus datos.', navigation_path: '/vendedor-clients' },
  { id: 'cuentas', title: 'Cuentas Corrientes', subtitle: 'Revisá el estado de cuenta de tus clientes.', navigation_path: '/vendedor-cuentas-corrientes' },
  { id: 'pedidos', title: 'Pedidos de Ventas', subtitle: 'Consultá el historial de pedidos realizados.', navigation_path: '/vendedor-pedidos-ventas' },
  { id: 'precios', title: 'Lista de Precios', subtitle: 'Accedé a las listas de precios vigentes.', navigation_path: '/vendedor-price-list' },
  { id: 'test-users', title: 'Usuarios de Prueba', subtitle: 'Administrá los usuarios de prueba de tus clientes.', navigation_path: '/vendedor-test-users' },
];

const VendedorDashboardPage = () => {
  const navigate = useNavigate();

  const {
    data: panels,
    isLoading,
  } = useQuery({
    queryKey: ['dashboardPanels'],
    queryFn: () => apiService.getDashboardPanels(),
    staleTime: 1000 * 60 * 5, // 5 minutos
    retry: 1,
  });

  const displayPanels = (panels && panels.length > 0) ? panels : FALLBACK_PANELS;

  if (isLoading) {
    return <LoadingSpinner text="Cargando dashboard..." />;
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen font-sans">
      <NovedadesModal />
      <div className="mb-10 text-center">
        <p className="text-lg text-gray-600 max-w-xl mx-auto">
          Bienvenido. Desde aquí puedes gestionar tus clientes, pedidos y
          cuentas corrientes.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {displayPanels.map((panel) => (
          <div
            key={panel.id}
            onClick={() => navigate(panel.navigation_path)}
            className="bg-white border border-gray-200 rounded-xl p-8 text-center text-inherit transition-all duration-300 ease-in-out cursor-pointer shadow-lg hover:-translate-y-2 hover:shadow-xl hover:border-blue-500"
          >
            <h2 className="text-xl font-semibold text-blue-600 mb-4">
              {panel.title}
            </h2>
            <p className="text-base text-gray-700 leading-relaxed">
              {panel.subtitle}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VendedorDashboardPage;
