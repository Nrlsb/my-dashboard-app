import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, ArrowLeft, Mail, Phone, User, MapPin, FileText, CheckCircle, Loader2 } from 'lucide-react';
import SEOHead from '../components/SEOHead';

const PROVINCIAS = [
    'Buenos Aires',
    'CABA',
    'Catamarca',
    'Chaco',
    'Chubut',
    'Córdoba',
    'Corrientes',
    'Entre Ríos',
    'Formosa',
    'Jujuy',
    'La Pampa',
    'La Rioja',
    'Mendoza',
    'Misiones',
    'Neuquén',
    'Río Negro',
    'Salta',
    'San Juan',
    'San Luis',
    'Santa Cruz',
    'Santa Fe',
    'Santiago del Estero',
    'Tierra del Fuego',
    'Tucumán',
];

const FormInput = ({ label, id, name, value, onChange, required = false, disabled = false, type = 'text', placeholder = '', icon: Icon }) => (
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
                name={name}
                type={type}
                required={required}
                className="w-full px-3 py-2.5 pl-10 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-[#0B3D68] focus:border-[#0B3D68] transition-colors"
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                disabled={disabled}
            />
        </div>
    </div>
);

// Mapeo de nombres de región (Nominatim/OSM y otros) → provincias del array
const IP_REGION_MAP = {
    // Buenos Aires
    'Buenos Aires': 'Buenos Aires',
    'Provincia de Buenos Aires': 'Buenos Aires',
    // CABA
    'Ciudad Autónoma de Buenos Aires': 'CABA',
    'Autonomous City of Buenos Aires': 'CABA',
    'Capital Federal': 'CABA',
    'Buenos Aires F.D.': 'CABA',
    // Resto de provincias (con y sin tilde — la búsqueda normalizada cubre variantes)
    'Catamarca': 'Catamarca',
    'Chaco': 'Chaco',
    'Chubut': 'Chubut',
    'Córdoba': 'Córdoba',
    'Corrientes': 'Corrientes',
    'Entre Ríos': 'Entre Ríos',
    'Formosa': 'Formosa',
    'Jujuy': 'Jujuy',
    'La Pampa': 'La Pampa',
    'La Rioja': 'La Rioja',
    'Mendoza': 'Mendoza',
    'Misiones': 'Misiones',
    'Neuquén': 'Neuquén',
    'Río Negro': 'Río Negro',
    'Salta': 'Salta',
    'San Juan': 'San Juan',
    'San Luis': 'San Luis',
    'Santa Cruz': 'Santa Cruz',
    'Santa Fe': 'Santa Fe',
    'Santiago del Estero': 'Santiago del Estero',
    'Tierra del Fuego': 'Tierra del Fuego',
    'Tucumán': 'Tucumán',
};

