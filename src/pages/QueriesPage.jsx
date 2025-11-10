import React, { useState } from 'react';
// (ELIMINADO) Header ya no se importa
import { ArrowLeft, Send } from 'lucide-react';

const API_URL = 'http://localhost:3001';

// --- Página de Envío de Consultas ---
// (NUEVO) Acepta 'currentUser'
const QueriesPage = ({ onNavigate, currentUser }) => {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSent, setIsSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Opciones para el selector de "Asunto"
  const querySubjects = [
    'Consulta sobre un pedido',
    'Problema con un producto',
    'Consulta administrativa/facturación',
    'Soporte técnico',
    'Otro',
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      setError("Error de autenticación. Por favor, inicie sesión de nuevo.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // (MODIFICADO) Enviar el 'userId' en el body
      const response = await fetch(`${API_URL}/api/queries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          subject, 
          message, 
          userId: currentUser.id // <-- ID del usuario real
        }),
      });

      if (!response.ok) throw new Error('No se pudo enviar la consulta.');

      // Simulación de envío exitoso
      setIsSent(true);
      
      // Resetear y volver al dashboard después de 3 segundos
      setTimeout(() => {
        setIsSent(false);
        onNavigate('dashboard');
      }, 3000);

    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Deshabilitar el botón si no hay asunto, mensaje, o está cargando
  const isButtonDisabled = !subject || message.trim() === '' || isLoading;

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      {/* (ELIMINADO) Header ya no se renderiza aquí */}
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
          <h1 className="text-2xl font-bold text-gray-800">Envío de Consultas</h1>
        </div>

        {/* Contenedor del Formulario */}
        <div className="p-6 md:p-8 bg-white rounded-lg shadow-md">
          {isSent ? (
            // Mensaje de éxito
            <div className="text-center p-8">
              <h2 className="text-2xl font-semibold text-green-600 mb-4">¡Consulta Enviada!</h2>
              <p className="text-gray-700">Tu mensaje ha sido recibido. Nos pondremos en contacto contigo pronto.</p>
              <p className="text-gray-500 mt-4 text-sm">Serás redirigido al dashboard en 3 segundos...</p>
            </div>
          ) : (
            // Formulario de consulta
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Selector de Asunto */}
              <div>
                <label htmlFor="subject-select" className="block text-sm font-medium text-gray-700 mb-2">
                  Asunto
                </label>
                <select
                  id="subject-select"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                  disabled={isLoading}
                >
                  <option value="">Selecciona un motivo...</option>
                  {querySubjects.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Campo de Mensaje */}
              <div>
                <label htmlFor="message-textarea" className="block text-sm font-medium text-gray-700 mb-2">
                  Mensaje
                </label>
                <textarea
                  id="message-textarea"
                  rows="6"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                  placeholder="Escribe tu consulta aquí..."
                  disabled={isLoading}
                />
              </div>

              {/* Mensaje de error */}
              {error && (
                <div className="text-sm text-red-600 text-right">
                  Error: {error}
                </div>
              )}

              {/* Botón de Envío */}
              <div className="mt-6 text-right">
                <button
                  type="submit"
                  disabled={isButtonDisabled}
                  className="inline-flex items-center px-6 py-2 font-semibold text-white bg-red-600 rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {isLoading ? 'Enviando...' : 'Enviar Consulta'}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
};

export default QueriesPage;