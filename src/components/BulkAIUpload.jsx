import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import apiService from '../api/apiService';
import LoadingSpinner from './LoadingSpinner';
import { Upload, Check, AlertCircle, FileImage } from 'lucide-react';

const BulkAIUpload = () => {
    const [uploadFiles, setUploadFiles] = useState([]);
    const [uploadContext, setUploadContext] = useState('');
    const [uploadIgnore, setUploadIgnore] = useState('');
    const [uploadBrand, setUploadBrand] = useState('');
    const [uploadResults, setUploadResults] = useState([]);
    const [selectedProductsMap, setSelectedProductsMap] = useState({});
    const [uploading, setUploading] = useState(false);
    const [replaceExisting, setReplaceExisting] = useState(false);

    const handleFileChange = (e) => {
        if (e.target.files) {
            setUploadFiles(Array.from(e.target.files));
        }
    };

    const handleBulkUpload = async () => {
        if (uploadFiles.length === 0) {
            toast.error('Selecciona al menos una imagen');
            return;
        }

        setUploading(true);
        const formData = new FormData();
        uploadFiles.forEach(file => {
            formData.append('images', file);
        });
        formData.append('userKeywords', uploadContext);
        formData.append('ignoreWords', uploadIgnore);
        formData.append('brand', uploadBrand);
        formData.append('useAI', 'true');

        try {
            const res = await apiService.uploadImages(formData);
            setUploadResults(res.results);
            toast.success('Análisis completado');
            setUploadFiles([]);
        } catch (error) {
            console.error(error);
            toast.error('Error en la subida masiva');
        } finally {
            setUploading(false);
        }
    };

    const toggleProductSelection = (resultIndex, productId) => {
        setSelectedProductsMap(prev => {
            const currentSelected = prev[resultIndex] || [];
            const isSelected = currentSelected.includes(productId);

            if (isSelected) {
                return { ...prev, [resultIndex]: currentSelected.filter(id => id !== productId) };
            } else {
                return { ...prev, [resultIndex]: [...currentSelected, productId] };
            }
        });
    };

    const handleAssignImage = async (imageUrl, productIds) => {
        const idsToAssign = Array.isArray(productIds) ? productIds : [productIds];

        try {
            await apiService.assignImageToProducts(imageUrl, idsToAssign, replaceExisting);
            toast.success('Imagen asignada correctamente');
            setUploadResults(prev => prev.map(item => {
                if (item.imageUrl === imageUrl) {
                    return { ...item, assigned: true, assignedTo: idsToAssign };
                }
                return item;
            }));
        } catch (error) {
            toast.error('Error al asignar imagen');
        }
    };

    return (
        <div className="bg-white p-6 rounded shadow">
            <h2 className="text-xl font-bold mb-4">Subida de Imágenes de Productos (IA)</h2>
            <p className="text-gray-600 mb-6">Sube imágenes y asígnalas a los productos correspondientes con ayuda de IA.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <input
                    type="text"
                    placeholder="Contexto (ej: 'Línea AAT', 'Pulimentos')"
                    value={uploadContext}
                    onChange={(e) => setUploadContext(e.target.value)}
                    className="border p-2 rounded w-full"
                />
                <input
                    type="text"
                    placeholder="Marca (Opcional, ej: '3D', 'Meguiars')"
                    value={uploadBrand}
                    onChange={(e) => setUploadBrand(e.target.value)}
                    className="border p-2 rounded w-full"
                />
                <input
                    type="text"
                    placeholder="Ignorar palabras (ej: 'kit', 'combo')"
                    value={uploadIgnore}
                    onChange={(e) => setUploadIgnore(e.target.value)}
                    className="border p-2 rounded w-full"
                />
            </div>

            <div className="flex items-center gap-4 mb-8">
                <label className="cursor-pointer bg-blue-50 text-blue-600 px-4 py-2 rounded font-bold hover:bg-blue-100 transition flex items-center gap-2">
                    <FileImage size={20} /> Elegir archivos
                    <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileChange} />
                </label>
                <span className="text-gray-500">{uploadFiles.length > 0 ? `${uploadFiles.length} archivos seleccionados` : 'Ningún archivo seleccionado'}</span>

                {uploadFiles.length > 0 && (
                    <button
                        onClick={handleBulkUpload}
                        disabled={uploading}
                        className="ml-auto bg-espint-blue text-white px-6 py-2 rounded font-bold hover:bg-blue-800 transition disabled:opacity-50 flex items-center gap-2"
                    >
                        {uploading ? <LoadingSpinner size="sm" /> : <Upload size={20} />}
                        Subir Imágenes
                    </button>
                )}
            </div>

            {/* Results Area */}
            {uploadResults.length > 0 && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center border-b pb-2">
                        <h3 className="font-bold text-lg">Resultados del Análisis</h3>
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
                    {uploadResults.map((result, idx) => (
                        <div key={idx} className={`border rounded p-4 flex flex-col md:flex-row gap-4 ${result.assigned ? 'bg-green-50 border-green-200' : 'bg-gray-50'}`}>
                            <div className="w-32 h-32 shrink-0 bg-white rounded border flex items-center justify-center overflow-hidden">
                                <img src={result.imageUrl} alt={result.file} className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                            </div>

                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="font-bold text-md">{result.file}</h4>
                                        <div className="text-xs text-gray-500 mt-1 space-y-1">
                                            {result.aiSuggestion?.code && <p>Código IA: <span className="font-mono bg-gray-200 px-1 rounded">{result.aiSuggestion.code}</span></p>}
                                            {result.aiSuggestion?.brand && <p>Marca IA: <span className="font-semibold">{result.aiSuggestion.brand}</span></p>}
                                            {result.aiSuggestion?.keywords?.length > 0 && <p>Keywords IA: {result.aiSuggestion.keywords.join(', ')}</p>}
                                        </div>

                                        {/* AI Best Match Highlight */}
                                        {result.aiSelection?.bestMatchId && (
                                            <div className="mt-3 bg-blue-50 border border-blue-200 p-2 rounded text-sm">
                                                <p className="font-bold text-blue-800 flex items-center gap-1">
                                                    <span className="text-lg">🤖</span> Recomendación IA
                                                </p>
                                                <p className="text-gray-700 text-xs italic mb-1">"{result.aiSelection.reasoning}"</p>
                                                {(() => {
                                                    const bestMatch = result.foundProducts.find(p => p.id === result.aiSelection.bestMatchId);
                                                    if (bestMatch) {
                                                        return (
                                                            <div className="flex justify-between items-center bg-white p-2 rounded border border-blue-300 shadow-sm mt-1">
                                                                <div>
                                                                    <p className="font-bold">{bestMatch.description}</p>
                                                                    <p className="text-xs text-gray-500">{bestMatch.code}</p>
                                                                </div>
                                                                {!result.assigned && (
                                                                    <button
                                                                        onClick={() => handleAssignImage(result.imageUrl, [bestMatch.id])}
                                                                        className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 shadow-sm"
                                                                    >
                                                                        Aceptar
                                                                    </button>
                                                                )}
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                })()}
                                            </div>
                                        )}
                                    </div>
                                    {result.assigned && (
                                        <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                                            <Check size={16} /> Asignado
                                        </span>
                                    )}
                                </div>

                                <div className="mt-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <p className="font-bold text-sm text-gray-700">Productos Sugeridos:</p>
                                        {!result.assigned && (selectedProductsMap[idx] || []).length > 0 && (
                                            <button
                                                onClick={() => handleAssignImage(result.imageUrl, selectedProductsMap[idx])}
                                                className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700 shadow-sm flex items-center gap-1"
                                            >
                                                <Check size={14} /> Confirmar Selección ({selectedProductsMap[idx].length})
                                            </button>
                                        )}
                                    </div>

                                    {result.foundProducts && result.foundProducts.length > 0 ? (
                                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                            {result.foundProducts.map(prod => {
                                                const isBestMatch = result.aiSelection?.bestMatchId === prod.id;
                                                const isSelected = (selectedProductsMap[idx] || []).includes(prod.id);

                                                return (
                                                    <div
                                                        key={prod.id}
                                                        onClick={() => !result.assigned && toggleProductSelection(idx, prod.id)}
                                                        className={`flex justify-between items-center p-2 rounded border transition cursor-pointer ${isSelected
                                                            ? 'bg-blue-100 border-blue-400 ring-1 ring-blue-400'
                                                            : isBestMatch
                                                                ? 'bg-blue-50 border-blue-300'
                                                                : 'bg-white hover:bg-gray-50'
                                                            } ${result.assigned ? 'opacity-60 cursor-default' : ''}`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            {!result.assigned && (
                                                                <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-400 bg-white'}`}>
                                                                    {isSelected && <Check size={10} className="text-white" />}
                                                                </div>
                                                            )}
                                                            <div>
                                                                <p className="font-bold text-sm">{prod.description}</p>
                                                                <p className="text-xs text-gray-500">Código: {prod.code} | Stock: {prod.stock}</p>
                                                            </div>
                                                        </div>

                                                        {result.assigned && result.assignedTo && result.assignedTo.includes(prod.id) && (
                                                            <span className="text-green-600 text-xs font-bold">Asignado</span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 text-orange-600 bg-orange-50 p-2 rounded text-sm">
                                            <AlertCircle size={16} /> No se encontraron coincidencias automáticas.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default BulkAIUpload;
