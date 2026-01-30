import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import DashboardCard from '/src/components/DashboardCard.jsx';
import AccessoryCarousel from '../components/AccessoryCarousel';
import ProductGroupCarousel from '../components/ProductGroupCarousel';
import apiService from '../api/apiService';

// ... (existing helper function if needed, but imports are at top usually)

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
import NewReleasesBanner from '../components/NewReleasesBanner';

const DashboardCards = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: cards, isLoading: isLoadingCards, error } = useQuery({
    queryKey: ['dashboardPanels'],
    queryFn: () => apiService.getDashboardPanels(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const safeCards = Array.isArray(cards) ? cards : [];

  // Fetch new releases to check if we should show the section
  const { data: newReleases = [] } = useQuery({
    queryKey: ['new-releases-banner'],
    queryFn: () => apiService.fetchNewReleases(),
    staleTime: 1000 * 60 * 5,
  });

  if (isLoadingCards) {
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
    <div className="flex flex-col md:flex-row w-full rounded-3xl shadow-xl bg-white relative z-0 mb-8">
      {safeCards.map((card, index) => (
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
  // We lift the state here or in DashboardCards depending on structure, 
  // but DashboardCards is a sibling to the banner. 
  // Wait, DashboardCards is inside DashboardPage. 
  // The query for new releases should be inside DashboardPage to control the layout below.

  // Correction: I put the query inside DashboardCards in the first attempt above, but that's wrong because 
  // DashboardCards only returns the cards. The banner is in DashboardPage.
  // I will fix this by putting the query in DashboardPage.

  // Fetch new releases
  const { data: newReleases = [] } = useQuery({
    queryKey: ['new-releases-banner'],
    queryFn: () => apiService.fetchNewReleases(),
    staleTime: 1000 * 60 * 5,
  });

  // Fetch launch groups to merge into banner
  const { data: launchGroups = [] } = useQuery({
    queryKey: ['dashboard-launch-groups'],
    queryFn: async () => {
      const groups = await apiService.getProductGroupsDetails();
      return groups.filter(g => g.is_launch_group);
    },
    staleTime: 1000 * 60 * 5,
  });

  const combinedReleases = [...(launchGroups || []), ...(newReleases || [])];

  return (
    <div className="font-sans">
      <main className="p-2 md:p-4 w-full">
        <DashboardCards />

        <div className="flex flex-col md:flex-row gap-6 mt-8">
          {/* Sidebar Banner */}
          {combinedReleases.length > 0 && (
            <div className="flex-shrink-0 hidden md:flex md:flex-col mt-8 py-4">
              <h2 className="text-2xl font-bold mb-4 text-espint-blue break-words w-64 lg:w-72 leading-tight">
                Nuevos Lanzamientos
              </h2>
              <NewReleasesBanner products={combinedReleases} />
            </div>
          )}

          {/* Mobile Banner (Horizontal) */}
          {combinedReleases.length > 0 && (
            <div className="block md:hidden mb-4">
              <NewReleasesBanner products={combinedReleases} />
            </div>
          )}

          {/* Main Content Area */}
          <div className="flex-grow w-full min-w-0 space-y-8">
            <ProductGroupCarousel />
            <AccessoryCarousel />
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;
