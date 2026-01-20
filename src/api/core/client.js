import axios from 'axios';
import toast from 'react-hot-toast';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor para agregar el token a las peticiones
apiClient.interceptors.request.use(
    (config) => {
        // El token se gestionará externamente o se puede obtener de localStorage si se decide cambiar la estrategia
        // Por ahora, mantenemos la compatibilidad con el método setAuthToken del apiService original
        // o permitimos que el servicio de autenticación maneje el token.
        // Sin embargo, para mantener la compatibilidad con la implementación actual de apiService,
        // permitiremos que el token se inyecte dinámicamente.
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Helper para mensajes de error amigables
const getFriendlyErrorMessage = (status) => {
    switch (status) {
        case 400:
            return "Datos inválidos. Por favor verifique la información.";
        case 401:
            return "Sesión no válida. Por favor ingrese nuevamente.";
        case 403:
            return "Acceso denegado. No tiene permisos para realizar esta acción.";
        case 404:
            return "Recurso no encontrado.";
        case 409:
            return "Conflicto en la solicitud. Intente nuevamente.";
        case 500:
        case 502:
        case 503:
        case 504:
            return "Error en el servidor. Intente más tarde.";
        default:
            return "Ocurrió un error inesperado. Intente nuevamente.";
    }
};

// Interceptor para manejo de respuestas y errores
apiClient.interceptors.response.use(
    (response) => {
        return response.data;
    },
    (error) => {
        const status = error.response ? error.response.status : null;
        const data = error.response ? error.response.data : {};

        // Mostrar notificación amigable
        if (status) {
            const friendlyMessage = getFriendlyErrorMessage(status);
            // Evitar mostar toast si es 401 y quizas estamos verificando sesion silenciosamente? 
            // Por ahora mantenemos el comportamiento original.
            toast.error(friendlyMessage);
        } else {
            toast.error('Error de conexión o desconocido.');
        }

        const customError = new Error(data.message || error.message || 'Error en la solicitud');
        customError.data = data;
        customError.status = status;
        return Promise.reject(customError);
    }
);

// Función para setear el token manualmente (compatibilidad)
export const setAuthToken = (token) => {
    if (token) {
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
        delete apiClient.defaults.headers.common['Authorization'];
    }
};

export default apiClient;
