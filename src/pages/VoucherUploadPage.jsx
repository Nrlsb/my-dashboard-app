import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  UploadCloud,
  File as FileIcon,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import apiService from '../api/apiService';
import { useAuth } from '../context/AuthContext';

const VoucherUploadPage = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploaded, setIsUploaded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const handleFileChange = (files) => {
    if (files && files[0]) {
      const file = files[0];
      if (
        file.type === 'image/png' ||
        file.type === 'image/jpeg' ||
        file.type === 'application/pdf'
      ) {
        setSelectedFile(file);
        setError(null);
      } else {
        setError('Tipo de archivo no permitido. Solo PNG, JPG o PDF.');
        setSelectedFile(null);
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileChange(e.dataTransfer.files);
  };

  const handleFileSelect = (e) => {
    handleFileChange(e.target.files);
  };

  const openFileDialog = () => {
    if (isLoading || isUploaded) return;
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile || !currentUser) {
      if (!currentUser) setError('Error de autenticación.');
      return;
    }

    setIsLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('voucherFile', selectedFile);

    try {
      await apiService.uploadVoucher(formData);
      setIsUploaded(true);

      setTimeout(() => {
        setIsUploaded(false);
        setSelectedFile(null);
        navigate('/dashboard');
      }, 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <main className="p-4 md:p-8 max-w-7xl mx-auto">
        <div className="flex items-center mb-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center justify-center p-2 mr-4 text-gray-600 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors"
            aria-label="Volver al dashboard"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold text-gray-800">
            Carga de Comprobantes
          </h1>
        </div>

        <div className="p-6 md:p-8 bg-white rounded-lg shadow-md">
          {isUploaded ? (
            <div className="text-center p-8">
              <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
              <h2 className="text-2xl font-semibold text-green-600 mb-4">
                ¡Archivo Subido!
              </h2>
              <p className="text-gray-700">
                El comprobante se ha cargado correctamente.
              </p>
              <p className="text-gray-500 mt-4 text-sm">
                Serás redirigido al dashboard en 3 segundos...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={openFileDialog}
                className={`flex flex-col items-center justify-center p-10 border-2 border-dashed rounded-lg transition-colors
                  ${isDragging ? 'border-red-500 bg-red-50' : 'border-gray-300'}
                  ${
                    isLoading || isUploaded
                      ? 'cursor-not-allowed bg-gray-50'
                      : 'cursor-pointer hover:border-gray-400'
                  }
                `}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                  accept="image/png, image/jpeg, application/pdf"
                  disabled={isLoading || isUploaded}
                />
                <UploadCloud className="w-12 h-12 text-gray-400 mb-4" />
                <p className="text-center text-gray-600">
                  Arrastra y suelta tu archivo aquí
                </p>
                <p className="text-sm text-gray-500">
                  o haz clic para seleccionar
                </p>
                <p className="text-xs text-gray-400 mt-2">(PNG, JPG o PDF)</p>
              </div>

              {selectedFile && (
                <div className="flex items-center justify-between p-3 bg-gray-100 rounded-md border border-gray-200">
                  <div className="flex items-center space-x-2 overflow-hidden">
                    <FileIcon className="w-5 h-5 text-gray-600 flex-shrink-0" />
                    <span className="text-sm font-medium text-gray-800 truncate">
                      {selectedFile.name}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="text-sm font-medium text-red-600 hover:text-red-800 ml-2"
                    disabled={isLoading}
                  >
                    Quitar
                  </button>
                </div>
              )}

              {error && (
                <div className="flex items-center p-3 bg-red-100 text-red-700 rounded-md">
                  <AlertTriangle className="w-5 h-5 mr-2 flex-shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <div className="mt-6 text-right">
                <button
                  type="submit"
                  disabled={!selectedFile || isLoading || isUploaded}
                  className="inline-flex items-center px-6 py-2 font-semibold text-white bg-red-600 rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <UploadCloud className="w-4 h-4 mr-2" />
                  {isLoading ? 'Subiendo...' : 'Subir Comprobante'}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
};

export default VoucherUploadPage;
