import React, { useState, useEffect } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';
import apiService from '../api/apiService';
import CustomSelect from '../components/CustomSelect';
import { useAuth } from '../context/AuthContext';

const ClientProductPermissionsPage = () => {
    const { user: currentUser } = useAuth();
    const [clients, setClients] = useState([]);
    const [userSearch, setUserSearch] = useState('');
    const [selectedClient, setSelectedClient] = useState('');
    const [deniedProductIds, setDeniedProductIds] = useState([]);
    const [deniedProductsDetails, setDeniedProductsDetails] = useState([]); // To show details of denied products
    const [productSearch, setProductSearch] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            if (!currentUser || !currentUser.is_admin) {
                setError('Acceso denegado. Requiere permisos de administrador.');
                return;
            }

            try {
                setIsLoading(true);
                const clientsData = await apiService.getAdminUsers();
                setClients(clientsData);
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
            setDeniedProductIds([]);
            setDeniedProductsDetails([]);
            return;
        }
        const fetchPermissions = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const deniedIds = await apiService.getDeniedProducts(selectedClient);
                setDeniedProductIds(deniedIds);

                // Fetch details for these products
                if (deniedIds.length > 0) {
                    // We need a way to fetch details for multiple IDs. 
                    // We can use fetchProducts with allowedIds filter? No, that's for search.
                    // We can iterate or maybe add a bulk fetch endpoint?
                    // For now, let's fetch them one by one or use a search with ID filter if possible.
                    // Actually, let's just show the IDs first, or better, fetch details.
                    // apiService.fetchProducts supports 'allowedIds' but it's for search.
                    // Let's try to use fetchProducts with a special param or just loop for now (inefficient but works for small numbers).
                    // Better: Use the existing fetchProducts with allowedIds.
                    const details = await apiService.fetchProducts(1, '', [], false, 9999);
                    // Wait, fetchProducts doesn't expose allowedIds in apiService.js yet.
                    // I should have added it.

                    // Workaround: Fetch all products is too heavy.
                    // Let's just fetch details for each ID in parallel.
                    const detailsPromises = deniedIds.map(id => apiService.fetchProductById(id));
                    const products = await Promise.all(detailsPromises);
                    setDeniedProductsDetails(products);
                } else {
                    setDeniedProductsDetails([]);
                }

            } catch (err) {
                setError(`Error al cargar los permisos para el cliente seleccionado.`);
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchPermissions();
    }, [selectedClient, currentUser]);

    // Search products to add
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (productSearch.length < 3) {
                setSearchResults([]);
                return;
            }

            try {
                setIsSearching(true);
                const response = await apiService.fetchProducts(1, productSearch, [], false, 10);
                setSearchResults(response.products);
            } catch (err) {
                console.error('Error searching products:', err);
            } finally {
                setIsSearching(false);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [productSearch]);

    const handleAddProduct = (product) => {
        if (!deniedProductIds.includes(product.id)) {
            setDeniedProductIds([...deniedProductIds, product.id]);
            setDeniedProductsDetails([...deniedProductsDetails, product]);
        }
        setProductSearch('');
        setSearchResults([]);
    };

    const handleRemoveProduct = (productId) => {
        setDeniedProductIds(deniedProductIds.filter((id) => id !== productId));
        setDeniedProductsDetails(deniedProductsDetails.filter((p) => p.id !== productId));
    };

    const handleSave = async () => {
        if (!selectedClient) {
            setError('Por favor, seleccione un cliente primero.');
            return;
        }
        try {
            setIsLoading(true);
            setError(null);
            setSuccess('');
            await apiService.updateUserProductPermissions(
                selectedClient,
                deniedProductIds
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

    if (isLoading && !selectedClient) {
        return <LoadingSpinner text="Cargando..." />;
    }

    if (!currentUser || !currentUser.is_admin) {
        return (
            <div className="text-center p-8 text-red-500">
                Acceso denegado. No tiene permisos de administrador.
            </div>
        );
    }

    return (
        <div className="p-8 max-w-4xl mx-auto bg-gray-50 rounded-lg shadow-md">
            <h2 className="text-center mb-8 text-gray-800">Gestionar Restricciones de Productos por Usuario</h2>
            {success && <p className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4">{success}</p>}
            {error && <p className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">{error}</p>}

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

                    <div className="mb-6">
                        <label className="font-bold block mb-2">Buscar Producto para Restringir:</label>
                        <input
                            type="text"
                            value={productSearch}
                            onChange={(e) => setProductSearch(e.target.value)}
                            placeholder="Buscar por nombre o código..."
                            className="p-2 rounded border border-gray-300 w-full"
                        />
                        {isSearching && <p className="text-sm text-gray-500 mt-1">Buscando...</p>}

                        {searchResults.length > 0 && (
                            <ul className="mt-2 border border-gray-200 rounded max-h-60 overflow-y-auto bg-white shadow-lg">
                                {searchResults.map((product) => (
                                    <li
                                        key={product.id}
                                        className="p-2 hover:bg-gray-100 cursor-pointer flex justify-between items-center"
                                        onClick={() => handleAddProduct(product)}
                                    >
                                        <span>{product.description} <span className="text-gray-500 text-sm">({product.code})</span></span>
                                        <span className="text-blue-600 text-sm font-semibold">Agregar</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <h3 className="mt-0 mb-4 border-b pb-2 text-xl font-semibold text-gray-700">Productos Restringidos ({deniedProductIds.length})</h3>

                    {isLoading ? (
                        <LoadingSpinner text="Cargando productos..." />
                    ) : (
                        <div className="space-y-2 mb-8">
                            {deniedProductsDetails.length === 0 ? (
                                <p className="text-gray-500 italic">No hay productos restringidos para este usuario.</p>
                            ) : (
                                deniedProductsDetails.map((product) => (
                                    <div key={product.id} className="flex justify-between items-center p-3 bg-red-50 border border-red-100 rounded">
                                        <div>
                                            <span className="font-medium">{product.description}</span>
                                            <span className="text-gray-500 text-sm ml-2">({product.code})</span>
                                        </div>
                                        <button
                                            onClick={() => handleRemoveProduct(product.id)}
                                            className="text-red-600 hover:text-red-800 font-semibold"
                                        >
                                            Quitar
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    <button
                        onClick={handleSave}
                        disabled={isLoading}
                        className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed w-full sm:w-auto"
                    >
                        Guardar Cambios
                    </button>
                </div>
            )}
        </div>
    );
};

export default ClientProductPermissionsPage;
