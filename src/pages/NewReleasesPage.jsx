import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const NewReleasesPage = () => {
    const navigate = useNavigate();

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen bg-gray-50">
            <button
                onClick={() => navigate(-1)}
                className="mb-6 flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Volver
            </button>

            <div className="bg-white rounded-3xl shadow-lg p-6 md:p-10">
                <h1 className="text-3xl font-bold text-gray-800 mb-8 border-b pb-4">Nuevos Lanzamientos</h1>

                <div className="flex flex-col md:flex-row gap-8 items-start">
                    {/* Image Placeholder */}
                    <div className="w-full md:w-1/2 aspect-video bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center border-2 border-dashed border-indigo-200">
                        <span className="text-indigo-400 font-medium">Imagen del Lanzamiento</span>
                        {/* <img src="/path/to/image.jpg" alt="Nuevo Lanzamiento" className="w-full h-full object-cover rounded-2xl shadow-sm" /> */}
                    </div>

                    <div className="w-full md:w-1/2">
                        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Descubre lo Nuevo</h2>
                        <p className="text-gray-600 leading-relaxed text-lg">
                            Aquí encontrarás información detallada sobre nuestros últimos productos y actualizaciones.
                            Estamos constantemente innovando para ofrecerte las mejores soluciones.
                            <br /><br />
                            ¡Explora las novedades y mantente al día con lo último en tecnología y diseño!
                        </p>

                        <div className="mt-8 p-4 bg-blue-50 rounded-xl border border-blue-100">
                            <p className="text-sm text-blue-700 font-medium">
                                🌟 Tip: Revisa esta sección periódicamente para no perderte ninguna oferta especial de lanzamiento.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NewReleasesPage;
