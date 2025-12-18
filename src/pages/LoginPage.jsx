import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.svg';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await login(email, password);
      if (!result.success) {
        setError(
          result.message || 'Credenciales inválidas. Inténtalo de nuevo.'
        );
      }
      // La navegación se maneja en el componente App principal
    } catch (err) {
      console.error(err);
      setError('Ocurrió un error inesperado durante el inicio de sesión.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#F3F4F6] font-sans">
      <div className="w-full max-w-sm p-8 space-y-6 bg-white rounded-xl shadow-xl border border-gray-100">
        <div className="text-center flex justify-center">
          <img
            src={logo}
            alt="Espint Logo"
            className="h-16 w-auto"
            width="103"
            height="64"
            fetchpriority="high"
          />
        </div>

        <h2 className="text-2xl font-bold text-center text-gray-800">
          Iniciar Sesión
        </h2>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
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
                className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#0B3D68] focus:border-[#0B3D68]"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
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
                className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#0B3D68] focus:border-[#0B3D68]"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={isLoading}
              />
            </div>
          </div>

          {error && <p className="text-sm text-center text-red-600">{error}</p>}

          <button
            type="submit"
            className="w-full px-4 py-2 font-semibold text-white bg-[#0B3D68] rounded-md shadow-sm hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#0B3D68] focus:ring-offset-2 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            {isLoading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <div className="text-sm text-center text-gray-600">
          ¿No tienes una cuenta?{' '}
          <button
            onClick={() => navigate('/register')}
            className="font-medium text-[#D10074] hover:text-[#a0005a]"
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
