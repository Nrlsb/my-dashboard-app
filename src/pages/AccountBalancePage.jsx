import React from 'react';
import Header from '../components/Header.jsx';
import { ArrowLeft } from 'lucide-react';

// --- Página de Cuenta Corriente ---
const AccountBalancePage = ({ onNavigate }) => {

  // Datos de ejemplo para la cuenta corriente
  const balanceSummary = {
    total: '$150,000.00',
    available: '$50,000.00',
    pending: '$100,000.00'
  };

  const accountMovements = [
    { id: 'F-001', date: '2024-10-28', description: 'Factura A-001-12345', debit: '$25,000.00', credit: '' },
    { id: 'P-001', date: '2024-10-27', description: 'Pago recibido', debit: '', credit: '$50,000.00' },
    { id: 'F-002', date: '2024-10-25', description: 'Factura A-001-12340', debit: '$175,000.00', credit: '' },
  ];
  
  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <Header />
      <main className="p-4 md:p-8 max-w-7xl mx-auto">
        {/* Encabezado con Botón de Volver y Título */}
        <div className="flex items-center mb-6">
          <button
            onClick={() => onNavigate('dashboard')} // <-- Navega de vuelta al dashboard
            className="flex items-center justify-center p-2 mr-4 text-gray-600 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors"
            aria-label="Volver al dashboard"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold text-gray-800">Estado de Cuenta Corriente</h1>
        </div>

        {/* Resumen de Saldo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="p-6 bg-white rounded-lg shadow-md">
            <h3 className="text-sm font-medium text-gray-500 uppercase">Saldo Total</h3>
            <p className="text-3xl font-bold text-gray-800 mt-2">{balanceSummary.total}</p>
          </div>
          <div className="p-6 bg-white rounded-lg shadow-md">
            <h3 className="text-sm font-medium text-gray-500 uppercase">Disponible</h3>
            <p className="text-3xl font-bold text-green-600 mt-2">{balanceSummary.available}</p>
          </div>
          <div className="p-6 bg-white rounded-lg shadow-md">
            <h3 className="text-sm font-medium text-gray-500 uppercase">Saldo Pendiente</h3>
            <p className="text-3xl font-bold text-red-600 mt-2">{balanceSummary.pending}</p>
          </div>
        </div>
        
        {/* Tabla de Últimos Movimientos */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <h2 className="text-lg font-semibold text-gray-800 p-6 border-b border-gray-200">Últimos Movimientos</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descripción
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Débito
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Crédito
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {accountMovements.map((move) => (
                  <tr key={move.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{move.date}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{move.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 text-right">{move.debit}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 text-right">{move.credit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  );
};

export default AccountBalancePage;
