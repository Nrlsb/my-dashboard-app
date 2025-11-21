import React from 'react';

const VendedorDashboardPage = ({ onNavigate }) => {
  const cardStyle = {
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '20px',
    textAlign: 'center',
    textDecoration: 'none',
    color: 'inherit',
    transition: 'transform 0.2s',
    display: 'block',
    backgroundColor: '#f9f9f9',
    cursor: 'pointer'
  };

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
    padding: '20px'
  };

  const containerStyle = {
    padding: '20px'
  };

  return (
    <div style={containerStyle}>
      <h1>Panel de Vendedor</h1>
      <p>Bienvenido. Desde aquí puedes gestionar tus clientes, pedidos y cuentas corrientes.</p>
      <div style={gridStyle}>
        <div onClick={() => onNavigate('account-balance')} style={cardStyle}>
          <h2>Cuentas Corrientes</h2>
          <p>Consulta los saldos y movimientos de tus clientes.</p>
        </div>
        <div onClick={() => onNavigate('order-history')} style={cardStyle}>
          <h2>Pedidos de Ventas</h2>
          <p>Visualiza el historial de pedidos y crea nuevos.</p>
        </div>
        <div onClick={() => onNavigate('vendedor-clientes')} style={cardStyle}>
          <h2>Clientes</h2>
          <p>Administra tu cartera de clientes.</p>
        </div>
      </div>
    </div>
  );
};

export default VendedorDashboardPage;
