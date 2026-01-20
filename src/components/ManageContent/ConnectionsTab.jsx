import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import apiService from '../../api/apiService';
import { API_BASE_URL } from '../../api/core/client';

// Simple Progress Bar Component
const ProgressBar = ({ progress, message }) => (
    <div className="w-full mt-4">
        <div className="flex justify-between text-xs mb-1">
            <span className="font-medium text-gray-700">{message}</span>
            <span className="font-medium text-gray-700">{progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
            ></div>
        </div>
    </div>
);

const ConnectionsTab = () => {
    const [isSyncing, setIsSyncing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [statusMessage, setStatusMessage] = useState('');
    const [syncType, setSyncType] = useState(null); // 'manual' or 'full'

    // Function to handle SSE connection and sync trigger
    const handleSync = async (type) => {
        if (isSyncing) return;

        const confirmMsg = type === 'manual'
            ? '¿Deseas iniciar la sincronización manual? Este proceso puede tomar varios minutos.'
            : '¿Deseas iniciar la sincronización TOTAL? Este proceso abarca TODA la base de datos y puede demorar varios minutos.';

        if (!window.confirm(confirmMsg)) return;

        setIsSyncing(true);
        setSyncType(type);
        setProgress(0);
        setStatusMessage('Iniciando conexión...');

        // 1. Setup SSE Listener
        const token = localStorage.getItem('authToken');
        // Construct SSE URL.
        const eventSourceUrl = `${API_BASE_URL}/admin/sync-events?token=${token}`;

        const eventSource = new EventSource(eventSourceUrl);

        eventSource.onopen = () => {
            console.log("SSE Connection Opened");
        };

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'progress') {
                    if (data.percent !== null) setProgress(data.percent);
                    if (data.message) setStatusMessage(data.message);

                    if (data.status === 'completed') {
                        toast.success(data.message || 'Sincronización completada');
                        closeConnection();
                    } else if (data.status === 'error') {
                        toast.error(data.message || 'Error en la sincronización');
                        closeConnection();
                    }
                }
            } catch (err) {
                console.error("Error parsing SSE data", err);
            }
        };

        eventSource.onerror = (err) => {
            console.error("SSE Error", err);
            // Don't close immediately on minor network glitches, but if persistent...
            // For now, let's close if state is 'completed' logic failed or connection dropped hard.
            // Check readyState: 0=CONNECTING, 1=OPEN, 2=CLOSED
            if (eventSource.readyState === 2) {
                closeConnection();
            }
        };

        const closeConnection = () => {
            eventSource.close();
            setIsSyncing(false);
            setSyncType(null);
        };

        // 2. Trigger the Sync Process via API
        try {
            if (type === 'manual') {
                await apiService.triggerManualSync();
            } else {
                await apiService.triggerFullSync();
            }
        } catch (error) {
            console.error(error);
            toast.error('No se pudo iniciar la sincronización.');
            closeConnection();
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded shadow border border-gray-200 flex flex-col items-center text-center relative overflow-hidden">
                <div className="bg-green-100 p-4 rounded-full mb-4">
                    <RefreshCw size={40} className={`text-green-600 ${isSyncing && syncType === 'manual' ? 'animate-spin' : ''}`} />
                </div>
                <h3 className="font-bold text-lg mb-2">Sincronización Manual</h3>
                <p className="text-gray-600 text-sm mb-6">
                    Ejecuta manualmente el proceso de sincronización de productos y precios desde Protheus.
                </p>

                {isSyncing && syncType === 'manual' ? (
                    <ProgressBar progress={progress} message={statusMessage} />
                ) : (
                    <button
                        onClick={() => handleSync('manual')}
                        disabled={isSyncing}
                        className={`bg-green-600 text-white px-4 py-2 rounded font-bold hover:bg-green-700 transition w-full ${isSyncing ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {isSyncing ? 'Sincronizando...' : 'Sincronizar Ahora'}
                    </button>
                )}
            </div>

            <div className="bg-white p-6 rounded shadow border border-gray-200 flex flex-col items-center text-center relative overflow-hidden">
                <div className="bg-purple-100 p-4 rounded-full mb-4">
                    <RefreshCw size={40} className={`text-purple-600 ${isSyncing && syncType === 'full' ? 'animate-spin' : ''}`} />
                </div>
                <h3 className="font-bold text-lg mb-2">Sincronización Total</h3>
                <p className="text-gray-600 text-sm mb-6">
                    Sincroniza Productos, Precios, Clientes y Vendedores. Útil para actualizaciones masivas o iniciales.
                </p>

                {isSyncing && syncType === 'full' ? (
                    <ProgressBar progress={progress} message={statusMessage} />
                ) : (
                    <button
                        onClick={() => handleSync('full')}
                        disabled={isSyncing}
                        className={`bg-purple-600 text-white px-4 py-2 rounded font-bold hover:bg-purple-700 transition w-full ${isSyncing ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {isSyncing ? 'Sincronizando...' : 'Sincronizar Todo'}
                    </button>
                )}
            </div>
        </div>
    );
};

export default ConnectionsTab;
