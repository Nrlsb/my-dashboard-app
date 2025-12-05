import React from 'react';
import { useNavigate, useLoaderData } from 'react-router-dom';
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
  const cards = useLoaderData();



  return (
    <div className="flex w-full bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
      {cards.map((card, index) => (
        <DashboardCard
          key={card.id}
          title={card.title}
          subTitle={card.subtitle}
          icon={iconMap[card.icon] || HelpCircle}
          tag={card.tag}
          isLast={index === cards.length - 1}
          onClick={() => navigate(`/${card.navigation_path.startsWith('/') ? card.navigation_path.substring(1) : card.navigation_path}`)}
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

export const dashboardLoader = async () => {
  try {
    const panels = await apiService.getDashboardPanels();
    return panels;
  } catch (error) {
    throw new Error('No se pudieron cargar los paneles del dashboard.');
  }
};

export default DashboardPage;
