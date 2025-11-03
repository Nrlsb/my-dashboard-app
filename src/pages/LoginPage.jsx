import React, { useState } from 'react';

// --- Componente de Login ---
const LoginPage = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // Lógica de autenticación de simulación
    if (username.trim() !== '' && password.trim() !== '') {
      setError('');
      onLoginSuccess(); // Llama a la función del padre para cambiar el estado
    } else {
      setError('Usuario o contraseña no pueden estar vacíos.');
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
          {/* Campo Usuario */}
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
            />
          </div>
          
          {/* Campo Contraseña */}
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
            />
          </div>

          {/* Mensaje de Error */}
          {error && (
            <p className="text-sm text-center text-red-600">{error}</p>
          )}

          {/* Botón de Ingreso */}
          <button
            type="submit"
            className="w-full px-4 py-2 font-semibold text-white bg-red-600 rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors duration-200"
          >
            Ingresar
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
