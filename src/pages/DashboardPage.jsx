import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import DashboardCard from '/src/components/DashboardCard.jsx';
import AccessoryCarousel from '../components/AccessoryCarousel';
import ProductGroupCarousel from '../components/ProductGroupCarousel';
import apiService from '../api/apiService';
import { useAuth } from '../context/AuthContext';
import {
  ShoppingCart,
  Clock,
  DollarSign,
  Gift,
  Banknote,
  HelpCircle,
} from 'lucide-react';

const iconMap = {
  ShoppingCart,
  Clock,
  DollarSign,
  Gift,
  Banknote,
  HelpCircle,
};

import DashboardSkeleton from '../components/DashboardSkeleton';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: cards, isLoading, error } = useQuery({
    queryKey: ['dashboardPanels'],
    queryFn: () => apiService.getDashboardPanels(),
  });

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="text-center p-8 text-red-500">
        No se pudieron cargar los paneles del dashboard.
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row w-full mb-8 rounded-3xl shadow-xl bg-white relative z-0">
      {cards.map((card, index) => (
        <DashboardCard
          key={card.id}
          title={card.title}
          subTitle={card.subtitle}
          icon={iconMap[card.icon] || HelpCircle}
          tag={card.tag}
          onClick={() => navigate(`/${card.navigation_path.startsWith('/') ? card.navigation_path.substring(1) : card.navigation_path}`)}
          className="flex-1 border-b md:border-b-0 md:border-r border-gray-100 last:border-0 first:rounded-t-3xl md:first:rounded-tr-none md:first:rounded-l-3xl last:rounded-b-3xl md:last:rounded-bl-none md:last:rounded-r-3xl"
        />
      ))}
    </div>
  );
};

const DashboardPage = () => {
  return (
    <div className="font-sans">
      <main className="p-4 md:p-8 max-w-7xl mx-auto">
        <Dashboard />
        <ProductGroupCarousel />
        <AccessoryCarousel />
      </main>
    </div>
  );
};



export default DashboardPage;
