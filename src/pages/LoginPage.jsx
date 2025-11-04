import React, { useState } from 'react';

// (NUEVO) Definimos la URL de la API
const API_URL = 'http://localhost:3001';

// --- Componente de Login ---
const LoginPage = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false); // (NUEVO) Estado de carga

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Validar campos vacíos en el frontend primero
    if (username.trim() === '' || password.trim() === '') {
      setError('Usuario o contraseña no pueden estar vacíos.');
      return;
    }

    setIsLoading(true); // (NUEVO) Empezar carga

    try {
      // (NUEVO) Llamada a la API de middleware
      const response = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        // Si la respuesta no es 2xx (ej. 401 Unauthorized)
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error de autenticación');
      }

      // const data = await response.json();
      // console.log('Login exitoso:', data);

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
          {/* ... campos de usuario y contraseña ... */}
          {/* ... (sin cambios aquí) ... */}
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">
              Usuario
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Tu usuario"
              disabled={isLoading}
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={isLoading}
            />
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
      </div>
    </div>
  );
};

export default LoginPage;
