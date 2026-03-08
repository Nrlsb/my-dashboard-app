import React, { useState, useEffect } from 'react';
import { MapPin, Edit2, Trash2, X, Check, AlertCircle, Mail, User } from 'lucide-react';
import apiClient from '../api/core/client';

const PROVINCIAS = [
    'Buenos Aires', 'CABA', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba',
    'Corrientes', 'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa', 'La Rioja',
    'Mendoza', 'Misiones', 'Neuquén', 'Río Negro', 'Salta', 'San Juan',
    'San Luis', 'Santa Cruz', 'Santa Fe', 'Santiago del Estero',
    'Tierra del Fuego', 'Tucumán',
];

export default function ProvinceRoutingPage() {
    const [routing, setRouting] = useState({});
    const [sellers, setSellers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editModal, setEditModal] = useState(null); // { provincia }
    const [form, setForm] = useState({ seller_name: '', seller_email: '' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [toast, setToast] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (toast) {
            const t = setTimeout(() => setToast(''), 3000);
            return () => clearTimeout(t);
        }
    }, [toast]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [routingRes, sellersRes] = await Promise.all([
                apiClient.get('/admin/province-routing'),
                apiClient.get('/admin/sellers'),
            ]);
            const routingMap = {};
            (routingRes.data || []).forEach((r) => {
                routingMap[r.provincia] = r;
            });
            setRouting(routingMap);
            setSellers(sellersRes || []);
        } catch (err) {
            setError('Error cargando datos.');
        } finally {
            setLoading(false);
        }
    };

    const openEdit = (provincia) => {
        const existing = routing[provincia];
        setForm({
            seller_name: existing?.seller_name || '',
            seller_email: existing?.seller_email || '',
        });
        setError('');
        setEditModal({ provincia });
    };

    const handleSellerSelect = (e) => {
        const codigo = e.target.value;
        if (!codigo) {
            setForm({ seller_name: '', seller_email: '' });
            return;
        }
        const seller = sellers.find((s) => s.codigo === codigo);
        if (seller) {
            setForm({ seller_name: seller.nombre, seller_email: seller.email || '' });
        }
    };

    const handleSave = async () => {
        if (!form.seller_email.trim()) {
            setError('El email es obligatorio.');
            return;
        }
        setSaving(true);
        setError('');
        try {
            const provincia = editModal.provincia;
            const res = await apiClient.put(
                `/admin/province-routing/${encodeURIComponent(provincia)}`,
                { seller_name: form.seller_name, seller_email: form.seller_email }
            );
            setRouting((prev) => ({ ...prev, [provincia]: res.data }));
            setEditModal(null);
            setToast(`Asignación guardada para ${provincia}`);
        } catch (err) {
            setError(err.response?.data?.message || 'Error al guardar.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (provincia) => {
        if (!window.confirm(`¿Quitar la asignación de ${provincia}?`)) return;
        try {
            await apiClient.delete(`/admin/province-routing/${encodeURIComponent(provincia)}`);
            setRouting((prev) => {
                const next = { ...prev };
                delete next[provincia];
                return next;
            });
            setToast(`Asignación eliminada para ${provincia}`);
        } catch {
            setToast('Error al eliminar asignación.');
        }
    };

    const assignedCount = Object.keys(routing).length;

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-espint-blue rounded-lg">
                            <MapPin className="w-5 h-5 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900">Routing de Solicitudes por Provincia</h1>
                    </div>
                    <p className="text-gray-500 ml-14">
                        Configurá a qué vendedor le llega el correo de solicitud de acceso según la provincia del cliente.
                    </p>
                    <div className="ml-14 mt-2 flex items-center gap-2 text-sm text-gray-400">
                        <span className="inline-flex items-center gap-1 bg-espint-blue/10 text-espint-blue px-2 py-0.5 rounded-full font-medium">
                            {assignedCount} / {PROVINCIAS.length} asignadas
                        </span>
                        <span>· Las provincias sin asignar envían al email de admin por defecto.</span>
                    </div>
                </div>

                {/* Toast */}
                {toast && (
                    <div className="fixed top-6 right-6 z-50 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                        <Check className="w-4 h-4" />
                        {toast}
                    </div>
                )}

                {loading ? (
                    <div className="text-center py-20 text-gray-400">Cargando...</div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Provincia</th>
                                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Vendedor asignado</th>
                                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email destino</th>
                                    <th className="px-6 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {PROVINCIAS.map((provincia) => {
                                    const r = routing[provincia];
                                    return (
                                        <tr key={provincia} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-3">
                                                <span className="font-medium text-gray-800">{provincia}</span>
                                            </td>
                                            <td className="px-6 py-3">
                                                {r ? (
                                                    <span className="text-sm text-gray-700">{r.seller_name || '—'}</span>
                                                ) : (
                                                    <span className="text-xs text-gray-400 italic">Sin asignar</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-3">
                                                {r ? (
                                                    <span className="text-sm text-espint-blue font-medium">{r.seller_email}</span>
                                                ) : (
                                                    <span className="text-xs text-gray-400 italic">Admin por defecto</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-3">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => openEdit(provincia)}
                                                        className="p-1.5 rounded-lg text-gray-400 hover:text-espint-blue hover:bg-blue-50 transition-colors"
                                                        title="Editar"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    {r && (
                                                        <button
                                                            onClick={() => handleDelete(provincia)}
                                                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                                            title="Quitar asignación"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            {editModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="flex items-center justify-between p-6 border-b border-gray-100">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Asignar vendedor</h2>
                                <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1">
                                    <MapPin className="w-3.5 h-3.5" />
                                    {editModal.provincia}
                                </p>
                            </div>
                            <button
                                onClick={() => setEditModal(null)}
                                className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Select from sellers */}
                            {sellers.length > 0 && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Seleccionar vendedor del sistema
                                    </label>
                                    <select
                                        onChange={handleSellerSelect}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-espint-blue/30 focus:border-espint-blue"
                                        defaultValue=""
                                    >
                                        <option value="">— Elegir vendedor —</option>
                                        {sellers.map((s) => (
                                            <option key={s.codigo} value={s.codigo}>
                                                {s.nombre} {s.email ? `(${s.email})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-gray-400 mt-1">
                                        Al seleccionar, se precarga nombre y email. Podés modificarlos abajo.
                                    </p>
                                </div>
                            )}

                            <div className="border-t border-gray-100 pt-4">
                                {/* Seller name */}
                                <div className="mb-3">
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        <User className="w-3.5 h-3.5 inline mr-1" />
                                        Nombre del vendedor
                                    </label>
                                    <input
                                        type="text"
                                        value={form.seller_name}
                                        onChange={(e) => setForm((f) => ({ ...f, seller_name: e.target.value }))}
                                        placeholder="Ej: Juan Pérez"
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-espint-blue/30 focus:border-espint-blue"
                                    />
                                </div>

                                {/* Email */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        <Mail className="w-3.5 h-3.5 inline mr-1" />
                                        Email destino <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        value={form.seller_email}
                                        onChange={(e) => setForm((f) => ({ ...f, seller_email: e.target.value }))}
                                        placeholder="vendedor@ejemplo.com"
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-espint-blue/30 focus:border-espint-blue"
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                    {error}
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 p-6 pt-0">
                            <button
                                onClick={() => setEditModal(null)}
                                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex-1 px-4 py-2.5 bg-espint-blue text-white rounded-lg text-sm font-medium hover:bg-espint-blue/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {saving ? 'Guardando...' : (
                                    <>
                                        <Check className="w-4 h-4" />
                                        Guardar
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
