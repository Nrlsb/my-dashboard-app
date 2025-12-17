import React, { useEffect, useState } from 'react';
import apiService from '../api/apiService';
import LoadingSpinner from '../components/LoadingSpinner';
import { toast } from 'react-hot-toast';

const AdminAnalyticsPage = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [days, setDays] = useState(30);
    const [users, setUsers] = useState([]);

    useEffect(() => {
        fetchStats();
        fetchUsers();
    }, [days]);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const data = await apiService.getAnalytics(days);
            setStats(data);
        } catch (error) {
            console.error('Error fetching analytics:', error);
            toast.error('Error al cargar las estadísticas.');
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const usersData = await apiService.getAdminUsers();
            setUsers(usersData);
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    const getSellerName = (code) => {
        const user = users.find(u => u.code === code || u.a1_cod === code || String(u.id) === String(code));
        return user ? user.full_name : code;
    };

    if (loading) return <LoadingSpinner text="Cargando análisis..." />;
    if (!stats) return <div className="p-4 text-center">No hay datos disponibles.</div>;

    return (
        <div className="container mx-auto p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Panel de Análisis</h1>
                <select
                    value={days}
                    onChange={(e) => setDays(Number(e.target.value))}
                    className="border rounded p-2"
                >
                    <option value={7}>Últimos 7 días</option>
                    <option value={30}>Últimos 30 días</option>
                    <option value={90}>Últimos 90 días</option>
                </select>
            </div>

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
                    <h3 className="text-gray-500 text-sm font-medium">Ventas Totales</h3>
                    <p
                        className="text-2xl font-bold text-green-600 mt-2 truncate"
                        title={`$${stats.orders.reduce((acc, curr) => acc + parseFloat(curr.total_amount || 0), 0).toLocaleString()}`}
                    >
                        ${stats.orders.reduce((acc, curr) => acc + parseFloat(curr.total_amount || 0), 0).toLocaleString()}
                    </p>
                </div>
                <div className="bg-white p-4 rounded shadow border border-gray-200">
                    <h3 className="text-gray-500 text-sm font-medium">Clientes Totales</h3>
                    <p className="text-3xl font-bold text-gray-800 mt-2">{stats.clients.totalClients}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Clientes */}
                <div className="bg-white p-6 rounded shadow border border-gray-200">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800">Top Clientes</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-gray-200">
                                    <th className="pb-3 text-gray-600 font-medium">Cliente</th>
                                    <th className="pb-3 text-gray-600 font-medium">Pedidos</th>
                                    <th className="pb-3 text-gray-600 font-medium">Total Gastado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.clients.topClients.map((client, index) => (
                                    <tr key={index} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                                        <td className="py-3">
                                            <div className="font-medium text-gray-800">{client.user.full_name}</div>
                                            <div className="text-xs text-gray-500">{client.user.email}</div>
                                        </td>
                                        <td className="py-3 text-gray-700">{client.order_count}</td>
                                        <td className="py-3 font-medium text-green-600">
                                            ${parseFloat(client.total_spent).toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                                {stats.clients.topClients.length === 0 && (
                                    <tr><td colSpan="3" className="py-4 text-center text-gray-500">Sin datos</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Top Vendedores */}
                <div className="bg-white p-6 rounded shadow border border-gray-200">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800">Rendimiento Vendedores</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-gray-200">
                                    <th className="pb-3 text-gray-600 font-medium">Vendedor</th>
                                    <th className="pb-3 text-gray-600 font-medium">Pedidos (Clientes)</th>
                                    <th className="pb-3 text-gray-600 font-medium">Total Ventas</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.sellers.map((seller, index) => (
                                    <tr key={index} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                                        <td className="py-3 font-medium text-gray-800">{getSellerName(seller.code)}</td>
                                        <td className="py-3 text-gray-700">{seller.orderCount}</td>
                                        <td className="py-3 font-medium text-green-600">
                                            ${seller.totalSales.toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                                {stats.sellers.length === 0 && (
                                    <tr><td colSpan="3" className="py-4 text-center text-gray-500">Sin datos</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Visitas Detalle - Simple Bar Chart */}
            <div className="mt-8 bg-white p-6 rounded shadow border border-gray-200">
                <h2 className="text-xl font-semibold mb-6 text-gray-800">Tráfico Diario</h2>
                <div className="h-64 flex items-end space-x-2 overflow-x-auto pb-8">
                    {stats.visits.length > 0 ? stats.visits.map((visit, index) => {
                        const counts = stats.visits.map(v => Number(v.count) || 0);
                        const max = Math.max(...counts);
                        const current = Number(visit.count) || 0;
                        const height = max > 0 ? (current / max) * 100 : 0;

                        return (
                            <div key={index} className="flex flex-col items-center min-w-[40px] group relative">
                                <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-10">
                                    {visit.date}: {current} visitas
                                </div>
                                <div
                                    className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors cursor-pointer"
                                    style={{ height: `${height}%`, minHeight: current > 0 ? '4px' : '0px' }}
                                ></div>
                                <span className="text-xs text-gray-500 mt-2 transform -rotate-45 origin-top-left">
                                    {visit.date.split('-').slice(1).join('/')}
                                </span>
                            </div>
                        );
                    }) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500">
                            No hay datos de visitas registrados aún.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminAnalyticsPage;
