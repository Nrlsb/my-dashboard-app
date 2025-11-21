import React, { useState, useEffect, useContext } from 'react';
import './VendedorClientsPage.css';
import apiService from "../api/apiService";
import { useAuth } from "../context/AuthContext";

const VendedorClientsPage = () => {
  const { user: authUser } = useAuth();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchClients = async () => {
      if (!authUser || authUser.role !== 'vendedor') {
        setError('Acceso denegado. Solo vendedores pueden ver esta sección.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await apiService.getVendedorClients();
        setClients(response);
      } catch (err) {
        console.error('Error al obtener clientes del vendedor:', err);
        setError('Error al cargar los clientes. Intente de nuevo más tarde.');
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
  }, [authUser]);

  return (
    <div className="vendedor-clients-container">
      <h1>Mis Clientes</h1>
      {loading && <p>Cargando clientes...</p>}
      {error && <p className="error-message">{error}</p>}
      {!loading && !error && (
        clients.length > 0 ? (
          <table className="client-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre Completo</th>
                <th>Email</th>
                <th>Código A1</th>
                <th>Loja A1</th>
                <th>CGC A1</th>
                <th>Teléfono A1</th>
                <th>Dirección A1</th>
              </tr>
            </thead>
            <tbody>
              {clients.map(client => (
                <tr key={client.id}>
                  <td>{client.id}</td>
                  <td>{client.full_name}</td>
                  <td>{client.email}</td>
                  <td>{client.a1_cod}</td>
                  <td>{client.a1_loja}</td>
                  <td>{client.a1_cgc}</td>
                  <td>{client.a1_tel}</td>
                  <td>{client.a1_endereco}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No hay clientes asignados a este vendedor.</p>
        )
      )}
    </div>
  );
};

export default VendedorClientsPage;
