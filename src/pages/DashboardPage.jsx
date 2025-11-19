import React, { useState, useEffect } from 'react';
import DashboardCard from '/src/components/DashboardCard.jsx';
import AccessoryCarousel from '../components/AccessoryCarousel';
import ProductGroupCarousel from '../components/ProductGroupCarousel'; // Import the new component
import apiService from '../api/apiService';
import { useAuth } from '../context/AuthContext'; // Import useAuth
import {
  ShoppingCart,
  Clock,
  DollarSign,
  Gift,
  Banknote,
  HelpCircle,
} from 'lucide-react';

// Mapa para convertir los nombres de los iconos de la BD a componentes
const iconMap = {
  ShoppingCart,
  Clock,
  DollarSign,
  Gift,
  Banknote,
  HelpCircle,
};

// El Contenido del Dashboard
const Dashboard = ({ onNavigate }) => {
  const { user } = useAuth(); // Use the useAuth hook
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPanels = async () => {
      if (!user) {
        // No user logged in, fetch public panels
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const fetchedPanels = await apiService.getDashboardPanels(); // No user.id needed
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
  }, [user]); // Depend on user to re-fetch if user changes

  if (loading) {
    return <div className="text-center p-8">Cargando paneles...</div>;
  }

  if (error) {
    return <div className="text-center p-8 text-red-500">{error}</div>;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
      {cards.map((card) => (
        <DashboardCard
          key={card.id}
          title={card.title}
          subTitle={card.subtitle}
          icon={iconMap[card.icon] || HelpCircle} // Usa el icono del mapa o uno por defecto
          tag={card.tag}
          bgColor="bg-gray-700" // El color es consistente
          onClick={() => onNavigate(card.navigation_path)}
        />
      ))}
    </div>
  );
};

// --- Página Principal del Dashboard ---
const DashboardPage = ({ onNavigate, onNavigateToCategory, onViewProductDetails }) => {
  return (
    <div className="font-sans">
      <main className="p-4 md:p-8 max-w-7xl mx-auto">
        <Dashboard onNavigate={onNavigate} />
        <ProductGroupCarousel onNavigateToCategory={onNavigateToCategory} />
        <AccessoryCarousel onViewProductDetails={onViewProductDetails} />
      </main>
    </div>
  );
};

export default DashboardPage;