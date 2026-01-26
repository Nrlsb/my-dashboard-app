
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import apiService from '../../api/apiService';
import LoadingSpinner from '../LoadingSpinner';
import { Plus, Edit2, Trash2, ArrowRight, ExternalLink, Upload, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const LaunchGroupsTab = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        image_url: '',
        isUploading: false,
        previewUrl: ''
    });

    const { data: groups, isLoading } = useQuery({
        queryKey: ['adminCarouselGroups'],
        queryFn: () => apiService.getCarouselGroups(),
    });

    const createGroupMutation = useMutation({
        mutationFn: (data) => apiService.createCarouselGroup(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adminCarouselGroups'] });
            setIsCreateModalOpen(false);
            setFormData({
                name: '',
                description: '',
                image_url: '',
                isUploading: false,
                previewUrl: ''
            });
            toast.success('Grupo creado exitosamente');
        },
        onError: (err) => {
            console.error(err);
            toast.error('Error al crear el grupo');
        }
    });

    const deleteGroupMutation = useMutation({
        mutationFn: (id) => apiService.deleteCarouselGroup(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adminCarouselGroups'] });
            toast.success('Grupo eliminado exitosamente');
        },
        onError: (err) => {
            console.error(err);
            toast.error('Error al eliminar el grupo');
        }
    });

    const handleCreate = (e) => {
        e.preventDefault();
        if (!formData.name.trim()) return;
        createGroupMutation.mutate({
            name: formData.name,
            description: formData.description,
            image_url: formData.image_url,
            type: 'custom_collection',
            is_launch_group: true
        });
    };

    const handleDelete = (id) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar este grupo?')) {
            deleteGroupMutation.mutate(id);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const previewUrl = URL.createObjectURL(file);
        setFormData(prev => ({ ...prev, isUploading: true, previewUrl }));

        const data = new FormData();
        data.append('image', file);

        try {
            const res = await apiService.uploadToDrive(data);
            setFormData(prev => ({
                ...prev,
                image_url: res.imageUrl,
                isUploading: false
            }));
            toast.success('Imagen subida correctamente');
        } catch (err) {
            console.error(err);
            toast.error('Error al subir imagen');
            setFormData(prev => ({ ...prev, isUploading: false }));
        }
    };

    if (isLoading) return <LoadingSpinner />;

    // Only show launch groups
    const customGroups = groups?.filter(g => g.is_launch_group === true) || [];

    return (
        <div className="pt-4">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Grupos de Lanzamiento</h2>
                    <p className="text-gray-500 text-sm">Crea y gestiona colecciones de productos para compartir.</p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2 bg-espint-blue text-white px-4 py-2 rounded-lg hover:bg-espint-blue-dark transition-colors"
                >
                    <Plus size={20} />
                    Crear Grupo
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {customGroups.map(group => (
                    <div key={group.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                        <div className="h-40 bg-gray-100 relative group overflow-hidden">
                            {group.image_url ? (
                                <img
                                    src={group.image_url}
                                    alt={group.name}
                                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                    referrerPolicy="no-referrer"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                    <Upload size={40} className="opacity-20" />
                                </div>
                            )}
                            <button
                                onClick={() => handleDelete(group.id)}
                                className="absolute top-2 right-2 p-2 bg-white/80 backdrop-blur-sm text-gray-400 hover:text-red-500 rounded-full shadow-sm transition-colors"
                                title="Eliminar Grupo"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>

                        <div className="p-5">
                            <h3 className="text-lg font-bold text-gray-900 mb-2 truncate">{group.name}</h3>
                            {group.description && (
                                <p className="text-sm text-gray-500 line-clamp-2 mb-4 h-10">{group.description}</p>
                            )}

                            <div className="flex flex-col gap-2">
                                <button
                                    onClick={() => navigate(`/admin/launch-groups/${group.id}`)}
                                    className="w-full flex items-center justify-center gap-2 bg-espint-blue/10 text-espint-blue py-2 px-4 rounded-lg hover:bg-espint-blue hover:text-white transition-all font-medium text-sm"
                                >
                                    <Edit2 size={16} />
                                    Gestionar Productos
                                </button>
                                <button
                                    onClick={() => window.open(`/collection/${group.id}`, '_blank')}
                                    className="w-full flex items-center justify-center gap-2 text-gray-500 py-2 px-4 hover:bg-gray-100 rounded-lg transition-colors text-sm"
                                >
                                    <ExternalLink size={16} /> Ver Pública
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {customGroups.length === 0 && (
                    <div className="col-span-full py-12 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-white">
                        <Plus size={48} className="mx-auto mb-4 opacity-10" />
                        <p>No hay grupos creados. Comienza creando uno nuevo.</p>
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h2 className="text-lg font-bold text-gray-800">Crear Nuevo Grupo</h2>
                            <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleCreate} className="p-6">
                            <div className="space-y-5">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                                        Nombre del Grupo *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                        className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-espint-blue focus:border-transparent outline-none transition-all"
                                        placeholder="Ej. Colección Verano 2026"
                                        autoFocus
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                                        Descripción
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                        className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-espint-blue focus:border-transparent outline-none transition-all resize-none"
                                        placeholder="Breve descripción del grupo..."
                                        rows="2"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                        Imagen de Portada
                                    </label>

                                    {formData.previewUrl || formData.image_url ? (
                                        <div className="mb-3 relative h-32 rounded-lg bg-gray-50 border border-gray-100 overflow-hidden flex items-center justify-center">
                                            <img
                                                src={formData.previewUrl || formData.image_url}
                                                alt="Preview"
                                                className="max-w-full max-h-full object-contain"
                                                referrerPolicy="no-referrer"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, image_url: '', previewUrl: '' }))}
                                                className="absolute top-1.5 right-1.5 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-sm transition-colors"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ) : (
                                        <label className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-lg py-6 px-4 text-xs font-medium text-gray-400 cursor-pointer hover:border-espint-blue hover:text-espint-blue transition-all ${formData.isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                                            <Upload size={24} className="opacity-40" />
                                            {formData.isUploading ? 'Subiendo...' : 'Click para subir imagen'}
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept="image/*"
                                                onChange={handleFileUpload}
                                                disabled={formData.isUploading}
                                            />
                                        </label>
                                    )}
                                </div>
                            </div>

                            <div className="mt-8 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="flex-1 px-4 py-2.5 text-gray-600 font-semibold hover:bg-gray-50 rounded-lg transition-colors border border-gray-100"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={!formData.name.trim() || createGroupMutation.isPending || formData.isUploading}
                                    className="flex-1 px-4 py-2.5 bg-espint-blue text-white font-bold rounded-lg hover:bg-espint-blue-dark transition-all disabled:opacity-50 shadow-md flex items-center justify-center gap-2"
                                >
                                    {createGroupMutation.isPending ? (
                                        <>
                                            <Loader2 className="animate-spin" size={18} />
                                            Creando...
                                        </>
                                    ) : (
                                        'Crear Grupo'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LaunchGroupsTab;

