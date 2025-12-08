import React, { useState, useEffect } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';
import apiService from '../api/apiService';
import CustomSelect from '../components/CustomSelect';
import { useAuth } from '../context/AuthContext';


const ClientGroupPermissionsPage = () => {
  const { user: currentUser } = useAuth();
  const [clients, setClients] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [productGroups, setProductGroups] = useState([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [clientDeniedGroups, setClientDeniedGroups] = useState([]);
  const [filterText, setFilterText] = useState('');
  const [selectAll, setSelectAll] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
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
          apiService.getAdminUsers(),
          apiService.getAdminProductGroups(),
        ]);
        setClients(clientsData);
        setProductGroups(groupsData);
        setError(null);
      } catch (err) {
        setError(
          'Error al cargar datos iniciales. Asegúrese de tener permisos de administrador.'
        );
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [currentUser]);

  useEffect(() => {
    if (!selectedClient || !currentUser || !currentUser.is_admin) {
      setClientDeniedGroups([]);
      return;
    }
    const fetchPermissions = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const permissionsData =
          await apiService.getDeniedProductGroups(selectedClient);
        setClientDeniedGroups(permissionsData);
      } catch (err) {
        setError(`Error al cargar los permisos para el cliente seleccionado.`);
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPermissions();
  }, [selectedClient, currentUser]);

  const handleCheckboxChange = (group) => {
    setClientDeniedGroups((prev) =>
      prev.includes(group) ? prev.filter((p) => p !== group) : [...prev, group]
    );
  };

  const handleSave = async () => {
    if (!selectedClient) {
      setError('Por favor, seleccione un cliente primero.');
      return;
    }
    if (!currentUser || !currentUser.is_admin) {
      setError(
        'Acceso denegado. Requiere permisos de administrador para guardar.'
      );
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      setSuccess('');
      await apiService.updateUserGroupPermissions(
        selectedClient,
        clientDeniedGroups
      );
      setSuccess('Permisos guardados con éxito.');
    } catch (err) {
      setError('Error al guardar los permisos.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredClients = clients.filter(
    (client) =>
      (client.full_name &&
        client.full_name.toLowerCase().includes(userSearch.toLowerCase())) ||
      (client.email &&
        client.email.toLowerCase().includes(userSearch.toLowerCase())) ||
      (client.a1_cod &&
        client.a1_cod.toLowerCase().includes(userSearch.toLowerCase()))
  );

  const filteredProductGroups = productGroups.filter(
    (item) =>
      (item.product_group &&
        item.product_group.toLowerCase().includes(filterText.toLowerCase())) ||
      (item.brand &&
        item.brand.toLowerCase().includes(filterText.toLowerCase()))
  );

  const handleSelectAllChange = (e) => {
    const isChecked = e.target.checked;
    setSelectAll(isChecked);

    const filteredGroupNames = filteredProductGroups.map(
      (item) => item.product_group
    );

    if (isChecked) {
      setClientDeniedGroups((prev) => [
        ...new Set([...prev, ...filteredGroupNames]),
      ]);
    } else {
      setClientDeniedGroups((prev) =>
        prev.filter((group) => !filteredGroupNames.includes(group))
      );
    }
  };

  useEffect(() => {
    if (
      filteredProductGroups.length > 0 &&
      filteredProductGroups.every((item) =>
        clientDeniedGroups.includes(item.product_group)
      )
    ) {
      setSelectAll(true);
    } else {
      setSelectAll(false);
    }
  }, [filteredProductGroups, clientDeniedGroups]);

  if (isLoading && !error) {
    return <LoadingSpinner text="Cargando..." />;
  }

  if (error) {
    return <div className="text-center p-8 text-red-500">{error}</div>;
  }

  if (!currentUser || !currentUser.is_admin) {
    return (
      <div className="text-center p-8 text-red-500">
        Acceso denegado. No tiene permisos de administrador para ver esta
        página.
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto bg-gray-50 rounded-lg shadow-md">
      <h2 className="text-center mb-8 text-gray-800">Gestionar Permisos por Grupo de Producto</h2>
      {success && <p className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4">{success}</p>}

      <div className="mb-8 flex flex-col items-stretch gap-3">
        <label htmlFor="user-search" className="font-bold">Buscar Cliente:</label>
        <input
          type="text"
          id="user-search"
          value={userSearch}
          onChange={(e) => setUserSearch(e.target.value)}
          placeholder="Filtrar por nombre, email o código..."
          className="p-2 rounded border border-gray-300 w-full"
        />
        <label htmlFor="client-select" className="font-bold">Seleccionar Cliente:</label>

        <CustomSelect
          options={filteredClients.map((client) => ({
            label: `${client.full_name} (${client.email})`,
            value: client.id,
          }))}
          value={selectedClient}
          onChange={(val) => setSelectedClient(val)}
          placeholder="-- Seleccione un cliente --"
        />
      </div>

      {selectedClient && (
        <div className="mt-4 p-6 border border-gray-200 rounded-lg bg-white">
          <div className="mb-6 flex items-center gap-4">
            <label htmlFor="product-group-filter" className="font-bold">Filtrar Grupos:</label>
            <input
              type="text"
              id="product-group-filter"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Filtrar por grupo o marca..."
              className="p-2 rounded border border-gray-300 flex-grow"
            />
          </div>
          <div className="mb-4 flex items-center gap-2">
            <input
              type="checkbox"
              id="select-all-groups"
              checked={selectAll}
              onChange={handleSelectAllChange}
              className="w-5 h-5"
            />
            <label htmlFor="select-all-groups" className="font-bold">
              Seleccionar todos los grupos filtrados
            </label>
          </div>
          <h3 className="mt-0 mb-6 border-b pb-4 text-xl font-semibold text-gray-700">Grupos de Productos Denegados</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
            {filteredProductGroups.map((item) => (
              <div key={item.product_group} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id={`group-${item.product_group}`}
                  checked={clientDeniedGroups.includes(item.product_group)}
                  onChange={() => handleCheckboxChange(item.product_group)}
                  className="w-5 h-5"
                />
                <label htmlFor={`group-${item.product_group}`}>
                  {item.product_group}{' '}
                  <span className="text-gray-600 text-sm ml-1">({item.brand})</span>
                </label>
              </div>
            ))}
          </div>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Guardar Permisos
          </button>
        </div>
      )}
    </div>
  );
};

export default ClientGroupPermissionsPage;
