import React, { useState } from 'react';
import { Mail, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext'; // Importar useAuth

// --- Componente de Login ---
const LoginPage = ({ onNavigate, onLogin }) => { 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false); 

  const { login } = useAuth(); // Usar el hook useAuth

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true); 

    try {
      const result = await onLogin(email, password); // Llamar a la función onLogin del App.jsx
      if (result.success) {
        // Si el login es exitoso, AuthContext ya maneja el estado y el localStorage
        // No necesitamos hacer nada aquí, App.jsx detectará el cambio en isAuthenticated
      } else {
        // Si el login falla, el error ya se ha manejado en AuthContext
        // Podemos mostrar un mensaje genérico o el mensaje específico si AuthContext lo devuelve
        setError(result.message || 'Credenciales inválidas. Inténtalo de nuevo.');
      }
    } catch (err) {
      console.error(err);
      setError('Ocurrió un error inesperado durante el inicio de sesión.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 font-sans">
      <div className="w-full max-w-sm p-8 space-y-6 bg-white rounded-lg shadow-xl">
        {/* Logo */}
        <div className="text-center">
          <span className="text-3xl font-bold text-red-600">Pintureria Mercurio</span>
        </div>
        
        <h2 className="text-2xl font-bold text-center text-gray-800">Iniciar Sesión</h2>
        
        <form className="space-y-6" onSubmit={handleSubmit}>
          
          {/* Campo de Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <div className="relative mt-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <Mail className="w-5 h-5 text-gray-400" />
              </span>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                disabled={isLoading}
              />
            </div>
          </div>
          
          {/* Campo de Contraseña */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Contraseña
            </label>
            <div className="relative mt-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <Lock className="w-5 h-5 text-gray-400" />
              </span>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={isLoading}
              />
            </div>
          </div>
          
          {/* Mensaje de Error */}
          {error && (
            <p className="text-sm text-center text-red-600">{error}</p>
          )}

          {/* Botón de Ingreso (con estado de carga) */}
          <button
            type="submit"
            className="w-full px-4 py-2 font-semibold text-white bg-red-600 rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            {isLoading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
        
        {/* Enlace a Registro */}
        <div className="text-sm text-center text-gray-600">
          ¿No tienes una cuenta?{' '}
          <button
            onClick={() => onNavigate('register')}
            className="font-medium text-red-600 hover:text-red-500"
            disabled={isLoading}
          >
            Regístrate aquí
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;