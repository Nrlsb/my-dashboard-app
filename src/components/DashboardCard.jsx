import React from 'react';

// --- Componente de Card ---
// Movido a su propio archivo ya que es reutilizable
const DashboardCard = ({
  title,
  subTitle,
  icon: Icon,
  tag,
  onClick,
  ...props
}) => {
  let iconColorClass = 'text-gray-500 bg-gray-100';
  if (title === 'CUENTAS') iconColorClass = 'text-[#0B3D68] bg-blue-50';
  else if (title === 'PEDIDOS') iconColorClass = 'text-[#8CB818] bg-green-50';
  else if (title === 'CLIENTES') iconColorClass = 'text-[#D10074] bg-pink-50';

  return (
    <div
      onClick={onClick}
      className="group relative flex flex-col items-start p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer border border-gray-100 overflow-hidden"
      {...props}
    >
      {tag && (
        <span className="absolute top-0 right-0 px-3 py-1 text-xs font-bold text-white bg-espint-magenta rounded-bl-lg z-10">
          {tag}
        </span>
      )}

      <div className={`p-3 rounded-full mb-4 ${iconColorClass} group-hover:scale-110 transition-transform duration-300`}>
        <Icon className="w-8 h-8" />
      </div>

      <h3 className="text-xs font-bold tracking-wider text-gray-400 uppercase mb-1">{title}</h3>
      <p className="text-lg font-semibold text-gray-800">{subTitle}</p>

      {/* Indicador visual de acción */}
      <div className="mt-4 text-xs font-medium text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center">
        Acceder <span className="ml-1">&rarr;</span>
      </div>
    </div>
  );
};

export default DashboardCard;
