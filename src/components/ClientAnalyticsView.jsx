import React from 'react';
import { Eye, Calendar, User, Shield, Download, ShoppingBag, PieChart, Star, Filter, X, Check } from 'lucide-react';

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

const ClientAnalyticsView = ({
    stats,
    clientName,
    onManagePermissions,
    availableBrands = [],
    selectedBrands = [],
    onBrandsChange
}) => {
    const [isFilterOpen, setIsFilterOpen] = React.useState(false);
    const [brandSearch, setBrandSearch] = React.useState('');
    const [tempSelectedBrands, setTempSelectedBrands] = React.useState(selectedBrands);

    // Sync temp state when selectedBrands changes from outside (e.g. Clear All)
    React.useEffect(() => {
        setTempSelectedBrands(selectedBrands);
    }, [selectedBrands]);

    if (!stats) return null;

    const toggleTempBrand = (brand) => {
        setTempSelectedBrands(prev =>
            prev.includes(brand)
                ? prev.filter(b => b !== brand)
                : [...prev, brand]
        );
    };

    const handleApplyFilters = () => {
        onBrandsChange(tempSelectedBrands);
        setIsFilterOpen(false);
    };

    const filteredBrandsList = availableBrands.filter(brand =>
        brand.toLowerCase().includes(brandSearch.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                            <ShoppingBag className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-semibold uppercase tracking-wider">Pedidos Totales</span>
                    </div>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                        {stats.totalOrders || 0}
                        <span className="text-sm font-normal text-green-600 ml-2">({stats.confirmedOrders || 0} Conf.)</span>
                    </p>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3 text-amber-700 mb-2">
                        <div className="p-2 bg-amber-100 rounded-lg">
                            <Star className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-semibold uppercase tracking-wider">Más Pedido</span>
                    </div>
                    <p className="text-sm font-bold text-gray-900 mt-2 line-clamp-2" title={stats.mostBoughtProduct}>
                        {stats.mostBoughtProduct || 'N/A'}
                    </p>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3 text-purple-700 mb-2">
                        <div className="p-2 bg-purple-100 rounded-lg">
                            <User className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-semibold uppercase tracking-wider">Perfil del Cliente</span>
                    </div>
                    <p className="text-lg font-medium text-gray-900 mt-1 truncated">{clientName}</p>
                    <p className="text-xs text-gray-500">ID: {stats.a1_cod || stats.codigo || '-'}</p>
                    {onManagePermissions && (
                        <button
                            onClick={onManagePermissions}
                            className="mt-3 w-full py-1.5 bg-purple-50 text-purple-700 rounded-lg text-xs font-medium hover:bg-purple-100 transition-colors flex items-center justify-center gap-2"
                        >
                            <Shield className="w-3.5 h-3.5" />
                            Gestionar Permisos
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Info & Top Pages */}
                <div className="space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-gray-400" />
                            Detalles de Actividad
                        </h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                <span className="text-gray-500">Última Visita</span>
                                <span className="font-medium">
                                    {stats.lastVisit ? new Date(stats.lastVisit).toLocaleString() : 'Nunca'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                <span className="text-gray-500">Producto Más Visto</span>
                                <span className="font-medium text-blue-600 text-right max-w-[200px] truncate" title={stats.mostViewedProduct}>
                                    {stats.mostViewedProduct || 'N/A'}
                                </span>
                            </div>
                        </div>
                    </div>

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
                </div>

                {/* Top Products */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-900">Productos Más Pedidos</h3>
                            <div className="relative">
                                <button
                                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                                    className={`p-2 rounded-lg border transition-colors flex items-center gap-2 text-sm font-medium ${selectedBrands.length > 0
                                        ? 'bg-blue-50 border-blue-200 text-blue-700'
                                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                        }`}
                                >
                                    <Filter className="w-4 h-4" />
                                    Filtrar Marcas
                                    {selectedBrands.length > 0 && (
                                        <span className="w-5 h-5 flex items-center justify-center bg-blue-600 text-white rounded-full text-[10px]">
                                            {selectedBrands.length}
                                        </span>
                                    )}
                                </button>

                                {isFilterOpen && (
                                    <>
                                        <div
                                            className="fixed inset-0 z-20"
                                            onClick={() => setIsFilterOpen(false)}
                                        />
                                        <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 z-30 overflow-hidden">
                                            <div className="p-3 border-b border-gray-100">
                                                <input
                                                    type="text"
                                                    placeholder="Buscar marca..."
                                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    value={brandSearch}
                                                    onChange={(e) => setBrandSearch(e.target.value)}
                                                    autoFocus
                                                />
                                            </div>
                                            <div className="max-h-60 overflow-y-auto">
                                                {filteredBrandsList.length > 0 ? (
                                                    <div className="p-1">
                                                        {filteredBrandsList.map(brand => (
                                                            <button
                                                                key={brand}
                                                                onClick={() => toggleTempBrand(brand)}
                                                                className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 rounded-lg transition-colors text-left"
                                                            >
                                                                <span className="text-sm text-gray-700 truncate">{brand}</span>
                                                                {tempSelectedBrands.includes(brand) && (
                                                                    <Check className="w-4 h-4 text-blue-600" />
                                                                )}
                                                            </button>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="p-4 text-center text-sm text-gray-500">
                                                        No se encontraron marcas.
                                                    </div>
                                                )}
                                            </div>
                                            <div className="p-2 border-t border-gray-100 bg-gray-50 space-y-2">
                                                <button
                                                    onClick={handleApplyFilters}
                                                    className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
                                                >
                                                    Aplicar Filtros
                                                </button>
                                                {tempSelectedBrands.length > 0 && (
                                                    <button
                                                        onClick={() => {
                                                            setTempSelectedBrands([]);
                                                            onBrandsChange([]);
                                                            setIsFilterOpen(false);
                                                        }}
                                                        className="w-full py-1 text-xs font-medium text-gray-500 hover:text-red-600 transition-colors"
                                                    >
                                                        Limpiar Todo
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {selectedBrands.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {selectedBrands.map(brand => (
                                    <span
                                        key={brand}
                                        className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-medium border border-blue-100"
                                    >
                                        {brand}
                                        <button
                                            onClick={() => {
                                                const newBrands = selectedBrands.filter(b => b !== brand);
                                                onBrandsChange(newBrands);
                                            }}
                                            className="hover:text-blue-900"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {stats.topBoughtProducts && stats.topBoughtProducts.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    <tr>
                                        <th className="px-6 py-3">Producto</th>
                                        <th className="px-6 py-3 text-center">Cant.</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {stats.topBoughtProducts.map((p, index) => (
                                        <tr key={index} className="hover:bg-gray-50 transition">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-gray-800">{p.description}</div>
                                                <div className="text-[10px] text-gray-500">ID: {p.product_id}</div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="px-3 py-1 bg-green-50 text-green-700 font-bold rounded-full">
                                                    {parseFloat(p.qty).toLocaleString()}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="p-6 text-gray-500 text-center">Sin pedidos registrados.</p>
                    )}
                </div>

                {/* Downloads History */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden lg:col-span-2">
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
