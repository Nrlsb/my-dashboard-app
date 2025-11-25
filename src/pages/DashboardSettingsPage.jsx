import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../api/apiService';
import { ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const DashboardSettingsPage = () => {
  const [panels, setPanels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const fetchPanels = async () => {
      if (!user || !user.is_admin) {
        setError('Acceso denegado.');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const fetchedPanels = await apiService.getAdminDashboardPanels();
        setPanels(fetchedPanels);
        setError(null);
      } catch (err) {
        setError('Error al cargar la configuración de los paneles.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPanels();
  }, [user]);

  const handleToggle = async (panelId, newVisibility) => {
    const originalPanels = panels;
    setPanels(
      panels.map((p) =>
        p.id === panelId ? { ...p, is_visible: newVisibility } : p
      )
    );

    try {
      await apiService.updateDashboardPanel(panelId, newVisibility);
    } catch (err) {
      setError('Error al actualizar el panel.');
      console.error(err);
      setPanels(originalPanels);
    }
  };

  if (loading) {
    return <div className="text-center p-8">Cargando...</div>;
  }

  if (error) {
    return <div className="text-center p-8 text-red-500">{error}</div>;
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Configuración del Sitio</h1>

      <h2 className="text-xl font-semibold mb-4 mt-8">Gestión de Contenido</h2>
      <div className="bg-white shadow rounded-lg mb-8">
        <button
          onClick={() => navigate('/manage-offers')}
          className="p-4 flex justify-between items-center w-full text-left hover:bg-gray-50"
        >
          <div>
            <p className="font-semibold">Gestionar Ofertas de Productos</p>
            <p className="text-sm text-gray-500">
              Activar o desactivar productos en oferta.
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      <h2 className="text-xl font-semibold mb-4">
        Visibilidad de Paneles del Dashboard
      </h2>
      <div className="bg-white shadow rounded-lg">
        <ul className="divide-y divide-gray-200">
          {panels.map((panel) => (
            <li
              key={panel.id}
              className="p-4 flex justify-between items-center"
            >
              <div>
                <p className="font-semibold">
                  {panel.subtitle || 'Sin subtítulo'}
                </p>
                <p className="text-sm text-gray-500">
                  {panel.title || 'Sin título'}
                </p>
              </div>
              <div className="flex items-center">
                <span
                  className={`mr-3 text-sm font-medium ${
                    panel.is_visible ? 'text-gray-900' : 'text-gray-400'
                  }`}
                >
                  {panel.is_visible ? 'Visible' : 'Oculto'}
                </span>
                <label
                  htmlFor={`toggle-${panel.id}`}
                  className="flex items-center cursor-pointer"
                >
                  <div className="relative">
                    <input
                      type="checkbox"
                      id={`toggle-${panel.id}`}
                      className="sr-only peer"
                      checked={panel.is_visible}
                      onChange={(e) => handleToggle(panel.id, e.target.checked)}
                    />
                    <div className="block bg-gray-200 peer-checked:bg-green-500 w-14 h-8 rounded-full transition"></div>
                    <div className="dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform transform peer-checked:translate-x-6"></div>
                  </div>
                </label>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default DashboardSettingsPage;
