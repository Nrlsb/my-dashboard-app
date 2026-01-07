import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Phone,

  Save,
  Home,
  AlertTriangle,
  CheckCircle,
  Loader2,
  ArrowLeft,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiService from '../api/apiService.js';
import { useAuth } from '../context/AuthContext.jsx';

const ProfileInput = ({ icon: Icon, label, id, ...props }) => (
  <div>
    <label
      htmlFor={id}
      className="block text-sm font-medium text-gray-700 mb-1"
    >
      {label}
    </label>
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Icon className="w-5 h-5 text-gray-400" />
      </div>
      <input
        id={id}
        className="w-full pl-10 p-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
        {...props}
      />
    </div>
  </div>
);

const LoadingSkeleton = () => (
  <div className="animate-pulse space-y-4">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-gray-200 h-12 rounded-lg"></div>
      <div className="bg-gray-200 h-12 rounded-lg"></div>
    </div>
    <div className="bg-gray-200 h-12 rounded-lg"></div>
    <div className="bg-gray-200 h-12 rounded-lg"></div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-gray-200 h-12 rounded-lg"></div>
      <div className="bg-gray-200 h-12 rounded-lg"></div>
    </div>
    <div className="flex justify-end mt-6">
      <div className="bg-gray-200 h-10 w-28 rounded-lg"></div>
    </div>
  </div>
);

const ErrorMessage = ({ message }) => (
  <div className="flex flex-col items-center justify-center p-10 bg-white rounded-lg shadow-md">
    <p className="text-red-500 font-semibold text-lg">
      Error al cargar el perfil
    </p>
    <p className="text-gray-600 mt-2">{message}</p>
  </div>
);

export default function ProfilePage() {
  const [formData, setFormData] = useState({
    A1_COD: '',
    A1_LOJA: '',
    A1_NOME: '',
    A1_EMAIL: '',
    A1_NUMBER: '',
    A1_CGC: '',
    A1_END: '',
  });

  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: profileData,
    isLoading: isLoadingProfile,
    isError,
    error,
    isSuccess,
  } = useQuery({
    queryKey: ['userProfile', user?.id],
    queryFn: () => apiService.fetchUserProfile(),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 15,
  });

  useEffect(() => {
    if (isSuccess && profileData) {
      setFormData({
        A1_COD: profileData.A1_COD || '',
        A1_LOJA: profileData.A1_LOJA || '',
        A1_NOME: profileData.A1_NOME || '',
        A1_EMAIL: profileData.A1_EMAIL || '',
        A1_NUMBER: profileData.A1_NUMBER || '',
        A1_CGC: profileData.A1_CGC || '',
        A1_END: profileData.A1_END || '',
      });
    }
  }, [isSuccess, profileData]);

  const mutation = useMutation({
    mutationFn: apiService.updateUserProfile,
    onSuccess: (data) => {
      setSuccessMessage('¡Perfil actualizado con éxito!');
      setErrorMessage('');
      queryClient.invalidateQueries({ queryKey: ['userProfile', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    },
    onError: (error) => {
      setErrorMessage(error.message || 'Error al guardar los cambios.');
      setSuccessMessage('');
    },
  });

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSuccessMessage('');
    setErrorMessage('');
    mutation.mutate(formData);
  };

  if (isLoadingProfile) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <header className="mb-6 flex items-center">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center justify-center p-2 mr-4 text-gray-600 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors"
            aria-label="Volver al dashboard"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Mi Perfil</h1>
            <p className="text-gray-600">
              Actualiza tu información personal y de contacto.
            </p>
          </div>
        </header>
        <div className="bg-white p-8 rounded-lg shadow-md max-w-4xl mx-auto">
          <LoadingSkeleton />
        </div>
      </div>
    );
  }

  if (isError) {
    const errorMessageText = !user?.id
      ? 'No se ha podido identificar al usuario.'
      : error.message;
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Mi Perfil</h1>
        </header>
        <ErrorMessage message={errorMessageText} />
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <header className="mb-6 flex items-center">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center justify-center p-2 mr-4 text-gray-600 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors"
          aria-label="Volver al dashboard"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Mi Perfil</h1>
          <p className="text-gray-600">
            Actualiza tu información personal y de contacto.
          </p>
        </div>
      </header>

      <div className="bg-white p-8 rounded-lg shadow-md max-w-4xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ProfileInput
              icon={User}
              label="Código de Cliente"
              id="A1_COD"
              value={formData.A1_COD}
              onChange={handleChange}
              disabled
            />

          </div>

          <ProfileInput
            icon={User}
            label="Nombre / Razón Social"
            id="A1_NOME"
            value={formData.A1_NOME}
            onChange={handleChange}
            disabled={mutation.isPending}
          />

          <ProfileInput
            icon={User}
            label="CUIT"
            id="A1_CGC"
            value={formData.A1_CGC}
            onChange={handleChange}
            disabled={mutation.isPending}
          />

          <ProfileInput
            icon={Home}
            label="Dirección"
            id="A1_END"
            value={formData.A1_END}
            onChange={handleChange}
            disabled={mutation.isPending}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ProfileInput
              icon={Mail}
              label="Email de Contacto"
              id="A1_EMAIL"
              type="email"
              value={formData.A1_EMAIL}
              onChange={handleChange}
              disabled={mutation.isPending}
            />
            <ProfileInput
              icon={Phone}
              label="Teléfono"
              id="A1_NUMBER"
              type="tel"
              value={formData.A1_NUMBER}
              onChange={handleChange}
              disabled={mutation.isPending}
            />
          </div>

          {errorMessage && (
            <div className="flex items-center p-3 bg-red-100 text-red-700 rounded-md">
              <AlertTriangle className="w-5 h-5 mr-2 flex-shrink-0" />
              <span className="text-sm">{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="flex items-center p-3 bg-green-100 text-green-700 rounded-md">
              <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0" />
              <span className="text-sm">{successMessage}</span>
            </div>
          )}

          <div className="flex justify-end pt-4 border-t border-gray-200">
            <button
              type="submit"
              className="inline-flex items-center justify-center px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <Save className="w-5 h-5 mr-2" />
              )}
              {mutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
