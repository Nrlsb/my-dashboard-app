import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPanels = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const fetchedPanels = await apiService.getDashboardPanels();
        setCards(fetchedPanels);
        setError(null);
      } catch (err) {
        setError('No se pudieron cargar los paneles del dashboard.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPanels();
  }, [user]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return <div className="text-center p-8 text-red-500">{error}</div>;
  }

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

export default DashboardPage;
