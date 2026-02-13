import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, BarChart2 } from 'lucide-react';
import apiService from '../api/apiService';
import LoadingSpinner from '../components/LoadingSpinner';
import SellerClientPermissionsModal from '../components/SellerClientPermissionsModal';
import ClientAnalyticsView from '../components/ClientAnalyticsView';
import { useAuth } from '../context/AuthContext';

export default function VendedorClientAnalyticsPage() {
    const { userId } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const clientName = searchParams.get('name') || 'Cliente';

    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);

    const { user } = useAuth();
    const isTestUser = searchParams.get('type') === 'test';

    useEffect(() => {
        if (userId) {
            fetchStats();
        }
    }, [userId]);

    const fetchStats = async () => {
        setLoading(true);
        setError(null);
        try {
            let response;
            if (user?.role === 'admin' || user?.role === 'marketing' || user?.role === 'test_user') {
                if (isTestUser) {
                    response = await apiService.getTestUserAnalytics(userId);
                } else {
                    response = await apiService.getUserAnalytics(userId);
                }
            } else {
                // Default for sellers
                response = await apiService.getVendedorClientAnalytics(userId);
            }
            setStats(response.data);
        } catch (err) {
            console.error('Error fetching analytics:', err);
            setError('No se pudo cargar la información del cliente.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-gray-50">
                <LoadingSpinner text="Cargando análisis..." />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col justify-center items-center min-h-screen bg-gray-50 p-4">
                <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md w-full">
                    <div className="text-red-500 mb-4 mx-auto w-12 h-12 flex items-center justify-center bg-red-100 rounded-full">
                        <BarChart2 className="w-6 h-6" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Error</h2>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <button
                        onClick={() => navigate('/vendedor-clients')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                        Volver a Clientes
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            <header className="bg-white shadow-sm sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center">
                        <button
                            onClick={() => navigate(-1)}
                            className="mr-4 p-2 rounded-full hover:bg-gray-100 text-gray-600 transition"
                        >
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <BarChart2 className="w-5 h-5 text-blue-600" />
                                Análisis Detallado
                            </h1>
                            <p className="text-sm text-gray-500">{clientName}</p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {stats && (
                    <ClientAnalyticsView
                        stats={stats}
                        clientName={clientName}
                        onManagePermissions={(user?.role === 'admin' || user?.role === 'vendedor') ? () => setIsPermissionsModalOpen(true) : null}
                    />
                )}
            </main>

            <SellerClientPermissionsModal
                isOpen={isPermissionsModalOpen}
                onClose={() => setIsPermissionsModalOpen(false)}
                clientId={userId}
                clientName={clientName}
            />
        </div>
    );
}
