import React from 'react';
import { toast } from 'react-hot-toast';
import { RefreshCw } from 'lucide-react';
import apiService from '../../api/apiService';

const ConnectionsTab = () => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded shadow border border-gray-200 flex flex-col items-center text-center">
                <div className="bg-green-100 p-4 rounded-full mb-4">
                    <RefreshCw size={40} className="text-green-600" />
                </div>
                <h3 className="font-bold text-lg mb-2">Sincronización Manual</h3>
                <p className="text-gray-600 text-sm mb-6">
                    Ejecuta manualmente el proceso de sincronización de productos y precios desde Protheus.
                </p>
                <button
                    onClick={async () => {
                        if (window.confirm('¿Deseas iniciar la sincronización manual? Este proceso puede tomar varios minutos.')) {
                            try {
                                const promise = apiService.triggerManualSync();
                                toast.promise(promise, {
                                    loading: 'Iniciando sincronización...',
                                    success: 'Sincronización completada',
                                    error: 'Error al sincronizar'
                                });
                                await promise;
                            } catch (error) {
                                console.error(error);
                            }
                        }
                    }}
                    className="bg-green-600 text-white px-4 py-2 rounded font-bold hover:bg-green-700 transition w-full"
                >
                    Sincronizar Ahora
                </button>
            </div>

            <div className="bg-white p-6 rounded shadow border border-gray-200 flex flex-col items-center text-center">
                <div className="bg-purple-100 p-4 rounded-full mb-4">
                    <RefreshCw size={40} className="text-purple-600" />
                </div>
                <h3 className="font-bold text-lg mb-2">Sincronización Total</h3>
                <p className="text-gray-600 text-sm mb-6">
                    Sincroniza Productos, Precios, Clientes y Vendedores. Útil para actualizaciones masivas o iniciales.
                </p>
                <button
                    onClick={async () => {
                        if (window.confirm('¿Deseas iniciar la sincronización TOTAL? Este proceso abarca TODA la base de datos y puede demorar varios minutos.')) {
                            try {
                                const promise = apiService.triggerFullSync();
                                toast.promise(promise, {
                                    loading: 'Iniciando sincronización completa...',
                                    success: 'Sincronización total completada',
                                    error: 'Error al sincronizar'
                                });
                                await promise;
                            } catch (error) {
                                console.error(error);
                            }
                        }
                    }}
                    className="bg-purple-600 text-white px-4 py-2 rounded font-bold hover:bg-purple-700 transition w-full"
                >
                    Sincronizar Todo
                </button>
            </div>
        </div>
    );
};

export default ConnectionsTab;
