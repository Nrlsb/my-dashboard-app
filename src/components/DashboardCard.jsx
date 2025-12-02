import React from 'react';

// --- Componente de Card ---
// Movido a su propio archivo ya que es reutilizable
const DashboardCard = ({
  title,
  subTitle,
  icon: Icon,
  tag,
  bgColor = 'bg-espint-blue',
  ...props
}) => {
  let borderColorClass = '';
  if (title === 'CUENTAS') borderColorClass = 'border-t-4 border-t-[#0B3D68]'; // Navy Blue
  else if (title === 'PEDIDOS') borderColorClass = 'border-t-4 border-t-[#8CB818]'; // Green
  else if (title === 'CLIENTES') borderColorClass = 'border-t-4 border-t-[#D10074]'; // Magenta
  else borderColorClass = 'border-t-4 border-t-gray-200';

  return (
    <div
      className={`relative flex flex-col items-center justify-center p-4 pt-8 text-center bg-white border border-gray-200 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 cursor-pointer overflow-hidden ${borderColorClass}`}
      {...props} // <-- onClick se aplicará aquí
    >
      {tag && (
        <span className="absolute top-0 right-0 px-3 py-1 text-xs font-bold text-white bg-espint-magenta rounded-bl-lg">
          {tag}
        </span>
      )}

      <div className="flex items-center justify-center w-16 h-16 mb-4">
        <Icon className="w-12 h-12 text-espint-magenta" />
      </div>

      <h3 className="text-sm font-semibold text-gray-500 uppercase">{title}</h3>

      <button
        className={`w-full px-4 py-2 mt-4 text-sm font-semibold text-white ${bgColor} rounded-md hover:opacity-90 transition-opacity`}
      >
        {subTitle}
      </button>
    </div>
  );
};

export default DashboardCard;
