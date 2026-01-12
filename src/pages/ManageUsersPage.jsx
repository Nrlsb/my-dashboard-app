import React, { useState, useEffect, useCallback, useMemo } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';
import apiService from '../api/apiService';
import { Search, Lock, Edit, AlertCircle, CheckCircle } from 'lucide-react';

const ManageUsersPage = () => {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionError, setActionError] = useState(null);
    const [actionSuccess, setActionSuccess] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal state
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const fetchClients = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await apiService.getAllClients();
            setClients(data);
        } catch (err) {
            setError(err.message || 'Error al cargar los clientes.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchClients();
    }, [fetchClients]);

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };

    const filteredClients = useMemo(() => {
        if (!searchTerm) return clients;
        const lowerTerm = searchTerm.toLowerCase();
        return clients.filter(client =>
            (client.full_name?.toLowerCase() || '').includes(lowerTerm) ||
            (client.email?.toLowerCase() || '').includes(lowerTerm) ||
            (client.a1_cod?.toLowerCase() || '').includes(lowerTerm)
        );
    }, [clients, searchTerm]);

    const openResetModal = (user) => {
        setSelectedUser(user);
        setNewPassword('');
        setConfirmPassword('');
        setActionError(null);
        setActionSuccess(null);
        setIsResetModalOpen(true);
    };

    const closeResetModal = () => {
        setIsResetModalOpen(false);
        setSelectedUser(null);
    };

    const handleResetPassword = async () => {
        if (!newPassword) {
            setActionError('La contraseña es requerida.');
            return;
        }
        if (newPassword.length < 6) {
            setActionError('La contraseña debe tener al menos 6 caracteres.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setActionError('Las contraseñas no coinciden.');
            return;
        }

        try {
            setActionError(null);
            await apiService.resetUserPassword(selectedUser.id, newPassword);
            setActionSuccess(`Contraseña restablecida correctamente para ${selectedUser.full_name}.`);
            closeResetModal();
            // Clear success message after 3 seconds
            setTimeout(() => setActionSuccess(null), 3000);
        } catch (err) {
            setActionError(err.message || 'Error al restablecer la contraseña.');
        }
    };

    if (loading) return <LoadingSpinner text="Cargando usuarios..." />;

    if (error) {
        return (
            <div className="p-8 text-center">
                <div className="text-red-600 bg-red-100 p-4 rounded-lg inline-block">
                    Error: {error}
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-8 max-w-7xl mx-auto min-h-screen bg-gray-50">
            <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">Gestión de Usuarios</h1>

            {actionSuccess && (
                <div className="mb-6 p-4 bg-green-100 border-l-4 border-green-500 text-green-700 flex items-center justify-center rounded shadow-sm animate-fade-in-down">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    <span>{actionSuccess}</span>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
                <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50/50">
                    <div className="relative w-full sm:w-96">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Buscar por nombre, email o código..."
                            className="pl-10 pr-4 py-2.5 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
                            value={searchTerm}
                            onChange={handleSearchChange}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Usuario
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Código
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Email
                                </th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Acciones
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredClients.length > 0 ? (
                                filteredClients.map((client) => (
                                    <tr key={client.id} className="hover:bg-blue-50/30 transition-colors duration-150">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 h-10 w-10">
                                                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-blue-700 font-bold shadow-sm">
                                                        {client.full_name?.charAt(0).toUpperCase() || 'U'}
                                                    </div>
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-gray-900">{client.full_name}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                                {client.a1_cod || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {client.email}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={() => openResetModal(client)}
                                                className="text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-300 font-medium rounded-lg text-xs px-4 py-2 transition-all shadow-sm focus:outline-none flex items-center justify-center ml-auto gap-2"
                                            >
                                                <Lock className="w-3.5 h-3.5" />
                                                Reset Password
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" className="px-6 py-10 text-center text-gray-500">
                                        <div className="flex flex-col items-center justify-center">
                                            <Search className="h-10 w-10 text-gray-300 mb-3" />
                                            <p className="text-lg font-medium">No se encontraron usuarios</p>
                                            <p className="text-sm">Intenta con otros términos de búsqueda.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Resetear Contraseña */}
            {isResetModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center overflow-x-hidden overflow-y-auto outline-none focus:outline-none bg-black/50 backdrop-blur-sm transition-opacity">
                    <div className="relative w-full max-w-md mx-auto my-6">
                        <div className="relative flex flex-col w-full bg-white border-0 rounded-xl shadow-2xl outline-none focus:outline-none animate-bounce-in">
                            {/* Header */}
                            <div className="flex items-start justify-between p-5 border-b border-solid border-gray-200 rounded-t-xl bg-gray-50">
                                <h3 className="text-xl font-bold text-gray-800">
                                    Restablecer Contraseña
                                </h3>
                                <button
                                    className="p-1 ml-auto bg-transparent border-0 text-gray-400 hover:text-gray-900 float-right text-3xl leading-none font-semibold outline-none focus:outline-none transition-colors"
                                    onClick={closeResetModal}
                                >
                                    <span className="bg-transparent h-6 w-6 text-2xl block outline-none focus:outline-none">
                                        ×
                                    </span>
                                </button>
                            </div>
                            {/* Body */}
                            <div className="relative p-6 flex-auto">
                                <p className="my-2 text-gray-600 text-sm leading-relaxed mb-6">
                                    Estás restableciendo la contraseña para el usuario:
                                    <br />
                                    <strong className="text-gray-900 block mt-1 text-base">{selectedUser?.full_name}</strong>
                                </p>

                                <div className="space-y-4">
                                    <div>
                                        <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                                            Nueva Contraseña
                                        </label>
                                        <input
                                            type="password"
                                            id="newPassword"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder="Ingresa la nueva contraseña"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                                            Confirmar Contraseña
                                        </label>
                                        <input
                                            type="password"
                                            id="confirmPassword"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="Repite la nueva contraseña"
                                        />
                                    </div>
                                    {actionError && (
                                        <div className="text-red-600 text-sm bg-red-50 p-2 rounded flex items-start gap-2">
                                            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                            <span>{actionError}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            {/* Footer */}
                            <div className="flex items-center justify-end p-6 border-t border-solid border-gray-200 rounded-b-xl bg-gray-50">
                                <button
                                    className="text-gray-500 background-transparent font-bold uppercase px-6 py-2 text-sm outline-none focus:outline-none mr-2 mb-1 ease-linear transition-all duration-150 hover:bg-gray-200 rounded-lg"
                                    type="button"
                                    onClick={closeResetModal}
                                >
                                    Cancelar
                                </button>
                                <button
                                    className="bg-indigo-600 text-white active:bg-indigo-700 font-bold uppercase text-sm px-6 py-3 rounded-lg shadow hover:shadow-lg outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150 hover:bg-indigo-700"
                                    type="button"
                                    onClick={handleResetPassword}
                                >
                                    Guardar Cambios
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageUsersPage;
