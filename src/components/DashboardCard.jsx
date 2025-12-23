import React from 'react';

// --- Componente de Card ---
// Movido a su propio archivo ya que es reutilizable
const DashboardCard = ({
  title,
  subTitle,
  icon: Icon,
  tag,
  onClick,
  isLast,
  ...props
}) => {
  // Normalize text for matching
  const fullText = `${title || ''} ${subTitle || ''}`.toUpperCase();

  // Default state (Clean White)
  let hoverColorClass = 'hover:bg-gray-50';
  let iconColorClass = 'text-espint-blue bg-gray-50 group-hover:bg-white/20 group-hover:text-white group-hover:scale-110';
  let textColorClass = 'text-espint-blue group-hover:text-espint-blue';
  let subTextColorClass = 'text-gray-400 group-hover:text-gray-600';
  let arrowColorClass = 'text-espint-green group-hover:text-espint-green';

  // Define specific colors based on content for HOVER state
  if (fullText.includes('PEDIDOS')) {
    // Histórico de Pedidos -> Magenta
    hoverColorClass = 'hover:bg-espint-magenta';
    textColorClass = 'text-espint-blue group-hover:text-white';
    subTextColorClass = 'text-gray-400 group-hover:text-white/90';
    arrowColorClass = 'text-espint-green group-hover:text-white';
  } else if (fullText.includes('PRECIO')) {
    // Lista de Precios -> Yellow
    hoverColorClass = 'hover:bg-[#FFC20E]';
    textColorClass = 'text-espint-blue group-hover:text-white';
    subTextColorClass = 'text-gray-400 group-hover:text-white/90';
    arrowColorClass = 'text-espint-green group-hover:text-white';
  } else if (fullText.includes('CUENTA') || fullText.includes('SALDO')) {
    // Cuenta Corriente -> Navy Blue
    hoverColorClass = 'hover:bg-espint-blue';
    textColorClass = 'text-espint-blue group-hover:text-white';
    subTextColorClass = 'text-gray-400 group-hover:text-white/90';
    arrowColorClass = 'text-espint-green group-hover:text-white';
  } else if (fullText.includes('CONSULTA') || fullText.includes('CLIENTE')) {
    // Consultas -> Magenta
    hoverColorClass = 'hover:bg-espint-magenta';
    textColorClass = 'text-espint-blue group-hover:text-white';
    subTextColorClass = 'text-gray-400 group-hover:text-white/90';
    arrowColorClass = 'text-espint-green group-hover:text-white';
  } else if (fullText.includes('OFERTAS')) {
    // Nuevas Ofertas -> Green (same as Nuevo Pedido)
    hoverColorClass = 'hover:bg-espint-green';
    textColorClass = 'text-espint-blue group-hover:text-white';
    subTextColorClass = 'text-gray-400 group-hover:text-white/90';
    arrowColorClass = 'text-espint-green group-hover:text-white';
  } else if (fullText.includes('PEDIDO')) {
    // Nuevo Pedido -> Green
    hoverColorClass = 'hover:bg-espint-green';
    textColorClass = 'text-espint-blue group-hover:text-white';
    subTextColorClass = 'text-gray-400 group-hover:text-white/90';
    arrowColorClass = 'text-espint-green group-hover:text-white';
  }

  // Override title for "Nuevo Pedido"
  let displayTitle = title;
  if (fullText.includes('NUEVO PEDIDO') || (fullText.includes('PEDIDO') && !fullText.includes('HISTORICO'))) {
    displayTitle = 'CREAR PEDIDO';
  }

  return (
    <div
      onClick={onClick}
      className={`
        group relative flex flex-col items-center justify-center p-6 h-48
        cursor-pointer transition-all duration-300 ease-out
        bg-white
        ${hoverColorClass}
        ${props.className || ''}
      `}
    >
      {tag && (
        <span className="absolute top-3 right-3 px-2.5 py-1 text-[10px] font-bold text-white bg-espint-magenta rounded-full shadow-sm z-10 tracking-wide">
          {tag}
        </span>
      )}

      <div className={`p-4 rounded-2xl mb-4 transition-colors duration-300 ${iconColorClass}`}>
        <Icon className="w-8 h-8 transition-transform duration-300" />
      </div>

      <h3 className={`text-xs font-bold tracking-widest uppercase mb-2 text-center transition-colors duration-300 ${subTextColorClass}`}>
        {displayTitle}
      </h3>

      <p className={`text-sm md:text-base font-bold text-center leading-tight px-2 transition-colors duration-300 ${textColorClass}`}>
        {subTitle}
      </p>


    </div>
  );
};

export default DashboardCard;
