import React, { useState, useEffect } from 'react';
// (NUEVO) Importar ArrowLeft
import { User, Mail, Phone, Building, Save, Home, AlertTriangle, CheckCircle, Loader2, ArrowLeft } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// (NUEVO) Importamos las funciones de API actualizadas
import { fetchUserProfile, updateUserProfile } from '../api/apiService.js';

// Componente reutilizable para campos del formulario
const ProfileInput = ({ icon: Icon, label, id, ...props }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
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

// Componente de UI para el estado de carga (Skeleton)
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

// Componente de UI para el estado de error
const ErrorMessage = ({ message }) => (
  <div className="flex flex-col items-center justify-center p-10 bg-white rounded-lg shadow-md">
    <p className="text-red-500 font-semibold text-lg">Error al cargar el perfil</p>
    <p className="text-gray-600 mt-2">{message}</p>
  </div>
);

export default function ProfilePage({ user, onNavigate }) { // (NUEVO) Recibe onNavigate
  // (CORREGIDO) El estado del formulario usa los nombres de campo del backend
  const [formData, setFormData] = useState({
    A1_COD: '',
    A1_LOJA: '',
    A1_NOME: '',
    A1_EMAIL: '',
    A1_NUMBER: '', // Antes a1_tel
    A1_CGC: '',    // Antes a1_cuit
    A1_END: '',    // (NUEVO) Campo de dirección
  });
  
  // (NUEVO) Estados para mensajes de éxito/error de la mutación
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const queryClient = useQueryClient();

  // 1. Usamos useQuery para cargar los datos del perfil
  const { 
    data: profileData, 
    isLoading: isLoadingProfile, // Renombrado para evitar colisión
    isError, 
    error,
    isSuccess 
  } = useQuery({
    queryKey: ['userProfile', user?.id],
    queryFn: () => fetchUserProfile(user?.id),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 15, // 15 min de caché para el perfil
  });

  // 2. Usamos useEffect para poblar el formulario UNA VEZ que la carga es exitosa
  useEffect(() => {
    if (isSuccess && profileData) {
      // (CORREGIDO) Mapeo de los datos del backend al estado del formulario
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

  // (NUEVO) 3. Implementamos useMutation para la actualización
  const mutation = useMutation({
    mutationFn: updateUserProfile, // La función de apiService que hace el PUT
    onSuccess: (data) => {
      // Si la API responde OK
      setSuccessMessage('¡Perfil actualizado con éxito!');
      setErrorMessage('');
      // Invalidar la query 'userProfile' para que la próxima vez
      // que se visite la página (o si la volvemos a enfocar),
      // se recarguen los datos frescos del servidor.
      queryClient.invalidateQueries({ queryKey: ['userProfile', user?.id] });
      // También invalidamos el 'currentUser' en App.jsx (si lo guardáramos con query)
      queryClient.invalidateQueries({ queryKey: ['currentUser'] }); 
    },
    onError: (error) => {
      // Si la API responde con error
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
    // Limpiamos mensajes antes de enviar
    setSuccessMessage('');
    setErrorMessage('');
    // Llamamos a la mutación con el ID del usuario y los datos del formulario
    mutation.mutate({ userId: user.id, profileData: formData });
  };

  // 4. Renderizado condicional
  if (isLoadingProfile) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        {/* (MODIFICADO) Encabezado con botón de volver */}
        <header className="mb-6 flex items-center">
          <button
            onClick={() => onNavigate('dashboard')}
            className="flex items-center justify-center p-2 mr-4 text-gray-600 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors"
            aria-label="Volver al dashboard"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Mi Perfil</h1>
            <p className="text-gray-600">Actualiza tu información personal y de contacto.</p>
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
      ? "No se ha podido identificar al usuario." 
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
      {/* (MODIFICADO) Encabezado con botón de volver */}
      <header className="mb-6 flex items-center">
        <button
          onClick={() => onNavigate('dashboard')}
          className="flex items-center justify-center p-2 mr-4 text-gray-600 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors"
          aria-label="Volver al dashboard"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Mi Perfil</h1>
          <p className="text-gray-600">Actualiza tu información personal y de contacto.</p>
        </div>
      </header>

      <div className="bg-white p-8 rounded-lg shadow-md max-w-4xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* (CORREGIDO) Campos de formulario actualizados */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ProfileInput
              icon={User}
              label="Código de Cliente"
              id="A1_COD" // <-- Corregido
              value={formData.A1_COD}
              onChange={handleChange}
              disabled // Generalmente el código no se edita
            />
            <ProfileInput
              icon={Building}
              label="Sucursal (Loja)"
              id="A1_LOJA" // <-- Corregido
              value={formData.A1_LOJA}
              onChange={handleChange}
              disabled // Ni la sucursal
            />
          </div>

          <ProfileInput
            icon={User}
            label="Nombre / Razón Social"
            id="A1_NOME" // <-- Corregido
            value={formData.A1_NOME}
            onChange={handleChange}
            disabled={mutation.isPending} // Deshabilitado mientras se guarda
          />
          
          <ProfileInput
            icon={User}
            label="CUIT"
            id="A1_CGC" // <-- Corregido
            value={formData.A1_CGC}
            onChange={handleChange}
            disabled={mutation.isPending}
          />
          
          {/* (NUEVO) Campo Dirección */}
          <ProfileInput
            icon={Home}
            label="Dirección"
            id="A1_END" // <-- Nuevo
            value={formData.A1_END}
            onChange={handleChange}
            disabled={mutation.isPending}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ProfileInput
              icon={Mail}
              label="Email de Contacto"
              id="A1_EMAIL" // <-- Corregido
              type="email"
              value={formData.A1_EMAIL}
              onChange={handleChange}
              disabled={mutation.isPending}
            />
            <ProfileInput
              icon={Phone}
              label="Teléfono"
              id="A1_NUMBER" // <-- Corregido
              type="tel"
              value={formData.A1_NUMBER}
              onChange={handleChange}
              disabled={mutation.isPending}
            />
          </div>
          
          {/* (NUEVO) Mensajes de estado de la mutación */}
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
              disabled={mutation.isPending} // Deshabilitado si se está guardando
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