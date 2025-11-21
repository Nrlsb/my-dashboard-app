import React from 'react';
import './VendedorDashboardPage.css'; // Asegúrate de que el CSS se importa si es necesario

const VendedorDashboardPage = ({ onNavigate }) => {

  return (
    <div className="vendedor-dashboard-container">
      <div className="vendedor-dashboard-header">
        <h1>Panel de Vendedor</h1>
        <p>Bienvenido. Desde aquí puedes gestionar tus clientes, pedidos y cuentas corrientes.</p>
      </div>
      <div className="vendedor-dashboard-grid">
        <div onClick={() => onNavigate('account-balance')} className="vendedor-dashboard-card">
          <h2>Cuentas Corrientes</h2>
          <p>Consulta los saldos y movimientos de tus clientes.</p>
        </div>
        <div onClick={() => onNavigate('order-history')} className="vendedor-dashboard-card">
          <h2>Pedidos de Ventas</h2>
          <p>Visualiza el historial de pedidos y crea nuevos.</p>
        </div>
        <div onClick={() => onNavigate('vendedor-clients')} className="vendedor-dashboard-card">
          <h2>Clientes</h2>
          <p>Gestiona y visualiza la información detallada de tus clientes.</p>
        </div>
      </div>
    </div>
  );
};

export default VendedorDashboardPage;
