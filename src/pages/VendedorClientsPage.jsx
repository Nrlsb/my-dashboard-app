import React, { useState, useEffect } from 'react';
import apiService from '../api/apiService';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { ChevronDown, ChevronUp, Phone, Mail } from 'lucide-react';

const VendedorClientsPage = () => {
  const { user: authUser } = useAuth();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedClientIds, setExpandedClientIds] = useState(new Set());

  useEffect(() => {
    const fetchClients = async () => {
      // console.log("[VendedorClientsPage] authUser:", authUser);
      if (!authUser) {
        setError('Acceso denegado. Se requiere autenticación.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        let response;
        if (authUser.is_admin) {
          response = await apiService.getAllClients();
          // console.log("[VendedorClientsPage] Fetched all clients for admin:", response);
        } else if (authUser.role === 'vendedor') {
          response = await apiService.getVendedorClients();
          // console.log("[VendedorClientsPage] Fetched seller-specific clients:", response);
        } else {
          setError('Acceso denegado. No tiene permisos para ver esta sección.');
          setLoading(false);
          return;
        }
        setClients(response);
      } catch (err) {
        console.error('Error al obtener clientes:', err);
        setError('Error al cargar los clientes. Intente de nuevo más tarde.');
        // console.log("[VendedorClientsPage] Error fetching clients:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
  }, [authUser]);

  const toggleClient = (id) => {
    const newExpanded = new Set(expandedClientIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedClientIds(newExpanded);
  };

  return (
    <div className="p-4 md:p-8 bg-gray-100 min-h-screen">
      <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-6 text-center">
        {authUser && authUser.is_admin ? 'Todos los Clientes' : 'Mis Clientes'}
      </h1>
      {loading && <LoadingSpinner text="Cargando clientes..." />}
      {error && <p className="text-red-500 text-center text-lg mt-4">{error}</p>}
      {!loading &&
        !error &&
        (clients.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full mt-6 border-collapse md:shadow-md md:bg-white md:rounded-lg overflow-hidden block md:table">
              <thead className="hidden md:table-header-group bg-white text-[var(--color-espint-blue)] border-b-2 border-[var(--color-espint-blue)]">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-base">Nombre Completo</th>
                  <th className="px-4 py-3 text-left font-semibold text-base">Email</th>
                  <th className="px-4 py-3 text-left font-semibold text-base">Código</th>
                  <th className="px-4 py-3 text-left font-semibold text-base">Cuit/Cuil</th>
                  <th className="px-4 py-3 text-left font-semibold text-base">Teléfono</th>
                  <th className="px-4 py-3 text-left font-semibold text-base">Dirección</th>
                </tr>
              </thead>
              <tbody className="block md:table-row-group">
                {clients.map((client) => {
                  const isExpanded = expandedClientIds.has(client.id);
                  return (
                    <tr
                      key={client.id}
                      className="block md:table-row mb-4 md:mb-0 bg-white md:bg-transparent shadow-md md:shadow-none rounded-lg md:rounded-none border border-gray-200 md:border-b md:border-gray-200 transition-colors duration-200 ease-in-out hover:bg-gray-50 last:border-b-0"
                    >


                      {/* Nombre Completo - Always Visible (Header on Mobile) */}
                      <td className="px-4 py-3 md:py-3 text-sm text-gray-700 block md:table-cell border-b md:border-none border-gray-100">
                        <div className="flex justify-between items-center md:block">
                          <span className="font-bold text-lg md:text-sm md:font-normal text-[var(--color-espint-blue)] md:text-gray-700">
                            {client.full_name}
                          </span>
                          <button
                            onClick={() => toggleClient(client.id)}
                            className="md:hidden p-1 text-gray-500 hover:text-blue-600 focus:outline-none"
                          >
                            {isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                          </button>
                        </div>
                      </td>

                      {/* Email - Visible on Mobile (Secondary) */}
                      <td className="px-4 py-2 md:py-3 text-sm text-gray-700 block md:table-cell">
                        <div className="flex items-center gap-2">
                          <span className="md:hidden text-gray-400"><Mail size={16} /></span>
                          <span>{client.email}</span>
                        </div>
                      </td>

                      {/* Código A1 - Hidden on mobile unless expanded */}
                      <td className={`px-4 py-2 md:py-3 text-sm text-gray-700 ${isExpanded ? 'block' : 'hidden'} md:table-cell`}>
                        <span className="font-bold text-gray-500 md:hidden block">Código: </span>
                        {client.a1_cod}
                      </td>



                      {/* CGC A1 - Hidden on mobile unless expanded */}
                      <td className={`px-4 py-2 md:py-3 text-sm text-gray-700 ${isExpanded ? 'block' : 'hidden'} md:table-cell`}>
                        <span className="font-bold text-gray-500 md:hidden block">Cuit/Cuil: </span>
                        {client.a1_cgc}
                      </td>

                      {/* Teléfono - Always Visible on Mobile */}
                      <td className="px-4 py-2 md:py-3 text-sm text-gray-700 block md:table-cell">
                        <div className="flex items-center gap-2 md:block">
                          <span className="md:hidden text-green-600"><Phone size={16} /></span>
                          <a href={`tel:${client.a1_tel}`} className="text-blue-600 hover:underline md:text-gray-700 md:hover:no-underline md:pointer-events-none">
                            {client.a1_tel}
                          </a>
                        </div>
                      </td>

                      {/* Dirección - Hidden on mobile unless expanded */}
                      <td className={`px-4 py-2 md:py-3 text-sm text-gray-700 ${isExpanded ? 'block' : 'hidden'} md:table-cell`}>
                        <span className="font-bold text-gray-500 md:hidden block">Dirección: </span>
                        {client.a1_endereco}
                      </td>

                      {/* Mobile "Show Details" Button (if not expanded) - Optional, but the chevron in header handles it. 
                          User asked for "[ Botón: Ver detalles + ]". 
                          Let's add a button at the bottom of the card if not expanded.
                      */}
                      {!isExpanded && (
                        <td className="px-4 py-2 block md:hidden text-center border-t border-gray-100 mt-2">
                          <button
                            onClick={() => toggleClient(client.id)}
                            className="text-blue-500 text-sm font-semibold flex items-center justify-center w-full"
                          >
                            Ver detalles +
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-gray-500 mt-10">No hay clientes {authUser && authUser.is_admin ? 'en el sistema.' : 'asignados a este vendedor.'}</p>
        ))}
    </div>
  );
};

export default VendedorClientsPage;
