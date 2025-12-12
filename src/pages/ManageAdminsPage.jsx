import React, { useState, useEffect, useCallback } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';
import apiService from '../api/apiService';
import CustomSelect from '../components/CustomSelect';


const AVAILABLE_PERMISSIONS = [
  { value: 'manage_content', label: 'Gestionar Contenido' },
  { value: 'manage_offers', label: 'Gestionar Ofertas' },
  { value: 'view_analytics', label: 'Ver Analíticas' },
  { value: 'manage_admins', label: 'Gestionar Admins' },
];

const ManageAdminsPage = () => {
  const [admins, setAdmins] = useState([]);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);

  // Role Management State
  const [isEditingRole, setIsEditingRole] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState(null);
  const [roleName, setRoleName] = useState('');
  const [rolePermissions, setRolePermissions] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setActionError(null);
      const [adminsData, usersData, rolesData] = await Promise.all([
        apiService.getAdmins(),
        apiService.getAdminUsers(), // Fetches non-admin users
        apiService.getRoles(),
      ]);
      setAdmins(adminsData);
      setUsers(usersData);
      setRoles(rolesData);
      if (usersData.length > 0) {
        setSelectedUser(usersData[0].id);
      }
      if (rolesData.length > 0) {
        setSelectedRole(rolesData[0].name);
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
    if (!selectedRole) {
      setActionError('Por favor, selecciona un rol.');
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

  const handleSaveRole = async () => {
    if (!roleName.trim()) {
      setActionError('El nombre del rol es requerido.');
      return;
    }
    try {
      setActionError(null);
      if (isEditingRole && editingRoleId) {
        await apiService.updateRole(editingRoleId, { name: roleName, permissions: rolePermissions });
      } else {
        await apiService.createRole({ name: roleName, permissions: rolePermissions });
      }
      resetRoleForm();
      await fetchData();
    } catch (err) {
      setActionError(err.message || 'Error al guardar el rol.');
    }
  };

  const handleDeleteRole = async (roleId) => {
    if (!window.confirm('¿Estás seguro de eliminar este rol?')) return;
    try {
      setActionError(null);
      await apiService.deleteRole(roleId);
      await fetchData();
    } catch (err) {
      setActionError(err.message || 'Error al eliminar el rol.');
    }
  };

  const startEditRole = (role) => {
    setIsEditingRole(true);
    setEditingRoleId(role.id);
    setRoleName(role.name);
    setRolePermissions(role.permissions || []);
  };

  const resetRoleForm = () => {
    setIsEditingRole(false);
    setEditingRoleId(null);
    setRoleName('');
    setRolePermissions([]);
  };

  const togglePermission = (permission) => {
    setRolePermissions(prev =>
      prev.includes(permission)
        ? prev.filter(p => p !== permission)
        : [...prev, permission]
    );
  };

  if (loading) {
    return <LoadingSpinner text="Cargando..." />;
  }

  if (error) {
    return <div className="text-red-700 bg-red-100 border border-red-400 p-4 rounded-md text-center mt-4">Error: {error}</div>;
  }

  return (
    <div className="p-8 max-w-6xl mx-auto my-8 bg-gray-50 rounded-lg shadow-md">
      <h2 className="text-center mb-8 text-gray-800 text-2xl font-bold">Gestionar Roles y Permisos</h2>

      {/* Role Management Section */}
      <div className="mb-10 p-6 border border-gray-200 rounded-lg bg-white">
        <h3 className="mt-0 mb-4 text-gray-700 border-b-2 border-gray-300 pb-2 text-xl font-semibold">
          {isEditingRole ? 'Editar Rol' : 'Crear Nuevo Rol'}
        </h3>
        <div className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Nombre del Rol"
            value={roleName}
            onChange={(e) => setRoleName(e.target.value)}
            className="p-2 border border-gray-300 rounded-md"
          />
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_PERMISSIONS.map((perm) => (
              <label key={perm.value} className="flex items-center gap-2 p-2 border rounded-md cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={rolePermissions.includes(perm.value)}
                  onChange={() => togglePermission(perm.value)}
                />
                {perm.label}
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSaveRole}
              className="py-2 px-6 bg-blue-600 text-white rounded-md font-bold hover:bg-blue-700"
            >
              {isEditingRole ? 'Actualizar Rol' : 'Crear Rol'}
            </button>
            {isEditingRole && (
              <button
                onClick={resetRoleForm}
                className="py-2 px-6 bg-gray-500 text-white rounded-md font-bold hover:bg-gray-600"
              >
                Cancelar
              </button>
            )}
          </div>
        </div>

        <div className="mt-6">
          <h4 className="text-lg font-semibold mb-2">Roles Existentes</h4>
          <ul className="list-disc pl-5">
            {roles.map((role) => (
              <li key={role.id} className="flex justify-between items-center mb-2">
                <span>
                  <strong>{role.name}</strong> - Permisos: {role.permissions?.join(', ') || 'Ninguno'}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => startEditRole(role)}
                    className="text-blue-600 hover:underline"
                    disabled={role.name === 'admin'} // Protect admin role?
                  >
                    Editar
                  </button>
                  {role.name !== 'admin' && (
                    <button
                      onClick={() => handleDeleteRole(role.id)}
                      className="text-red-600 hover:underline"
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

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
              options={roles.map(r => ({ label: r.name, value: r.name }))}
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
                    {admin.role}
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
