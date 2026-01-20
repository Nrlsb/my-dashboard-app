import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Plus, Trash2, X, Search } from 'lucide-react';
import apiService from '../../api/apiService';
import LoadingSpinner from '../LoadingSpinner';
import ConfirmationModal from '../ConfirmationModal';

const AccessoriesTab = () => {
    const [accessories, setAccessories] = useState([]);
    const [loading, setLoading] = useState(false);

    // Add Modal State
    const [showAddAccessoryModal, setShowAddAccessoryModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);

    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [accessoryToDelete, setAccessoryToDelete] = useState(null);

    useEffect(() => {
        fetchAccessories();
    }, []);

    const fetchAccessories = async () => {
        setLoading(true);
        try {
            const data = await apiService.getAccessories();
            setAccessories(data);
        } catch (error) {
            console.error(error);
            toast.error('Error al cargar accesorios');
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
            fetchAccessories();
            setShowAddAccessoryModal(false);
        } catch (error) {
            toast.error('Error al agregar accesorio');
        }
    };

    const initiateDeleteAccessory = (accessoryId) => {
        setAccessoryToDelete(accessoryId);
        setIsDeleteModalOpen(true);
    };

    const confirmDeleteAccessory = async () => {
        if (!accessoryToDelete) return;
        setIsDeleteModalOpen(false);

        try {
            await apiService.removeAccessory(accessoryToDelete);
            toast.success('Accesorio eliminado');
            fetchAccessories();
        } catch (error) {
            toast.error('Error al eliminar accesorio');
        } finally {
            setAccessoryToDelete(null);
        }
    };

    const cancelDeleteAccessory = () => {
        setIsDeleteModalOpen(false);
        setAccessoryToDelete(null);
    };

    if (loading && accessories.length === 0) return <LoadingSpinner />;

    return (
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
                            src={acc.imageUrl}
                            alt={acc.name}
                            className="w-full h-full object-cover opacity-70 group-hover:opacity-50 transition-opacity"
                        />
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-2 pointer-events-none">
                            <h3 className="font-bold text-white text-center text-sm md:text-base leading-tight drop-shadow-md">{acc.name}</h3>
                            <p className="text-gray-200 text-xs mt-1 drop-shadow-md">{acc.code}</p>
                        </div>
                        <button
                            onClick={() => initiateDeleteAccessory(acc.id)}
                            className="absolute bottom-2 right-2 bg-red-500 text-white p-1.5 rounded opacity-100 md:opacity-0 group-hover:opacity-100 transition shadow-lg z-10"
                            title="Eliminar"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}
                {accessories.length === 0 && !loading && <p className="text-gray-500">No hay accesorios configurados.</p>}
            </div>

            {/* Add Accessory Modal */}
            {showAddAccessoryModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
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
                                    <div className="flex items-center gap-3">
                                        {prod.imageUrl && (
                                            <img src={prod.imageUrl} alt={prod.name} className="w-12 h-12 object-cover rounded" />
                                        )}
                                        <div>
                                            <p className="font-bold">{prod.name}</p>
                                            <p className="text-sm text-gray-500">{prod.code}</p>
                                        </div>
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

            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={cancelDeleteAccessory}
                onConfirm={confirmDeleteAccessory}
                title="Eliminar Accesorio"
                message="¿Estás seguro de eliminar este accesorio?"
                confirmText="Eliminar"
                variant="danger"
            />
        </div>
    );
};

export default AccessoriesTab;
