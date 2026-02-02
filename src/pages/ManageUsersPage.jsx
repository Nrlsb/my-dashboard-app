import React, { useState, useEffect, useCallback, useMemo } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';
import apiService from '../api/apiService';
import { Search, Lock, Edit, AlertCircle, CheckCircle, Trash, Download } from 'lucide-react';
import TestUserAnalyticsModal from '../components/TestUserAnalyticsModal';
import ConfirmationModal from '../components/ConfirmationModal';

const ManageUsersPage = () => {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionError, setActionError] = useState(null);
    const [actionSuccess, setActionSuccess] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSeller, setSelectedSeller] = useState(''); // NEW: State for seller filter

    // Modal state
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedUserForAnalytics, setSelectedUserForAnalytics] = useState(null);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [downloadCredentials, setDownloadCredentials] = useState(true);

    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);

    const fetchClients = useCallback(async (term) => {
        try {
            // Do NOT set loading(true) here to keep UI input active
            setError(null);
            const data = await apiService.getAllClients(term);
            setClients(data);
        } catch (err) {
            setError(err.message || 'Error al cargar los clientes.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchClients(searchTerm);
        }, 500);

        return () => clearTimeout(timer);
    }, [searchTerm, fetchClients]);

    // Initial load handled by the search effect above because searchTerm starts empty

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };

    // NEW: Compute unique sellers for the dropdown
    const uniqueSellers = useMemo(() => {
        const sellers = clients
            .map(client => client.vendedor_nombre)
            .filter(name => name); // Filter out null/undefined
        return [...new Set(sellers)].sort(); // Unique and sorted
    }, [clients]);

    // NEW: Filter clients by selected seller
    const filteredClients = useMemo(() => {
        if (!selectedSeller) return clients;
        return clients.filter(client => client.vendedor_nombre === selectedSeller);
    }, [clients, selectedSeller]);

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

    const openAnalyticsModal = (user) => {
        setSelectedUserForAnalytics(user);
        setIsAnalyticsModalOpen(true);
    };

    const closeAnalyticsModal = () => {
        setIsAnalyticsModalOpen(false);
        setSelectedUserForAnalytics(null);
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
            if (selectedUser.has_password) {
                // Reset Mode
                await apiService.resetUserPassword(selectedUser.id, newPassword);
                setActionSuccess(`Contraseña restablecida correctamente para ${selectedUser.full_name}.`);
            } else {
                // Assign Mode (New Credential)
                await apiService.assignClientPassword({
                    a1_cod: selectedUser.a1_cod,
                    password: newPassword,
                    email: selectedUser.email
                });
                setActionSuccess(`Contraseña asignada correctamente a ${selectedUser.full_name}.`);
                // Refresh list to update status, maintaining the current search
                fetchClients(searchTerm);
            }

            // Generate Excel
            if (downloadCredentials) {
                try {
                    // Import dynamically to match PriceListPage pattern and ensure correct loading
                    const ExcelJS = (await import('exceljs')).default;
                    const workbook = new ExcelJS.Workbook();
                    const worksheet = workbook.addWorksheet('Credenciales');

                    worksheet.columns = [
                        { header: 'Dato', key: 'key', width: 25 },
                        { header: 'Valor', key: 'value', width: 40 },
                    ];

                    // Style header
                    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
                    worksheet.getRow(1).fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FF283A5A' }, // Dark blue
                    };

                    worksheet.addRows([
                        { key: 'Cliente', value: selectedUser.full_name },
                        { key: 'Código', value: selectedUser.codigo || selectedUser.a1_cod }, // Use codigo as primary
                        { key: 'Email', value: selectedUser.email },
                        { key: 'Contraseña', value: newPassword },
                        { key: 'Fecha', value: new Date().toLocaleDateString() }
                    ]);

                    // Add simple styling to the data
                    worksheet.eachRow((row, rowNumber) => {
                        if (rowNumber > 1) {
                            row.font = { size: 12 };
                        }
                    });

                    const buffer = await workbook.xlsx.writeBuffer();
                    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `Credenciales_${selectedUser.codigo || selectedUser.full_name}.xlsx`;
                    a.click();
                    window.URL.revokeObjectURL(url);
                } catch (err) {
                    console.error('Error generando Excel:', err);
                    setActionError('Error al generar el archivo Excel, pero la contraseña se guardó.');
                }
            }

            closeResetModal();
            setTimeout(() => setActionSuccess(null), 3000);
        } catch (err) {
            setActionError(err.message || 'Error al procesar la contraseña.');
        }
    };

    const initiateDeleteUser = (user) => {
        setUserToDelete(user);
        setIsDeleteModalOpen(true);
    };

    const confirmDeleteUser = async () => {
        if (!userToDelete) return;
        setIsDeleteModalOpen(false);

        try {
            setActionError(null);
            setActionSuccess(null);
            await apiService.deleteUser(userToDelete.id);
            setActionSuccess(`Usuario ${userToDelete.full_name} eliminado correctamente.`);
            fetchClients(searchTerm);
            setTimeout(() => setActionSuccess(null), 3000);
        } catch (err) {
            console.error(err);
            // Display error toast or set error state
            setActionError(err.message || 'Error al eliminar el usuario.');
            // Also invoke toast for better visibility if available in this context (it is not imported but error state works)
        } finally {
            setUserToDelete(null);
        }
    };

    const cancelDeleteUser = () => {
        setIsDeleteModalOpen(false);
        setUserToDelete(null);
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
        <div className="p-4 sm:p-6 max-w-[1600px] mx-auto min-h-screen bg-gray-50">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6 text-center">Gestión de Usuarios</h1>

            {actionSuccess && (
                <div className="mb-6 p-4 bg-green-100 border-l-4 border-green-500 text-green-700 flex items-center justify-center rounded shadow-sm animate-fade-in-down">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    <span>{actionSuccess}</span>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
                <div className="p-4 sm:p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50/50">
                    <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto flex-1">
                        <form className="relative w-full md:max-w-md" onSubmit={(e) => e.preventDefault()} autoComplete="off">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="search"
                                name="search_users_query"
                                id="search_users_query"
                                placeholder="Buscar por nombre, email o código..."
                                className="pl-10 pr-4 py-2.5 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
                                value={searchTerm}
                                onChange={handleSearchChange}
                                autoComplete="off"
                            />
                        </form>

                        <select
                            className="w-full md:w-64 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm bg-white text-gray-700"
                            value={selectedSeller}
                            onChange={(e) => setSelectedSeller(e.target.value)}
                        >
                            <option value="">Todos los Vendedores</option>
                            {uniqueSellers.map(seller => (
                                <option key={seller} value={seller}>{seller}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="w-full overflow-hidden">
                    <table className="w-full divide-y divide-gray-200 table-fixed">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="w-[30%] px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider truncate">
                                    Usuario
                                </th>
                                <th scope="col" className="w-[10%] px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell truncate">
                                    Código
                                </th>
                                <th scope="col" className="w-[20%] px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell truncate">
                                    Email
                                </th>
                                <th scope="col" className="w-[15%] px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell truncate">
                                    Vendedor
                                </th>
                                <th scope="col" className="w-[25%] px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Acciones
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredClients.length > 0 ? (
                                filteredClients.map((client) => (
                                    <tr key={client.id} className="hover:bg-blue-50/30 transition-colors duration-150">
                                        <td className="px-4 py-3 overflow-hidden">
                                            <div className="flex items-center min-w-0">
                                                <div className="flex-shrink-0 h-9 w-9 hidden xs:block">
                                                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-blue-700 font-bold shadow-sm">
                                                        {client.full_name?.charAt(0).toUpperCase() || 'U'}
                                                    </div>
                                                </div>
                                                <div className="ml-0 xs:ml-3 min-w-0 flex-1">
                                                    <div className="text-sm font-medium text-gray-900 truncate" title={client.full_name}>{client.full_name}</div>
                                                    <div className="md:hidden text-xs text-gray-500 truncate">{client.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap hidden sm:table-cell">
                                            <span className="px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                                {client.a1_cod || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-500 truncate hidden md:table-cell" title={client.email}>
                                            {client.email}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-500 truncate hidden lg:table-cell" title={client.vendedor_nombre}>
                                            {client.vendedor_nombre || '-'}
                                        </td>
                                        <td className="px-4 py-3 text-right text-sm font-medium whitespace-nowrap">
                                            <div className="flex items-center justify-end gap-1 sm:gap-2">
                                                <button
                                                    onClick={() => openAnalyticsModal(client)}
                                                    className="text-white bg-blue-500 hover:bg-blue-600 font-medium rounded-lg text-xs px-2.5 py-1.5 transition-all shadow-sm focus:outline-none flex items-center gap-1"
                                                    title="Ver Análisis"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-bar-chart-2"><line x1="18" x2="18" y1="20" y2="10" /><line x1="12" x2="12" y1="20" y2="4" /><line x1="6" x2="6" y1="20" y2="14" /></svg>
                                                    <span className="hidden xl:inline">Análisis</span>
                                                </button>
                                                <button
                                                    onClick={() => openResetModal(client)}
                                                    className={`text-white font-medium rounded-lg text-xs px-2.5 py-1.5 transition-all shadow-sm focus:outline-none flex items-center justify-center gap-1 ${client.has_password
                                                        ? "bg-indigo-600 hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-300"
                                                        : "bg-green-600 hover:bg-green-700 focus:ring-4 focus:ring-green-300"
                                                        }`}
                                                    title={client.has_password ? "Resetear" : "Asignar"}
                                                >
                                                    {client.has_password ? <Lock className="w-3.5 h-3.5" /> : <Edit className="w-3.5 h-3.5" />}
                                                    <span className="hidden xl:inline">{client.has_password ? "Reset" : "Asignar"}</span>
                                                </button>
                                                {!client.is_admin && (
                                                    <button
                                                        onClick={() => initiateDeleteUser(client)}
                                                        className="text-white bg-red-500 hover:bg-red-600 font-medium rounded-lg text-xs px-2.5 py-1.5 transition-all shadow-sm focus:outline-none flex items-center gap-1"
                                                        title="Eliminar Usuario"
                                                    >
                                                        <Trash className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="px-6 py-10 text-center text-gray-500">
                                        <div className="flex flex-col items-center justify-center">
                                            <Search className="h-10 w-10 text-gray-300 mb-3" />
                                            <p className="text-lg font-medium">No se encontraron usuarios</p>
                                            <p className="text-sm">Intenta con otros filtros o términos de búsqueda.</p>
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
                    <div className="relative w-full max-w-md mx-4 my-6">
                        <div className="relative flex flex-col w-full bg-white border-0 rounded-xl shadow-2xl outline-none focus:outline-none animate-bounce-in">
                            {/* Header */}
                            <div className="flex items-start justify-between p-5 border-b border-solid border-gray-200 rounded-t-xl bg-gray-50">
                                <h3 className="text-xl font-bold text-gray-800">
                                    {selectedUser?.has_password ? 'Restablecer Contraseña' : 'Asignar Nueva Contraseña'}
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
                                    {/* Invisible dummy inputs to capture browser autofill */}
                                    <input type="text" readOnly className="opacity-0 absolute w-0 h-0 -z-10" autoComplete="username" />
                                    <input type="password" readOnly className="opacity-0 absolute w-0 h-0 -z-10" autoComplete="current-password" />

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
                                    <input
                                        type="password"
                                        id="confirmPassword"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Repite la nueva contraseña"
                                    />
                                </div>

                                <div className="flex items-center mt-2 p-2 bg-gray-50 rounded text-sm text-gray-700">
                                    <input
                                        id="downloadCredentials"
                                        type="checkbox"
                                        checked={downloadCredentials}
                                        onChange={(e) => setDownloadCredentials(e.target.checked)}
                                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                                    />
                                    <label htmlFor="downloadCredentials" className="ml-2 block cursor-pointer select-none">
                                        Descargar credenciales en Excel
                                    </label>
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
            )}

            {/* Modal de Análisis */}
            <TestUserAnalyticsModal
                isOpen={isAnalyticsModalOpen}
                onClose={closeAnalyticsModal}
                userId={selectedUserForAnalytics?.id}
                userName={selectedUserForAnalytics?.full_name}
                isRegularUser={true}
            />

            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={cancelDeleteUser}
                onConfirm={confirmDeleteUser}
                title="Eliminar Usuario"
                message={`¿Estás seguro de que deseas eliminar al usuario ${userToDelete?.full_name}? Esta acción borrará sus credenciales y datos del sistema.`}
                confirmText="Eliminar"
                variant="danger"
            />
        </div >
    );
};

export default ManageUsersPage;
