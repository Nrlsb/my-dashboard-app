import React, { useEffect, useState } from 'react';
import apiService from '../api/apiService';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import TestUsersTable from '../components/TestUsersTable';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const AdminAnalyticsPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('general'); // 'general' | 'test-users'
    const [testUsers, setTestUsers] = useState([]);
    const [loadingTestUsers, setLoadingTestUsers] = useState(false);

    // Default to last 30 days
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

    useEffect(() => {
        if (activeTab === 'general') {
            fetchStats();
        } else if (activeTab === 'test-users') {
            fetchTestUsers();
        }
    }, [startDate, endDate, activeTab]);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const data = await apiService.getAnalytics({ startDate, endDate });
            setStats(data);
        } catch (error) {
            console.error('Error fetching analytics:', error);
            toast.error('Error al cargar las estadísticas.');
        } finally {
            setLoading(false);
        }
    };

    const fetchTestUsers = async () => {
        setLoadingTestUsers(true);
        try {
            const response = await apiService.getTestUsers();
            // La respuesta directa de apiService.request ya es el JSON parseado.
            // testUserController devuelve { results: ..., data: { users: [...] } }
            // Ojo: apiService.js handleResponse devuelve data.
            // Si el controller devuelve res.json({...}), data será ese objeto.
            setTestUsers(response.data.users || []);
        } catch (error) {
            console.error('Error fetching test users:', error);
            toast.error('Error al cargar usuarios de prueba.');
        } finally {
            setLoadingTestUsers(false);
        }
    };

    if (loading && activeTab === 'general') return <LoadingSpinner text="Cargando análisis..." />;
    if (activeTab === 'general' && !stats && !loading) return <div className="p-4 text-center">No hay datos disponibles.</div>;

    const isMarketing = user?.role === 'marketing';

    return (
        <div className="container mx-auto p-6">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h1 className="text-2xl font-bold text-gray-800">Panel de Análisis</h1>

                {/* Tabs */}
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab('general')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'general'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        General
                    </button>
                    <button
                        onClick={() => setActiveTab('test-users')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'test-users'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Usuarios de Prueba
                    </button>
                </div>

                {activeTab !== 'test-users' && (
                    <div className="flex items-center gap-2">
                        <div className="flex flex-col">
                            <label className="text-xs text-gray-500">Desde</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="border rounded p-2 text-sm"
                            />
                        </div>
                        <div className="flex flex-col">
                            <label className="text-xs text-gray-500">Hasta</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="border rounded p-2 text-sm"
                            />
                        </div>
                    </div>
                )}
            </div>

            {activeTab === 'test-users' ? (
                loadingTestUsers ? (
                    <LoadingSpinner text="Cargando usuarios de prueba..." />
                ) : (
                    <TestUsersTable users={testUsers} isMarketing={isMarketing} />
                )
            ) : (
                <>
                    {/* Resumen Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        <div className="bg-white p-4 rounded shadow border border-gray-200">
                            <h3 className="text-gray-500 text-sm font-medium">Visitas Totales</h3>
                            <p className="text-3xl font-bold text-gray-800 mt-2">
                                {stats.visits.reduce((acc, curr) => acc + parseInt(curr.count), 0)}
                            </p>
                        </div>
                        <div className="bg-white p-4 rounded shadow border border-gray-200">
                            <h3 className="text-gray-500 text-sm font-medium">Pedidos Totales</h3>
                            <p className="text-3xl font-bold text-gray-800 mt-2">
                                {stats.orders.reduce((acc, curr) => acc + parseInt(curr.count), 0)}
                            </p>
                        </div>
                        <div className="bg-white p-4 rounded shadow border border-gray-200">
                            <h3 className="text-gray-500 text-sm font-medium">Pedidos Confirmados</h3>
                            <p className="text-3xl font-bold text-green-600 mt-2">
                                {stats.orders.reduce((acc, curr) => acc + parseInt(curr.confirmed_count || 0), 0)}
                            </p>
                        </div>
                        <div className="bg-white p-4 rounded shadow border border-gray-200">
                            <h3 className="text-gray-500 text-sm font-medium">Clientes Totales</h3>
                            <p className="text-3xl font-bold text-gray-800 mt-2">{stats.clients.totalClients}</p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-6">
                        {/* Top Clientes */}
                        <div className="bg-white p-6 rounded shadow border border-gray-200">
                            <h2 className="text-xl font-semibold mb-4 text-gray-800">Tráfico por Cliente</h2>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-200">
                                            <th className="pb-3 text-gray-600 font-medium">Cliente</th>
                                            <th className="pb-3 text-gray-600 font-medium">Pedidos</th>
                                            <th className="pb-3 text-gray-600 font-medium">Más Visto</th>
                                            <th className="pb-3 text-gray-600 font-medium">Más Pedido</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stats.clients.topClients.map((client, index) => (
                                            <tr key={index} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                                                <td className="py-3">
                                                    <div
                                                        className="font-medium text-blue-600 hover:text-blue-800 cursor-pointer"
                                                        onClick={() => navigate(`/vendedor-client-analytics/${client.user_id}?name=${encodeURIComponent(client.user.full_name)}`)}
                                                    >
                                                        {client.user.full_name}
                                                    </div>
                                                    <div className="text-xs text-gray-500">{client.user.email}</div>
                                                </td>
                                                <td className="py-3 text-gray-700">{client.order_count}</td>
                                                <td className="py-3 text-gray-600 truncate max-w-[150px]" title={client.mostViewedProduct}>
                                                    {client.mostViewedProduct}
                                                </td>
                                                <td className="py-3 text-gray-600 truncate max-w-[150px]" title={client.mostBoughtProduct}>
                                                    {client.mostBoughtProduct}
                                                </td>
                                            </tr>
                                        ))}
                                        {stats.clients.topClients.length === 0 && (
                                            <tr><td colSpan="4" className="py-4 text-center text-gray-500">Sin datos</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Top Vendedores */}
                        <div className="bg-white p-6 rounded shadow border border-gray-200">
                            <h2 className="text-xl font-semibold mb-4 text-gray-800">Tráfico por Vendedor</h2>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-200">
                                            <th className="pb-3 text-gray-600 font-medium">Vendedor</th>
                                            <th className="pb-3 text-gray-600 font-medium">Visitas (Clientes)</th>
                                            <th className="pb-3 text-gray-600 font-medium">Pedidos</th>
                                            <th className="pb-3 text-gray-600 font-medium">Pedidos Confirmados</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stats.sellers.map((seller, index) => (
                                            <tr key={index} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                                                <td className="py-3">
                                                    <div
                                                        className="font-medium text-blue-600 hover:text-blue-800 cursor-pointer"
                                                        onClick={() => navigate(`/admin/analytics/seller/${seller.code}?name=${encodeURIComponent(seller.name)}`)}
                                                    >
                                                        {seller.name}
                                                    </div>
                                                </td>
                                                <td className="py-3 text-gray-700">{seller.visitCount}</td>
                                                <td className="py-3 text-gray-700">{seller.orderCount}</td>
                                                <td className="py-3 font-medium text-green-600">
                                                    {seller.confirmedOrderCount}
                                                </td>
                                            </tr>
                                        ))}
                                        {stats.sellers.length === 0 && (
                                            <tr><td colSpan="4" className="py-4 text-center text-gray-500">Sin datos</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Visitas Detalle - Simple Bar Chart */}
                    <div className="mt-8 bg-white p-6 rounded shadow border border-gray-200">
                        <h2 className="text-xl font-semibold mb-6 text-gray-800">Tráfico Diario</h2>
                        <div className="h-64 flex space-x-2 overflow-x-auto">
                            {stats.visits.length > 0 ? stats.visits.map((visit, index) => {
                                const counts = stats.visits.map(v => Number(v.count) || 0);
                                const max = Math.max(...counts);
                                const current = Number(visit.count) || 0;
                                const height = max > 0 ? (current / max) * 100 : 0;

                                return (
                                    <div key={index} className="h-full flex flex-col items-center min-w-[40px] group">
                                        <div className="flex-1 w-full flex items-end justify-center relative">
                                            <div
                                                className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors cursor-pointer relative"
                                                style={{ height: `${height}%`, minHeight: current > 0 ? '4px' : '0px' }}
                                            >
                                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-10">
                                                    {visit.date}: {current} visitas
                                                </div>
                                            </div>
                                        </div>
                                        <div className="h-12 flex items-center justify-center">
                                            <span className="text-xs text-gray-500 transform -rotate-45 origin-center">
                                                {visit.date.split('-').slice(1).join('/')}
                                            </span>
                                        </div>
                                    </div>
                                );
                            }) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-500">
                                    No hay datos de visitas registrados aún.
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default AdminAnalyticsPage;
