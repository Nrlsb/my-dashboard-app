import React, { useState, useEffect, useCallback } from 'react';
import apiService from '../api/apiService';
import './ManageAdminsPage.css';

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
    return <div>Cargando...</div>;
  }

  if (error) {
    return <div className="error-message">Error: {error}</div>;
  }

  return (
    <div className="manage-admins-container">
      <h2>Gestionar Administradores</h2>

      <div className="admin-section add-admin-section">
        <h3>Añadir Administrador</h3>
        <p>Selecciona un usuario para convertirlo en administrador.</p>
        <div className="add-admin-form">
          <select 
            value={selectedUser} 
            onChange={(e) => setSelectedUser(e.target.value)}
            disabled={users.length === 0}
          >
            {users.length > 0 ? (
              users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.full_name} ({user.email})
                </option>
              ))
            ) : (
              <option>No hay usuarios para añadir</option>
            )}
          </select>
          <button onClick={handleAddAdmin} disabled={users.length === 0}>
            Añadir Administrador
          </button>
        </div>
      </div>

      <div className="admin-section current-admins-section">
        <h3>Administradores Actuales</h3>
        {admins.length > 0 ? (
          <ul className="admins-list">
            {admins.map(admin => (
              <li key={admin.id} className="admin-item">
                <span>{admin.full_name} ({admin.email})</span>
                <button onClick={() => handleRemoveAdmin(admin.id)} className="remove-btn">
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p>No hay administradores configurados.</p>
        )}
      </div>
      
      {actionError && <div className="error-message action-error">{actionError}</div>}
    </div>
  );
};

export default ManageAdminsPage;
