import React from 'react';
// Necesitarás instalar lucide-react: npm install lucide-react
import {
  ShoppingCart,
  History,
  CircleDollarSign,
  Gift,
  Landmark,
  FileText,
  HelpCircle,
  Upload
} from 'lucide-react';

/*
 * ===================================================================
 * Componente de Tarjeta Reutilizable
 * ===================================================================
 * Este componente crea cada uno de los "módulos" del panel.
 * Acepta props para el título, ícono, texto del botón y una
 * "etiqueta" opcional (como la de "NUEVO").
 */
const DashboardCard = ({ title, icon: Icon, buttonText, badge }) => {
  return (
    <div className="relative flex flex-col items-center justify-between p-4 bg-zinc-100 border border-zinc-300 rounded-lg shadow-sm text-center h-48">
      {/* Etiqueta opcional (para "NUEVO") */}
      {badge && (
        <span className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
          {badge}
        </span>
      )}

      {/* Título del Módulo */}
      <h3 className="text-sm font-semibold text-zinc-600 uppercase tracking-wider">
        {title}
      </h3>

      {/* Ícono */}
      <div className="my-2">
        <Icon className="h-12 w-12 text-zinc-800" strokeWidth={1.5} />
      </div>

      {/* Botón de Acción */}
      <button className="w-full bg-zinc-700 text-white text-sm font-medium py-2 px-4 rounded-md hover:bg-zinc-800 transition-colors duration-200">
        {buttonText}
      </button>
    </div>
  );
};

/*
 * ===================================================================
 * Cabecera de la Aplicación
 * ===================================================================
 */
const AppHeader = () => (
  <header className="w-full bg-red-700 p-4 shadow-md">
    <div className="w-full max-w-7xl mx-auto flex justify-center items-center">
      {/* Asumo que "KUM" es un logo de texto. Puedes cambiarlo por un <img> */}
      <h1 className="text-white text-3xl font-bold tracking-wider">
        KUM
      </h1>
      <span className="text-white text-xs font-light ml-2 mt-2 self-start">
        APORTES EN VIRTUAL
      </span>
    </div>
  </header>
);

/*
 * ===================================================================
 * Componente Principal de la Aplicación
 * ===================================================================
 * Aquí se renderiza la cabecera y el panel de módulos.
 */
export default function App() {
  // Datos para los módulos, separados por filas como en la imagen.
  const topRowModules = [
    {
      title: "Nuevo Pedido",
      icon: ShoppingCart,
      buttonText: "Nuevo Pedido",
      badge: null,
    },
    {
      title: "Histórico",
      icon: History,
      buttonText: "Histórico de Pedidos",
      badge: null,
    },
    {
      title: "Precios",
      icon: CircleDollarSign,
      buttonText: "Lista de Precios",
      badge: null,
    },
    {
      title: "Ofertas",
      icon: Gift,
      buttonText: "Nuevas Ofertas",
      badge: "NUEVO",
    },
    {
      title: "Cuenta Corriente",
      icon: Landmark,
      buttonText: "Saldo Cuenta",
      badge: null,
    },
  ];

  const bottomRowModules = [
    {
      title: "Información Importante",
      icon: FileText,
      buttonText: "Información", // El botón no es visible en la foto
      badge: null,
    },
    {
      title: "Consultas",
      icon: HelpCircle,
      buttonText: "Envío de Consultas",
      badge: null,
    },
    {
      title: "Cupones Tarjeta",
      icon: Upload,
      buttonText: "Carga Comprobantes",
      badge: null,
    },
  ];

  return (
    <div className="min-h-screen bg-zinc-200 font-sans">
      <AppHeader />

      <main className="w-full max-w-7xl mx-auto p-4 md:p-8">
        {/* --- Fila Superior de Módulos --- */}
        {/* En pantallas grandes (lg) muestra 5 columnas, como en la foto */}
        {/* En pantallas medianas (md) muestra 3 */}
        {/* En pantallas pequeñas (sm) muestra 2 */}
        {/* En pantallas muy pequeñas (móvil) muestra 1 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
          {topRowModules.map((mod) => (
            <DashboardCard
              key={mod.title}
              title={mod.title}
              icon={mod.icon}
              buttonText={mod.buttonText}
              badge={mod.badge}
            />
          ))}
        </div>

        {/* --- Fila Inferior de Módulos --- */}
        {/* Esta fila se alinea con la de arriba, pero solo tiene 3 elementos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6 mt-4 md:mt-6">
          {bottomRowModules.map((mod) => (
            <DashboardCard
              key={mod.title}
              title={mod.title}
              icon={mod.icon}
              buttonText={mod.buttonText}
              badge={mod.badge}
            />
          ))}
          {/* Dejé el grid de 5 columnas para que los 3 elementos se alineen
              con los 3 primeros de la fila de arriba, como en la foto.
              Si prefieres que los 3 se centren, puedes cambiar
              "lg:grid-cols-5" por "lg:grid-cols-3" arriba y
              agregar "lg:w-3/5 lg:mx-auto" a este div.
          */}
        </div>
      </main>
    </div>
  );
}

