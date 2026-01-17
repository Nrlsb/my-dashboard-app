import React from 'react';
import { toast } from 'react-hot-toast';
import { FileSpreadsheet } from 'lucide-react';
import apiService from '../../api/apiService';

const ReportsTab = () => {
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
        </div>
    );
};

export default ReportsTab;