const ContactRequestPage = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        cuit_cuil: '',
        nombre_apellido: '',
        telefono: '',
        email: '',
        provincia: '',
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isDetecting, setIsDetecting] = useState(true);
    const [autoDetected, setAutoDetected] = useState(false);
    const [detectedProvincia, setDetectedProvincia] = useState('');

    useEffect(() => {
        const normalize = (str) =>
            str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

        const findProvincia = (region) => {
            if (!region) return null;
            if (IP_REGION_MAP[region]) return IP_REGION_MAP[region];
            const regionNorm = normalize(region);
            const key = Object.keys(IP_REGION_MAP).find((k) => normalize(k) === regionNorm);
            return key ? IP_REGION_MAP[key] : null;
        };

        const applyProvincia = (provincia) => {
            setFormData((prev) => ({ ...prev, provincia }));
            setDetectedProvincia(provincia);
            setAutoDetected(true);
            setIsDetecting(false);
        };

        const tryGeolocation = () => {
            if (!navigator.geolocation) {
                setIsDetecting(false);
                return;
            }
            navigator.geolocation.getCurrentPosition(
                ({ coords }) => {
                    const { latitude, longitude } = coords;
                    fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=es`,
                        { headers: { 'Accept-Language': 'es' } }
                    )
                        .then((res) => res.json())
                        .then((data) => {
                            const country = data.address?.country_code?.toUpperCase();
                            const state = data.address?.state || data.address?.province;
                            if (country === 'AR' && state) {
                                const provincia = findProvincia(state);
                                if (provincia) {
                                    applyProvincia(provincia);
                                    return;
                                }
                            }
                            setIsDetecting(false);
                        })
                        .catch(() => setIsDetecting(false));
                },
                () => {
                    // Permiso denegado o error: el usuario selecciona manualmente
                    setIsDetecting(false);
                },
                { timeout: 8000 }
            );
        };

        tryGeolocation();
    }, []);

    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validaciones del frontend
        const { cuit_cuil, nombre_apellido, telefono, email, provincia } = formData;

        if (!cuit_cuil || !nombre_apellido || !telefono || !email || !provincia) {
            setError('Por favor, completá todos los campos.');
            return;
        }

        const cuitRegex = /^(20|23|24|27|30|33|34)-?\d{8}-?\d{1}$/;
        if (!cuitRegex.test(cuit_cuil)) {
            setError('El CUIT/CUIL no tiene un formato válido. Ejemplo: 20-12345678-9');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError('El email no tiene un formato válido.');
            return;
        }

        setIsLoading(true);

        try {
            const payload = { ...formData };
            if (detectedProvincia && detectedProvincia !== formData.provincia) {
                payload.provincia_detectada = detectedProvincia;
            }

            const response = await fetch(`${API_BASE}/public/contact-request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Error al enviar la solicitud.');
            }

            setSuccess(true);
        } catch (err) {
            setError(err.message || 'Ocurrió un error. Intentá de nuevo más tarde.');
        } finally {
            setIsLoading(false);
        }
    };

    // Estado de éxito
    if (success) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50 font-sans py-12 px-4">
                <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-2xl shadow-xl text-center">
                    <div className="flex justify-center">
                        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                            <CheckCircle className="w-10 h-10 text-green-600" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800">¡Solicitud Enviada!</h2>
                    <p className="text-gray-600">
                        Recibimos tu solicitud correctamente. Un representante se pondrá en contacto con vos a la brevedad para habilitarte el acceso.
                    </p>
                    <div className="pt-4 flex flex-col gap-3">
                        <button
                            onClick={() => navigate('/catalogo')}
                            className="w-full px-6 py-2.5 font-semibold text-white bg-[#0B3D68] rounded-lg shadow-sm hover:bg-[#0a3459] transition-colors"
                        >
                            Volver al Catálogo
                        </button>
                        <button
                            onClick={() => navigate('/login')}
                            className="w-full px-6 py-2.5 font-semibold text-[#0B3D68] bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            Iniciar Sesión
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 font-sans py-12 px-4">
            <SEOHead
                title="Solicitar Acceso"
                description="¿Sos comerciante del rubro pinturas? Solicitá tu acceso a la plataforma mayorista de Distribuidora Espint. Un representante te contactará para habilitarte."
                canonical="/solicitar-acceso"
            />
            <div className="w-full max-w-lg p-8 space-y-6 bg-white rounded-2xl shadow-xl">
                {/* Header */}
                <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-[#0B3D68]/10 flex items-center justify-center mb-4">
                        <UserPlus className="w-8 h-8 text-[#0B3D68]" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800">Solicitar Acceso</h2>
                    <p className="text-sm text-gray-500 mt-2 text-center">
                        Completá el formulario y un representante se pondrá en contacto con vos para habilitarte el acceso al sistema.
                    </p>
                </div>

                <form className="space-y-4" onSubmit={handleSubmit}>
                    <FormInput
                        label="CUIT/CUIL"
                        id="cuit_cuil"
                        name="cuit_cuil"
                        value={formData.cuit_cuil}
                        onChange={handleChange}
                        required
                        disabled={isLoading}
                        placeholder="Ej: 20-12345678-9"
                        icon={FileText}
                    />

                    <FormInput
                        label="Nombre y Apellido"
                        id="nombre_apellido"
                        name="nombre_apellido"
                        value={formData.nombre_apellido}
                        onChange={handleChange}
                        required
                        disabled={isLoading}
                        placeholder="Ej: Juan Pérez"
                        icon={User}
                    />

                    <FormInput
                        label="Nº de Teléfono"
                        id="telefono"
                        name="telefono"
                        value={formData.telefono}
                        onChange={handleChange}
                        required
                        disabled={isLoading}
                        type="tel"
                        placeholder="Ej: 11 1234-5678"
                        icon={Phone}
                    />

                    <FormInput
                        label="Email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        type="email"
                        required
                        disabled={isLoading}
                        placeholder="tu@email.com"
                        icon={Mail}
                    />

                    {/* Select de provincia */}
                    <div>
                        <label htmlFor="provincia" className="block text-sm font-medium text-gray-700">
                            Provincia <span className="text-red-500">*</span>
                        </label>
                        <div className="relative mt-1">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                {isDetecting
                                    ? <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                                    : <MapPin className="w-5 h-5 text-gray-400" />
                                }
                            </span>
                            <select
                                id="provincia"
                                name="provincia"
                                required
                                className="w-full px-3 py-2.5 pl-10 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-[#0B3D68] focus:border-[#0B3D68] bg-white transition-colors appearance-none"
                                value={formData.provincia}
                                onChange={(e) => { handleChange(e); setAutoDetected(false); }}
                                disabled={isLoading || isDetecting}
                            >
                                <option value="">{isDetecting ? 'Detectando ubicación...' : 'Seleccionar provincia...'}</option>
                                {PROVINCIAS.map((prov) => (
                                    <option key={prov} value={prov}>
                                        {prov}
                                    </option>
                                ))}
                            </select>
                        </div>
                        {autoDetected && (
                            <p className="mt-1 text-xs text-green-600 flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                Provincia detectada automáticamente. Podés cambiarla si es incorrecta.
                            </p>
                        )}
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm text-center">
                            {error}
                        </div>
                    )}

                    {/* Submit */}
                    <div className="pt-2">
                        <button
                            type="submit"
                            className="w-full flex items-center justify-center gap-2 px-6 py-3 font-semibold text-white bg-[#0B3D68] rounded-lg shadow-sm hover:bg-[#0a3459] focus:outline-none focus:ring-2 focus:ring-[#0B3D68] focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Enviando...
                                </>
                            ) : (
                                <>
                                    <UserPlus className="w-5 h-5" />
                                    Enviar Solicitud
                                </>
                            )}
                        </button>
                    </div>
                </form>

                {/* Links de navegación */}
                <div className="flex flex-col gap-2 text-sm text-center text-gray-600 pt-2">
                    <div>
                        ¿Ya tenés una cuenta?{' '}
                        <button
                            onClick={() => navigate('/login')}
                            className="font-medium text-[#0B3D68] hover:text-[#0a3459]"
                            disabled={isLoading}
                        >
                            Iniciá Sesión
                        </button>
                    </div>
                    <div>
                        <button
                            onClick={() => navigate('/catalogo')}
                            className="font-medium text-gray-500 hover:text-gray-700 flex items-center gap-1 mx-auto"
                            disabled={isLoading}
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Volver al catálogo
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContactRequestPage;
