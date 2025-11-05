import React, { useState } from 'react';
import { UserPlus, ArrowLeft } from 'lucide-react';

const API_URL = 'http://localhost:3001';

// --- Componente de Registro (ACTUALIZADO) ---
const RegisterPage = ({ onNavigate }) => {
  // Estados para campos de Login
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // (NUEVO) Estados para campos de Cliente
  const [codigo, setCodigo] = useState('');
  const [tienda, setTienda] = useState('');
  const [nombre, setNombre] = useState('');
  const [fisica_juridica, setFisicaJuridica] = useState('F');
  const [n_fantasia, setNFantasia] = useState('');
  const [direccion, setDireccion] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [provincia, setProvincia] = useState('');
  const [estatus, setEstatus] = useState('2');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [tipo_iva, setTipoIva] = useState('I');
  const [tipo_doc, setTipoDoc] = useState('80');
  const [cuit_cuil, setCuitCuil] = useState('');
  const [di, setDi] = useState('');

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
    
    // Validar campos requeridos (basado en '*')
    if (!codigo || !tienda || !nombre || !n_fantasia || !direccion || !municipio || !provincia || !tipo_iva || !tipo_doc || !username || !password) {
      setError('Por favor, completa todos los campos marcados con *.');
      return;
    }

    setIsLoading(true);

    try {
      // (ACTUALIZADO) Enviar todos los datos
      const response = await fetch(`${API_URL}/api/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Campos de Login
          username, 
          password, 
          // Campos de Cliente (Mapeo a Protheus)
          codigo, // A1_COD
          tienda, // A1_LOJA
          nombre, // A1_NOME
          fisica_juridica, // A1_PESSOA
          n_fantasia, // A1_NREDUZ
          direccion, // A1_END
          municipio, // A1_MUN
          provincia, // A1_EST
          estatus,
          telefono, // A1_NUMBER
          email, // A1_EMAIL
          tipo_iva, // A1_TIPO
          tipo_doc, // A1_AFIP
          cuit_cuil, // A1_CGC
          di
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
  const FormInput = ({ label, id, value, onChange, required = false, disabled = false, type = "text", placeholder = "" }) => (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        id={id}
        type={type}
        required={required}
        className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
      />
    </div>
  );

  // Componente de Select reutilizable
  const FormSelect = ({ label, id, value, onChange, required = false, disabled = false, children }) => (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <select
        id={id}
        required={required}
        className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
        value={value}
        onChange={onChange}
        disabled={disabled}
      >
        {children}
      </select>
    </div>
  );


  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 font-sans py-12">
      <div className="w-full max-w-4xl p-8 space-y-6 bg-white rounded-lg shadow-xl">
        
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center">
            <UserPlus className="w-8 h-8 mr-3 text-red-600" />
            Crear Cuenta de Cliente
          </h2>
          <button
            onClick={() => onNavigate('login')}
            className="font-medium text-red-600 hover:text-red-500 inline-flex items-center"
            disabled={isLoading}
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Volver a Iniciar Sesión
          </button>
        </div>
        
        {/* Pestaña Ficticia */}
        <div className="border-b border-gray-200">
          <span className="pb-2 border-b-2 border-red-500 text-sm font-medium text-red-600">
            de Registro
          </span>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          
          {/* --- GRILLA DE DATOS DEL CLIENTE --- */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Columna 1 */}
            <div className="space-y-4">
              <FormInput label="Codigo (A1_COD)" id="codigo" value={codigo} onChange={(e) => setCodigo(e.target.value)} required disabled={isLoading} />
              <FormInput label="N Fantasia (A1_NREDUZ)" id="n_fantasia" value={n_fantasia} onChange={(e) => setNFantasia(e.target.value)} required disabled={isLoading} />
              <FormInput label="Provincia (A1_EST)" id="provincia" value={provincia} onChange={(e) => setProvincia(e.target.value)} required disabled={isLoading} />
              <FormInput label="Telefono (A1_NUMBER)" id="telefono" value={telefono} onChange={(e) => setTelefono(e.target.value)} disabled={isLoading} />
              <FormSelect label="Tipo (A1_TIPO)" id="tipo_iva" value={tipo_iva} onChange={(e) => setTipoIva(e.target.value)} required disabled={isLoading}>
                <option value="I">I - Resp. Inscripto</option>
                <option value="M">M - Monotributo</option>
                <option value="C">C - Consumidor Final</option>
              </FormSelect>
              <FormInput label="CUIT/CUIL (A1_CGC)" id="cuit_cuil" value={cuit_cuil} onChange={(e) => setCuitCuil(e.target.value)} disabled={isLoading} placeholder="20-11426267-7" />
            </div>

            {/* Columna 2 */}
            <div className="space-y-4">
              <FormInput label="Tienda (A1_LOJA)" id="tienda" value={tienda} onChange={(e) => setTienda(e.target.value)} required disabled={isLoading} />
              <FormInput label="Nombre (A1_NOME)" id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required disabled={isLoading} />
              <FormInput label="Direccion (A1_END)" id="direccion" value={direccion} onChange={(e) => setDireccion(e.target.value)} required disabled={isLoading} />
              <FormSelect label="Estatus" id="estatus" value={estatus} onChange={(e) => setEstatus(e.target.value)} disabled={isLoading}>
                <option value="1">1 - Inactivo</option>
                <option value="2">2 - Activo</option>
              </FormSelect>
              <FormInput label="E-Mail (A1_EMAIL)" id="email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" disabled={isLoading} />
              <FormInput label="Tipo Doc (A1_AFIP)" id="tipo_doc" value={tipo_doc} onChange={(e) => setTipoDoc(e.target.value)} required disabled={isLoading} />
              <FormInput label="DI" id="di" value={di} onChange={(e) => setDi(e.target.value)} disabled={isLoading} placeholder="20114262677" />
            </div>

            {/* Columna 3 */}
            <div className="space-y-4">
              <FormSelect label="Fisica/Jurid (A1_PESSOA)" id="fisica_juridica" value={fisica_juridica} onChange={(e) => setFisicaJuridica(e.target.value)} required disabled={isLoading}>
                <option value="F">F - Fisica</option>
                <option value="J">J - Juridica</option>
              </FormSelect>
              <FormInput label="Municipio" id="municipio" value={municipio} onChange={(e) => setMunicipio(e.target.value)} required disabled={isLoading} />
              <FormInput label="Descr Pais" id="descr_pais" value="ARGENTINA" disabled={true} />
              
              {/* Campos de Login */}
              <div className="p-4 border border-gray-200 rounded-md bg-gray-50 space-y-4">
                <FormInput label="Usuario (Login)" id="username" value={username} onChange={(e) => setUsername(e.target.value)} required disabled={isLoading} placeholder="Tu usuario de acceso" />
                <FormInput label="Contraseña" id="password" value={password} onChange={(e) => setPassword(e.target.value)} type="password" required disabled={isLoading} placeholder="••••••••" />
                <FormInput label="Confirmar Contraseña" id="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} type="password" required disabled={isLoading} placeholder="••••••••" />
              </div>

            </div>
          </div>

          {/* --- FIN GRILLA --- */}
          
          {/* Mensaje de Error */}
          {error && (
            <p className="text-sm text-center text-red-600">{error}</p>
          )}
          
          {/* Mensaje de Éxito */}
          {success && (
            <p className="text-sm text-center text-green-600">{success}</p>
          )}

          {/* Botón de Registro */}
          <div className="text-right">
            <button
              type="submit"
              className="w-full md:w-auto px-6 py-2 font-semibold text-white bg-red-600 rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading || success}
            >
              {isLoading ? 'Registrando...' : 'Crear Cuenta'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default RegisterPage;