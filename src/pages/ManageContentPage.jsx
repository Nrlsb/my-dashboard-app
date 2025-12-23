import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import apiService from '../api/apiService';
import LoadingSpinner from '../components/LoadingSpinner';
import CustomSelect from '../components/CustomSelect';
import { Trash2, Plus, Edit, Search, X, Upload, Check, AlertCircle, FileImage, FileSpreadsheet } from 'lucide-react';

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

    const handleDownloadMissingImagesReport = async () => {
        try {
            const blob = await apiService.downloadMissingImagesReport();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'reporte_faltantes.xlsx';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            toast.success('Reporte descargado correctamente');
        } catch (error) {
            console.error(error);
            toast.error('Error al descargar el reporte');
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
                    className={`py-2 px-4 font-semibold ${activeTab === 'reports' ? 'text-espint-blue border-b-2 border-espint-blue' : 'text-gray-500'}`}
                    onClick={() => setActiveTab('reports')}
                >
                    <span className="md:hidden">Reportes</span>
                    <span className="hidden md:inline">Reportes y Análisis</span>
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

                    {activeTab === 'reports' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div className="bg-white p-6 rounded shadow border border-gray-200 flex flex-col items-center text-center">
                                <div className="bg-blue-100 p-4 rounded-full mb-4">
                                    <FileSpreadsheet size={40} className="text-blue-600" />
                                </div>
                                <h3 className="font-bold text-lg mb-2">Productos Sin Imágenes</h3>
                                <p className="text-gray-600 text-sm mb-6">
                                    Genera un reporte Excel con todos los productos activos que no tienen imágenes asignadas.
                                </p>
                                <button
                                    onClick={handleDownloadMissingImagesReport}
                                    className="bg-blue-600 text-white px-4 py-2 rounded font-bold hover:bg-blue-700 transition w-full"
                                >
                                    Descargar Excel
                                </button>
                            </div>
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
