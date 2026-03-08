import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, UserPlus, LogIn, Package, ChevronRight } from 'lucide-react';
import apiClient from '../api/core/client';
import SEOHead from '../components/SEOHead';

const ORGANIZATION_SCHEMA = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Distribuidora Espint',
    description: 'Distribuidora mayorista de pinturas y accesorios para pinturerías. Marcas líderes, stock permanente y envíos a todo el país.',
    url: import.meta.env.VITE_SITE_URL || 'https://espint.com.ar',
    logo: `${import.meta.env.VITE_SITE_URL || 'https://espint.com.ar'}/logo.svg`,
    contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'sales',
        availableLanguage: 'Spanish',
    },
    areaServed: 'AR',
};

// ============================================================
// Componentes internos para la vista pública (sin precios)
// ============================================================

/**
 * Banner CTA para que los visitantes soliciten acceso.
 */
const RegistrationBanner = () => {
    const navigate = useNavigate();
    return (
        <div className="bg-gradient-to-r from-[#0B3D68] to-[#1a5a96] text-white rounded-3xl p-6 md:p-8 shadow-xl mb-8 relative overflow-hidden">
            {/* Decoración de fondo */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-[#7BBF42]/20 rounded-full blur-2xl"></div>

            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex-1">
                    <h2 className="text-2xl md:text-3xl font-bold mb-2">
                        ¿Querés acceder a precios y realizar pedidos?
                    </h2>
                    <p className="text-white/80 text-sm md:text-base">
                        Solicitá tu acceso y un representante se pondrá en contacto con vos para habilitarte el sistema completo.
                    </p>
                </div>
                <div className="flex gap-3 flex-shrink-0">
                    <button
                        onClick={() => navigate('/solicitar-acceso')}
                        className="flex items-center gap-2 bg-[#7BBF42] hover:bg-[#6aad35] text-white font-semibold px-6 py-3 rounded-xl transition-colors shadow-lg"
                    >
                        <UserPlus className="w-5 h-5" />
                        Solicitar Acceso
                    </button>
                    <button
                        onClick={() => navigate('/login')}
                        className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white font-semibold px-6 py-3 rounded-xl transition-colors backdrop-blur-sm"
                    >
                        <LogIn className="w-5 h-5" />
                        Iniciar Sesión
                    </button>
                </div>
            </div>
        </div>
    );
};

/**
 * Banner de nuevos lanzamientos sin precios.
 */
const PublicNewReleasesBanner = ({ products }) => {
    const navigate = useNavigate();
    const [currentIndex, setCurrentIndex] = React.useState(0);
    const [isHovered, setIsHovered] = React.useState(false);

    React.useEffect(() => {
        if (products.length <= 1 || isHovered) return;
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % products.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [products.length, isHovered]);

    if (products.length === 0) {
        return (
            <div
                onClick={() => navigate('/login')}
                className="group cursor-pointer bg-gradient-to-b from-indigo-600 to-purple-700 text-white rounded-3xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] flex flex-col items-center justify-center w-full md:w-64 lg:w-72 h-[400px] md:h-auto md:flex-grow min-h-[500px] relative overflow-hidden"
            >
                <div className="p-3 bg-white/20 rounded-full backdrop-blur-sm mb-4">
                    <Sparkles className="w-8 h-8 text-yellow-300" />
                </div>
                <h3 className="text-xl font-bold text-center mb-2">Nuevos Lanzamientos</h3>
                <p className="text-white/80 text-center text-sm">Descubre las novedades</p>
            </div>
        );
    }

    const currentProduct = products[currentIndex];
    const handleBannerClick = () => {
        if (currentProduct.is_launch_group) {
            navigate(`/collection/${currentProduct.id}`);
        } else {
            navigate(`/product-detail/${currentProduct.id}`);
        }
    };

    return (
        <div
            className="group cursor-pointer bg-gradient-to-b from-indigo-600 to-purple-700 text-white rounded-3xl p-0 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] flex flex-col w-full md:w-64 lg:w-72 h-[400px] md:h-auto md:flex-grow min-h-[500px] relative overflow-hidden"
            onClick={handleBannerClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="absolute top-0 left-0 w-full h-full bg-white opacity-5 pointer-events-none"></div>
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-400 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity"></div>

            {/* Badge */}
            <div className="absolute top-4 right-4 z-20">
                <span className={`${currentProduct.is_launch_group ? 'bg-[#0B3D68] text-white' : 'bg-yellow-400 text-yellow-900'} text-xs font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1`}>
                    <Sparkles className="w-3 h-3" />
                    {currentProduct.is_launch_group ? 'COLECCIÓN' : 'NUEVO'}
                </span>
            </div>

            {/* Image */}
            <div className="w-full h-[65%] bg-white p-0 flex items-center justify-center relative">
                {currentProduct.custom_image_url || currentProduct.imageUrl || currentProduct.image_url ? (
                    <div className="relative w-full h-full">
                        <img
                            src={currentProduct.custom_image_url || currentProduct.imageUrl || currentProduct.image_url}
                            alt={currentProduct.name}
                            className="w-full h-full object-cover drop-shadow-xl transition-transform duration-500 group-hover:scale-105"
                            referrerPolicy="no-referrer"
                        />
                        <span className="absolute bottom-0 right-0 bg-black/50 text-white text-[10px] px-3 py-1 pointer-events-none uppercase tracking-widest font-bold rounded-tl-lg backdrop-blur-sm">
                            Imagen ilustrativa
                        </span>
                    </div>
                ) : (
                    <div className="flex flex-col items-center text-gray-300">
                        <Package className="w-16 h-16 mb-2" />
                        <span className="text-xs">Sin imagen</span>
                    </div>
                )}
            </div>

            {/* Content - SIN PRECIO */}
            <div className="px-5 py-4 flex flex-col flex-grow relative z-10 h-[35%] justify-between">
                <div>
                    <div className="mb-1">
                        <span className="text-[10px] font-bold text-white/70 uppercase tracking-wider">
                            {currentProduct.is_launch_group ? 'Lanzamiento' : currentProduct.brand}
                        </span>
                    </div>
                    <h3 className="text-lg font-bold leading-tight mb-1 line-clamp-2">
                        {currentProduct.custom_title || currentProduct.name}
                    </h3>
                    <div className="flex flex-col mt-2">
                        <span className="text-sm text-white/70 italic">
                            Inicie sesión para ver precios
                        </span>
                    </div>
                </div>
            </div>

            {/* Dots */}
            {products.length > 1 && (
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2 z-20">
                    {products.map((_, idx) => (
                        <div
                            key={idx}
                            className={`w-2 h-2 rounded-full transition-all duration-300 ${idx === currentIndex ? 'bg-white w-6' : 'bg-white/40'}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

/**
 * Grid de categorías sin precios (reutiliza la lógica de ProductGroupCarousel).
 */
const PublicCategoriesGrid = ({ groups }) => {
    if (groups.length === 0) return null;

    const displayedGroups = groups.filter((g) => !g.is_launch_group).slice(0, 5);

    return (
        <div className="relative py-4 mt-8">
            <h2 className="text-2xl font-bold mb-4 text-espint-blue">Categorías</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {displayedGroups.map((group) => (
                    <Link
                        key={group.id || group.product_group || group.group_code}
                        to={group.type === 'static_group' ? `/category/${group.group_code}` : `/collection/${group.id || group.collection_id}`}
                        className="w-full bg-white rounded-lg overflow-hidden transition-all duration-200 ease-in-out hover:-translate-y-1 shadow-sm hover:shadow-md border-b-[3px] border-espint-green group flex flex-col h-auto aspect-square md:aspect-auto md:h-auto"
                    >
                        {group.imageUrl ? (
                            <div className="relative w-full h-40 md:h-48 overflow-hidden">
                                <img
                                    src={group.imageUrl}
                                    alt={group.name}
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                    loading="lazy"
                                />
                                <span className="absolute bottom-0 right-0 bg-black/50 text-white text-[8px] px-1.5 py-0.5 pointer-events-none uppercase tracking-wider font-medium rounded-tl-sm backdrop-blur-sm">
                                    Imagen ilustrativa
                                </span>
                            </div>
                        ) : (
                            <div className="w-full h-40 md:h-48 bg-[#183B64] flex items-center justify-center p-4">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                </svg>
                            </div>
                        )}
                        <div className="p-3 md:p-4 flex-grow flex items-center justify-center md:block bg-white">
                            <h3 className="text-sm md:text-base font-bold text-espint-blue text-center md:text-left md:whitespace-nowrap md:overflow-hidden md:text-ellipsis line-clamp-2 md:line-clamp-1">
                                {group.name}
                            </h3>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
};

/**
 * Grid de accesorios sin precios.
 */
const PublicAccessoriesGrid = ({ accessories }) => {
    if (accessories.length === 0) return null;

    const displayed = accessories.slice(0, 5);

    return (
        <div className="relative py-4 mt-8">
            <h2 className="text-2xl font-bold mb-4 text-espint-blue">Accesorios</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {displayed.map((item) => (
                    <Link
                        key={item.id}
                        to={`/product-detail/${item.id}`}
                        className="w-full bg-white rounded-lg overflow-hidden transition-all duration-200 ease-in-out hover:-translate-y-1 shadow-sm hover:shadow-md border-b-[3px] border-espint-green group"
                    >
                        <div className="relative">
                            {item.imageUrl ? (
                                <>
                                    <img
                                        src={item.imageUrl}
                                        alt={item.name}
                                        className="w-full h-32 object-contain p-2"
                                        referrerPolicy="no-referrer"
                                        loading="lazy"
                                    />
                                    <span className="absolute bottom-0 right-0 bg-black/60 text-white text-[7px] px-1.5 py-0.5 pointer-events-none uppercase font-bold rounded-tl-sm">
                                        Ilustrativa
                                    </span>
                                </>
                            ) : (
                                <div className="w-full h-32 bg-gray-100 flex items-center justify-center">
                                    <Package className="w-8 h-8 text-gray-300" />
                                </div>
                            )}
                        </div>
                        <div className="p-3">
                            <h3 className="text-sm font-bold text-espint-blue whitespace-nowrap truncate">
                                {item.name}
                            </h3>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
};

// ============================================================
// Skeleton de carga
// ============================================================
const PublicDashboardSkeleton = () => (
    <div className="font-sans p-2 md:p-4 w-full animate-pulse">
        <div className="h-32 bg-gray-200 rounded-3xl mb-8"></div>
        <div className="h-8 w-48 bg-gray-200 rounded mb-4"></div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-gray-200 rounded-lg h-56"></div>
            ))}
        </div>
    </div>
);

// ============================================================
// Página Principal Pública
// ============================================================
const PublicDashboardPage = () => {
    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

    // Fetch datos públicos (sin auth token)
    const { data: groups = [], isLoading: loadingGroups } = useQuery({
        queryKey: ['public-product-groups'],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/public/product-groups`);
            if (!res.ok) throw new Error('Error cargando categorías');
            return res.json();
        },
        staleTime: 1000 * 60 * 5,
    });

    const { data: accessories = [], isLoading: loadingAccessories } = useQuery({
        queryKey: ['public-accessories'],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/public/accessories`);
            if (!res.ok) throw new Error('Error cargando accesorios');
            return res.json();
        },
        staleTime: 1000 * 60 * 5,
    });

    const { data: newReleases = [], isLoading: loadingReleases } = useQuery({
        queryKey: ['public-new-releases'],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/public/new-releases`);
            if (!res.ok) throw new Error('Error cargando lanzamientos');
            return res.json();
        },
        staleTime: 1000 * 60 * 5,
    });

    const isLoading = loadingGroups || loadingAccessories || loadingReleases;

    if (isLoading) {
        return <PublicDashboardSkeleton />;
    }

    // Separar launch groups de los new releases
    const launchGroups = groups.filter((g) => g.is_launch_group);
    const combinedReleases = [...launchGroups, ...newReleases];

    return (
        <div className="font-sans">
            <SEOHead
                title="Catálogo de Pinturas y Accesorios"
                description="Explorá nuestro catálogo mayorista de pinturas y accesorios para pinturerías. Marcas líderes, stock permanente y envíos a todo el país. Solicitá tu acceso."
                canonical="/catalogo"
                jsonLd={ORGANIZATION_SCHEMA}
            />
            <main className="p-2 md:p-4 w-full">
                {/* Banner CTA de Registro */}
                <RegistrationBanner />

                <div className="flex flex-col md:flex-row gap-6 mt-4">
                    {/* Sidebar Banner - Nuevos Lanzamientos */}
                    {combinedReleases.length > 0 && (
                        <div className="flex-shrink-0 hidden md:flex md:flex-col mt-8 py-4">
                            <h2 className="text-2xl font-bold mb-4 text-espint-blue break-words w-64 lg:w-72 leading-tight">
                                Nuevos Lanzamientos
                            </h2>
                            <PublicNewReleasesBanner products={combinedReleases} />
                        </div>
                    )}

                    {/* Mobile Banner */}
                    {combinedReleases.length > 0 && (
                        <div className="block md:hidden mb-4">
                            <PublicNewReleasesBanner products={combinedReleases} />
                        </div>
                    )}

                    {/* Main Content */}
                    <div className="flex-grow w-full min-w-0 space-y-8">
                        <PublicCategoriesGrid groups={groups} />
                        <PublicAccessoriesGrid accessories={accessories} />
                    </div>
                </div>

                {/* Bottom CTA */}
                <div className="mt-12 mb-4 text-center">
                    <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100">
                        <h3 className="text-xl font-bold text-gray-800 mb-2">
                            ¿Querés ver precios y realizar pedidos?
                        </h3>
                        <p className="text-gray-500 mb-4">
                            Completá una solicitud de acceso y un representante te contactará.
                        </p>
                        <Link
                            to="/solicitar-acceso"
                            className="inline-flex items-center gap-2 bg-[#0B3D68] hover:bg-[#0a3459] text-white font-semibold px-8 py-3 rounded-xl transition-colors shadow-md"
                        >
                            <UserPlus className="w-5 h-5" />
                            Solicitar Acceso
                            <ChevronRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default PublicDashboardPage;
