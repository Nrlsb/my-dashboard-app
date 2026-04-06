import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { NOVEDADES } from '../data/novedades';
import apiService from '../api/apiService';
import { ArrowLeft, CheckCircle, BookOpen, Sparkles, CalendarDays, Tag, ArrowRight, ShoppingCart } from 'lucide-react';

const TAG_COLORS = {
  blue: {
    badge: 'bg-blue-100 text-blue-700',
    dot: 'bg-blue-500',
    step: 'bg-blue-500 text-white',
    border: 'border-blue-200',
    icon: 'text-blue-500',
  },
  green: {
    badge: 'bg-green-100 text-green-700',
    dot: 'bg-green-500',
    step: 'bg-green-500 text-white',
    border: 'border-green-200',
    icon: 'text-green-500',
  },
};

const SEEN_KEY = 'espint_novedades_seen';

function getSeenIds() {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) || '[]');
  } catch {
    return [];
  }
}

function markAllSeen(ids) {
  try {
    const seen = getSeenIds();
    const updated = Array.from(new Set([...seen, ...ids]));
    localStorage.setItem(SEEN_KEY, JSON.stringify(updated));
  } catch { }
}

function formatDate(dateStr) {
  const [year, month, day] = dateStr.split('-');
  const months = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ];
  return `${parseInt(day, 10)} de ${months[parseInt(month, 10) - 1]} de ${year}`;
}

export default function NovedadesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const userRole = user?.role || '';
  const [hasOffers, setHasOffers] = useState(false);

  // Consultar si hay ofertas activas
  useEffect(() => {
    async function checkOffers() {
      try {
        const offers = await apiService.fetchOffers();
        if (Array.isArray(offers) && offers.length > 0) {
          setHasOffers(true);
        }
      } catch (error) {
        console.error('Error fetching offers for novedades:', error);
      }
    }
    if (user?.id) {
      checkOffers();
    }
  }, [user]);

  // Filtrar novedades relevantes para este usuario
  const visibleNovedades = NOVEDADES.map((novedad) => {
    const visibleSections = novedad.sections.filter((s) =>
      s.roles.includes(userRole) || (user?.is_admin)
    );
    if (visibleSections.length === 0) return null;
    return { ...novedad, sections: visibleSections };
  }).filter(Boolean);

  // Marcar como vistas al entrar
  useEffect(() => {
    const ids = visibleNovedades.map((n) => n.id);
    markAllSeen(ids);
    // Forzar re-render del badge en Header disparando un evento de storage
    window.dispatchEvent(new Event('storage'));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Hero Header */}
      <div className="bg-espint-blue text-white">
        <div className="container mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-12">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-white/70 hover:text-white text-sm mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/10 rounded-xl">
              <Sparkles className="w-6 h-6 text-espint-green" />
            </div>
            <span className="text-espint-green font-semibold text-sm uppercase tracking-wider">
              Novedades de la plataforma
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            Actualizaciones recientes
          </h1>
          <p className="text-white/60 mt-2 text-sm sm:text-base">
            Seguí todas las mejoras y nuevas funcionalidades disponibles para vos.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-12">
        {/* Banner Dinámico de Ofertas */}
        {hasOffers && (
          <div className="mb-10 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl p-6 text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 border border-orange-400">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <ShoppingCart className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold">¡Hay ofertas exclusivas hoy!</h3>
                  <p className="text-white/80 text-sm">
                    No te pierdas los descuentos vigentes en productos seleccionados.
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate('/offers')}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white text-orange-600 font-bold px-6 py-2.5 rounded-xl transition-all hover:bg-orange-50 shadow-md active:scale-95 whitespace-nowrap"
              >
                Ver todas las ofertas
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {visibleNovedades.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-lg font-medium">No hay novedades disponibles</p>
            <p className="text-sm">Volvé pronto para ver las últimas actualizaciones.</p>
          </div>
        ) : (
          <div className="space-y-10">
            {visibleNovedades.map((novedad) => (
              <div key={novedad.id}>
                {/* Release Header */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-1.5 shadow-sm">
                    <Tag className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs font-bold text-gray-700">v{novedad.version}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-400 text-xs">
                    <CalendarDays className="w-3.5 h-3.5" />
                    <span>{formatDate(novedad.date)}</span>
                  </div>
                  <div className="flex-1 h-px bg-gray-200"></div>
                </div>

                {/* Sections */}
                <div className="space-y-6">
                  {novedad.sections.map((section, idx) => {
                    const colors = TAG_COLORS[section.tagColor] || TAG_COLORS.blue;
                    return (
                      <div
                        key={idx}
                        className={`bg-white rounded-2xl border ${colors.border} shadow-sm overflow-hidden`}
                      >
                        {/* Card Header */}
                        <div className="px-6 py-5 border-b border-gray-50">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${colors.badge}`}>
                                  <BookOpen className="w-3 h-3" />
                                  {section.tag}
                                </span>
                              </div>
                              <h2 className="text-lg font-bold text-gray-900">
                                {section.title}
                              </h2>
                              <p className="text-sm text-gray-500 mt-1">
                                {section.description}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Guide Steps */}
                        {section.guide && section.guide.length > 0 && (
                          <div className="px-6 py-5">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                              Cómo usarlo
                            </p>
                            <ol className="space-y-3">
                              {section.guide.map((step, stepIdx) => (
                                <li key={stepIdx} className="flex items-start gap-3">
                                  <span
                                    className={`flex-shrink-0 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center mt-0.5 ${colors.step}`}
                                  >
                                    {stepIdx + 1}
                                  </span>
                                  <p className="text-sm text-gray-700 leading-relaxed">
                                    {step}
                                  </p>
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}

                        {/* Footer */}
                        <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <CheckCircle className={`w-4 h-4 ${colors.icon}`} />
                            <span className="text-xs text-gray-400">
                              Disponible desde la versión {novedad.version}
                            </span>
                          </div>
                          {section.path && (
                            <button
                              onClick={() => navigate(section.path)}
                              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${section.tagColor === 'green'
                                  ? 'bg-green-500 hover:bg-green-600 text-white'
                                  : 'bg-blue-500 hover:bg-blue-600 text-white'
                                }`}
                            >
                              {section.buttonLabel || 'Ir al apartado'}
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
