import React, { useState, useEffect } from 'react';
import apiService from '../api/apiService';
import { Search, Check, X } from 'lucide-react';

const IndividualImageUpload = () => {
    const [files, setFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [analysisResults, setAnalysisResults] = useState(null);
    const [errors, setErrors] = useState(null);
    const [generalError, setGeneralError] = useState(null);

    // State for Step 2: Selection
    const [selectedProductsMap, setSelectedProductsMap] = useState({}); // { [imageIndex]: [productId1, productId2] }
    const [searchQueries, setSearchQueries] = useState({}); // { [imageIndex]: "search term" }
    const [searchResults, setSearchResults] = useState({}); // { [imageIndex]: [products] }
    const [searching, setSearching] = useState({}); // { [imageIndex]: boolean }
    const [assignmentStatus, setAssignmentStatus] = useState({}); // { [imageIndex]: 'pending' | 'saving' | 'success' | 'error' }

    const [userKeywords, setUserKeywords] = useState('');
    const [ignoreWords, setIgnoreWords] = useState('');
    const [replaceExisting, setReplaceExisting] = useState(false);
    const [brands, setBrands] = useState([]);
    const [selectedBrand, setSelectedBrand] = useState('');

    useEffect(() => {
        const loadBrands = async () => {
            try {
                const brandsData = await apiService.fetchProtheusBrands();
                setBrands(brandsData);
            } catch (error) {
                console.error("Error loading brands:", error);
            }
        };
        loadBrands();
    }, []);

    const handleFileChange = (e) => {
        setFiles(Array.from(e.target.files));
        setAnalysisResults(null);
        setErrors(null);
        setGeneralError(null);
        setSelectedProductsMap({});
        setSearchQueries({});
        setSearchResults({});
        setAssignmentStatus({});
    };

    const handleUpload = async () => {
        if (files.length === 0) {
            setGeneralError('Por favor selecciona al menos un archivo.');
            return;
        }

        setUploading(true);
        setAnalysisResults(null);
        setErrors(null);
        setGeneralError(null);

        const formData = new FormData();
        // Append text fields FIRST to ensure they are available before files are processed
        if (userKeywords) {
            formData.append('userKeywords', userKeywords);
        }
        if (ignoreWords) {
            formData.append('ignoreWords', ignoreWords);
        }
        if (selectedBrand) {
            formData.append('brand', selectedBrand);
        }
        formData.append('useAI', 'false');

        files.forEach((file) => {
            formData.append('images', file);
        });

        try {
            const data = await apiService.uploadImages(formData);
            setAnalysisResults(data.results);
            setErrors(data.errors);

            // Initialize selected products and populate search results with AI suggestions
            const initialSelections = {};
            const initialSearchResults = {};

            data.results.forEach((res, index) => {
                initialSelections[index] = [];
                // If AI found products, add them to search results immediately
                // If not, set to empty array so we know we tried
                initialSearchResults[index] = res.foundProducts || [];
            });

            setSelectedProductsMap(initialSelections);
            setSearchResults(initialSearchResults);

        } catch (err) {
            console.error('Upload error:', err);
            setGeneralError(err.message || 'Error al subir imágenes.');
        } finally {
            setUploading(false);
        }
    };

    const handleSearchProduct = async (index, query) => {
        if (!query) return;
        setSearching(prev => ({ ...prev, [index]: true }));
        try {
            const response = await apiService.fetchProducts(1, query, [], false, 250);
            setSearchResults(prev => ({ ...prev, [index]: response.products }));
        } catch (err) {
            console.error("Search error:", err);
        } finally {
            setSearching(prev => ({ ...prev, [index]: false }));
        }
    };

    const toggleProductSelection = (imageIndex, product) => {
        setSelectedProductsMap(prev => {
            const currentSelected = prev[imageIndex] || [];
            const isSelected = currentSelected.includes(product.id);

            let newSelected;
            if (isSelected) {
                newSelected = currentSelected.filter(id => id !== product.id);
            } else {
                newSelected = [...currentSelected, product.id];
            }
            return { ...prev, [imageIndex]: newSelected };
        });
    };

    const handleConfirmAssignment = async (index, imageUrl) => {
        const productIds = selectedProductsMap[index];
        if (!productIds || productIds.length === 0) return;

        setAssignmentStatus(prev => ({ ...prev, [index]: 'saving' }));

        try {
            await apiService.assignImageToProducts(imageUrl, productIds, replaceExisting);
            setAssignmentStatus(prev => ({ ...prev, [index]: 'success' }));
        } catch (err) {
            console.error("Assignment error:", err);
            setAssignmentStatus(prev => ({ ...prev, [index]: 'error' }));
        }
    };

    const getProductDetails = (index, productId) => {
        // Helper to find product details from search results
        const searchProds = searchResults[index] || [];
        return searchProds.find(p => p.id === productId);
    };

    return (
        <div className="bg-white p-6 rounded shadow">
            <h2 className="text-xl font-bold mb-4">Subida Manual / Individual</h2>
            <p className="text-gray-600 mb-6">Sube imágenes y búscalas manualmente para asignarlas.</p>

            {/* Step 1: Upload */}
            <div className="flex flex-col space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Palabras clave / Contexto (Opcional)</label>
                        <input
                            type="text"
                            value={userKeywords}
                            onChange={(e) => setUserKeywords(e.target.value)}
                            placeholder="Ej: Pincel serie 170, Rodillo epoxi..."
                            className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                        />
                        <p className="text-xs text-gray-500 mt-1">Palabras para buscar (además del nombre del archivo).</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Palabras a ignorar (Opcional)</label>
                        <input
                            type="text"
                            value={ignoreWords}
                            onChange={(e) => setIgnoreWords(e.target.value)}
                            placeholder="Ej: copia, nuevo, 2024..."
                            className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                        />
                        <p className="text-xs text-gray-500 mt-1">Palabras del nombre del archivo que NO se usarán en la búsqueda.</p>
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Filtrar por Marca (Opcional)</label>
                        <select
                            value={selectedBrand}
                            onChange={(e) => setSelectedBrand(e.target.value)}
                            className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                        >
                            <option value="">-- Todas las marcas --</option>
                            {brands.map((brand, index) => (
                                <option key={index} value={brand}>
                                    {brand}
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">Si seleccionas una marca, la búsqueda inicial se limitará a productos de esa marca.</p>
                    </div>
                </div>

                <div className="flex items-center space-x-4">
                    <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFileChange}
                        className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
                    />
                    <button
                        onClick={handleUpload}
                        disabled={uploading || files.length === 0}
                        className={`px-6 py-2 rounded-lg text-white font-bold transition-colors ${uploading || files.length === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                    >
                        {uploading ? 'Subiendo...' : 'Subir Imágenes'}
                    </button>
                </div>
                {files.length > 0 && <span className="text-sm text-gray-500">{files.length} archivo(s) seleccionado(s)</span>}
            </div>

            {generalError && (
                <div className="p-4 bg-red-100 text-red-700 rounded-lg border border-red-200">
                    <strong>Error:</strong> {generalError}
                </div>
            )}

            {/* Step 2: Review & Assign */}
            {analysisResults && analysisResults.length > 0 && (
                <div className="space-y-8 mt-8">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xl font-semibold text-gray-800">Revisar y Asignar</h3>
                        <label className="flex items-center space-x-2 text-sm text-gray-700 bg-yellow-50 px-3 py-1 rounded border border-yellow-200 cursor-pointer hover:bg-yellow-100 transition-colors">
                            <input
                                type="checkbox"
                                checked={replaceExisting}
                                onChange={(e) => setReplaceExisting(e.target.checked)}
                                className="rounded text-yellow-600 focus:ring-yellow-500 h-4 w-4"
                            />
                            <span className="font-medium">Reemplazar imágenes existentes</span>
                        </label>
                    </div>

                    {analysisResults.map((res, index) => (
                        <div key={index} className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                            <div className="p-4 flex flex-col md:flex-row gap-6">
                                {/* Image Preview */}
                                <div className="w-full md:w-1/3 flex-shrink-0">
                                    <img src={res.imageUrl} alt={res.file} className="w-full h-64 object-contain bg-white rounded-lg border" />
                                    <p className="text-sm text-gray-500 mt-2 text-center">{res.file}</p>
                                </div>

                                {/* Product Selection */}
                                <div className="flex-grow space-y-4">
                                    {/* Selected Products List */}
                                    <div>
                                        <h4 className="font-medium text-gray-700 mb-2">Productos Seleccionados:</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {(selectedProductsMap[index] || []).length === 0 && (
                                                <span className="text-sm text-gray-400 italic">Ningún producto seleccionado</span>
                                            )}
                                            {(selectedProductsMap[index] || []).map(prodId => {
                                                const prod = getProductDetails(index, prodId);
                                                return (
                                                    <div key={prodId} className="flex items-center bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                                                        <span className="font-medium mr-2">{prod ? prod.code : prodId}</span>
                                                        <button onClick={() => toggleProductSelection(index, { id: prodId })} className="hover:text-blue-600">
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Manual Search */}
                                    <div className="mt-4">
                                        <h4 className="font-medium text-gray-700 mb-2 text-sm">Buscar Productos:</h4>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="Buscar por código o descripción..."
                                                className="flex-grow text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"
                                                value={searchQueries[index] || ''}
                                                onChange={(e) => setSearchQueries(prev => ({ ...prev, [index]: e.target.value }))}
                                                onKeyDown={(e) => e.key === 'Enter' && handleSearchProduct(index, searchQueries[index])}
                                            />
                                            <button
                                                onClick={() => handleSearchProduct(index, searchQueries[index])}
                                                className="p-2 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                                            >
                                                <Search size={18} />
                                            </button>
                                        </div>

                                        {/* Search Results / AI Suggestions */}
                                        {searchResults[index] && searchResults[index].length > 0 ? (
                                            <div className="mt-2 max-h-60 overflow-y-auto border border-gray-300 rounded-md bg-white shadow-sm">
                                                <div className="bg-gray-50 px-3 py-2 border-b text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                    {searchQueries[index] ? 'Resultados de búsqueda' : 'Coincidencias encontradas'}
                                                </div>
                                                {searchResults[index].map(prod => {
                                                    const isSelected = (selectedProductsMap[index] || []).includes(prod.id);
                                                    return (
                                                        <div key={prod.id}
                                                            onClick={() => toggleProductSelection(index, prod)}
                                                            className={`p-3 border-b border-gray-100 cursor-pointer hover:bg-blue-50 flex items-start transition-colors ${isSelected ? 'bg-blue-50' : ''
                                                                }`}
                                                        >
                                                            <div className="flex items-center h-5">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isSelected}
                                                                    readOnly
                                                                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                                />
                                                            </div>
                                                            <div className="ml-3 text-sm">
                                                                <span className="font-bold text-gray-900">{prod.code}</span>
                                                                <span className="text-gray-500 mx-1">-</span>
                                                                <span className="text-gray-700">{prod.name || prod.description}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            searchResults[index] && !searchQueries[index] && (
                                                <div className="mt-2 p-3 bg-yellow-50 text-yellow-800 text-sm rounded border border-yellow-200 flex items-center">
                                                    <span className="mr-2">⚠️</span>
                                                    <span>No se encontraron coincidencias automáticas. Intenta buscar manualmente.</span>
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Action Footer */}
                            <div className="bg-gray-100 p-3 flex justify-end items-center border-t border-gray-200">
                                {assignmentStatus[index] === 'success' ? (
                                    <span className="text-green-600 font-bold flex items-center">
                                        <Check className="mr-2" /> Guardado Exitosamente
                                    </span>
                                ) : (
                                    <button
                                        onClick={() => handleConfirmAssignment(index, res.imageUrl)}
                                        disabled={assignmentStatus[index] === 'saving' || (selectedProductsMap[index] || []).length === 0}
                                        className={`px-4 py-2 rounded text-sm font-bold text-white ${assignmentStatus[index] === 'saving' || (selectedProductsMap[index] || []).length === 0
                                            ? 'bg-gray-400'
                                            : 'bg-green-600 hover:bg-green-700'
                                            }`}
                                    >
                                        {assignmentStatus[index] === 'saving' ? 'Guardando...' : 'Confirmar Asignación'}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {errors && errors.length > 0 && (
                <div className="space-y-2 mt-8">
                    <h3 className="font-semibold text-red-700">Errores ({errors.length})</h3>
                    <div className="grid grid-cols-1 gap-2">
                        {errors.map((err, index) => (
                            <div key={index} className="p-3 bg-red-50 text-red-800 rounded border border-red-200">
                                <p className="font-bold">{err.file}</p>
                                <p className="text-sm">{err.error}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default IndividualImageUpload;
