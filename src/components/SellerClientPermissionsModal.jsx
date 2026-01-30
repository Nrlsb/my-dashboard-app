
import React, { useState, useEffect } from 'react';
import { X, Save, Lock, Info, CheckCircle, AlertCircle } from 'lucide-react';
import apiService from '../api/apiService';

const SellerClientPermissionsModal = ({ isOpen, onClose, clientId, clientName }) => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [allGroups, setAllGroups] = useState([]);
    const [permissions, setPermissions] = useState([]); // [{ group, source }]
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState(null);

    useEffect(() => {
        if (isOpen && clientId) {
            fetchData();
        } else {
            // Reset state when closed
            setSuccessMsg(null);
            setError(null);
        }
    }, [isOpen, clientId]);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [groupsData, permsData] = await Promise.all([
                apiService.getVendedorProductGroups(),
                apiService.getClientPermissions(clientId)
            ]);

            // groupsData: Array of objects { product_group: '...', brand: '...' }
            // permsData: Array of objects { group: '...', source: 'admin'|'vendedor' }

            setAllGroups(groupsData);
            setPermissions(permsData);
        } catch (err) {
            console.error(err);
            setError('Error al cargar datos. Intente nuevamente.');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleGroup = (groupName) => {
        setPermissions(prev => {
            const existing = prev.find(p => p.group === groupName);
            if (existing) {
                // If it exists, remove it UNLESS it's admin (which shouldn't be clickable anyway, but logic safety)
                if (existing.source === 'admin') return prev;
                return prev.filter(p => p.group !== groupName);
            } else {
                // Add it as vendor source
                return [...prev, { group: groupName, source: 'vendedor' }];
            }
        });
    };

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        try {
            // Filter only seller-managed groups to send to backend
            // The backend replaces all 'vendedor' records for this user using this list.
            const groupsToSend = permissions
                .filter(p => p.source === 'vendedor')
                .map(p => p.group);

            await apiService.updateClientPermissions(clientId, groupsToSend);

            setSuccessMsg('Permisos actualizados correctamente.');
            setTimeout(() => {
                setSuccessMsg(null);
                onClose();
            }, 1500);
        } catch (err) {
            console.error(err);
            setError(err.message || 'Error al guardar cambios.');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    // Grouping for Display? Currently simpler list.
    // The groupsData has 'brand'. We could group by brand if needed, but existing admin UI lists flat usually.
    // Let's verify existing Admin UI... The `allGroups` might be large.
    // Let's assume a simple grid or list.

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white w-full max-w-4xl rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Restricciones de Productos</h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Gestionando restricciones para: <span className="font-semibold text-blue-600">{clientName}</span>
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 bg-white relative">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-64">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
                            <p className="text-gray-500">Cargando grupos...</p>
                        </div>
                    ) : (
                        <>
                            {error && (
                                <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-3">
                                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            {successMsg && (
                                <div className="absolute inset-0 flex items-center justify-center bg-white/90 z-10">
                                    <div className="flex flex-col items-center animate-bounce-in">
                                        <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
                                        <p className="text-xl font-semibold text-gray-800">{successMsg}</p>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {allGroups.map((item) => {
                                    const groupName = item.product_group;
                                    const perm = permissions.find(p => p.group === groupName);
                                    const isRestricted = !!perm;
                                    const isAdminLocked = perm?.source === 'admin';

                                    return (
                                        <label
                                            key={groupName}
                                            className={`
                                                relative flex items-center p-4 rounded-lg border transition-all cursor-pointer
                                                ${isAdminLocked
                                                    ? 'bg-gray-50 border-gray-200 opacity-75 cursor-not-allowed'
                                                    : isRestricted
                                                        ? 'bg-red-50 border-red-200 shadow-sm'
                                                        : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm'
                                                }
                                            `}
                                        >
                                            <input
                                                type="checkbox"
                                                className="sr-only"
                                                checked={isRestricted}
                                                onChange={() => !isAdminLocked && handleToggleGroup(groupName)}
                                                disabled={isAdminLocked}
                                            />

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className={`text-sm font-medium truncate ${isRestricted ? 'text-red-700' : 'text-gray-700'}`}>
                                                        {groupName}
                                                    </span>
                                                    {isAdminLocked && (
                                                        <Lock className="w-4 h-4 text-gray-400" />
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-500 truncate">{item.brand || 'General'}</p>
                                            </div>

                                            <div className={`
                                                w-5 h-5 rounded border flex items-center justify-center ml-3 transition-colors
                                                ${isRestricted
                                                    ? (isAdminLocked ? 'bg-gray-400 border-gray-400' : 'bg-red-500 border-red-500')
                                                    : 'border-gray-300'
                                                }
                                            `}>
                                                {isRestricted && <X className="w-3.5 h-3.5 text-white" />}
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Info className="w-4 h-4" />
                        <span>
                            <Lock className="w-3 h-3 inline mx-1" /> Restringido por Admin (Bloqueado)
                        </span>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg font-medium text-sm transition-colors"
                            disabled={saving}
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving || loading}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
                        >
                            {saving ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    Guardando...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    Guardar Cambios
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SellerClientPermissionsModal;
