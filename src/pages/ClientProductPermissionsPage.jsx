import React, { useState, useEffect } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';
import apiService from '../api/apiService';
import { useAuth } from '../context/AuthContext';

const ClientProductPermissionsPage = () => {
    const { user: currentUser } = useAuth();
    const [deniedProductIds, setDeniedProductIds] = useState([]);
    const [deniedProductsDetails, setDeniedProductsDetails] = useState([]); // To show details of denied products
    const [productSearch, setProductSearch] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState('');
    const [filterRestricted, setFilterRestricted] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        const fetchPermissions = async () => {
            if (!currentUser || !currentUser.is_admin) {
                setError('Acceso denegado. Requiere permisos de administrador.');
                return;
            }

            try {
                setIsLoading(true);
                setError(null);
                const deniedIds = await apiService.getGlobalDeniedProducts();
                setDeniedProductIds(deniedIds);

                // Fetch details for these products
                if (deniedIds.length > 0) {
                    const detailsPromises = deniedIds.map(id => apiService.fetchProductById(id));
                    const products = await Promise.all(detailsPromises);
                    // Filter out nulls in case a product was deleted
                    setDeniedProductsDetails(products.filter(p => p !== null));
                } else {
                    setDeniedProductsDetails([]);
                }

            } catch (err) {
                setError(`Error al cargar las restricciones globales.`);
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchPermissions();
    }, [currentUser]);

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

    // Reset page when filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [filterRestricted]);

    // Filter and paginate logic
    const filteredDeniedProducts = deniedProductsDetails.filter(product =>
        product.name.toLowerCase().includes(filterRestricted.toLowerCase()) ||
        product.code.toLowerCase().includes(filterRestricted.toLowerCase())
    );

    const totalPages = Math.ceil(filteredDeniedProducts.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentDeniedProducts = filteredDeniedProducts.slice(startIndex, startIndex + itemsPerPage);

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    const handleAddProduct = (product) => {
        if (!deniedProductIds.includes(product.id)) {
            setDeniedProductIds([...deniedProductIds, product.id]);
            setDeniedProductsDetails([...deniedProductsDetails, product]);
        }
        // No limpiamos la búsqueda para permitir selección múltiple
    };

    const handleRemoveProduct = (productId) => {
        setDeniedProductIds(deniedProductIds.filter((id) => id !== productId));
        setDeniedProductsDetails(deniedProductsDetails.filter((p) => p.id !== productId));
    };

    const handleSave = async () => {
        try {
            setIsLoading(true);
            setError(null);
            setSuccess('');
            await apiService.updateGlobalProductPermissions(
                deniedProductIds
            );
            setSuccess('Restricciones globales guardadas con éxito.');
        } catch (err) {
            setError('Error al guardar las restricciones.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading && deniedProductIds.length === 0) {
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
            <h2 className="text-center mb-8 text-gray-800">Gestionar Restricciones Globales de Productos</h2>
            <p className="text-center text-gray-600 mb-6">
                Los productos seleccionados aquí estarán ocultos para <strong>todos los usuarios</strong> (excepto administradores).
            </p>
            {success && <p className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4">{success}</p>}
            {error && <p className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">{error}</p>}

            <div className="mt-4 p-6 border border-gray-200 rounded-lg bg-white">

                <div className="mb-6">
                    <label className="font-bold block mb-2">Buscar Producto para Restringir:</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={productSearch}
                            onChange={(e) => setProductSearch(e.target.value)}
                            placeholder="Buscar por nombre o código..."
                            className="p-2 rounded border border-gray-300 w-full"
                        />
                        {productSearch && (
                            <button
                                onClick={() => {
                                    setProductSearch('');
                                    setSearchResults([]);
                                }}
                                className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                            >
                                Limpiar
                            </button>
                        )}
                    </div>
                    {isSearching && <p className="text-sm text-gray-500 mt-1">Buscando...</p>}

                    {searchResults.length > 0 && (
                        <ul className="mt-2 border border-gray-200 rounded max-h-60 overflow-y-auto bg-white shadow-lg">
                            {searchResults.map((product) => {
                                const isAdded = deniedProductIds.includes(product.id);
                                return (
                                    <li
                                        key={product.id}
                                        className={`p-2 hover:bg-gray-100 cursor-pointer flex justify-between items-center ${isAdded ? 'bg-blue-50' : ''}`}
                                        onClick={() => !isAdded && handleAddProduct(product)}
                                    >
                                        <span>{product.name} <span className="text-gray-500 text-sm">({product.code})</span></span>
                                        <span className={`text-sm font-semibold ${isAdded ? 'text-green-600' : 'text-blue-600'}`}>
                                            {isAdded ? 'Agregado' : 'Agregar'}
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

                <h3 className="mt-0 mb-4 border-b pb-2 text-xl font-semibold text-gray-700">Productos Restringidos Globalmente ({deniedProductIds.length})</h3>

                <div className="mb-4">
                    <input
                        type="text"
                        value={filterRestricted}
                        onChange={(e) => setFilterRestricted(e.target.value)}
                        placeholder="Filtrar lista de restringidos..."
                        className="p-2 rounded border border-gray-300 w-full text-sm"
                    />
                </div>

                {isLoading ? (
                    <LoadingSpinner text="Cargando productos..." />
                ) : (
                    <>
                        <div className="space-y-2 mb-4">
                            {currentDeniedProducts.length === 0 ? (
                                <p className="text-gray-500 italic">No hay productos que coincidan.</p>
                            ) : (
                                currentDeniedProducts.map((product) => (
                                    <div key={product.id} className="flex justify-between items-center p-3 bg-red-50 border border-red-100 rounded">
                                        <div>
                                            <span className="font-medium">{product.name}</span>
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

                        {totalPages > 1 && (
                            <div className="flex justify-between items-center mb-8">
                                <button
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50 hover:bg-gray-300 transition-colors"
                                >
                                    Anterior
                                </button>
                                <span className="text-sm text-gray-600">
                                    Página {currentPage} de {totalPages}
                                </span>
                                <button
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50 hover:bg-gray-300 transition-colors"
                                >
                                    Siguiente
                                </button>
                            </div>
                        )}
                    </>
                )}

                <button
                    onClick={handleSave}
                    disabled={isLoading}
                    className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed w-full sm:w-auto"
                >
                    Guardar Cambios
                </button>
            </div>
        </div>
    );
};

export default ClientProductPermissionsPage;
