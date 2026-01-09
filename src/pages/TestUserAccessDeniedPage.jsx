import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Phone, ArrowLeft } from 'lucide-react';

const TestUserAccessDeniedPage = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                        <AlertTriangle className="h-6 w-6 text-red-600" />
                    </div>

                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        Acceso Restringido
                    </h2>

                    <p className="text-gray-600 mb-6">
                        Los usuarios de prueba no tienen permitido confirmar pedidos.
                    </p>

                    <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6 text-left">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <Phone className="h-5 w-5 text-blue-400" />
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-blue-700">
                                    Por favor, contacte con su vendedor para solicitar acceso completo.
                                </p>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => navigate('/dashboard')}
                        className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Volver al Dashboard
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TestUserAccessDeniedPage;
