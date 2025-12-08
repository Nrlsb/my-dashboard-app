import React, { useState, useEffect, useCallback } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';
import apiService from '../api/apiService';
import CustomSelect from '../components/CustomSelect';


const ManageAdminsPage = () => {
  const [admins, setAdmins] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedRole, setSelectedRole] = useState('admin');
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
      await apiService.addAdmin(selectedUser, selectedRole);
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
      <h2 className="text-center mb-8 text-gray-800 text-2xl font-bold">Gestionar Roles y Permisos</h2>

      <div className="mb-10 p-6 border border-gray-200 rounded-lg bg-white">
        <h3 className="mt-0 mb-2 text-gray-700 border-b-2 border-gray-300 pb-2 text-xl font-semibold">Asignar Rol</h3>
        <p className="text-sm text-gray-600 mb-4">Selecciona un usuario y el rol que deseas asignarle.</p>
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
          <div className="flex-grow">
            <CustomSelect
              options={users.length > 0 ? users.map((user) => ({
                label: `${user.full_name} (${user.email})`,
                value: user.id
              })) : []}
              value={selectedUser}
              onChange={(val) => setSelectedUser(val)}
              placeholder={users.length > 0 ? "Seleccionar usuario" : "No hay usuarios para añadir"}
            />
          </div>
          <div className="w-full md:w-40">
            <CustomSelect
              options={[
                { label: 'Admin', value: 'admin' },
                { label: 'Marketing', value: 'marketing' }
              ]}
              value={selectedRole}
              onChange={(val) => setSelectedRole(val)}
              placeholder="Rol"
            />
          </div>
          <button
            onClick={handleAddAdmin}
            disabled={users.length === 0}
            className="py-2 px-6 bg-green-600 text-white rounded-md cursor-pointer font-bold transition-colors duration-200 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed h-[42px]"
          >
            Añadir
          </button>
        </div>
      </div>

      <div className="mb-10 p-6 border border-gray-200 rounded-lg bg-white">
        <h3 className="mt-0 mb-2 text-gray-700 border-b-2 border-gray-300 pb-2 text-xl font-semibold">Usuarios con Roles Asignados</h3>
        {admins.length > 0 ? (
          <ul className="list-none p-0">
            {admins.map((admin) => (
              <li key={admin.id} className="flex flex-col md:flex-row justify-between items-start md:items-center py-4 px-0 border-b border-gray-200 last:border-b-0 gap-3">
                <div className="flex flex-col w-full">
                  <span className="text-base font-bold text-gray-800">
                    {admin.full_name}
                  </span>
                  <span className="text-sm text-gray-600 break-all">
                    {admin.email}
                  </span>
                  <span className={`mt-2 self-start px-2 py-1 text-xs rounded-full font-medium ${admin.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                    {admin.role === 'admin' ? 'Administrador' : 'Marketing'}
                  </span>
                </div>
                <button
                  onClick={() => handleRemoveAdmin(admin.id)}
                  className="w-full md:w-auto py-2 px-4 bg-red-600 text-white rounded-md cursor-pointer font-bold transition-colors duration-200 hover:bg-red-700 text-sm mt-2 md:mt-0"
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
