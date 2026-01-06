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
  // Default state (Clean White)
  let hoverBgClass = 'group-hover:bg-gray-50';
  let hoverScaleClass = '';
  let iconColorClass = 'text-espint-blue bg-gray-50 group-hover:bg-white/20 group-hover:text-white group-hover:scale-110';
  let textColorClass = 'text-espint-blue group-hover:text-espint-blue';
  let subTextColorClass = 'text-gray-400 group-hover:text-gray-600';
  let arrowColorClass = 'text-espint-green group-hover:text-espint-green';

  // Define specific colors based on content for HOVER state
  if (fullText.includes('PEDIDOS')) {
    // Histórico de Pedidos -> Magenta
    hoverBgClass = 'group-hover:bg-espint-magenta';
    textColorClass = 'text-espint-blue group-hover:text-white';
    subTextColorClass = 'text-gray-400 group-hover:text-white/90';
    arrowColorClass = 'text-espint-green group-hover:text-white';
  } else if (fullText.includes('PRECIO')) {
    // Lista de Precios -> Yellow
    hoverBgClass = 'group-hover:bg-[#FFC20E]';
    textColorClass = 'text-espint-blue group-hover:text-white';
    subTextColorClass = 'text-gray-400 group-hover:text-white/90';
    arrowColorClass = 'text-espint-green group-hover:text-white';
  } else if (fullText.includes('CUENTA') || fullText.includes('SALDO')) {
    // Cuenta Corriente -> Navy Blue
    hoverBgClass = 'group-hover:bg-espint-blue';
    textColorClass = 'text-espint-blue group-hover:text-white';
    subTextColorClass = 'text-gray-400 group-hover:text-white/90';
    arrowColorClass = 'text-espint-green group-hover:text-white';
  } else if (fullText.includes('CONSULTA') || fullText.includes('CLIENTE')) {
    // Consultas -> Magenta
    hoverBgClass = 'group-hover:bg-espint-magenta';
    textColorClass = 'text-espint-blue group-hover:text-white';
    subTextColorClass = 'text-gray-400 group-hover:text-white/90';
    arrowColorClass = 'text-espint-green group-hover:text-white';
  } else if (fullText.includes('OFERTAS')) {
    // Nuevas Ofertas -> Green Background + Animated Border + Scale
    hoverBgClass = 'group-hover:bg-espint-green';
    hoverScaleClass = 'hover:scale-110 z-20';
    textColorClass = 'text-espint-blue group-hover:text-white';
    subTextColorClass = 'text-gray-400 group-hover:text-white/90';
    arrowColorClass = 'text-espint-green group-hover:text-white';
  } else if (fullText.includes('PEDIDO')) {
    // Nuevo Pedido -> Green
    hoverBgClass = 'group-hover:bg-espint-green';
    textColorClass = 'text-espint-blue group-hover:text-white';
    subTextColorClass = 'text-gray-400 group-hover:text-white/90';
    arrowColorClass = 'text-espint-green group-hover:text-white';
  }

  // Override title for "Nuevo Pedido"
  let displayTitle = title;
  if (fullText.includes('NUEVO PEDIDO') || (fullText.includes('PEDIDO') && !fullText.includes('HISTORICO'))) {
    displayTitle = 'CREAR PEDIDO';
  }

  const isOffers = fullText.includes('OFERTAS');

  return (
    <>
      {isOffers && (
        <style>{`
          @keyframes border-rotate {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          .animate-border-custom {
            background-size: 200% 200%;
            animation: border-rotate 3s ease infinite;
          }
        `}</style>
      )}
      <div
        onClick={onClick}
        className={`
          group relative flex flex-col items-center justify-center p-6 h-48
          cursor-pointer transition-all duration-300 ease-out
          bg-transparent
          ${hoverScaleClass}
          ${props.className || ''}
        `}
      >
        {/* Animated Border (Behind everything) */}
        {isOffers && (
          <div className="absolute -inset-[5px] rounded-[inherit] bg-[linear-gradient(90deg,#003366,#AACD46,#FFC20E,#EC008C,#003366)] animate-border-custom -z-20 blur-sm" />
        )}

        {/* Card Background (Between Border and Content) */}
        <div className={`absolute inset-0 rounded-[inherit] bg-white transition-colors duration-300 ${hoverBgClass} -z-10`} />

        {tag && (
          <span className="absolute top-3 right-3 px-2.5 py-1 text-[10px] font-bold text-white bg-espint-magenta rounded-full shadow-sm z-10 tracking-wide">
            {tag}
          </span>
        )}

        {/* Content Wrapper */}
        <div className="relative z-10 flex flex-col items-center w-full">
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

      </div>
    </>
  );
};

export default DashboardCard;
