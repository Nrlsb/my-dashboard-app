import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiService from '../api/apiService';
import { FaTrash, FaUserPlus, FaWhatsapp } from 'react-icons/fa';
import { BarChart2 } from 'lucide-react';
import TestUserAnalyticsModal from './TestUserAnalyticsModal';

const TestUserManager = () => {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        name: '',
        password: '',
        cellphone: '',
    });
    const [error, setError] = useState(null);
    const [selectedUser, setSelectedUser] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const MAX_TEST_USERS = 5;

    const { data: users = [], isLoading } = useQuery({
        queryKey: ['testUsers'],
        queryFn: async () => {
            const response = await apiService.getTestUsers();
            return response.data.users || [];
        },
    });

    const isLimitReached = users.length >= MAX_TEST_USERS;

    const createMutation = useMutation({
        mutationFn: (newData) => apiService.createTestUser(newData),
        onSuccess: () => {
            queryClient.invalidateQueries(['testUsers']);
            setFormData({ name: '', password: '', cellphone: '' });
            setError(null);
        },
        onError: (err) => {
            setError(err.message);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => apiService.deleteTestUser(id),
        onSuccess: () => {
            queryClient.invalidateQueries(['testUsers']);
        },
        onError: (err) => {
            setError(err.message);
        },
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.name || !formData.password) {
            setError('Nombre y contraseña son obligatorios.');
            return;
        }
        createMutation.mutate(formData);
    };

    const handleDelete = (id) => {
        if (window.confirm('¿Estás seguro de eliminar este usuario de prueba?')) {
            deleteMutation.mutate(id);
        }
    };

    const openAnalytics = (user) => {
        setSelectedUser(user);
        setIsModalOpen(true);
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6 max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <FaUserPlus className="text-blue-600" /> Gestión de Usuarios de Prueba
            </h2>

            {/* Formulario de creación */}
            <div className="mb-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Crear Nuevo Usuario</h3>
                {isLimitReached && (
                    <div className="mb-4 text-amber-700 bg-amber-50 p-3 rounded border border-amber-200">
                        Has alcanzado el límite de {MAX_TEST_USERS} usuarios activos. Debes eliminar uno para poder crear otro.
                    </div>
                )}
                {error && <div className="mb-4 text-red-600 bg-red-50 p-3 rounded">{error}</div>}
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border disabled:bg-gray-100 disabled:text-gray-500"
                            placeholder="Ej. Cliente Prueba"
                            disabled={isLimitReached}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                        <input
                            type="text"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border disabled:bg-gray-100 disabled:text-gray-500"
                            placeholder="Contraseña"
                            disabled={isLimitReached}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Celular</label>
                        <input
                            type="text"
                            name="cellphone"
                            value={formData.cellphone}
                            onChange={handleChange}
                            className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border disabled:bg-gray-100 disabled:text-gray-500"
                            placeholder="Ej. +549..."
                            disabled={isLimitReached}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={createMutation.isPending || isLimitReached}
                        className={`px-4 py-2 rounded-md transition-colors flex items-center justify-center gap-2 h-[42px] ${isLimitReached || createMutation.isPending
                                ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                    >
                        {createMutation.isPending ? 'Creando...' : 'Crear Usuario'}
                    </button>
                </form>
            </div>

            {/* Lista de usuarios */}
            <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Usuarios Activos</h3>
                {isLoading ? (
                    <p className="text-gray-500">Cargando usuarios...</p>
                ) : users.length === 0 ? (
                    <p className="text-gray-500 italic">No hay usuarios de prueba creados.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credenciales</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contacto</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Creado</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Baja Automática</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {users.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <span className="font-mono bg-gray-100 px-2 py-1 rounded text-xs">{user.password}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 flex items-center gap-2">
                                            {user.cellphone && <FaWhatsapp className="text-green-500" />} {user.cellphone || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(user.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(new Date(user.created_at).getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => openAnalytics(user)}
                                                className="text-blue-600 hover:text-blue-900 bg-blue-50 p-2 rounded-full transition-colors focus:outline-none"
                                                title="Ver Análisis"
                                            >
                                                <BarChart2 className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(user.id)}
                                                className="text-red-600 hover:text-red-900 bg-red-50 p-2 rounded-full transition-colors focus:outline-none"
                                                title="Eliminar usuario"
                                                disabled={deleteMutation.isPending}
                                            >
                                                <FaTrash />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <TestUserAnalyticsModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                userId={selectedUser?.id}
                userName={selectedUser?.name}
            />
        </div>
    );
};

export default TestUserManager;
