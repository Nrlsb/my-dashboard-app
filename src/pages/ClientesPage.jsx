import React from 'react';
import { useQuery } from '@tanstack/react-query';
import apiService from '../api/apiService';

const ClientesPage = () => {
  const containerStyle = {
    padding: '20px',
  };

  const tableStyle = {
    width: '100%',
    marginTop: '20px',
    borderCollapse: 'collapse',
  };

  const thTdStyle = {
    border: '1px solid #ddd',
    padding: '8px',
    textAlign: 'left',
  };

  const thStyle = {
    ...thTdStyle,
    backgroundColor: '#f2f2f2',
  };

  // Usar React Query para obtener los clientes del vendedor
  const {
    data: clients,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['vendedorClients'],
    queryFn: apiService.getVendedorClients,
  });

  return (
    <div style={containerStyle}>
      <h1>Gestión de Clientes</h1>
      <p>Aquí podrás ver, buscar y administrar tus clientes.</p>

      {isLoading && <p>Cargando clientes...</p>}
      {isError && (
        <p style={{ color: 'red' }}>
          Error al cargar clientes: {error.message}
        </p>
      )}

      {!isLoading && !isError && (
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Código</th>
              <th style={thStyle}>Nombre</th>
              <th style={thStyle}>Email</th>
              <th style={thStyle}>Teléfono</th>
              <th style={thStyle}>CUIT/CNPJ</th>
            </tr>
          </thead>
          <tbody>
            {clients && clients.length > 0 ? (
              clients.map((client) => (
                <tr key={client.id}>
                  <td style={thTdStyle}>{client.a1_cod}</td>
                  <td style={thTdStyle}>{client.full_name}</td>
                  <td style={thTdStyle}>{client.email}</td>
                  <td style={thTdStyle}>{client.a1_tel}</td>
                  <td style={thTdStyle}>{client.a1_cgc}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" style={{ ...thTdStyle, textAlign: 'center' }}>
                  No tienes clientes asignados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default ClientesPage;
