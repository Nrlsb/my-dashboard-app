import React, { useState, useEffect } from 'react';
import { apiService } from '../api/apiService';
import './ClientGroupPermissionsPage.css';

const ClientGroupPermissionsPage = ({ currentUser }) => {
  const [clients, setClients] = useState([]);
  const [productGroups, setProductGroups] = useState([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [clientPermissions, setClientPermissions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null); // Cambiado a null para diferenciar de string vacío
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser || !currentUser.is_admin) {
        setError('Acceso denegado. Requiere permisos de administrador.');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const [clientsData, groupsData] = await Promise.all([
          apiService.getAdminUsers(currentUser.id),
          apiService.getAdminProductGroups(currentUser.id)
        ]);
        setClients(clientsData);
        setProductGroups(groupsData);
        setError(null); // Limpiar errores si la carga inicial es exitosa
      } catch (err) {
        setError('Error al cargar datos iniciales. Asegúrese de tener permisos de administrador.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [currentUser]); // Dependencia de currentUser

  // Fetch permissions when a client is selected
  useEffect(() => {
    if (!selectedClient || !currentUser || !currentUser.is_admin) {
      setClientPermissions([]);
      return;
    }
    const fetchPermissions = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const permissionsData = await apiService.getUserGroupPermissions(selectedClient, currentUser.id);
        setClientPermissions(permissionsData);
      } catch (err) {
        setError(`Error al cargar los permisos para el cliente seleccionado.`);
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPermissions();
  }, [selectedClient, currentUser]); // Dependencias de selectedClient y currentUser

  const handleCheckboxChange = (group) => {
    setClientPermissions(prev =>
      prev.includes(group) ? prev.filter(p => p !== group) : [...prev, group]
    );
  };

  const handleSave = async () => {
    if (!selectedClient) {
      setError('Por favor, seleccione un cliente primero.');
      return;
    }
    if (!currentUser || !currentUser.is_admin) {
      setError('Acceso denegado. Requiere permisos de administrador para guardar.');
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      setSuccess('');
      await apiService.updateUserGroupPermissions(selectedClient, clientPermissions, currentUser.id);
      setSuccess('Permisos guardados con éxito.');
    } catch (err) {
      setError('Error al guardar los permisos.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !error) { // Mostrar "Cargando..." solo si no hay un error previo
    return <div className="text-center p-8">Cargando...</div>;
  }

  if (error) {
    return <div className="text-center p-8 text-red-500">{error}</div>;
  }

  // Si no es admin, mostrar mensaje de acceso denegado
  if (!currentUser || !currentUser.is_admin) {
    return <div className="text-center p-8 text-red-500">Acceso denegado. No tiene permisos de administrador para ver esta página.</div>;
  }

  return (
    <div className="permissions-page">
      <h2>Gestionar Permisos por Grupo de Producto</h2>
      {success && <p className="success-message">{success}</p>}
      
      <div className="selection-container">
        <label htmlFor="client-select">Seleccionar Cliente:</label>
        <select id="client-select" value={selectedClient} onChange={e => setSelectedClient(e.target.value)}>
          <option value="">-- Seleccione un cliente --</option>
          {clients.map(client => (
            <option key={client.id} value={client.id}>
              {client.full_name} ({client.email})
            </option>
          ))}
        </select>
      </div>

      {selectedClient && (
        <div className="permissions-container">
          <h3>Grupos de Productos Permitidos</h3>
          <div className="groups-list">
            {productGroups.map(group => (
              <div key={group} className="group-item">
                <input
                  type="checkbox"
                  id={`group-${group}`}
                  checked={clientPermissions.includes(group)}
                  onChange={() => handleCheckboxChange(group)}
                />
                <label htmlFor={`group-${group}`}>{group}</label>
              </div>
            ))}
          </div>
          <button onClick={handleSave} disabled={isLoading}>
            Guardar Permisos
          </button>
        </div>
      )}
    </div>
  );
};

export default ClientGroupPermissionsPage;
