import React, { useState, useEffect, useCallback } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';
import apiService from '../api/apiService';


const ManageAdminsPage = () => {
  const [admins, setAdmins] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setActionError(null);
      const [adminsData, usersData] = await Promise.all([
        apiService.getAdmins(),
        apiService.getAdminUsers(), // Fetches non-admin users
      ]);
      setAdmins(adminsData);
      setUsers(usersData);
      if (usersData.length > 0) {
        setSelectedUser(usersData[0].id);
      }
    } catch (err) {
      setError(err.message || 'Error al cargar los datos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddAdmin = async () => {
    if (!selectedUser) {
      setActionError('Por favor, selecciona un usuario.');
      return;
    }
    try {
      setActionError(null);
      await apiService.addAdmin(selectedUser);
      await fetchData(); // Refresh data
    } catch (err) {
      setActionError(err.message || 'Error al añadir administrador.');
    }
  };

  const handleRemoveAdmin = async (userId) => {
    try {
      setActionError(null);
      await apiService.removeAdmin(userId);
      await fetchData(); // Refresh data
    } catch (err) {
      setActionError(err.message || 'Error al quitar administrador.');
    }
  };

  if (loading) {
    return <LoadingSpinner text="Cargando..." />;
  }

  if (error) {
    return <div className="text-red-700 bg-red-100 border border-red-400 p-4 rounded-md text-center mt-4">Error: {error}</div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto my-8 bg-gray-50 rounded-lg shadow-md">
      <h2 className="text-center mb-8 text-gray-800 text-2xl font-bold">Gestionar Administradores</h2>

      <div className="mb-10 p-6 border border-gray-200 rounded-lg bg-white">
        <h3 className="mt-0 mb-2 text-gray-700 border-b-2 border-gray-300 pb-2 text-xl font-semibold">Añadir Administrador</h3>
        <p className="text-sm text-gray-600 mb-4">Selecciona un usuario para convertirlo en administrador.</p>
        <div className="flex gap-4 items-center">
          <select
            className="flex-grow py-3 px-4 border border-gray-300 rounded-md text-base"
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            disabled={users.length === 0}
          >
            {users.length > 0 ? (
              users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name} ({user.email})
                </option>
              ))
            ) : (
              <option>No hay usuarios para añadir</option>
            )}
          </select>
          <button
            onClick={handleAddAdmin}
            disabled={users.length === 0}
            className="py-3 px-6 bg-green-600 text-white rounded-md cursor-pointer font-bold transition-colors duration-200 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Añadir Administrador
          </button>
        </div>
      </div>

      <div className="mb-10 p-6 border border-gray-200 rounded-lg bg-white">
        <h3 className="mt-0 mb-2 text-gray-700 border-b-2 border-gray-300 pb-2 text-xl font-semibold">Administradores Actuales</h3>
        {admins.length > 0 ? (
          <ul className="list-none p-0">
            {admins.map((admin) => (
              <li key={admin.id} className="flex justify-between items-center py-3 px-0 border-b border-gray-200 last:border-b-0">
                <span className="text-base">
                  {admin.full_name} ({admin.email})
                </span>
                <button
                  onClick={() => handleRemoveAdmin(admin.id)}
                  className="py-2 px-4 bg-red-600 text-white rounded-md cursor-pointer font-bold transition-colors duration-200 hover:bg-red-700 text-sm"
                >
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p>No hay administradores configurados.</p>
        )}
      </div>

      {actionError && (
        <div className="text-red-700 bg-red-100 border border-red-400 p-4 rounded-md text-center mt-4">{actionError}</div>
      )}
    </div>
  );
};

export default ManageAdminsPage;
