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

  // New State for Tabs
  const [activeTab, setActiveTab] = useState('search'); // 'search' | 'seller'
  const [sellers, setSellers] = useState([]);
  const [selectedSeller, setSelectedSeller] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser || !currentUser.is_admin) {
        setError('Acceso denegado. Requiere permisos de administrador.');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const [clientsData, groupsData, sellersData] = await Promise.all([
          apiService.getAdminUsers(),
          apiService.getAdminProductGroups(),
          apiService.getAdminSellers(),
        ]);
        setClients(clientsData);
        setProductGroups(groupsData);
        setSellers(sellersData);
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

    // If "ALL_CLIENTS" is selected, we start with empty selection (or could fetch common ones, but empty is safer so user builds from scratch)
    // Alternatively, we could default to NONE denied, effectively resetting everyone if they save empty.
    if (selectedClient === 'ALL_CLIENTS') {
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

      if (selectedClient === 'ALL_CLIENTS' && selectedSeller) {
        // Bulk Update
        await apiService.updateVendorGroupPermissions(
          selectedSeller.codigo,
          clientDeniedGroups
        );
        setSuccess(`Permisos actualizados para TODOS los clientes de ${selectedSeller.nombre} exitosamente.`);
      } else {
        // Single Client Update
        await apiService.updateUserGroupPermissions(
          selectedClient,
          clientDeniedGroups
        );
        setSuccess('Permisos guardados con éxito.');
      }

    } catch (err) {
      setError('Error al guardar los permisos.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredClients = clients.filter((client) => {
    if (activeTab === 'seller') {
      if (!selectedSeller) return false;
      // Filter by selected seller code
      // We expect client.vendedor_codigo to be populated from the backend
      return client.vendedor_codigo && String(client.vendedor_codigo).trim() === String(selectedSeller.codigo).trim();
    }

    // Default Search Logic
    return (
      (client.full_name &&
        client.full_name.toLowerCase().includes(userSearch.toLowerCase())) ||
      (client.email &&
        client.email.toLowerCase().includes(userSearch.toLowerCase())) ||
      (client.a1_cod &&
        client.a1_cod.toLowerCase().includes(userSearch.toLowerCase()))
    );
  });

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

      {/* TABS */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          className={`px-6 py-3 font-medium text-sm focus:outline-none ${activeTab === 'search'
            ? 'border-b-2 border-blue-500 text-blue-600'
            : 'text-gray-500 hover:text-gray-700'
            }`}
          onClick={() => setActiveTab('search')}
        >
          Buscar Cliente
        </button>
        <button
          className={`px-6 py-3 font-medium text-sm focus:outline-none ${activeTab === 'seller'
            ? 'border-b-2 border-blue-500 text-blue-600'
            : 'text-gray-500 hover:text-gray-700'
            }`}
          onClick={() => setActiveTab('seller')}
        >
          Por Vendedor
        </button>
      </div>

      <div className="mb-8 flex flex-col items-stretch gap-3">
        {activeTab === 'search' && (
          <>
            <label htmlFor="user-search" className="font-bold">Buscar Cliente:</label>
            <input
              type="text"
              id="user-search"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Filtrar por nombre, email o código..."
              className="p-2 rounded border border-gray-300 w-full"
            />
          </>
        )}

        {activeTab === 'seller' && (
          <>
            <label htmlFor="seller-select" className="font-bold">Seleccionar Vendedor:</label>
            <CustomSelect
              options={sellers.map((s) => ({
                label: `${s.nombre} (Cod: ${s.codigo})`,
                value: s.codigo,
              }))}
              value={selectedSeller ? selectedSeller.codigo : ''}
              onChange={(val) => {
                const seller = sellers.find(s => s.codigo === val);
                setSelectedSeller(seller);
                setSelectedClient(''); // Reset client when vendor changes
              }}
              placeholder="-- Seleccione un vendedor --"
            />
          </>
        )}

        <label htmlFor="client-select" className="font-bold">Seleccionar Cliente:</label>

        <CustomSelect
          options={[
            // Conditionally add "TODOS" option if in seller tab and a seller is selected
            ...(activeTab === 'seller' && selectedSeller
              ? [{ label: '-- TODOS LOS CLIENTES DEL VENDEDOR --', value: 'ALL_CLIENTS' }]
              : []),
            ...filteredClients.map((client) => ({
              label: `${client.full_name} (${client.email || 'Sin Email'})`,
              value: client.id,
            }))
          ]}
          value={selectedClient}
          onChange={(val) => setSelectedClient(val)}
          placeholder={activeTab === 'seller' && !selectedSeller ? "-- Primero seleccione un vendedor --" : "-- Seleccione un cliente --"}
          disabled={activeTab === 'seller' && !selectedSeller}
        />
      </div>

      {selectedClient && (
        <div className="mt-4 p-6 border border-gray-200 rounded-lg bg-white">
          {/* Show warning banner if ALL_CLIENTS is selected */}
          {selectedClient === 'ALL_CLIENTS' && selectedSeller && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  {/* Heroicon name: solid/exclamation */}
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    Estás editando los permisos para <strong>TODOS</strong> los clientes de <strong>{selectedSeller.nombre}</strong>.
                    <br />
                    Las restricciones que selecciones abajo se aplicarán a todos sus clientes, sobrescribiendo sus configuraciones actuales.
                  </p>
                </div>
              </div>
            </div>
          )}

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
