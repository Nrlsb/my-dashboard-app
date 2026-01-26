
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import apiService from '../api/apiService';
import LoadingSpinner from '../components/LoadingSpinner';
import { Plus, Edit2, Trash2, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

const LaunchGroupsPage = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');

    const { data: groups, isLoading } = useQuery({
        queryKey: ['adminCarouselGroups'],
        queryFn: () => apiService.get('/admin/carousel-groups'),
    });

    const createGroupMutation = useMutation({
        mutationFn: (data) => apiService.post('/admin/carousel-groups', data),
        onSuccess: () => {
            queryClient.invalidateQueries(['adminCarouselGroups']);
            setIsCreateModalOpen(false);
            setNewGroupName('');
            toast.success('Grupo creado exitosamente');
        },
        onError: (err) => {
            console.error(err);
            toast.error('Error al crear el grupo');
        }
    });

    const deleteGroupMutation = useMutation({
        mutationFn: (id) => apiService.delete(`/admin/carousel-groups/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries(['adminCarouselGroups']);
            toast.success('Grupo eliminado exitosamente');
        },
        onError: (err) => {
            console.error(err);
            toast.error('Error al eliminar el grupo');
        }
    });

    const handleCreate = (e) => {
        e.preventDefault();
        if (!newGroupName.trim()) return;
        createGroupMutation.mutate({ name: newGroupName, type: 'custom_collection' });
    };

    const handleDelete = (id) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar este grupo?')) {
            deleteGroupMutation.mutate(id);
        }
    };

    if (isLoading) return <LoadingSpinner />;

    // Filter only custom items, usually 'custom_collection'
    const customGroups = groups?.filter(g => g.type === 'custom_collection') || [];

    return (
        <div className="container mx-auto p-4">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Grupos de Lanzamiento</h1>
                    <p className="text-gray-500">Gestiona tus colecciones personalizadas de productos.</p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2 bg-espint-blue text-white px-4 py-2 rounded-lg hover:bg-espint-blue-dark transition-colors"
                >
                    <Plus size={20} />
                    Crear Nuevo Grupo
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {customGroups.map(group => (
                    <div key={group.id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">{group.name}</h3>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleDelete(group.id)}
                                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                    title="EliminarGrupo"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>

                        <div className="mt-4 flex gap-2">
                            <button
                                onClick={() => navigate(`/admin/launch-groups/${group.id}`)}
                                className="flex-1 flex items-center justify-center gap-2 bg-gray-50 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-100 transition-colors font-medium text-sm"
                            >
                                <Edit2 size={16} />
                                Gestionar Productos
                            </button>
                            <button
                                onClick={() => navigate(`/collection/${group.id}`)} // Public link preview
                                className="flex-none p-2 text-espint-blue hover:bg-blue-50 rounded-lg transition-colors"
                                title="Ver Pública"
                            >
                                <ArrowRight size={20} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Create Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
                        <h2 className="text-xl font-bold mb-4">Crear Nuevo Grupo</h2>
                        <form onSubmit={handleCreate}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Nombre del Grupo
                                </label>
                                <input
                                    type="text"
                                    value={newGroupName}
                                    onChange={(e) => setNewGroupName(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-espint-blue focus:border-transparent outline-none"
                                    placeholder="Ej. Ofertas Verano 2026"
                                    autoFocus
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={!newGroupName.trim() || createGroupMutation.isLoading}
                                    className="px-4 py-2 bg-espint-blue text-white rounded-lg hover:bg-espint-blue-dark transition-colors disabled:opacity-50"
                                >
                                    {createGroupMutation.isLoading ? 'Creando...' : 'Crear Grupo'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LaunchGroupsPage;
