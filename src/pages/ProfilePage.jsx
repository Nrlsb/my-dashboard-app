import React, { useState, useEffect } from 'react';
import Header from '../components/Header.jsx';
import { ArrowLeft, User, Save, AlertTriangle, CheckCircle } from 'lucide-react';

const API_URL = 'http://localhost:3001';

// --- Componentes de Formulario Reutilizables ---
// (Copiados de RegisterPage para mantener este archivo independiente)
const FormInput = ({ label, id, value, onChange, required = false, disabled = false, type = "text", placeholder = "" }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-gray-700">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      id={id}
      type={type}
      required={required}
      className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 disabled:bg-gray-100"
      value={value || ''} // Asegurarse de que no sea null
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
    />
  </div>
);

const FormSelect = ({ label, id, value, onChange, required = false, disabled = false, children }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-gray-700">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <select
      id={id}
      required={required}
      className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 disabled:bg-gray-100"
      value={value || ''} // Asegurarse de que no sea null
      onChange={onChange}
      disabled={disabled}
    >
      {children}
    </select>
  </div>
);
// --- Fin de Componentes de Formulario ---


// --- Página de Perfil ---
const ProfilePage = ({ onNavigate }) => {
  // Estado para todos los campos del formulario
  const [formData, setFormData] = useState({
    codigo: '',
    tienda: '',
    nombre: '',
    fisica_juridica: 'F',
    n_fantasia: '',
    direccion: '',
    municipio: '',
    provincia: '',
    estatus: '2',
    telefono: '',
    email: '',
    tipo_iva: 'I',
    tipo_doc: '80',
    cuit_cuil: '',
    di: '',
    username: '' // El email de login
  });

  // Estados de UI
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // --- Cargar Datos del Perfil ---
  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_URL}/api/profile`);
        if (!response.ok) throw new Error('No se pudieron cargar los datos del perfil.');
        const data = await response.json();
        setFormData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, []);

  // --- Manejador de Cambios en Formulario ---
  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  // --- Enviar Actualización ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${API_URL}/api/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Error al guardar.');

      setSuccess('¡Perfil actualizado con éxito!');
      setTimeout(() => setSuccess(null), 3000);

    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // --- Renderizado ---
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 font-sans">
        <Header />
        <main className="p-4 md:p-8 max-w-7xl mx-auto text-center">
          <p className="text-gray-600">Cargando perfil...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <Header />
      <main className="p-4 md:p-8 max-w-7xl mx-auto">
        {/* Encabezado con Botón de Volver y Título */}
        <div className="flex items-center mb-6">
          <button
            onClick={() => onNavigate('dashboard')}
            className="flex items-center justify-center p-2 mr-4 text-gray-600 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors"
            aria-label="Volver al dashboard"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center">
            <User className="w-7 h-7 mr-3 text-red-600" />
            Mi Perfil
          </h1>
        </div>

        {/* Contenedor del Formulario */}
        <div className="p-6 md:p-8 bg-white rounded-lg shadow-md">
          <form className="space-y-6" onSubmit={handleSubmit}>
            
            {/* --- GRILLA DE DATOS DEL CLIENTE --- */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Columna 1 */}
              <div className="space-y-4">
                <FormInput label="Apellido y Nombre (A1_NOME)" id="nombre" value={formData.nombre} onChange={handleChange} required disabled={isSaving} />
                <FormInput label="N Fantasia (A1_NREDUZ)" id="n_fantasia" value={formData.n_fantasia} onChange={handleChange} required disabled={isSaving} />
                <FormInput label="Provincia (A1_EST)" id="provincia" value={formData.provincia} onChange={handleChange} required disabled={isSaving} />
                <FormInput label="Telefono (A1_NUMBER)" id="telefono" value={formData.telefono} onChange={handleChange} disabled={isSaving} />
                <FormSelect label="Tipo (A1_TIPO)" id="tipo_iva" value={formData.tipo_iva} onChange={handleChange} required disabled={isSaving}>
                  <option value="I">I - Resp. Inscripto</option>
                  <option value="M">M - Monotributo</option>
                  <option value="C">C - Consumidor Final</option>
                </FormSelect>
                <FormInput label="CUIT/CUIL (A1_CGC)" id="cuit_cuil" value={formData.cuit_cuil} onChange={handleChange} disabled={isSaving} placeholder="20-11426267-7" />
              </div>

              {/* Columna 2 */}
              <div className="space-y-4">
                <FormInput label="Codigo (A1_COD)" id="codigo" value={formData.codigo} onChange={handleChange} required disabled={isSaving} />
                <FormInput label="Tienda (A1_LOJA)" id="tienda" value={formData.tienda} onChange={handleChange} required disabled={isSaving} />
                <FormInput label="Direccion (A1_END)" id="direccion" value={formData.direccion} onChange={handleChange} required disabled={isSaving} />
                <FormSelect label="Estatus" id="estatus" value={formData.estatus} onChange={handleChange} disabled={isSaving}>
                  <option value="1">1 - Inactivo</option>
                  <option value="2">2 - Activo</option>
                </FormSelect>
                <FormSelect label="Tipo Doc (A1_AFIP)" id="tipo_doc" value={formData.tipo_doc} onChange={handleChange} required disabled={isSaving}>
                   <option value="80">80 - CUIT</option>
                   <option value="86">86 - CUIL</option>
                   <option value="96">96 - DNI</option>
                </FormSelect>
                <FormInput label="DI" id="di" value={formData.di} onChange={handleChange} disabled={isSaving} placeholder="20114262677" />
              </div>

              {/* Columna 3 */}
              <div className="space-y-4">
                <FormSelect label="Fisica/Jurid (A1_PESSOA)" id="fisica_juridica" value={formData.fisica_juridica} onChange={handleChange} required disabled={isSaving}>
                  <option value="F">F - Fisica</option>
                  <option value="J">J - Juridica</option>
                </FormSelect>
                <FormInput label="Municipio" id="municipio" value={formData.municipio} onChange={handleChange} required disabled={isSaving} />
                <FormInput label="Descr Pais" id="descr_pais" value={formData.descr_pais} disabled={true} />
                
                {/* Campos de Login (No editables) */}
                <div className="p-4 border border-gray-200 rounded-md bg-gray-50 space-y-4">
                  <FormInput label="Email (Login)" id="username" value={formData.username} onChange={handleChange} disabled={true} />
                  <FormInput label="E-Mail (Contacto)" id="email" value={formData.email} onChange={handleChange} type="email" disabled={isSaving} />
                </div>
              </div>
            </div>

            {/* --- FIN GRILLA --- */}
            
            {/* Mensaje de Error */}
            {error && (
              <div className="flex items-center p-3 bg-red-100 text-red-700 rounded-md">
                <AlertTriangle className="w-5 h-5 mr-2 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}
            
            {/* Mensaje de Éxito */}
            {success && (
              <div className="flex items-center p-3 bg-green-100 text-green-700 rounded-md">
                <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                <span className="text-sm">{success}</span>
              </div>
            )}

            {/* Botón de Guardar */}
            <div className="mt-8 text-right border-t pt-6">
              <button
                type="submit"
                className="inline-flex items-center px-6 py-2 font-semibold text-white bg-green-600 rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSaving || isLoading}
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default ProfilePage;