// --- Componente Principal de la Página ---
import React, { useState, useRef, useEffect, Suspense, lazy } from 'react';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';
import { useNavigate } from 'react-router-dom';
import {
    useInfiniteQuery,
    useQuery,
    useQueryClient,
    useMutation,
} from '@tanstack/react-query';
import { Loader2, ArrowLeft, Search, CheckCircle, XCircle, Edit2, Save, X, Star, Filter, Upload } from 'lucide-react';
import apiService from '../api/apiService.js';
import { useAuth } from "../context/AuthContext.jsx";

const LaunchGroupsTab = lazy(() => import('../components/ManageContent/LaunchGroupsTab'));

// --- Componente Reutilizable para el Interruptor ---
const ToggleSwitch = ({ checked, onChange, disabled, labelOff, labelOn, colorClass = 'bg-purple-600' }) => (
    <button
        type="button"
        onClick={onChange}
        disabled={disabled}
        className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${checked ? colorClass : 'bg-gray-300'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        aria-label={checked ? (labelOn || 'Desactivar') : (labelOff || 'Activar')}
    >
        <span
            className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-200 ease-in-out ${checked ? 'translate-x-6' : 'translate-x-1'
                }`}
        />
    </button>
);

// --- Modal de Edición ---
const EditReleaseModal = ({ product, onClose, onSave, isSaving }) => {
    const [formData, setFormData] = useState({
        custom_title: product.custom_title || '',
        custom_description: product.custom_description || '',
        custom_image_url: product.custom_image_url || '',
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(product.id, formData);
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                    <h3 className="text-lg font-semibold text-gray-800">Editar Lanzamiento</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="overflow-y-auto p-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Título Personalizado
                            </label>
                            <input
                                type="text"
                                name="custom_title"
                                value={formData.custom_title}
                                onChange={handleChange}
                                placeholder={product.name}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">Dejar en blanco para usar el nombre original.</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Descripción Personalizada
                            </label>
                            <textarea
                                name="custom_description"
                                value={formData.custom_description}
                                onChange={handleChange}
                                rows="3"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Imagen Personalizada
                            </label>

                            {/* Image Preview */}
                            {(formData.custom_image_url || formData.previewUrl) && (
                                <div className="mb-2 relative w-full h-48 bg-gray-100 rounded-md overflow-hidden border border-gray-200">
                                    <img
                                        src={formData.previewUrl || formData.custom_image_url}
                                        alt="Preview"
                                        className="w-full h-full object-contain"
                                        referrerPolicy="no-referrer"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, custom_image_url: '', previewUrl: '' }))}
                                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-sm"
                                        title="Eliminar imagen"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            )}

                            <div className="flex items-center gap-2">
                                <label className="flex-1 cursor-pointer bg-white border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2">
                                    <Upload className="w-4 h-4" />
                                    {formData.isUploading ? 'Subiendo...' : 'Seleccionar Imagen'}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        disabled={formData.isUploading}
                                        onChange={async (e) => {
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
                                                    custom_image_url: res.imageUrl,
                                                    isUploading: false
                                                }));
                                                toast.success('Imagen subida a Drive correctamente');
                                            } catch (err) {
                                                console.error(err);
                                                toast.error('Error al subir imagen');
                                                setFormData(prev => ({ ...prev, isUploading: false }));
                                            }
                                        }}
                                    />
                                </label>
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end space-x-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={isSaving || formData.isUploading}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 flex items-center disabled:opacity-50 cursor-pointer"
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Guardando...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4 mr-2" />
                                        Guardar Cambios
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

// --- Componente para la Fila de Producto ---
const ProductRow = ({ product, onToggle, isToggling, onEdit, viewMode }) => {
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        try {
            return new Date(dateString).toLocaleDateString('es-AR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return '-';
        }
    };

    const dateToShow = viewMode === 'included' ? product.inclusion_date :
        viewMode === 'modified' ? product.modification_date : null;

    return (
        <tr className="border-b border-gray-200 hover:bg-gray-50">
            <td className="py-3 px-4 text-sm text-gray-500 font-mono">
                {product.code}
            </td>
            <td className="py-3 px-4 text-sm text-gray-900 font-medium">
                <div>
                    {product.custom_title || product.name}
                    {product.custom_title && (
                        <span className="ml-2 text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
                            Personalizado
                        </span>
                    )}
                </div>
            </td>
            <td className="py-3 px-4 text-sm text-gray-500">
                {product.is_new_release ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        <Star className="w-4 h-4 mr-1 fill-current" />
                        Lanzamiento
                    </span>
                ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        <XCircle className="w-4 h-4 mr-1" />
                        Estándar
                    </span>
                )}
            </td>
            {viewMode !== null && ( // Only show date column if viewMode is not null (i.e., not in "show only active" mode)
                <td className="py-3 px-4 text-sm text-gray-500 font-mono whitespace-nowrap">
                    {formatDate(dateToShow)}
                </td>
            )}
            <td className="py-3 px-4 text-center">
                <div className="flex items-center justify-center space-x-4">
                    <ToggleSwitch
                        checked={!!product.is_new_release}
                        onChange={onToggle}
                        disabled={isToggling}
                    />
                    {product.is_new_release && (
                        <button
                            onClick={() => onEdit(product)}
                            className="p-1 text-gray-400 hover:text-blue-600 transition-colors cursor-pointer"
                            title="Editar detalles de lanzamiento"
                        >
                            <Edit2 className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </td>
        </tr>
    );
};

// --- Componente Principal de la Página ---
export default function ManageNewReleasesPage() {
    const [activeTab, setActiveTab] = useState('general'); // 'general' | 'groups'
    const [searchTerm, setSearchTerm] = useState('');
    const [debounceSearchTerm, setDebounceSearchTerm] = useState('');
    const [editingProduct, setEditingProduct] = useState(null);
    const [viewMode, setViewMode] = useState('included'); // 'included', 'modified'
    const [showOnlyActive, setShowOnlyActive] = useState(false); // Restore toggle state

    const debounceTimeout = useRef(null);
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const { user } = useAuth();

    // Debounce para el campo de búsqueda
    useEffect(() => {
        if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
        debounceTimeout.current = setTimeout(() => {
            setDebounceSearchTerm(searchTerm);
        }, 500);
        return () => clearTimeout(debounceTimeout.current);
    }, [searchTerm]);

    // Query para obtener productos FILTRADOS por fecha (backend) - ONLY when toggle is OFF
    const {
        data: infiniteData,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading: isLoadingInfinite,
        isError: isErrorInfinite,
        error: errorInfinite,
    } = useInfiniteQuery({
        queryKey: ['products', debounceSearchTerm, ['new_releases', viewMode]],
        queryFn: async ({ pageParam = 1 }) => {
            const productsData = await apiService.fetchProducts(
                pageParam,
                debounceSearchTerm,
                [],
                true, // bypassCache
                20, // limit
                '', // hasImage
                false, // onlyNewReleasesCandidates
                false, // onlyModifiedPrices
                viewMode // dateFilterType ('included' or 'modified')
            );

            // We still need to fetch active releases status to mark "is_new_release" correctly in the list
            // because findProducts doesn't strictly join with new_releases table for that flag by default?
            // Actually findProducts maps "oferta" but maybe not "is_new_release" properly unless we merged it in backend?
            // The previous code did manual merge. Let's keep it safe.
            const newReleases = await apiService.fetchNewReleases();
            const newReleasesMap = new Map(newReleases.map(r => [r.code, r]));

            const products = productsData.products.map(p => {
                const releaseInfo = newReleasesMap.get(p.code);
                return {
                    ...p,
                    is_new_release: !!releaseInfo,
                    custom_title: releaseInfo?.custom_title,
                    custom_description: releaseInfo?.custom_description,
                    custom_image_url: releaseInfo?.custom_image_url,
                    // Prefer returned date from backend if available, mostly for sort/display
                    inclusion_date: p.inclusion_date,
                    modification_date: p.modification_date
                };
            });
            return { ...productsData, products };
        },
        getNextPageParam: (lastPage, allPages) => {
            const productsLoaded = allPages.reduce((acc, page) => acc + page.products.length, 0);
            return productsLoaded < lastPage.totalProducts ? allPages.length + 1 : undefined;
        },
        initialPageParam: 1,
        enabled: !!(user?.is_admin || user?.role === 'marketing') && !showOnlyActive && activeTab === 'general',
    });

    // Query for Active Releases - ONLY when toggle is ON
    const {
        data: activeReleasesData,
        isLoading: isLoadingActive,
        isError: isErrorActive,
        error: errorActive,
    } = useQuery({
        queryKey: ['activeNewReleases', debounceSearchTerm],
        queryFn: async () => {
            const releases = await apiService.fetchNewReleases();
            const releasesWithFlag = releases.map(r => ({ ...r, is_new_release: true }));

            if (!debounceSearchTerm) return releasesWithFlag;
            const lowerInfos = debounceSearchTerm.toLowerCase();
            return releasesWithFlag.filter(p =>
                p.name.toLowerCase().includes(lowerInfos) ||
                p.code.toLowerCase().includes(lowerInfos)
            );
        },
        enabled: !!(user?.is_admin || user?.role === 'marketing') && showOnlyActive && activeTab === 'general',
    });

    const { mutate: toggleRelease, isPending: isToggling } = useMutation({
        mutationFn: (productId) => apiService.toggleProductNewRelease(productId),
        onSuccess: (data) => {
            // Update Infinite Query cache
            queryClient.setQueryData(
                ['products', debounceSearchTerm, ['new_releases', viewMode]],
                (oldData) => {
                    if (!oldData) return oldData;
                    return {
                        ...oldData,
                        pages: oldData.pages.map((page) => ({
                            ...page,
                            products: page.products.map((p) =>
                                p.id === data.id
                                    ? { ...p, is_new_release: data.is_new_release } // Just toggle flag
                                    : p
                            ),
                        })),
                    };
                }
            );

            queryClient.invalidateQueries({ queryKey: ['activeNewReleases'] });
            queryClient.invalidateQueries({ queryKey: ['newReleases'] });

            toast.success(data.is_new_release ? 'Lanzamiento activado' : 'Lanzamiento desactivado');
        },
        onError: (err) => toast.error(`Error: ${err.message}`),
    });

    const { mutate: saveDetails, isPending: isSavingDetails } = useMutation({
        mutationFn: ({ productId, details }) => apiService.updateProductNewReleaseDetails(productId, details),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['activeNewReleases'] });
            queryClient.invalidateQueries({ queryKey: ['newReleases'] });
            setEditingProduct(null);
            toast.success('Detalles actualizados');
        },
        onError: (err) => toast.error(`Error: ${err.message}`),
    });

    // Determine products to show
    const productsToShow = showOnlyActive
        ? (activeReleasesData || [])
        : (infiniteData?.pages.flatMap((page) => page.products) || []);

    const isLoading = showOnlyActive ? isLoadingActive : isLoadingInfinite;
    const isError = showOnlyActive ? isErrorActive : isErrorInfinite;
    const error = showOnlyActive ? errorActive : errorInfinite;

    if (!user?.is_admin && user?.role !== 'marketing') {
        return <div className="p-8 text-center text-red-500">Acceso denegado.</div>;
    }

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center">
                    <button onClick={() => navigate('/manage-content')} className="flex items-center justify-center p-2 mr-4 text-gray-600 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors cursor-pointer">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Gestionar Nuevos Lanzamientos</h1>
                        <p className="text-gray-500">Gestiona productos individuales y grupos de lanzamiento.</p>
                    </div>
                </div>
            </header>

            {/* TABS */}
            <div className="flex space-x-4 mb-6 border-b border-gray-200">
                <button
                    className={`py-2 px-4 font-semibold ${activeTab === 'general' ? 'text-espint-blue border-b-2 border-espint-blue' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setActiveTab('general')}
                >
                    Productos Individuales
                </button>
                <button
                    className={`py-2 px-4 font-semibold ${activeTab === 'groups' ? 'text-espint-blue border-b-2 border-espint-blue' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setActiveTab('groups')}
                >
                    Grupos de Lanzamiento
                </button>
            </div>

            {/* TAB CONTENT: GENERAL */}
            {activeTab === 'general' && (
                <div className="animate-fadeIn">
                    <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Buscar por nombre o código..."
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="flex items-center space-x-3 bg-white p-2 rounded-lg shadow-sm border border-gray-200">
                            <div className="flex space-x-2 mr-4 border-r pr-4 border-gray-200">
                                <button
                                    onClick={() => setViewMode('included')}
                                    disabled={showOnlyActive}
                                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${viewMode === 'included' && !showOnlyActive
                                        ? 'bg-purple-100 text-purple-800'
                                        : 'text-gray-600 hover:bg-gray-50 disabled:opacity-50'
                                        }`}
                                >
                                    Productos Incluidos
                                </button>
                                <button
                                    onClick={() => setViewMode('modified')}
                                    disabled={showOnlyActive}
                                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${viewMode === 'modified' && !showOnlyActive
                                        ? 'bg-purple-100 text-purple-800'
                                        : 'text-gray-600 hover:bg-gray-50 disabled:opacity-50'
                                        }`}
                                >
                                    Producto Modificado
                                </button>
                            </div>

                            <div className="flex items-center space-x-2">
                                <Filter className={`w-5 h-5 ${showOnlyActive ? 'text-purple-600' : 'text-gray-400'}`} />
                                <span className="text-sm font-medium text-gray-700">Ver solo activos</span>
                            </div>
                            <ToggleSwitch
                                checked={showOnlyActive}
                                onChange={() => setShowOnlyActive(!showOnlyActive)}
                                labelOff="Todo"
                                labelOn="Activos"
                                colorClass="bg-purple-600"
                            />
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-md overflow-hidden">
                        <div className="hidden md:block overflow-x-auto">
                            <table className="min-w-full bg-white">
                                <thead className="bg-gray-100 border-b border-gray-300">
                                    <tr>
                                        <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase">Código</th>
                                        <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase">Descripción</th>
                                        <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase">Estado</th>
                                        {!showOnlyActive && (
                                            <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase">Fecha</th>
                                        )}
                                        <th className="py-3 px-4 text-center text-xs font-semibold text-gray-600 uppercase">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {isLoading && (
                                        <tr><td colSpan={showOnlyActive ? "4" : "5"} className="p-0"><LoadingSpinner text="Cargando productos..." /></td></tr>
                                    )}
                                    {isError && (
                                        <tr><td colSpan={showOnlyActive ? "4" : "5"} className="p-8 text-center text-red-500">Error: {error?.message}</td></tr>
                                    )}
                                    {!isLoading && !isError && productsToShow.length === 0 && (
                                        <tr><td colSpan={showOnlyActive ? "4" : "5"} className="p-8 text-center text-gray-500">No se encontraron productos.</td></tr>
                                    )}
                                    {productsToShow.map((product) => (
                                        <ProductRow
                                            key={product.id}
                                            product={product}
                                            onToggle={() => toggleRelease(product.id)}
                                            isToggling={isToggling}
                                            onEdit={setEditingProduct}
                                            viewMode={showOnlyActive ? null : viewMode} // Pass null if showOnlyActive so date is not shown? Or logic inside row handles it?
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile View Omitted - Rendering Logic reuse if needed similar to ManageOffers */}

                        {!showOnlyActive && (
                            <div className="p-4 text-center">
                                {hasNextPage && (
                                    <button
                                        onClick={() => fetchNextPage()}
                                        disabled={isFetchingNextPage}
                                        className="mt-4 px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                                    >
                                        {isFetchingNextPage ? 'Cargando...' : 'Cargar más productos'}
                                    </button>
                                )}
                                {!hasNextPage && !isLoading && productsToShow.length > 0 && (
                                    <p className="text-gray-500 text-sm">Fin de los resultados.</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB CONTENT: GROUPS */}
            {activeTab === 'groups' && (
                <Suspense fallback={<LoadingSpinner />}>
                    <LaunchGroupsTab />
                </Suspense>
            )}

            {editingProduct && (
                <EditReleaseModal
                    product={editingProduct}
                    onClose={() => setEditingProduct(null)}
                    onSave={(productId, details) => saveDetails({ productId, details })}
                    isSaving={isSavingDetails}
                />
            )}
        </div>
    );
}
