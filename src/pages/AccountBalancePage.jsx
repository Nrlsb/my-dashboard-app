import React, { useState, useEffect } from 'react'; // (PASO 1) Importar useState y useEffect
import Header from '/src/components/Header.jsx'; // <-- (CORRECCIÓN) Ruta absoluta
import { ArrowLeft } from 'lucide-react';

// --- Página de Cuenta Corriente (Modificada para API) ---
const AccountBalancePage = ({ onNavigate }) => {

  // (PASO 2) Reemplazar datos estáticos por estados
  const [balanceSummary, setBalanceSummary] = useState(null);
  const [accountMovements, setAccountMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Define la URL de tu API (el middleware que acabamos de crear)
  const API_URL = 'http://localhost:3001';

  // (PASO 3) Usar useEffect para cargar los datos cuando el componente se monta
  useEffect(() => {
    // Definimos una función async dentro para poder usar await
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Hacemos las dos peticiones a nuestro middleware
        const balanceResponse = await fetch(`${API_URL}/api/balance`);
        if (!balanceResponse.ok) throw new Error('No se pudo cargar el saldo.');
        const balanceData = await balanceResponse.json();

        const movementsResponse = await fetch(`${API_URL}/api/movements`);
        if (!movementsResponse.ok) throw new Error('No se pudieron cargar los movimientos.');
        const movementsData = await movementsResponse.json();

        // Actualizamos los estados con los datos recibidos
        setBalanceSummary(balanceData);
        setAccountMovements(movementsData);

      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err.message);
      } finally {
        // Marcamos que la carga ha terminado (sea exitosa o con error)
        setLoading(false);
      }
    };

    fetchData(); // Ejecutamos la función de carga
  }, []); // El array vacío [] significa que esto se ejecuta SÓLO UNA VEZ, cuando el componente se monta.


  // (PASO 4) Manejar los estados de Carga y Error en el render
  
  // Renderizado mientras carga
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 font-sans">
        <Header />
        <main className="p-4 md:p-8 max-w-7xl mx-auto text-center">
          <div className="p-10 bg-white rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-700">Cargando datos...</h2>
            <p className="text-gray-500">Consultando estado de cuenta.</p>
          </div>
        </main>
      </div>
    );
  }

  // Renderizado si hay un error
  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 font-sans">
        <Header />
        <main className="p-4 md:p-8 max-w-7xl mx-auto text-center">
          <div className="p-10 bg-white rounded-lg shadow-md border-l-4 border-red-500">
            <h2 className="text-xl font-semibold text-red-600">Error</h2>
            <p className="text-gray-600">{error}</p>
            <button
              onClick={() => onNavigate('dashboard')}
              className="mt-6 px-4 py-2 bg-red-600 text-white rounded-md shadow hover:bg-red-700"
            >
              Volver al Inicio
            </button>
          </div>
        </main>
      </div>
    );
  }

  // (PASO 5) Renderizado normal (cuando los datos ya cargaron)
  // Usamos "balanceSummary?.total" (optional chaining) por si el estado es null
  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <Header />
      <main className="p-4 md:p-8 max-w-7xl mx-auto">
        {/* Encabezado con Botón de Volver y Título */}
        <div className="flex items-center mb-6">
          <button
            onClick={() => onNavigate('dashboard')}
            className="flex items-center justify-center p-2 mr-4 text-gray-600 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors"
            aria-label="Volver al dashboard"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold text-gray-800">Estado de Cuenta Corriente</h1>
        </div>

        {/* Resumen de Saldo (datos del estado) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="p-6 bg-white rounded-lg shadow-md">
            <h3 className="text-sm font-medium text-gray-500 uppercase">Saldo Total</h3>
            <p className="text-3xl font-bold text-gray-800 mt-2">{balanceSummary?.total}</p>
          </div>
          <div className="p-6 bg-white rounded-lg shadow-md">
            <h3 className="text-sm font-medium text-gray-500 uppercase">Disponible</h3>
            <p className="text-3xl font-bold text-green-600 mt-2">{balanceSummary?.available}</p>
          </div>
          <div className="p-6 bg-white rounded-lg shadow-md">
            <h3 className="text-sm font-medium text-gray-500 uppercase">Saldo Pendiente</h3>
            <p className="text-3xl font-bold text-red-600 mt-2">{balanceSummary?.pending}</p>
          </div>
        </div>
        
        {/* Tabla de Últimos Movimientos (datos del estado) */}
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

