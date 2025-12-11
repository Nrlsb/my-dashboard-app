import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import apiService from '../api/apiService';
import LoadingSpinner from '../components/LoadingSpinner';
import CustomSelect from '../components/CustomSelect';
import { Trash2, Plus, Edit, Search, X, Upload, Check, AlertCircle, FileImage } from 'lucide-react';

const ManageContentPage = () => {
    const [activeTab, setActiveTab] = useState('accessories');
    const [loading, setLoading] = useState(false);
    const [accessories, setAccessories] = useState([]);
    const [groups, setGroups] = useState([]);

    // Modals
    const [showAddAccessoryModal, setShowAddAccessoryModal] = useState(false);
    const [showAddGroupModal, setShowAddGroupModal] = useState(false);
    const [showEditCollectionModal, setShowEditCollectionModal] = useState(false);

    // Search state
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);

    // Group Form state
    const [groupType, setGroupType] = useState('static_group');
    const [groupName, setGroupName] = useState('');
    const [groupImage, setGroupImage] = useState('');
    const [selectedReferenceId, setSelectedReferenceId] = useState('');
    const [availableGroups, setAvailableGroups] = useState([]);

    // Collection Edit state
    const [currentCollection, setCurrentCollection] = useState(null);
    const [collectionItems, setCollectionItems] = useState([]);

    // AI Upload state
    const [uploadFiles, setUploadFiles] = useState([]);
    const [uploadContext, setUploadContext] = useState('');
    const [uploadIgnore, setUploadIgnore] = useState('');
    const [uploadResults, setUploadResults] = useState([]);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'accessories') {
                const data = await apiService.getAccessories();
                setAccessories(data);
            } else {
                const data = await apiService.getProductGroupsDetails(); // This now returns DB config + fallback
                // Actually, for admin management, we might want the raw DB config to know what is editable.
                // But getProductGroupsDetails merges everything.
                // Let's use getCarouselGroups for raw config if possible, but getProductGroupsDetails is what the user sees.
                // Wait, getProductGroupsDetails returns formatted objects.
                // If I want to manage them, I need the IDs from the DB.
                // My updated getProductGroupsDetails returns `id` if it comes from DB.
                // If it doesn't have `id`, it's from the fallback list (not in DB yet).
                // I should probably fetch getCarouselGroups directly to manage the DB state.
                const dbGroups = await apiService.getCarouselGroups();
                setGroups(dbGroups);
            }
        } catch (error) {
            console.error(error);
            toast.error('Error al cargar datos');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchTerm.trim()) return;
        setSearching(true);
        try {
            const res = await apiService.fetchProducts(1, searchTerm);
            setSearchResults(res.products);
        } catch (error) {
            toast.error('Error al buscar productos');
        } finally {
            setSearching(false);
        }
    };

    const handleAddAccessory = async (productId) => {
        try {
            await apiService.addAccessory(productId);
            toast.success('Accesorio agregado');
            fetchData();
            setShowAddAccessoryModal(false);
        } catch (error) {
            toast.error('Error al agregar accesorio');
        }
    };

    const handleRemoveAccessory = async (productId) => {
        if (!window.confirm('¿Estás seguro de eliminar este accesorio?')) return;
        try {
            await apiService.removeAccessory(productId);
            toast.success('Accesorio eliminado');
            fetchData();
        } catch (error) {
            toast.error('Error al eliminar accesorio');
        }
    };

    const handleOpenAddGroupModal = async () => {
        setShowAddGroupModal(true);
        try {
            const groups = await apiService.getAdminProductGroups();
            setAvailableGroups(groups);
        } catch (error) {
            toast.error('Error al cargar grupos disponibles');
        }
    };

    const handleCreateGroup = async (e) => {
        e.preventDefault();
        try {
            await apiService.createCarouselGroup({
                name: groupName,
                image_url: groupImage,
                type: groupType,
                reference_id: groupType === 'static_group' ? selectedReferenceId : null,
                display_order: groups.length + 1
            });
            toast.success('Grupo creado');
            setShowAddGroupModal(false);
            fetchData();
            resetGroupForm();
        } catch (error) {
            toast.error('Error al crear grupo');
        }
    };

    const resetGroupForm = () => {
        setGroupName('');
        setGroupImage('');
        setGroupType('static_group');
        setSelectedReferenceId('');
    };

    const handleDeleteGroup = async (id) => {
        if (!window.confirm('¿Estás seguro de eliminar este grupo?')) return;
        try {
            await apiService.deleteCarouselGroup(id);
            toast.success('Grupo eliminado');
            fetchData();
        } catch (error) {
            toast.error('Error al eliminar grupo');
        }
    };

    const handleEditCollection = async (group) => {
        setCurrentCollection(group);
        setShowEditCollectionModal(true);
        // Fetch items
        try {
            const items = await apiService.getCustomCollectionProducts(group.id);
            setCollectionItems(items);
        } catch (error) {
            toast.error('Error al cargar items de la colección');
        }
    };

    const handleAddCollectionItem = async (productId) => {
        try {
            await apiService.addCustomGroupItem(currentCollection.id, productId);
            toast.success('Producto agregado a la colección');
            // Refresh items
            const items = await apiService.getCustomCollectionProducts(currentCollection.id);
            setCollectionItems(items);
        } catch (error) {
            toast.error('Error al agregar producto');
        }
    };

    const handleRemoveCollectionItem = async (productId) => {
        try {
            await apiService.removeCustomGroupItem(currentCollection.id, productId);
            toast.success('Producto eliminado de la colección');
            const items = await apiService.getCustomCollectionProducts(currentCollection.id);
            setCollectionItems(items);
        } catch (error) {
            toast.error('Error al eliminar producto');
        }
    };

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
        formData.append('useAI', 'true');

        try {
            const res = await apiService.uploadImages(formData);
            setUploadResults(res.results);
            toast.success('Análisis completado');
            setUploadFiles([]); // Clear files after upload
        } catch (error) {
            console.error(error);
            toast.error('Error en la subida masiva');
        } finally {
            setUploading(false);
        }
    };

    const handleAssignImage = async (imageUrl, productId) => {
        try {
            await apiService.assignImageToProducts(imageUrl, [productId]);
            toast.success('Imagen asignada correctamente');
            // Update local state to show success
            setUploadResults(prev => prev.map(item => {
                if (item.imageUrl === imageUrl) {
                    return { ...item, assigned: true, assignedTo: productId };
                }
                return item;
            }));
        } catch (error) {
            toast.error('Error al asignar imagen');
        }
    };

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-3xl font-bold text-espint-blue mb-6">Gestionar Contenido</h1>

            <div className="flex space-x-4 mb-6 border-b border-gray-200 overflow-x-auto whitespace-nowrap pb-1">
                <button
                    className={`py-2 px-4 font-semibold ${activeTab === 'accessories' ? 'text-espint-blue border-b-2 border-espint-blue' : 'text-gray-500'}`}
                    onClick={() => setActiveTab('accessories')}
                >
                    <span className="md:hidden">Accesorios</span>
                    <span className="hidden md:inline">Accesorios (Carousel)</span>
                </button>
                <button
                    className={`py-2 px-4 font-semibold ${activeTab === 'groups' ? 'text-espint-blue border-b-2 border-espint-blue' : 'text-gray-500'}`}
                    onClick={() => setActiveTab('groups')}
                >
                    <span className="md:hidden">Grupos</span>
                    <span className="hidden md:inline">Grupos de Productos (Carousel)</span>
                </button>
                <button
                    className={`py-2 px-4 font-semibold ${activeTab === 'ai_upload' ? 'text-espint-blue border-b-2 border-espint-blue' : 'text-gray-500'}`}
                    onClick={() => setActiveTab('ai_upload')}
                >
                    <span className="md:hidden">IA Upload</span>
                    <span className="hidden md:inline">Subida Masiva IA</span>
                </button>
            </div>

            {loading ? (
                <LoadingSpinner />
            ) : (
                <div>
                    {activeTab === 'accessories' && (
                        <div>
                            <button
                                onClick={() => { setShowAddAccessoryModal(true); setSearchResults([]); setSearchTerm(''); }}
                                className="bg-espint-green text-white px-4 py-2 rounded mb-4 flex items-center gap-2 hover:bg-green-600 transition"
                            >
                                <Plus size={20} /> Agregar Accesorio
                            </button>

                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {accessories.map(acc => (
                                    <div key={acc.id} className="relative aspect-square bg-gray-800 rounded shadow overflow-hidden group">
                                        <img
                                            src={acc.image_url}
                                            alt={acc.name}
                                            className="w-full h-full object-cover opacity-70 group-hover:opacity-50 transition-opacity"
                                        />
                                        <div className="absolute inset-0 flex flex-col items-center justify-center p-2 pointer-events-none">
                                            <h3 className="font-bold text-white text-center text-sm md:text-base leading-tight drop-shadow-md">{acc.name}</h3>
                                            <p className="text-gray-200 text-xs mt-1 drop-shadow-md">{acc.code}</p>
                                        </div>
                                        <button
                                            onClick={() => handleRemoveAccessory(acc.id)}
                                            className="absolute bottom-2 right-2 bg-red-500 text-white p-1.5 rounded opacity-100 md:opacity-0 group-hover:opacity-100 transition shadow-lg z-10"
                                            title="Eliminar"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                                {accessories.length === 0 && <p className="text-gray-500">No hay accesorios configurados.</p>}
                            </div>
                        </div>
                    )}

                    {activeTab === 'groups' && (
                        <div>
                            <button
                                onClick={handleOpenAddGroupModal}
                                className="bg-espint-green text-white px-4 py-2 rounded mb-4 flex items-center gap-2 hover:bg-green-600 transition"
                            >
                                <Plus size={20} /> Agregar Grupo
                            </button>

                            <div className="space-y-4">
                                {groups.map(group => (
                                    <div key={group.id} className="bg-white p-4 rounded shadow flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="flex items-center gap-4">
                                            {group.image_url && <img src={group.image_url} alt={group.name} className="w-16 h-16 object-cover rounded shrink-0" />}
                                            <div>
                                                <h3 className="font-bold text-lg leading-tight">{group.name || `Grupo ${group.reference_id}`}</h3>
                                                <span className={`text-xs px-2 py-1 rounded inline-block mt-1 ${group.type === 'static_group' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                                                    {group.type === 'static_group' ? 'Grupo Existente' : 'Colección Personalizada'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 self-end md:self-auto">
                                            {group.type === 'custom_collection' && (
                                                <button
                                                    onClick={() => handleEditCollection(group)}
                                                    className="text-blue-500 hover:text-blue-700 p-2"
                                                    title="Editar Productos"
                                                >
                                                    <Edit size={20} />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleDeleteGroup(group.id)}
                                                className="text-red-500 hover:text-red-700 p-2"
                                                title="Eliminar Grupo"
                                            >
                                                <Trash2 size={20} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {groups.length === 0 && <p className="text-gray-500">No hay grupos configurados.</p>}
                            </div>
                        </div>
                    )}

                    {activeTab === 'ai_upload' && (
                        <div className="bg-white p-6 rounded shadow">
                            <h2 className="text-xl font-bold mb-4">Subida de Imágenes de Productos</h2>
                            <p className="text-gray-600 mb-6">Sube imágenes y asígnalas a los productos correspondientes con ayuda de IA.</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                <div>
                                    <label className="block text-sm font-bold mb-1">Palabras clave / Contexto (Opcional)</label>
                                    <input
                                        type="text"
                                        className="w-full border p-2 rounded"
                                        placeholder="Ej: Pincel serie 170, Rodillo epoxi..."
                                        value={uploadContext}
                                        onChange={(e) => setUploadContext(e.target.value)}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Palabras para buscar (además del nombre del archivo).</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-1">Palabras a ignorar (Opcional)</label>
                                    <input
                                        type="text"
                                        className="w-full border p-2 rounded"
                                        placeholder="Ej: copia, nuevo, 2024..."
                                        value={uploadIgnore}
                                        onChange={(e) => setUploadIgnore(e.target.value)}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Palabras del nombre del archivo que NO se usarán en la búsqueda.</p>
                                </div>
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
                                    <h3 className="font-bold text-lg border-b pb-2">Resultados del Análisis</h3>
                                    {uploadResults.map((result, idx) => (
                                        <div key={idx} className={`border rounded p-4 flex flex-col md:flex-row gap-4 ${result.assigned ? 'bg-green-50 border-green-200' : 'bg-gray-50'}`}>
                                            <div className="w-32 h-32 shrink-0 bg-white rounded border flex items-center justify-center overflow-hidden">
                                                <img src={result.imageUrl} alt={result.file} className="max-w-full max-h-full object-contain" />
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
                                                                                        onClick={() => handleAssignImage(result.imageUrl, bestMatch.id)}
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
                                                    <p className="font-bold text-sm mb-2 text-gray-700">Productos Sugeridos:</p>
                                                    {result.foundProducts && result.foundProducts.length > 0 ? (
                                                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                                            {result.foundProducts.map(prod => {
                                                                const isBestMatch = result.aiSelection?.bestMatchId === prod.id;
                                                                return (
                                                                    <div key={prod.id} className={`flex justify-between items-center p-2 rounded border transition ${isBestMatch ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-300' : 'bg-white hover:border-blue-300'}`}>
                                                                        <div>
                                                                            <p className="font-bold text-sm">{prod.description}</p>
                                                                            <p className="text-xs text-gray-500">Código: {prod.code} | Stock: {prod.stock}</p>
                                                                        </div>
                                                                        {!result.assigned && (
                                                                            <button
                                                                                onClick={() => handleAssignImage(result.imageUrl, prod.id)}
                                                                                className="bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600 transition"
                                                                            >
                                                                                Asignar
                                                                            </button>
                                                                        )}
                                                                        {result.assigned && result.assignedTo === prod.id && (
                                                                            <span className="text-green-600 text-xs font-bold">Seleccionado</span>
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
                    )}
                </div>
            )}

            {/* Add Accessory Modal */}
            {showAddAccessoryModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg w-full max-w-2xl max-h-[80vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Agregar Producto</h2>
                            <button onClick={() => setShowAddAccessoryModal(false)}><X size={24} /></button>
                        </div>
                        <form onSubmit={handleSearch} className="flex gap-2 mb-4">
                            <input
                                type="text"
                                placeholder="Buscar por nombre o código..."
                                className="flex-1 border p-2 rounded"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">
                                <Search size={20} />
                            </button>
                        </form>

                        {searching && <LoadingSpinner />}

                        <div className="space-y-2">
                            {searchResults.map(prod => (
                                <div key={prod.id} className="flex justify-between items-center border p-2 rounded hover:bg-gray-50">
                                    <div>
                                        <p className="font-bold">{prod.name}</p>
                                        <p className="text-sm text-gray-500">{prod.code}</p>
                                    </div>
                                    <button
                                        onClick={() => handleAddAccessory(prod.id)}
                                        className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
                                    >
                                        Agregar
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Add Group Modal */}
            {showAddGroupModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg w-full max-w-lg">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Agregar Grupo al Carousel</h2>
                            <button onClick={() => setShowAddGroupModal(false)}><X size={24} /></button>
                        </div>
                        <form onSubmit={handleCreateGroup} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold mb-1">Tipo</label>
                                <CustomSelect
                                    options={[
                                        { label: 'Grupo Existente', value: 'static_group' },
                                        { label: 'Colección Personalizada', value: 'custom_collection' }
                                    ]}
                                    value={groupType}
                                    onChange={(val) => setGroupType(val)}
                                    placeholder="Seleccionar Tipo"
                                />
                            </div>

                            {groupType === 'static_group' ? (
                                <div>
                                    <label className="block text-sm font-bold mb-1">Seleccionar Grupo</label>
                                    <CustomSelect
                                        options={availableGroups.map(g => ({
                                            label: `${g.brand} (${g.product_group})`,
                                            value: g.product_group
                                        }))}
                                        value={selectedReferenceId}
                                        onChange={(val) => setSelectedReferenceId(val)}
                                        placeholder="-- Seleccionar --"
                                    />
                                </div>
                            ) : (
                                <>
                                    <div>
                                        <label className="block text-sm font-bold mb-1">Nombre de la Colección</label>
                                        <input
                                            type="text"
                                            className="w-full border p-2 rounded"
                                            value={groupName}
                                            onChange={(e) => setGroupName(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold mb-1">URL de Imagen (Opcional)</label>
                                        <input
                                            type="text"
                                            className="w-full border p-2 rounded"
                                            value={groupImage}
                                            onChange={(e) => setGroupImage(e.target.value)}
                                        />
                                    </div>
                                </>
                            )}

                            <button type="submit" className="w-full bg-espint-blue text-white py-2 rounded font-bold hover:bg-blue-800 transition">
                                Crear Grupo
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Collection Modal */}
            {showEditCollectionModal && currentCollection && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg w-full max-w-2xl max-h-[80vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Editar Colección: {currentCollection.name}</h2>
                            <button onClick={() => setShowEditCollectionModal(false)}><X size={24} /></button>
                        </div>

                        {/* Search to add */}
                        <form onSubmit={handleSearch} className="flex gap-2 mb-4">
                            <input
                                type="text"
                                placeholder="Buscar productos para agregar..."
                                className="flex-1 border p-2 rounded"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">
                                <Search size={20} />
                            </button>
                        </form>
                        {searching && <LoadingSpinner />}

                        {/* Search Results */}
                        {searchResults.length > 0 && (
                            <div className="mb-4 border-b pb-4">
                                <h3 className="font-bold mb-2">Resultados de Búsqueda</h3>
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                    {searchResults.map(prod => (
                                        <div key={prod.id} className="flex justify-between items-center border p-2 rounded hover:bg-gray-50">
                                            <div>
                                                <p className="font-bold text-sm">{prod.name}</p>
                                                <p className="text-xs text-gray-500">{prod.code}</p>
                                            </div>
                                            <button
                                                onClick={() => handleAddCollectionItem(prod.id)}
                                                className="bg-green-500 text-white px-3 py-1 rounded text-xs hover:bg-green-600"
                                            >
                                                Agregar
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Current Items */}
                        <h3 className="font-bold mb-2">Productos en la Colección</h3>
                        <div className="space-y-2">
                            {collectionItems.map(item => (
                                <div key={item.id} className="flex justify-between items-center border p-2 rounded">
                                    <div>
                                        <p className="font-bold text-sm">{item.name}</p>
                                        <p className="text-xs text-gray-500">{item.code}</p>
                                    </div>
                                    <button
                                        onClick={() => handleRemoveCollectionItem(item.id)}
                                        className="text-red-500 hover:text-red-700"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                            {collectionItems.length === 0 && <p className="text-gray-500 text-sm">No hay productos en esta colección.</p>}
                        </div>

                    </div>
                </div>
            )}

        </div>
    );
};

export default ManageContentPage;
