import React from 'react';
// (ELIMINADO) Header ya no se importa ni se renderiza aquí
import DashboardCard from '/src/components/DashboardCard.jsx';
import {
  ShoppingCart,
  Clock,
  DollarSign,
  Gift,
  Banknote,
  HelpCircle,
  // (ELIMINADO) FileText y UploadCloud ya no se usan
} from 'lucide-react';

// El Contenido del Dashboard
const Dashboard = ({ onNavigate }) => {
  const cards = [
    { 
      title: '', 
      subTitle: 'Nuevo Pedido', 
      icon: ShoppingCart, 
      bgColor: 'bg-gray-700',
      action: () => onNavigate('new-order') // (RUTA CORREGIDA)
    },
    { 
      title: 'Historico', 
      subTitle: 'Histórico de Pedidos', 
      icon: Clock, 
      bgColor: 'bg-gray-700',
      action: () => onNavigate('order-history') // (RUTA CORREGIDA)
    },
    { 
      title: 'Precios', 
      subTitle: 'Lista de Precios', 
      icon: DollarSign, 
      bgColor: 'bg-gray-700',
      action: () => onNavigate('price-list') // (RUTA CORREGIDA)
    },
    { 
      title: 'Ofertas', 
      subTitle: 'Nuevas Ofertas', 
      icon: Gift, 
      tag: 'NUEVO', 
      bgColor: 'bg-gray-700',
      action: () => onNavigate('offers')
    },
    { 
      title: 'Cuenta Corriente', 
      subTitle: 'Saldo Cuenta', 
      icon: Banknote, 
      bgColor: 'bg-gray-700',
      action: () => onNavigate('account-balance') // (RUTA CORREGIDA)
    },
    // --- (ELIMINADO) Objeto de 'Información Importante' ---
    // { 
    //   title: 'Información Importante', 
    //   subTitle: 'Información', 
    //   icon: FileText, 
    //   bgColor: 'bg-gray-700',
    //   action: () => {}
    // },
    { 
      title: 'Consultas', 
      subTitle: 'Envío de Consultas', 
      icon: HelpCircle, 
      bgColor: 'bg-gray-700',
      action: () => onNavigate('queries')
    },
    // --- (ELIMINADO) Objeto de 'Carga Comprobantes' ---
    // { 
    //   title: 'Cupones Tarjeta', 
    //   subTitle: 'Carga Comprobantes', 
    //   icon: UploadCloud, 
    //   bgColor: 'bg-gray-700',
    //   action: () => onNavigate('voucher-upload')
    // },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
      {cards.map((card, index) => (
        <DashboardCard
          key={index}
          title={card.title}
          subTitle={card.subTitle}
          icon={card.icon}
          tag={card.tag}
          bgColor={card.bgColor}
          onClick={card.action} // Asignamos el onClick
        />
      ))}
    </div>
  );
};


// --- Página Principal del Dashboard ---
const DashboardPage = ({ onNavigate }) => {
  return (
    // (MODIFICADO) Se quita min-h-screen y bg-gray-100 (App.jsx lo maneja)
    <div className="font-sans">
      {/* (ELIMINADO) Header ya no se renderiza aquí */}
      <main className="p-4 md:p-8 max-w-7xl mx-auto">
        <Dashboard onNavigate={onNavigate} />
      </main>
    </div>
  );
};

export default DashboardPage;