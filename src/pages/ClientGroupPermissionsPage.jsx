import React, { useState, useEffect } from 'react';
import { apiService } from '../api/apiService';
import './ClientGroupPermissionsPage.css';

const ClientGroupPermissionsPage = ({ currentUser }) => {
  const [clients, setClients] = useState([]);
  const [productGroups, setProductGroups] = useState([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [clientDeniedGroups, setClientDeniedGroups] = useState([]);
  const [filterText, setFilterText] = useState('');
  const [selectAll, setSelectAll] = useState(false);
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
      setClientDeniedGroups([]);
      return;
    }
    const fetchPermissions = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const permissionsData = await apiService.getDeniedProductGroups(selectedClient, currentUser.id);
        setClientDeniedGroups(permissionsData);
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
    setClientDeniedGroups(prev =>
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
      await apiService.updateUserGroupPermissions(selectedClient, clientDeniedGroups, currentUser.id);
      setSuccess('Permisos guardados con éxito.');
    } catch (err) {
      setError('Error al guardar los permisos.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Si no es admin, mostrar mensaje de acceso denegado
  // Mover las sentencias de retorno condicionales para `isLoading`, `error` y `!currentUser || !currentUser.is_admin`
  // después de todas las llamadas a `useState` y `useEffect` para asegurar que los hooks se llamen incondicionalmente.

  const filteredProductGroups = productGroups.filter(group =>
    group.toLowerCase().includes(filterText.toLowerCase())
  );

  const handleSelectAllChange = (e) => {
    const isChecked = e.target.checked;
    setSelectAll(isChecked);

    if (isChecked) {
      // Add all filtered groups to clientDeniedGroups
      setClientDeniedGroups(prev => [...new Set([...prev, ...filteredProductGroups])]);
    } else {
      // Remove all filtered groups from clientDeniedGroups
      setClientDeniedGroups(prev => prev.filter(group => !filteredProductGroups.includes(group)));
    }
  };

  // Determine if the "Select All" checkbox should be checked
  useEffect(() => {
    if (filteredProductGroups.length > 0 && filteredProductGroups.every(group => clientDeniedGroups.includes(group))) {
      setSelectAll(true);
    } else {
      setSelectAll(false);
    }
  }, [filteredProductGroups, clientDeniedGroups]);

  if (isLoading && !error) { // Mostrar "Cargando..." solo si no hay un error previo
    return <div className="text-center p-8">Cargando...</div>;
  }

  if (error) {
    return <div className="text-center p-8 text-red-500">{error}</div>;
  }

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
          <div className="filter-container">
            <label htmlFor="product-group-filter">Filtrar Grupos:</label>
            <input
              type="text"
              id="product-group-filter"
              value={filterText}
              onChange={e => setFilterText(e.target.value)}
              placeholder="Escriba para filtrar grupos..."
            />
          </div>
          <div className="select-all-container">
            <input
              type="checkbox"
              id="select-all-groups"
              checked={selectAll}
              onChange={handleSelectAllChange}
            />
            <label htmlFor="select-all-groups">Seleccionar todos los grupos filtrados</label>
          </div>
          <h3>Grupos de Productos Denegados</h3>
          <div className="groups-list">
            {filteredProductGroups.map(group => (
              <div key={group} className="group-item">
                <input
                  type="checkbox"
                  id={`group-${group}`}
                  checked={clientDeniedGroups.includes(group)}
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
