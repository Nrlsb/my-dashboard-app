import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, UserPlus } from 'lucide-react';
import logoWhite from '../assets/espintBlanco.svg';

/**
 * Header simplificado para visitantes no autenticados.
 * Solo muestra logo, botón de login y solicitar acceso.
 */
const PublicHeader = () => {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col w-full z-50 sticky top-0 font-sans">
            {/* Top Bar sutil */}
            <div className="bg-[#002244] text-white py-1.5 border-b border-white/10">
                <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex justify-center items-center text-xs">
                    <span className="text-white/70">
                        Distribuidora de pinturas y accesorios — Solicitá tu acceso para ver precios
                    </span>
                </div>
            </div>

            {/* Main Header */}
            <header className="bg-espint-blue shadow-lg relative z-20">
                <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16 md:h-20 gap-4">

                        {/* Logo */}
                        <div className="flex-shrink-0 transition-transform hover:scale-105 duration-300 flex items-center gap-4 md:gap-8">
                            <button onClick={() => navigate('/catalogo')}>
                                <img src={logoWhite} alt="Espint Distribuidora" className="h-8 md:h-16" />
                            </button>

                            {/* Enlace al Catálogo */}
                            <button
                                onClick={() => navigate('/products')}
                                className="text-white/90 hover:text-white font-bold text-sm md:text-lg uppercase tracking-wider transition-colors border-b-2 border-transparent hover:border-[#7BBF42] pb-1"
                            >
                                Catálogo
                            </button>
                        </div>


                        {/* Right Actions */}
                        <div className="flex items-center gap-2 md:gap-3">
                            <button
                                onClick={() => navigate('/solicitar-acceso')}
                                className="flex items-center gap-1.5 bg-[#7BBF42] hover:bg-[#6aad35] text-white font-semibold px-3 md:px-5 py-2 md:py-2.5 rounded-lg transition-colors text-sm shadow-md"
                            >
                                <UserPlus className="w-4 h-4" />
                                <span className="hidden md:inline">Solicitar Acceso</span>
                                <span className="md:hidden">Registrarse</span>
                            </button>

                            <button
                                onClick={() => navigate('/login')}
                                className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white font-semibold px-3 md:px-5 py-2 md:py-2.5 rounded-lg transition-colors text-sm backdrop-blur-sm"
                            >
                                <LogIn className="w-4 h-4" />
                                <span className="hidden md:inline">Iniciar Sesión</span>
                                <span className="md:hidden">Ingresar</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>


        </div>
    );
};

export default PublicHeader;
