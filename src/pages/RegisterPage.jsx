import React, { useState } from 'react';
import { UserPlus, ArrowLeft, Mail, Lock, User } from 'lucide-react';

const API_URL = 'http://localhost:3001';

// --- Componente de Registro (SIMPLIFICADO) ---
const RegisterPage = ({ onNavigate }) => {
  // Estados para los nuevos campos
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Estados de UI
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // --- Validación Frontend ---
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    
    // Validar campos requeridos
    if (!nombre || !email || !password) {
      setError('Por favor, completa todos los campos.');
      return;
    }

    setIsLoading(true);

    try {
      // (ACTUALIZADO) Enviar solo los datos necesarios
      const response = await fetch(`${API_URL}/api/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nombre,
          email, 
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al registrar la cuenta.');
      }
      
      // Éxito
      setSuccess('¡Cuenta registrada! Serás redirigido al login...');
      setTimeout(() => {
        onNavigate('login');
      }, 2000);

    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Componente de Input reutilizable
  const FormInput = ({ label, id, value, onChange, required = false, disabled = false, type = "text", placeholder = "", icon: Icon }) => (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative mt-1">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3">
          <Icon className="w-5 h-5 text-gray-400" />
        </span>
        <input
          id={id}
          type={type}
          required={required}
          className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
        />
      </div>
    </div>
  );

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 font-sans py-12">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-xl">
        
        <div className="flex flex-col items-center">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center">
            <UserPlus className="w-8 h-8 mr-3 text-red-600" />
            Crear Cuenta
          </h2>
          <p className="text-sm text-gray-500 mt-2">Crea tu acceso inicial. Podrás completar tu perfil más tarde.</p>
        </div>
        

        <form className="space-y-6" onSubmit={handleSubmit}>
          
          <FormInput 
            label="Apellido y Nombre" 
            id="nombre" 
            value={nombre} 
            onChange={(e) => setNombre(e.target.value)} 
            required 
            disabled={isLoading} 
            placeholder="Ej: Juan Pérez"
            icon={User}
          />
          
          <FormInput 
            label="Email" 
            id="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            type="email" 
            required 
            disabled={isLoading} 
            placeholder="tu@email.com"
            icon={Mail}
          />

          <FormInput 
            label="Contraseña" 
            id="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            type="password" 
            required 
            disabled={isLoading} 
            placeholder="••••••••"
            icon={Lock}
          />

          <FormInput 
            label="Confirmar Contraseña" 
            id="confirmPassword" 
            value={confirmPassword} 
            onChange={(e) => setConfirmPassword(e.target.value)} 
            type="password" 
            required 
            disabled={isLoading} 
            placeholder="••••••••"
            icon={Lock}
          />
          
          {/* Mensaje de Error */}
          {error && (
            <p className="text-sm text-center text-red-600">{error}</p>
          )}
          
          {/* Mensaje de Éxito */}
          {success && (
            <p className="text-sm text-center text-green-600">{success}</p>
          )}

          {/* Botón de Registro */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full px-6 py-2 font-semibold text-white bg-red-600 rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading || success}
            >
              {isLoading ? 'Registrando...' : 'Crear Cuenta'}
            </button>
          </div>
        </form>

        <div className="text-sm text-center text-gray-600">
          ¿Ya tienes una cuenta?{' '}
          <button
            onClick={() => onNavigate('login')}
            className="font-medium text-red-600 hover:text-red-500"
            disabled={isLoading}
          >
            Inicia Sesión
          </button>
        </div>

      </div>
    </div>
  );
};

export default RegisterPage;