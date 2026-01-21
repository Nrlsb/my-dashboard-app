import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, Phone, ArrowLeft } from 'lucide-react';

const TestUserExpiredPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const vendor = location.state?.vendor;
    const message = location.state?.message; // [NUEVO]

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                        <AlertTriangle className="h-6 w-6 text-red-600" />
                    </div>

                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        Acceso Revocado
                    </h2>

                    <p className="text-gray-600 mb-6">
                        {message || "Su cuenta de prueba ha expirado. Para obtener acceso total, por favor contacte a su vendedor."}
                    </p>

                    {vendor ? (
                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 w-full text-left mb-6">
                            <p className="text-sm text-blue-800 font-semibold mb-2">
                                Datos del Vendedor:
                            </p>
                            <p className="text-gray-700"><strong>Nombre:</strong> {vendor.name}</p>
                            <p className="text-gray-700"><strong>Email:</strong> {vendor.email}</p>
                            {vendor.phone && <p className="text-gray-700"><strong>Teléfono:</strong> {vendor.phone}</p>}
                        </div>
                    ) : (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 w-full text-left mb-6">
                            <p className="text-sm text-gray-600">
                                No se encontró información de contacto del vendedor. Por favor, comuníquese con soporte.
                            </p>
                        </div>
                    )}

                    <button
                        onClick={() => navigate('/login')}
                        className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Volver al Inicio de Sesión
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TestUserExpiredPage;
