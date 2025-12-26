import React, { useState } from 'react';
import { Sparkles, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import apiService from '../api/apiService';
import { toast } from 'react-hot-toast';

const BatchDescriptionGenerator = () => {
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState(null);

    const handleGenerate = async () => {
        if (!window.confirm('¿Estás seguro de que deseas generar descripciones para un lote de hasta 50 productos que tienen imagen pero no descripción? Esto puede tardar unos minutos.')) {
            return;
        }

        setLoading(true);
        setResults(null);

        try {
            const data = await apiService.batchGenerateAiDescriptions();
            setResults(data);
            toast.success(`Proceso completado: ${data.success} descripciones generadas.`);
        } catch (error) {
            console.error('Error en generación masiva:', error);
            toast.error('Error al iniciar la generación masiva.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center p-3 bg-purple-100 rounded-full mb-4">
                    <Sparkles className="w-8 h-8 text-purple-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Generación Masiva de Descripciones IA</h2>
                <p className="text-gray-600 max-w-2xl mx-auto">
                    Esta herramienta buscará automáticamente un lote de hasta 50 productos que tienen imagen cargada pero no tienen una descripción generada.
                    Utilizará inteligencia artificial para crear una descripción técnica basada en el nombre, marca y precio del producto.
                </p>
            </div>

            <div className="flex justify-center mb-8">
                <button
                    onClick={handleGenerate}
                    disabled={loading}
                    className="flex items-center px-8 py-4 bg-purple-600 text-white text-lg font-semibold rounded-xl hover:bg-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-1"
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                            Procesando...
                        </>
                    ) : (
                        <>
                            <Sparkles className="w-6 h-6 mr-3" />
                            Comenzar Generación Masiva
                        </>
                    )}
                </button>
            </div>

            {results && (
                <div className="mt-8 border-t pt-8 animate-in fade-in slide-in-from-bottom-4">
                    <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">Resultados del Proceso</h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-blue-50 p-4 rounded-lg text-center border border-blue-100">
                            <p className="text-sm text-blue-600 font-medium uppercase tracking-wider">Total Procesados</p>
                            <p className="text-3xl font-bold text-blue-800">{results.total}</p>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg text-center border border-green-100">
                            <p className="text-sm text-green-600 font-medium uppercase tracking-wider">Exitosos</p>
                            <p className="text-3xl font-bold text-green-800">{results.success}</p>
                        </div>
                        <div className="bg-red-50 p-4 rounded-lg text-center border border-red-100">
                            <p className="text-sm text-red-600 font-medium uppercase tracking-wider">Fallidos</p>
                            <p className="text-3xl font-bold text-red-800">{results.failed}</p>
                        </div>
                    </div>

                    {results.details && results.details.length > 0 && (
                        <div className="bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto border border-gray-200">
                            <h4 className="font-semibold text-gray-700 mb-2 sticky top-0 bg-gray-50 pb-2 border-b">Detalles:</h4>
                            <ul className="space-y-2">
                                {results.details.map((item, index) => (
                                    <li key={index} className="flex items-center text-sm">
                                        {item.status === 'success' ? (
                                            <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                                        ) : (
                                            <AlertCircle className="w-4 h-4 text-red-500 mr-2 flex-shrink-0" />
                                        )}
                                        <span className="font-medium mr-2">{item.code}:</span>
                                        <span className={item.status === 'success' ? 'text-gray-600' : 'text-red-600'}>
                                            {item.status === 'success' ? 'Generado correctamente' : item.error || 'Error desconocido'}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default BatchDescriptionGenerator;
