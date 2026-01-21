import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { FileSpreadsheet, Eye, EyeOff } from 'lucide-react';
import apiService from '../../api/apiService';

const ReportsTab = () => {
    const [showNoImage, setShowNoImage] = useState(true);
    const [loadingSetting, setLoadingSetting] = useState(false);

    useEffect(() => {
        fetchSetting();
    }, []);

    const fetchSetting = async () => {
        try {
            const data = await apiService.getGlobalSetting('show_no_image_products');
            // If value is null, default is true
            setShowNoImage(data.value !== 'false');
        } catch (error) {
            console.error('Error fetching setting:', error);
        }
    };

    const handleToggleVisibility = async () => {
        const newValue = !showNoImage;
        const previousValue = showNoImage;
        setShowNoImage(newValue); // Optimistic update
        setLoadingSetting(true);

        try {
            await apiService.updateGlobalSetting('show_no_image_products', newValue ? 'true' : 'false');
            toast.success(`Visibilidad actualizada: ${newValue ? 'Todos los productos' : 'Solo con imágenes'}`);
        } catch (error) {
            console.error('Error updating setting:', error);
            setShowNoImage(previousValue); // Revert
            toast.error('Error al actualizar la configuración');
        } finally {
            setLoadingSetting(false);
        }
    };

    const handleDownloadMissingImagesReport = async () => {
        try {
            const blob = await apiService.downloadMissingImagesReport();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'reporte_faltantes.xlsx';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            toast.success('Reporte descargado correctamente');
        } catch (error) {
            console.error(error);
            toast.error('Error al descargar el reporte');
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded shadow border border-gray-200 flex flex-col items-center text-center">
                <div className="bg-blue-100 p-4 rounded-full mb-4">
                    <FileSpreadsheet size={40} className="text-blue-600" />
                </div>
                <h3 className="font-bold text-lg mb-2">Productos Sin Imágenes</h3>
                <p className="text-gray-600 text-sm mb-6">
                    Genera un reporte Excel con todos los productos activos que no tienen imágenes asignadas.
                </p>
                <button
                    onClick={handleDownloadMissingImagesReport}
                    className="bg-blue-600 text-white px-4 py-2 rounded font-bold hover:bg-blue-700 transition w-full"
                >
                    Descargar Excel
                </button>
            </div>

            {/* Visibility Settings Card */}
            <div className="bg-white p-6 rounded shadow border border-gray-200 flex flex-col items-center text-center">
                <div className={`p-4 rounded-full mb-4 transition-colors ${showNoImage ? 'bg-green-100' : 'bg-gray-100'}`}>
                    {showNoImage ? (
                        <Eye size={40} className="text-green-600" />
                    ) : (
                        <EyeOff size={40} className="text-gray-500" />
                    )}
                </div>
                <h3 className="font-bold text-lg mb-2">Visibilidad Global</h3>
                <p className="text-gray-600 text-sm mb-6">
                    Controla si los clientes pueden ver productos que no tienen imagen cargada.
                </p>

                <div className="flex items-center justify-center gap-3 w-full">
                    <span className={`text-sm font-medium ${!showNoImage ? 'text-gray-900' : 'text-gray-500'}`}>
                        Ocultar sin imagen
                    </span>

                    <button
                        onClick={handleToggleVisibility}
                        disabled={loadingSetting}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${showNoImage ? 'bg-green-500' : 'bg-gray-200'
                            }`}
                    >
                        <span
                            className={`${showNoImage ? 'translate-x-6' : 'translate-x-1'
                                } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                        />
                    </button>

                    <span className={`text-sm font-medium ${showNoImage ? 'text-gray-900' : 'text-gray-500'}`}>
                        Mostrar todo
                    </span>
                </div>
                <p className="text-xs text-gray-400 mt-4">
                    {showNoImage
                        ? 'Los clientes ven todos los productos del catálogo.'
                        : 'Los clientes solo ven productos con foto.'}
                </p>
            </div>
        </div>

    );
};

export default ReportsTab;
