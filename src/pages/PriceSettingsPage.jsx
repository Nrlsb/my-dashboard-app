import React, { useState, useEffect } from 'react';
import apiService from '../api/apiService';
import LoadingSpinner from '../components/LoadingSpinner';
import { toast } from 'react-hot-toast';

const PriceSettingsPage = () => {
    const [allGroups, setAllGroups] = useState([]);
    const [selectedGroups, setSelectedGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

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

    if (loading) return <LoadingSpinner text="Cargando grupos..." />;

    return (
        <div className="p-4 md:p-8 max-w-4xl mx-auto">
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
                            <span className="text-gray-700 text-sm font-medium truncat" title={`${group.code} - ${group.name}`}>
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
        </div>
    );
};

export default PriceSettingsPage;
