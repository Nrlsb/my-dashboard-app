import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import apiService from '../api/apiService'; // Se creará en el siguiente paso

const ChangePasswordPage = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { logout } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await apiService.changePassword(newPassword);
      if (result.success) {
        setSuccess('Contraseña actualizada con éxito. Serás desconectado para que inicies sesión nuevamente.');
        setTimeout(() => {
          logout(); // Desloguear al usuario para que inicie sesión con la nueva contraseña
        }, 3000);
      } else {
        setError(result.message || 'No se pudo actualizar la contraseña.');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Ocurrió un error inesperado.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 font-sans">
      <div className="w-full max-w-sm p-8 space-y-6 bg-white rounded-lg shadow-xl">
        <div className="text-center">
          <span className="text-3xl font-bold text-red-600">Pintureria Mercurio</span>
        </div>
        
        <h2 className="text-2xl font-bold text-center text-gray-800">Establecer Nueva Contraseña</h2>
        <p className="text-sm text-center text-gray-600">
          Este es tu primer inicio de sesión. Por favor, establece una contraseña permanente.
        </p>
        
        <form className="space-y-6" onSubmit={handleSubmit}>
          
          <div>
            <label htmlFor="new-password" aname="block text-sm font-medium text-gray-700">
              Nueva Contraseña
            </label>
            <div className="relative mt-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <Lock className="w-5 h-5 text-gray-400" />
              </span>
              <input
                id="new-password"
                type="password"
                required
                className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                disabled={isLoading || success}
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
              Confirmar Contraseña
            </label>
            <div className="relative mt-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <Lock className="w-5 h-5 text-gray-400" />
              </span>
              <input
                id="confirm-password"
                type="password"
                required
                className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite la contraseña"
                disabled={isLoading || success}
              />
            </div>
          </div>
          
          {error && <p className="text-sm text-center text-red-600">{error}</p>}
          {success && <p className="text-sm text-center text-green-600">{success}</p>}

          <button
            type="submit"
            className="w-full px-4 py-2 font-semibold text-white bg-red-600 rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading || success}
          >
            {isLoading ? 'Guardando...' : 'Guardar Contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChangePasswordPage;
