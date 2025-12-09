import React, { useState } from 'react';
import apiService from '../api/apiService';
import { Search, Check, X, Plus, Trash2 } from 'lucide-react';

const ImageUpload = () => {
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
            setGeneralError('Please select at least one file.');
            return;
        }

        setUploading(true);
        setAnalysisResults(null);
        setErrors(null);
        setGeneralError(null);

        const formData = new FormData();
        files.forEach((file) => {
            formData.append('images', file);
        });

        try {
            const data = await apiService.uploadImages(formData);
            setAnalysisResults(data.results);
            setErrors(data.errors);

            // Initialize selected products with AI suggestions
            const initialSelections = {};
            data.results.forEach((res, index) => {
                if (res.foundProducts && res.foundProducts.length > 0) {
                    // Select the first match by default
                    initialSelections[index] = [res.foundProducts[0].id];
                } else {
                    initialSelections[index] = [];
                }
            });
            setSelectedProductsMap(initialSelections);

        } catch (err) {
            console.error('Upload error:', err);
            setGeneralError(err.message || 'Failed to upload images.');
        } finally {
            setUploading(false);
        }
    };

    const handleSearchProduct = async (index, query) => {
        if (!query) return;
        setSearching(prev => ({ ...prev, [index]: true }));
        try {
            const response = await apiService.fetchProducts(1, query);
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
            await apiService.assignImageToProducts(imageUrl, productIds);
            setAssignmentStatus(prev => ({ ...prev, [index]: 'success' }));
        } catch (err) {
            console.error("Assignment error:", err);
            setAssignmentStatus(prev => ({ ...prev, [index]: 'error' }));
        }
    };

    const getProductDetails = (index, productId) => {
        // Helper to find product details from either AI results or search results
        const aiProducts = analysisResults[index]?.foundProducts || [];
        const searchProds = searchResults[index] || [];
        const allProds = [...aiProducts, ...searchProds];
        return allProds.find(p => p.id === productId);
    };

    return (
        <div className="p-6 max-w-4xl mx-auto bg-white rounded-xl shadow-md space-y-6">
            <div className="border-b pb-4">
                <h2 className="text-2xl font-bold text-gray-900">AI Product Image Upload</h2>
                <p className="text-gray-600 mt-1">Upload images, review AI suggestions, and assign them to products.</p>
            </div>

            {/* Step 1: Upload */}
            <div className="flex flex-col space-y-4">
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
                        {uploading ? 'Analyzing...' : 'Upload & Analyze'}
                    </button>
                </div>
                {files.length > 0 && <span className="text-sm text-gray-500">{files.length} file(s) selected</span>}
            </div>

            {generalError && (
                <div className="p-4 bg-red-100 text-red-700 rounded-lg border border-red-200">
                    <strong>Error:</strong> {generalError}
                </div>
            )}

            {/* Step 2: Review & Assign */}
            {analysisResults && analysisResults.length > 0 && (
                <div className="space-y-8 mt-8">
                    <h3 className="text-xl font-semibold text-gray-800">Review & Assign Images</h3>

                    {analysisResults.map((res, index) => (
                        <div key={index} className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                            <div className="p-4 flex flex-col md:flex-row gap-6">
                                {/* Image Preview */}
                                <div className="w-full md:w-1/3 flex-shrink-0">
                                    <img src={res.imageUrl} alt={res.file} className="w-full h-64 object-contain bg-white rounded-lg border" />
                                    <p className="text-sm text-gray-500 mt-2 text-center">{res.file}</p>
                                    <div className="mt-2 text-center">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${res.aiSuggestion !== 'UNKNOWN' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                            }`}>
                                            AI ID: {res.aiSuggestion}
                                        </span>
                                    </div>
                                </div>

                                {/* Product Selection */}
                                <div className="flex-grow space-y-4">
                                    {/* Selected Products List */}
                                    <div>
                                        <h4 className="font-medium text-gray-700 mb-2">Selected Products:</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {(selectedProductsMap[index] || []).length === 0 && (
                                                <span className="text-sm text-gray-400 italic">No products selected</span>
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

                                    {/* AI Suggestions */}
                                    {res.foundProducts && res.foundProducts.length > 0 && (
                                        <div>
                                            <h4 className="font-medium text-gray-700 mb-2 text-sm">Suggested Matches:</h4>
                                            <div className="space-y-2">
                                                {res.foundProducts.map(prod => (
                                                    <div key={prod.id}
                                                        onClick={() => toggleProductSelection(index, prod)}
                                                        className={`p-2 rounded border cursor-pointer flex justify-between items-center transition-colors ${(selectedProductsMap[index] || []).includes(prod.id)
                                                                ? 'bg-blue-50 border-blue-300'
                                                                : 'bg-white border-gray-200 hover:bg-gray-50'
                                                            }`}
                                                    >
                                                        <div>
                                                            <p className="font-bold text-sm">{prod.code}</p>
                                                            <p className="text-xs text-gray-600 truncate">{prod.description}</p>
                                                        </div>
                                                        {(selectedProductsMap[index] || []).includes(prod.id) && <Check size={16} className="text-blue-600" />}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Manual Search */}
                                    <div className="mt-4">
                                        <h4 className="font-medium text-gray-700 mb-2 text-sm">Search Other Products:</h4>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="Search by code or description..."
                                                className="flex-grow text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
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

                                        {/* Search Results */}
                                        {searchResults[index] && searchResults[index].length > 0 && (
                                            <div className="mt-2 max-h-40 overflow-y-auto border rounded bg-white">
                                                {searchResults[index].map(prod => (
                                                    <div key={prod.id}
                                                        onClick={() => toggleProductSelection(index, prod)}
                                                        className={`p-2 border-b cursor-pointer hover:bg-gray-50 flex justify-between items-center ${(selectedProductsMap[index] || []).includes(prod.id) ? 'bg-blue-50' : ''
                                                            }`}
                                                    >
                                                        <div className="text-xs">
                                                            <span className="font-bold">{prod.code}</span> - {prod.description}
                                                        </div>
                                                        {(selectedProductsMap[index] || []).includes(prod.id) ? <Check size={14} className="text-blue-600" /> : <Plus size={14} className="text-gray-400" />}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Action Footer */}
                            <div className="bg-gray-100 p-3 flex justify-end items-center border-t border-gray-200">
                                {assignmentStatus[index] === 'success' ? (
                                    <span className="text-green-600 font-bold flex items-center">
                                        <Check className="mr-2" /> Saved Successfully
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
                                        {assignmentStatus[index] === 'saving' ? 'Saving...' : 'Confirm Assignment'}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {errors && errors.length > 0 && (
                <div className="space-y-2 mt-8">
                    <h3 className="font-semibold text-red-700">Failed Analysis ({errors.length})</h3>
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

export default ImageUpload;
