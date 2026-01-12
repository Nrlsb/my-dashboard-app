import React, { useEffect, useState } from 'react';
import { X, BarChart2, Calendar, Eye } from 'lucide-react';
import apiService from '../api/apiService';
import LoadingSpinner from './LoadingSpinner';

const TestUserAnalyticsModal = ({ isOpen, onClose, userId, userName }) => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && userId) {
            fetchStats();
        }
    }, [isOpen, userId]);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const response = await apiService.getTestUserAnalytics(userId);
            setStats(response.data);
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 overflow-hidden">
                <div className="flex justify-between items-center p-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <BarChart2 className="w-5 h-5 text-blue-600" />
                        Análisis: {userName}
                    </h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <LoadingSpinner text="Cargando datos..." />
                        </div>
                    ) : stats ? (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-blue-50 p-4 rounded-lg">
                                    <div className="flex items-center gap-2 text-blue-700 mb-1">
                                        <Eye className="w-4 h-4" />
                                        <span className="text-sm font-medium">Visitas Totales</span>
                                    </div>
                                    <p className="text-2xl font-bold text-gray-800">{stats.totalVisits}</p>
                                </div>
                                <div className="bg-green-50 p-4 rounded-lg">
                                    <div className="flex items-center gap-2 text-green-700 mb-1">
                                        <Calendar className="w-4 h-4" />
                                        <span className="text-sm font-medium">Última Visita</span>
                                    </div>
                                    <p className="text-lg font-semibold text-gray-800">
                                        {stats.lastVisit ? new Date(stats.lastVisit).toLocaleDateString() : 'N/A'}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {stats.lastVisit ? new Date(stats.lastVisit).toLocaleTimeString() : ''}
                                    </p>
                                </div>
                            </div>

                            <div>
                                <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                                    Páginas Más Vistas
                                </h4>
                                {stats.topPages.length > 0 ? (
                                    <ul className="divide-y divide-gray-100">
                                        {stats.topPages.map((page, index) => (
                                            <li key={index} className="py-2 flex justify-between items-center">
                                                <span className="text-sm text-gray-600 truncate max-w-[250px]" title={page.path}>
                                                    {page.path}
                                                </span>
                                                <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                                    {page.count} visitas
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-gray-500 italic">No hay actividad registrada.</p>
                                )}
                            </div>
                        </div>
                    ) : (
                        <p className="text-center text-gray-500">No se pudieron cargar los datos.</p>
                    )}
                </div>

                <div className="bg-gray-50 p-4 border-t border-gray-200 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TestUserAnalyticsModal;
