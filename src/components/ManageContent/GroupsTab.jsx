import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Plus, Edit, Trash2, X, Upload, Search } from 'lucide-react';
import apiService from '../../api/apiService';
import LoadingSpinner from '../LoadingSpinner';
import CustomSelect from '../CustomSelect';
import ConfirmationModal from '../ConfirmationModal';

const GroupsTab = () => {
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(false);

    // Modals
    const [showAddGroupModal, setShowAddGroupModal] = useState(false);
    const [showEditCollectionModal, setShowEditCollectionModal] = useState(false);

    // Group Form state
    const [groupType, setGroupType] = useState('static_group');
    const [groupName, setGroupName] = useState('');
    const [groupImage, setGroupImage] = useState('');
    const [selectedReferenceId, setSelectedReferenceId] = useState('');
    const [availableGroups, setAvailableGroups] = useState([]);

    // Collection Edit state
    const [currentCollection, setCurrentCollection] = useState(null);
    const [collectionItems, setCollectionItems] = useState([]);
    const [editGroupName, setEditGroupName] = useState('');
    const [editGroupImage, setEditGroupImage] = useState('');

    // Search state (for adding items to collection)
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);

    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [groupToDelete, setGroupToDelete] = useState(null);

    useEffect(() => {
        fetchGroups();
    }, []);

    const fetchGroups = async () => {
        setLoading(true);
        try {
            const dbGroups = await apiService.getCarouselGroups();
            setGroups(dbGroups);
        } catch (error) {
            console.error(error);
            toast.error('Error al cargar grupos');
        } finally {
            setLoading(false);
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
            fetchGroups();
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

    const initiateDeleteGroup = (group) => {
        setGroupToDelete(group);
        setIsDeleteModalOpen(true);
    };

    const confirmDeleteGroup = async () => {
        if (!groupToDelete) return;
        setIsDeleteModalOpen(false);

        try {
            await apiService.deleteCarouselGroup(groupToDelete.id);
            toast.success('Grupo eliminado');
            fetchGroups();
        } catch (error) {
            toast.error('Error al eliminar grupo');
        } finally {
            setGroupToDelete(null);
        }
    };

    const cancelDeleteGroup = () => {
        setIsDeleteModalOpen(false);
        setGroupToDelete(null);
    };

    const handleEditCollection = async (group) => {
        setCurrentCollection(group);
        setEditGroupName(group.name || '');
        setEditGroupImage(group.image_url || '');
        setSearchResults([]);
        setSearchTerm('');
        setShowEditCollectionModal(true);
        // Fetch items
        try {
            const items = await apiService.getCustomCollectionProducts(group.id);
            setCollectionItems(items);
        } catch (error) {
            toast.error('Error al cargar items de la colección');
        }
    };

    const handleUpdateGroup = async () => {
        try {
            await apiService.updateCarouselGroup(currentCollection.id, {
                name: editGroupName,
                image_url: editGroupImage
            });
            toast.success('Grupo actualizado');
            fetchGroups();
            // Update local state to reflect changes immediately in header
            setCurrentCollection(prev => ({ ...prev, name: editGroupName, image_url: editGroupImage }));
        } catch (error) {
            toast.error('Error al actualizar grupo');
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

    if (loading && groups.length === 0) return <LoadingSpinner />;

    return (
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
                                onClick={() => initiateDeleteGroup(group)}
                                className="text-red-500 hover:text-red-700 p-2"
                                title="Eliminar Grupo"
                            >
                                <Trash2 size={20} />
                            </button>
                        </div>
                    </div>
                ))}
                {groups.length === 0 && !loading && <p className="text-gray-500">No hay grupos configurados.</p>}
            </div>

            {/* Add Group Modal */}
            {showAddGroupModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
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
                                        <label className="block text-sm font-bold mb-1">Imagen de la Colección</label>

                                        {/* Image Preview */}
                                        {(groupImage) && (
                                            <div className="mb-2 relative w-full h-32 bg-gray-100 rounded-md overflow-hidden border border-gray-200">
                                                <img
                                                    src={groupImage}
                                                    alt="Preview"
                                                    className="w-full h-full object-contain"
                                                    referrerPolicy="no-referrer"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setGroupImage('')}
                                                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-sm"
                                                    title="Eliminar imagen"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        )}

                                        <div className="flex items-center gap-2">
                                            <label className="flex-1 cursor-pointer bg-white border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2">
                                                <Upload className="w-4 h-4" />
                                                {loading ? 'Subiendo...' : 'Seleccionar Imagen'}
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    disabled={loading}
                                                    onChange={async (e) => {
                                                        const file = e.target.files[0];
                                                        if (!file) return;

                                                        const previewUrl = URL.createObjectURL(file);
                                                        setGroupImage(previewUrl);
                                                        setLoading(true);

                                                        const data = new FormData();
                                                        data.append('image', file);

                                                        try {
                                                            const res = await apiService.uploadToDrive(data);
                                                            setGroupImage(res.imageUrl);
                                                            toast.success('Imagen subida a Drive correctamente');
                                                        } catch (err) {
                                                            console.error(err);
                                                            toast.error('Error al subir imagen');
                                                            setGroupImage('');
                                                        } finally {
                                                            setLoading(false);
                                                        }
                                                    }}
                                                />
                                            </label>
                                        </div>
                                    </div>
                                </>
                            )}

                            <button type="submit" className="w-full bg-espint-blue text-white py-2 rounded font-bold hover:bg-blue-800 transition" disabled={loading}>
                                Crear Grupo
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Collection Modal */}
            {showEditCollectionModal && currentCollection && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg w-full max-w-2xl max-h-[80vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Editar Colección: {currentCollection.name}</h2>
                            <button onClick={() => setShowEditCollectionModal(false)}><X size={24} /></button>
                        </div>

                        {/* Edit Group Details */}
                        <div className="mb-6 p-4 bg-gray-50 rounded border border-gray-200">
                            <h3 className="font-bold mb-3 text-gray-700">Detalles del Grupo</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold mb-1">Nombre</label>
                                    <input
                                        type="text"
                                        className="w-full border p-2 rounded"
                                        value={editGroupName}
                                        onChange={(e) => setEditGroupName(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-1">Imagen</label>

                                    {/* Image Preview for Edit */}
                                    {(editGroupImage) && (
                                        <div className="mb-2 relative w-full h-32 bg-white rounded-md overflow-hidden border border-gray-200">
                                            <img
                                                src={editGroupImage}
                                                alt="Preview"
                                                className="w-full h-full object-contain"
                                                referrerPolicy="no-referrer"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setEditGroupImage('')}
                                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-sm"
                                                title="Eliminar imagen"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-2">
                                        <label className="flex-1 cursor-pointer bg-white border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2">
                                            <Upload className="w-4 h-4" />
                                            {loading ? 'Subiendo...' : 'Cambiar Imagen'}
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                disabled={loading}
                                                onChange={async (e) => {
                                                    const file = e.target.files[0];
                                                    if (!file) return;

                                                    const previewUrl = URL.createObjectURL(file);
                                                    setEditGroupImage(previewUrl);
                                                    setLoading(true);

                                                    const data = new FormData();
                                                    data.append('image', file);

                                                    try {
                                                        const res = await apiService.uploadToDrive(data);
                                                        setEditGroupImage(res.imageUrl);
                                                        toast.success('Imagen subida a Drive correctamente');
                                                    } catch (err) {
                                                        console.error(err);
                                                        toast.error('Error al subir imagen');
                                                        setEditGroupImage('');
                                                    } finally {
                                                        setLoading(false);
                                                    }
                                                }}
                                            />
                                        </label>
                                    </div>

                                </div>
                            </div>
                            <div className="mt-3 text-right">
                                <button
                                    onClick={handleUpdateGroup}
                                    className={`bg-blue-600 text-white px-4 py-2 rounded font-bold hover:bg-blue-700 transition ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    disabled={loading}
                                >
                                    {loading ? 'Guardando...' : 'Guardar Cambios'}
                                </button>
                            </div>
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
                                            <div className="flex items-center gap-3">
                                                {prod.imageUrl && (
                                                    <img src={prod.imageUrl} alt={prod.name} className="w-10 h-10 object-cover rounded" />
                                                )}
                                                <div>
                                                    <p className="font-bold text-sm">{prod.name}</p>
                                                    <p className="text-xs text-gray-500">{prod.code}</p>
                                                </div>
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
                                    <div className="flex items-center gap-3">
                                        {item.imageUrl && (
                                            <img src={item.imageUrl} alt={item.name} className="w-10 h-10 object-cover rounded" />
                                        )}
                                        <div>
                                            <p className="font-bold text-sm">{item.name}</p>
                                            <p className="text-xs text-gray-500">{item.code}</p>
                                        </div>
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

            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={cancelDeleteGroup}
                onConfirm={confirmDeleteGroup}
                title="Eliminar Grupo"
                message={`¿Estás seguro de eliminar el grupo "${groupToDelete?.name}"?`}
                confirmText="Eliminar"
                variant="danger"
            />
        </div>
    );
};

export default GroupsTab;
