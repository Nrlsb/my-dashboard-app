import React from 'react';
import Header from '/src/components/Header.jsx';
import DashboardCard from '/src/components/DashboardCard.jsx';
import {
  ShoppingCart,
  Clock,
  DollarSign,
  Gift,
  Banknote,
  FileText,
  HelpCircle,
  UploadCloud,
  User, // (NUEVO) Importar icono de Perfil
} from 'lucide-react';

// El Contenido del Dashboard
// Este componente (Dashboard) es específico de DashboardPage, 
// por lo que puede quedarse aquí o moverse a components/ si se reutiliza.
const Dashboard = ({ onNavigate }) => {
  const cards = [
    { 
      title: '', 
      subTitle: 'Nuevo Pedido', 
      icon: ShoppingCart, 
      bgColor: 'bg-gray-700',
      action: () => onNavigate('newOrder') // <-- Acción de navegación
    },
    { 
      title: 'Historico', 
      subTitle: 'Histórico de Pedidos', 
      icon: Clock, 
      bgColor: 'bg-gray-700',
      action: () => onNavigate('orderHistory') // <-- Acción para Histórico
    },
    { 
      title: 'Precios', 
      subTitle: 'Lista de Precios', 
      icon: DollarSign, 
      bgColor: 'bg-gray-700',
      action: () => onNavigate('priceList') // <-- Acción para Precios
    },
    { 
      title: 'Ofertas', 
      subTitle: 'Nuevas Ofertas', 
      icon: Gift, 
      tag: 'NUEVO', 
      bgColor: 'bg-gray-700',
      action: () => onNavigate('offers') // <-- Acción para Ofertas
    },
    { 
      title: 'Cuenta Corriente', 
      subTitle: 'Saldo Cuenta', 
      icon: Banknote, 
      bgColor: 'bg-gray-700',
      action: () => onNavigate('accountBalance') // <-- (MODIFICADO) Acción para Cuenta Corriente
    },
    { title: 'Información Importante', subTitle: 'Información', icon: FileText, bgColor: 'bg-gray-700' },
    { 
      title: 'Consultas', 
      subTitle: 'Envío de Consultas', 
      icon: HelpCircle, 
      bgColor: 'bg-gray-700',
      action: () => onNavigate('queries') // <-- (AÑADIDO) Acción para Consultas
    },
    { 
      title: 'Cupones Tarjeta', 
      subTitle: 'Carga Comprobantes', 
      icon: UploadCloud, 
      bgColor: 'bg-gray-700',
      action: () => onNavigate('voucherUpload') // <-- (AÑADIDO) Acción para Carga de Comprobantes
    },
    // (NUEVO) Tarjeta de Perfil
    { 
      title: 'Mi Perfil', 
      subTitle: 'Mis Datos', 
      icon: User, 
      bgColor: 'bg-gray-700',
      action: () => onNavigate('profile') 
    },
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
          onClick={card.action} // <-- Asignamos el onClick
        />
      ))}
    </div>
  );
};


// --- Página Principal del Dashboard ---
const DashboardPage = ({ onNavigate }) => {
  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <Header />
      <main className="p-4 md:p-8 max-w-7xl mx-auto">
        <Dashboard onNavigate={onNavigate} />
      </main>
    </div>
  );
};

export default DashboardPage;