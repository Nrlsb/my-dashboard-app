import React from 'react';
import { Eye, Calendar, User, Shield, Download } from 'lucide-react';

const PATH_NAMES = {
    '/dashboard': 'Inicio',
    '/login': 'Iniciar Sesión',
    '/new-order': 'Nuevo Pedido',
    '/price-list': 'Lista de Precios',
    '/products': 'Productos',
    '/cart': 'Carrito',
    '/orders': 'Mis Pedidos',
    '/profile': 'Mi Perfil',
    '/admin/dashboard': 'Panel Admin',
    '/admin/users': 'Gestión Usuarios',
    '/admin/products': 'Gestión Productos'
};

const ClientAnalyticsView = ({ stats, clientName, onManagePermissions }) => {
    if (!stats) return null;

    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3 text-blue-700 mb-2">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <Eye className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-semibold uppercase tracking-wider">Visitas Totales</span>
                    </div>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalVisits}</p>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3 text-green-700 mb-2">
                        <div className="p-2 bg-green-100 rounded-lg">
                            <Calendar className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-semibold uppercase tracking-wider">Última Visita</span>
                    </div>
                    {stats.lastVisit ? (
                        <>
                            <p className="text-2xl font-bold text-gray-900 mt-2">
                                {new Date(stats.lastVisit).toLocaleDateString()}
                            </p>
                            <p className="text-sm text-gray-500">
                                {new Date(stats.lastVisit).toLocaleTimeString()}
                            </p>
                        </>
                    ) : (
                        <p className="text-xl font-medium text-gray-400 mt-2">N/A</p>
                    )}
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3 text-purple-700 mb-2">
                        <div className="p-2 bg-purple-100 rounded-lg">
                            <User className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-semibold uppercase tracking-wider">Perfil</span>
                    </div>
                    <p className="text-lg font-medium text-gray-900 mt-2 truncated">{clientName}</p>
                    <p className="text-xs text-gray-500 mt-1">ID: {stats.a1_cod || stats.codigo || '-'}</p>
                    {onManagePermissions && (
                        <button
                            onClick={onManagePermissions}
                            className="mt-4 w-full py-2 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-100 transition-colors flex items-center justify-center gap-2"
                        >
                            <Shield className="w-4 h-4" />
                            Gestionar Permisos
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Pages */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100">
                        <h3 className="text-lg font-bold text-gray-900">Páginas Más Vistas</h3>
                    </div>

                    {stats.topPages && stats.topPages.length > 0 ? (
                        <ul className="divide-y divide-gray-100">
                            {stats.topPages.map((page, index) => (
                                <li key={index} className="p-4 hover:bg-gray-50 transition flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <span className="w-6 h-6 flex items-center justify-center bg-gray-100 text-gray-600 rounded-full text-xs font-bold">
                                            {index + 1}
                                        </span>
                                        <span className="text-gray-700 font-medium" title={page.path}>
                                            {PATH_NAMES[page.path] || page.path}
                                        </span>
                                    </div>
                                    <span className="px-3 py-1 bg-blue-50 text-blue-700 text-sm font-semibold rounded-full">
                                        {page.count} visitas
                                    </span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="p-6 text-gray-500 text-center">Sin actividad registrada.</p>
                    )}
                </div>

                {/* Downloads History */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-gray-900">Historial de Descargas (Listas de Precio)</h3>
                        <Download className="w-5 h-5 text-gray-400" />
                    </div>

                    {stats.downloads && stats.downloads.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    <tr>
                                        <th className="px-6 py-3">Fecha</th>
                                        <th className="px-6 py-3">Filtros Utilizados</th>
                                        <th className="px-6 py-3">Formato</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {stats.downloads.map((dl, index) => (
                                        <tr key={index} className="hover:bg-gray-50 transition">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {new Date(dl.created_at).toLocaleDateString()}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {new Date(dl.created_at).toLocaleTimeString()}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap gap-2">
                                                    {dl.filters?.searchTerm && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                                            Busq: {dl.filters.searchTerm}
                                                        </span>
                                                    )}
                                                    {dl.filters?.brands && dl.filters.brands.length > 0 && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                                            Marcas: {dl.filters.brands.join(', ')}
                                                        </span>
                                                    )}
                                                    {dl.filters?.onlyModifiedPrices && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                                            Solo Modif.
                                                        </span>
                                                    )}
                                                    {!dl.filters?.searchTerm && (!dl.filters?.brands || dl.filters.brands.length === 0) && !dl.filters?.onlyModifiedPrices && (
                                                        <span className="text-xs text-gray-400 italic">Todo el catálogo</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 uppercase">
                                                {dl.format || 'Excel'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="p-8 text-center text-gray-500">
                            No se han registrado descargas recientes.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ClientAnalyticsView;
