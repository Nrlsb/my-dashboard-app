import React, { useState, useEffect, useRef } from 'react';
import apiService from '../api/apiService';
import LoadingSpinner from '../components/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { ChevronDown } from 'lucide-react';

const PriceSettingsPage = () => {
    const [allGroups, setAllGroups] = useState([]);
    const [selectedGroups, setSelectedGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // State for Price Changes Report
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedReportBrands, setSelectedReportBrands] = useState([]);
    const [isBrandDropdownOpen, setIsBrandDropdownOpen] = useState(false);
    const brandDropdownRef = useRef(null);
    const [priceChanges, setPriceChanges] = useState(null);
    const [visibleCount, setVisibleCount] = useState(20);
    const [loadingChanges, setLoadingChanges] = useState(false);
    const [downloading, setDownloading] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                // 1. Fetch all product groups available (Filtered by modifications)
                const groups = await apiService.getProductGroupsForAdmin({ params: { onlyWithModifications: true } });

                // We need to deduplicate by product_group code, but keep the name (brand)
                const uniqueGroupsMap = new Map();
                groups.forEach(g => {
                    if (g.product_group && !uniqueGroupsMap.has(g.product_group)) {
                        uniqueGroupsMap.set(g.product_group, {
                            code: g.product_group,
                            name: g.brand || 'Sin descripción'
                        });
                    }
                });

                // Convert map to array and sort by code
                const uniqueGroups = Array.from(uniqueGroupsMap.values()).sort((a, b) => a.code.localeCompare(b.code));
                setAllGroups(uniqueGroups);

                // 2. Fetch current setting
                const setting = await apiService.getGlobalSetting('price_modified_allowed_groups');
                // Expecting JSON string array or null/empty
                if (setting && setting.value) {
                    try {
                        const parsed = JSON.parse(setting.value);
                        if (Array.isArray(parsed)) setSelectedGroups(parsed);
                    } catch (err) {
                        console.error("Failed to parse setting", err);
                    }
                }
            } catch (err) {
                console.error(err);
                toast.error('Error al cargar datos');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (brandDropdownRef.current && !brandDropdownRef.current.contains(event.target)) {
                setIsBrandDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleToggle = (groupCode) => {
        setSelectedGroups(prev => {
            if (prev.includes(groupCode)) {
                return prev.filter(g => g !== groupCode);
            } else {
                return [...prev, groupCode];
            }
        });
    };

    const handleSelectAll = () => {
        setSelectedGroups(allGroups.map(g => g.code));
    };

    const handleClearAll = () => {
        setSelectedGroups([]);
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const value = JSON.stringify(selectedGroups);
            await apiService.updateGlobalSetting('price_modified_allowed_groups', value);
            toast.success('Configuración guardada correctamente');
        } catch (err) {
            console.error(err);
            toast.error('Error al guardar configuración');
        } finally {
            setSaving(false);
        }
    };

    const handleSearchChanges = async () => {
        if (!startDate || !endDate) {
            toast.error('Por favor selecciona ambas fechas.');
            return;
        }
        try {
            setLoadingChanges(true);
            setPriceChanges(null);
            setVisibleCount(20);

            // Map selected codes to brand names
            const brands = selectedReportBrands.map(code => {
                const group = allGroups.find(g => g.code === code);
                return group ? group.name : null;
            }).filter(Boolean);

            // Append time to end date to ensure the full day is included
            const results = await apiService.getPriceChangedProducts({
                startDate: startDate,
                endDate: endDate + ' 23:59:59',
                brands: brands.length > 0 ? brands : undefined
            });
            setPriceChanges(results);
        } catch (error) {
            console.error(error);
            toast.error('Error al buscar cambios de precio');
        } finally {
            setLoadingChanges(false);
        }
    };

    const handleDownloadExcel = async () => {
        if (!startDate || !endDate) {
            toast.error('Por favor selecciona ambas fechas.');
            return;
        }
        try {
            setDownloading(true);
            const brands = selectedReportBrands.map(code => {
                const group = allGroups.find(g => g.code === code);
                return group ? group.name : null;
            }).filter(Boolean);

            const response = await apiService.downloadPriceChangesExcel({
                startDate: startDate,
                endDate: endDate + ' 23:59:59',
                brands: brands.length > 0 ? brands : undefined
            });

            // Create blob link to download
            // Note: apiClient interceptor returns response.data directly.
            const url = window.URL.createObjectURL(new Blob([response]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `cambios_precios_${startDate}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
        } catch (error) {
            console.error(error);
            toast.error('Error al descargar Excel');
        } finally {
            setDownloading(false);
        }
    };

    const toggleBrandSelection = (code) => {
        setSelectedReportBrands(prev => {
            if (prev.includes(code)) return prev.filter(c => c !== code);
            return [...prev, code];
        });
    };

    const getBrandButtonLabel = () => {
        if (selectedReportBrands.length === 0) return 'Todas las marcas';
        if (selectedReportBrands.length === 1) {
            const group = allGroups.find(g => g.code === selectedReportBrands[0]);
            return group ? group.name : selectedReportBrands[0];
        }
        return `${selectedReportBrands.length} marcas seleccionadas`;
    };

    if (loading) return <LoadingSpinner text="Cargando grupos..." />;

    return (
        <div className="p-4 md:p-8 w-[95%] mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Alertas de Precio Modificado</h1>
                <p className="text-gray-600 mt-2">
                    Selecciona qué grupos de productos mostrarán la etiqueta "Precio modificado" cuando cambien de precio.
                    <br />
                    <span className="text-sm font-semibold text-amber-600">
                        Nota: Si no seleccionas ninguno, se mostrará para TODOS los grupos (comportamiento por defecto).
                    </span>
                </p>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold">Grupos de Productos ({allGroups.length})</h2>
                    <div className="space-x-2">
                        <button
                            onClick={handleSelectAll}
                            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                        >
                            Seleccionar Todos
                        </button>
                        <span className="text-gray-300">|</span>
                        <button
                            onClick={handleClearAll}
                            className="text-sm text-gray-600 hover:text-gray-800 font-medium"
                        >
                            Limpiar Selección
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto mb-6 border p-4 rounded bg-gray-50">
                    {allGroups.map(group => (
                        <label key={group.code} className="flex items-center space-x-3 p-2 hover:bg-white rounded cursor-pointer transition-colors">
                            <input
                                type="checkbox"
                                className="h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                checked={selectedGroups.includes(group.code)}
                                onChange={() => handleToggle(group.code)}
                            />
                            <span className="text-gray-700 text-sm font-medium truncate" title={`${group.code} - ${group.name}`}>
                                <span className="font-bold text-gray-500 mr-2">{group.code}</span>
                                {group.name}
                            </span>
                        </label>
                    ))}
                </div>

                <div className="flex justify-between items-center border-t pt-4">
                    <div className="text-sm text-gray-500">
                        {selectedGroups.length === 0
                            ? "Ningún grupo seleccionado (Se mostrará alerta en TODOS los productos)"
                            : `${selectedGroups.length} grupos seleccionados`
                        }
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className={`px-6 py-2 rounded-md text-white font-medium transition-colors ${saving ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                    >
                        {saving ? 'Guardando...' : 'Guardar Configuración'}
                    </button>
                </div>
            </div>

            {/* Price Changes Report Section */}
            <div className="mt-8 bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4">Reporte de Cambios de Precio</h2>
                <div className="flex flex-col md:flex-row gap-4 mb-6 items-start">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Desde</label>
                        <input
                            type="date"
                            className="border rounded p-2 w-full"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Hasta</label>
                        <input
                            type="date"
                            className="border rounded p-2 w-full"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                    <div className="flex-1 min-w-[200px] relative" ref={brandDropdownRef}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Marcas (Opcional)</label>
                        <button
                            type="button"
                            onClick={() => setIsBrandDropdownOpen(!isBrandDropdownOpen)}
                            className="w-full flex justify-between items-center text-left bg-white px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer h-[42px]"
                        >
                            <span className="truncate text-sm text-gray-700">{getBrandButtonLabel()}</span>
                            <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isBrandDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isBrandDropdownOpen && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                {allGroups.map((g) => (
                                    <label
                                        key={g.code}
                                        className="flex items-center px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedReportBrands.includes(g.code)}
                                            onChange={() => toggleBrandSelection(g.code)}
                                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="ml-3 text-sm text-gray-700 truncate" title={g.name}>
                                            {g.name}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex gap-2 mb-6">
                    <button
                        onClick={handleSearchChanges}
                        disabled={loadingChanges}
                        className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition disabled:opacity-50"
                    >
                        {loadingChanges ? 'Buscando...' : 'Buscar Cambios'}
                    </button>
                    {priceChanges && priceChanges.length > 0 && (
                        <button
                            onClick={handleDownloadExcel}
                            disabled={downloading}
                            className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 transition disabled:opacity-50 flex items-center gap-2"
                        >
                            {downloading ? 'Descargando...' : 'Descargar Excel'}
                        </button>
                    )}
                </div>

                {priceChanges && (
                    <div className="overflow-x-auto">
                        <div className="mb-2 text-sm text-gray-500">
                            Encontrados: {priceChanges.length} productos
                        </div>
                        <table className="min-w-full divide-y divide-gray-200 border">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Marca</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">P. Anterior</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">P. Actual</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Dif ($)</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Dif (%)</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {priceChanges.length > 0 ? (
                                    priceChanges.slice(0, visibleCount).map((item, index) => (
                                        <tr key={`${item.code}-${index}`}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.code}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.description}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.brand}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.change_date_formatted}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right text-gray-400">
                                                {item.previous_price ? new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(item.previous_price) : '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium text-right">
                                                {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(item.current_price)}
                                            </td>
                                            <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${item.diff > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                {item.diff ? new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(item.diff) : '-'}
                                            </td>
                                            <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${item.percent > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                {item.percent ? item.percent.toFixed(2) + '%' : '-'}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="8" className="px-6 py-4 text-center text-sm text-gray-500">
                                            No se encontraron cambios de precio en este rango.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        {priceChanges.length > visibleCount && (
                            <div className="mt-4 flex justify-center">
                                <button
                                    onClick={() => setVisibleCount(prev => prev + 20)}
                                    className="bg-gray-100 text-gray-700 px-6 py-2 rounded-full hover:bg-gray-200 transition font-medium border border-gray-300"
                                >
                                    Cargar más productos
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PriceSettingsPage;
