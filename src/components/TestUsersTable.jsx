import React, { useState } from 'react';
import { FaWhatsapp, FaUserTie } from 'react-icons/fa';
import { Trash2, BarChart2 } from 'lucide-react';
import apiService from '../api/apiService';
import { toast } from 'react-hot-toast';
import TestUserAnalyticsModal from './TestUserAnalyticsModal';
import ConfirmationModal from './ConfirmationModal';

const TestUsersTable = ({ users = [] }) => {
    const [selectedUser, setSelectedUser] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Delete Confirmation State
    const [userToDelete, setUserToDelete] = useState(null);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

    const initiateDelete = (user) => {
        setUserToDelete(user);
        setIsDeleteConfirmOpen(true);
    };

    const confirmDelete = async () => {
        if (!userToDelete) return;
        setIsDeleteConfirmOpen(false);

        try {
            await apiService.deleteTestUser(userToDelete.id);
            toast.success('Usuario dado de baja exitosamente');
            // Idealmente recargar la lista o actualizar estado local
            window.location.reload();
        } catch (error) {
            console.error(error);
            toast.error('Error al dar de baja usuario');
        } finally {
            setUserToDelete(null);
        }
    };

    const cancelDelete = () => {
        setIsDeleteConfirmOpen(false);
        setUserToDelete(null);
    };

    const openAnalytics = (user) => {
        setSelectedUser(user);
        setIsModalOpen(true);
    };

    if (!users || users.length === 0) {
        return (
            <div className="text-center p-8 bg-white rounded-lg border border-gray-200 shadow-sm">
                <p className="text-gray-500">No hay usuarios de prueba registrados.</p>
            </div>
        );
    }

    return (
        <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Usuario de Prueba
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Credenciales
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Contacto
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Estado
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Fecha Creación
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Creado Por (Vendedor)
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Acciones
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {users.map((user) => (
                            <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                    <div className="text-xs text-gray-500">ID: {user.id}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-600">
                                        <span className="font-semibold text-xs uppercase text-gray-400 mr-1">Pass:</span>
                                        <span className="font-mono bg-gray-100 px-2 py-1 rounded text-xs text-gray-800">
                                            {user.password}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {user.cellphone ? (
                                        <div className="flex items-center gap-2">
                                            <FaWhatsapp className="text-green-500 text-lg" />
                                            <span>{user.cellphone}</span>
                                        </div>
                                    ) : (
                                        <span className="text-gray-400">-</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {user.deleted_at ? (
                                        <div className="flex flex-col">
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 w-fit mb-1">
                                                {user.deletion_reason === 'EXPIRED' ? 'Expirado (7 días)' : 'Baja por Vendedor'}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                {new Date(user.deleted_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                            Activo
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(user.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-500 mr-3">
                                            <FaUserTie />
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium text-gray-900">
                                                {user.vendedor?.nombre || 'Desconocido'}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {user.vendedor?.email || '-'}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex items-center justify-end gap-2">
                                    <button
                                        onClick={() => openAnalytics(user)}
                                        className="text-blue-600 hover:text-blue-900 bg-blue-50 p-2 rounded-full transition-colors"
                                        title="Ver Análisis"
                                    >
                                        <BarChart2 className="w-5 h-5" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <TestUserAnalyticsModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                userId={selectedUser?.id}
                userName={selectedUser?.name}
            />

            <ConfirmationModal
                isOpen={isDeleteConfirmOpen}
                onClose={cancelDelete}
                onConfirm={confirmDelete}
                title="Dar de Baja Usuario"
                message={`¿Estás seguro de que deseas dar de baja al usuario ${userToDelete?.name}?`}
                confirmText="Dar de Baja"
                variant="danger"
            />
        </div>
    );
};

export default TestUsersTable;
