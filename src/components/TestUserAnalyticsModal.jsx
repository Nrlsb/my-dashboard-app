import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, BarChart2 } from 'lucide-react';
import apiService from '../api/apiService';
import LoadingSpinner from './LoadingSpinner';
import ClientAnalyticsView from './ClientAnalyticsView';

const TestUserAnalyticsModal = ({ isOpen, onClose, userId, userName, isRegularUser = false, isSellerView = false }) => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (isOpen && userId) {
            fetchStats();
        }
    }, [isOpen, userId]);

    const fetchStats = async () => {
        setLoading(true);
        try {
            let response;
            if (isSellerView) {
                response = await apiService.getVendedorClientAnalytics(userId);
            } else if (isRegularUser) {
                // Determine if we need to use a different endpoint for Admin Client view?
                // The original code used getUserAnalytics(userId) for isRegularUser
                // But VendedorClientAnalyticsPage uses getVendedorClientAnalytics(userId)
                // Let's stick to what was there, but it seems getUserAnalytics might return similar structure.
                response = await apiService.getUserAnalytics(userId);
            } else {
                response = await apiService.getTestUserAnalytics(userId);
            }
            setStats(response.data);
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-4 border-b border-gray-200 flex-shrink-0">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <BarChart2 className="w-5 h-5 text-blue-600" />
                        Análisis: {userName}
                    </h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <LoadingSpinner text="Cargando datos..." />
                        </div>
                    ) : stats ? (
                        <ClientAnalyticsView
                            stats={stats}
                            clientName={userName}
                        // Permissions button is hidden for Admin modal for now, unless needed.
                        // If needed, we can add a prop or logic here.
                        />
                    ) : (
                        <p className="text-center text-gray-500">No se pudieron cargar los datos.</p>
                    )}
                </div>

                <div className="bg-gray-50 p-4 border-t border-gray-200 flex justify-between items-center">
                    {isSellerView && (
                        <button
                            onClick={() => {
                                onClose();
                                navigate(`/vendedor-client-analytics/${userId}?name=${encodeURIComponent(userName)}`);
                            }}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                        >
                            Ver análisis completo <BarChart2 className="w-4 h-4" />
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="ml-auto px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div >
    );
};

export default TestUserAnalyticsModal;
