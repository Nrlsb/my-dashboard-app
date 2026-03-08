import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, X, ArrowRight, BookOpen } from 'lucide-react';
import { NOVEDADES } from '../data/novedades';
import { useAuth } from '../context/AuthContext';

const SEEN_KEY = 'espint_novedades_seen';
const MODAL_SESSION_KEY = 'espint_novedades_modal_shown';

function getUnseenNovedades(userRole, isAdmin) {
  try {
    const seen = JSON.parse(localStorage.getItem(SEEN_KEY) || '[]');
    return NOVEDADES.map((n) => {
      if (seen.includes(n.id)) return null;
      const visibleSections = n.sections.filter((s) =>
        s.roles.includes(userRole) || isAdmin
      );
      if (visibleSections.length === 0) return null;
      return { ...n, sections: visibleSections };
    }).filter(Boolean);
  } catch {
    return [];
  }
}

export default function NovedadesModal() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [novedades, setNovedades] = useState([]);

  useEffect(() => {
    if (!user) return;
    const alreadyShown = sessionStorage.getItem(MODAL_SESSION_KEY);
    if (alreadyShown) return;

    const unseen = getUnseenNovedades(user?.role, user?.is_admin);
    if (unseen.length > 0) {
      setNovedades(unseen);
      setIsOpen(true);
      sessionStorage.setItem(MODAL_SESSION_KEY, '1');
    }
  }, [user]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-espint-blue px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <Sparkles className="w-5 h-5 text-espint-green" />
            </div>
            <div>
              <p className="text-espint-green text-xs font-semibold uppercase tracking-wider">
                Plataforma actualizada
              </p>
              <h2 className="text-white font-bold text-lg leading-tight">
                ¡Hay novedades para vos!
              </h2>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-white/50 hover:text-white transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-3 max-h-[55vh] overflow-y-auto">
          {novedades.map((nov) =>
            nov.sections.map((section, idx) => (
              <div
                key={`${nov.id}-${idx}`}
                className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl"
              >
                <div
                  className={`mt-0.5 p-1.5 rounded-lg flex-shrink-0 ${
                    section.tagColor === 'green' ? 'bg-green-100' : 'bg-blue-100'
                  }`}
                >
                  <BookOpen
                    className={`w-4 h-4 ${
                      section.tagColor === 'green' ? 'text-green-600' : 'text-blue-600'
                    }`}
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider ${
                        section.tagColor === 'green' ? 'text-green-600' : 'text-blue-600'
                      }`}
                    >
                      {section.tag}
                    </span>
                    <span className="text-[10px] text-gray-400">· v{nov.version}</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-800">{section.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                    {section.description}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={() => setIsOpen(false)}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg transition-colors"
          >
            Cerrar
          </button>
          <button
            onClick={() => { navigate('/novedades'); setIsOpen(false); }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-espint-blue hover:bg-[#001a33] rounded-lg transition-colors"
          >
            Ver detalle
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
