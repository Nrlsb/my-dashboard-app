import React, { useState, useEffect, useContext } from 'react';
import apiService from '../api/apiService';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

const VendedorClientsPage = () => {
  const { user: authUser } = useAuth();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchClients = async () => {
      console.log("[VendedorClientsPage] authUser:", authUser);
      if (!authUser) {
        setError('Acceso denegado. Se requiere autenticación.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        let response;
        if (authUser.is_admin) { // Check if the user is an admin
          // Si el usuario es administrador, obtener todos los clientes
          response = await apiService.getAllClients();
          console.log("[VendedorClientsPage] Fetched all clients for admin:", response);
        } else if (authUser.role === 'vendedor') {
          // Si el usuario es vendedor, obtener solo sus clientes asignados
          response = await apiService.getVendedorClients();
          console.log("[VendedorClientsPage] Fetched seller-specific clients:", response);
        } else {
          setError('Acceso denegado. No tiene permisos para ver esta sección.');
          setLoading(false);
          return;
        }
        setClients(response);
      } catch (err) {
        console.error('Error al obtener clientes:', err);
        setError('Error al cargar los clientes. Intente de nuevo más tarde.');
        console.log("[VendedorClientsPage] Error fetching clients:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
  }, [authUser]); // Dependencia authUser para re-ejecutar cuando cambie el usuario

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <h1 className="text-4xl font-bold text-gray-800 mb-6 text-center">
        {authUser && authUser.is_admin ? 'Todos los Clientes' : 'Mis Clientes'}
      </h1>
      {loading && <LoadingSpinner text="Cargando clientes..." />}
      {error && <p className="text-red-500 text-center text-lg mt-4">{error}</p>}
      {!loading &&
        !error &&
        (clients.length > 0 ? (
          <table className="w-full mt-6 shadow-md bg-white rounded-lg overflow-hidden">
            <thead className="bg-blue-500 text-white">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-base">ID</th>
                <th className="px-4 py-3 text-left font-semibold text-base">Nombre Completo</th>
                <th className="px-4 py-3 text-left font-semibold text-base">Email</th>
                <th className="px-4 py-3 text-left font-semibold text-base">Código A1</th>
                <th className="px-4 py-3 text-left font-semibold text-base">Loja A1</th>
                <th className="px-4 py-3 text-left font-semibold text-base">CGC A1</th>
                <th className="px-4 py-3 text-left font-semibold text-base">Teléfono A1</th>
                <th className="px-4 py-3 text-left font-semibold text-base">Dirección A1</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id} className="border-b border-gray-200 transition-colors duration-200 ease-in-out hover:bg-gray-50 last:border-b-0">
                  <td className="px-4 py-3 text-sm text-gray-700">{client.id}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{client.full_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{client.email}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{client.a1_cod}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{client.a1_loja}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{client.a1_cgc}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{client.a1_tel}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{client.a1_endereco}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No hay clientes {authUser && authUser.is_admin ? 'en el sistema.' : 'asignados a este vendedor.'}</p>
        ))}
    </div>
  );
};

export default VendedorClientsPage;
