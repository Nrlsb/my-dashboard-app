import React, { useState, useEffect } from 'react';
import { apiService } from '../api/apiService'; // Assuming apiService is in this location

const DashboardSettingsPage = ({ currentUser }) => {
  const [panels, setPanels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPanels = async () => {
      if (!currentUser || !currentUser.is_admin) {
        setError('Acceso denegado.');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const fetchedPanels = await apiService.getAdminDashboardPanels(currentUser.id);
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
  }, [currentUser]);

  const handleToggle = async (panelId, newVisibility) => {
    try {
      await apiService.updateDashboardPanel(currentUser.id, panelId, newVisibility);
      setPanels(panels.map(p => p.id === panelId ? { ...p, is_visible: newVisibility } : p));
    } catch (err) {
      setError('Error al actualizar el panel.');
      console.error(err);
      // Revert optimistic update on error
      setPanels(panels.map(p => p.id === panelId ? { ...p, is_visible: !newVisibility } : p));
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
      <h1 className="text-2xl font-bold mb-6">Configuración de Paneles del Dashboard</h1>
      <div className="bg-white shadow rounded-lg">
        <ul className="divide-y divide-gray-200">
          {panels.map(panel => (
            <li key={panel.id} className="p-4 flex justify-between items-center">
              <div>
                <p className="font-semibold">{panel.subtitle || 'Sin subtítulo'}</p>
                <p className="text-sm text-gray-500">{panel.title || 'Sin título'}</p>
              </div>
              <div className="flex items-center">
                <span className={`mr-3 text-sm font-medium ${panel.is_visible ? 'text-gray-900' : 'text-gray-400'}`}>
                  {panel.is_visible ? 'Visible' : 'Oculto'}
                </span>
                <label htmlFor={`toggle-${panel.id}`} className="flex items-center cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      id={`toggle-${panel.id}`}
                      className="sr-only"
                      checked={panel.is_visible}
                      onChange={(e) => handleToggle(panel.id, e.target.checked)}
                    />
                    <div className="block bg-gray-600 w-14 h-8 rounded-full"></div>
                    <div className="dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition"></div>
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
