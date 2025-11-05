import React, { useState } from 'react';
import { Mail, Lock } from 'lucide-react'; // (NUEVO) Iconos

// (NUEVO) Definimos la URL de la API
const API_URL = 'http://localhost:3001';

// --- Componente de Login ---
const LoginPage = ({ onLoginSuccess, onNavigate }) => { 
  const [email, setEmail] = useState(''); // (ACTUALIZADO) de username a email
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false); 

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Validar campos vacíos en el frontend primero
    if (email.trim() === '' || password.trim() === '') { // (ACTUALIZADO)
      setError('Email o contraseña no pueden estar vacíos.'); // (ACTUALIZADO)
      return;
    }

    setIsLoading(true); 

    try {
      // (NUEVO) Llamada a la API de middleware
      const response = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }), // (ACTUALIZADO)
      });

      if (!response.ok) {
        // Si la respuesta no es 2xx (ej. 401 Unauthorized)
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error de autenticación');
      }

      // Si la autenticación es exitosa
      onLoginSuccess(); // Llama a la función del padre para cambiar el estado

    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setIsLoading(false); // (NUEVO) Terminar carga
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
          
          {/* (ACTUALIZADO) Campo de Email */}
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
          
          {/* (ACTUALIZADO) Campo de Contraseña */}
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
            disabled={isLoading} // (NUEVO) Deshabilitar mientras carga
          >
            {isLoading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
        
        {/* (NUEVO) Enlace a Registro */}
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