import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Users, ShoppingBag, Eye, DollarSign, BarChart2 } from 'lucide-react';
import apiService from '../api/apiService';
import LoadingSpinner from '../components/LoadingSpinner';
import { toast } from 'react-hot-toast';

const AdminSellerAnalyticsPage = () => {
    const { sellerCode } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const sellerName = searchParams.get('name') || sellerCode;

    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Date range
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

    useEffect(() => {
        fetchStats();
    }, [sellerCode, startDate, endDate]);

    const fetchStats = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await apiService.getSellerAnalytics(sellerCode, { startDate, endDate });
            setStats(response.data);
        } catch (err) {
            console.error('Error fetching seller analytics:', err);
            setError('No se pudo cargar la información del vendedor.');
            toast.error('Error al cargar las estadísticas.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <LoadingSpinner text="Cargando análisis del vendedor..." />;

    if (error || !stats) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
                <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-4">
                    {error || 'No hay datos disponibles.'}
                </div>
                <button
                    onClick={() => navigate('/analytics')}
                    className="flex items-center gap-2 text-blue-600 hover:underline"
                >
                    <ArrowLeft className="w-4 h-4" /> Volver al Panel de Análisis
                </button>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 md:p-6 pb-12">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        title="Volver"
                    >
                        <ArrowLeft className="w-6 h-6 text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                            <BarChart2 className="w-6 h-6 text-blue-600" />
                            Análisis de Vendedor
                        </h1>
                        <p className="text-gray-500">{sellerName} ({sellerCode})</p>
                    </div>
                </div>

                {/* Date Filters */}
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="flex flex-col flex-1 md:flex-none">
                        <label className="text-xs text-gray-500 mb-1">Desde</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                    </div>
                    <div className="flex flex-col flex-1 md:flex-none">
                        <label className="text-xs text-gray-500 mb-1">Hasta</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                    </div>
                </div>
            </header>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-500 text-sm font-medium uppercase tracking-wider">Visitas</span>
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                            <Eye className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{stats.summary.visitCount}</p>
                </div>

                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-500 text-sm font-medium uppercase tracking-wider">Pedidos</span>
                        <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                            <ShoppingBag className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">
                        {stats.summary.orderCount}
                        <span className="text-sm font-normal text-green-600 ml-2">({stats.summary.confirmedOrderCount} Conf.)</span>
                    </p>
                </div>

                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-500 text-sm font-medium uppercase tracking-wider">Valor de Pedidos</span>
                        <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                            <DollarSign className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">${stats.summary.totalSales.toLocaleString()}</p>
                </div>

                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-500 text-sm font-medium uppercase tracking-wider">Clientes Activos</span>
                        <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                            <Users className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{stats.clients.length}</p>
                </div>
            </div>

            {/* Daily Activity Chart */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8 overflow-hidden">
                <h2 className="text-xl font-semibold mb-6 text-gray-800">Actividad Diaria</h2>
                <div className="h-64 flex items-end space-x-2 overflow-x-auto min-w-full pb-2">
                    {stats.dailyStats.length > 0 ? (
                        stats.dailyStats.map((day, idx) => {
                            const maxVisits = Math.max(...stats.dailyStats.map(d => d.visits), 1);
                            const maxOrders = Math.max(...stats.dailyStats.map(d => d.orders), 1);

                            return (
                                <div key={idx} className="flex-1 flex flex-col items-center min-w-[50px] group relative">
                                    <div className="w-full flex items-end justify-center space-x-1 h-48">
                                        <div
                                            className="w-3 bg-blue-500 rounded-t transition-all hover:bg-blue-600"
                                            style={{ height: `${(day.visits / maxVisits) * 100}%` }}
                                        />
                                        <div
                                            className="w-3 bg-green-500 rounded-t transition-all hover:bg-green-600"
                                            style={{ height: `${(day.orders / maxOrders) * 100}%` }}
                                        />
                                    </div>
                                    <div className="mt-2 text-[10px] text-gray-500 transform -rotate-45 origin-top-left whitespace-nowrap">
                                        {day.date.split('-').slice(1).join('/')}
                                    </div>

                                    {/* Tooltip */}
                                    <div className="absolute bottom-full mb-2 bg-gray-800 text-white text-[10px] p-2 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none whitespace-nowrap">
                                        <strong>{day.date}</strong><br />
                                        Visitas: {day.visits}<br />
                                        Pedidos: {day.orders}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                            Sin datos de actividad en este periodo.
                        </div>
                    )}
                </div>
            </div>

            {/* Client Breakdown */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h2 className="text-xl font-semibold text-gray-800">Desglose por Cliente</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-600 font-semibold uppercase tracking-wider text-xs border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4">Cliente</th>
                                <th className="px-6 py-4 text-center">Visitas</th>
                                <th className="px-6 py-4 text-center">Pedidos</th>
                                <th className="px-6 py-4 text-right">Valor de Pedidos</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {stats.clients.length > 0 ? (
                                stats.clients.map((client) => (
                                    <tr
                                        key={client.id}
                                        className="hover:bg-gray-50 transition-colors cursor-pointer group"
                                        onClick={() => navigate(`/vendedor-client-analytics/${client.id}?name=${encodeURIComponent(client.full_name)}`)}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="font-semibold text-blue-600 group-hover:text-blue-800">{client.full_name}</div>
                                            <div className="text-xs text-gray-500">{client.email} | ID: {client.a1_cod}</div>
                                        </td>
                                        <td className="px-6 py-4 text-center font-medium text-gray-700">{client.visitCount}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="font-medium text-gray-900">{client.orderCount}</span>
                                            <span className="text-xs text-green-600 block">({client.confirmedOrderCount} conf.)</span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-gray-900">
                                            ${client.totalSpent.toLocaleString()}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" className="px-6 py-8 text-center text-gray-500 italic">
                                        Este vendedor no tiene clientes asignados o no hay actividad en el rango seleccionado.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminSellerAnalyticsPage;
