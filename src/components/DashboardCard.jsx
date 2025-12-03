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

  // Default state
  let hoverColorClass = 'hover:bg-gray-50';
  let iconColorClass = 'text-gray-500 bg-gray-100';
  let textColorClass = 'group-hover:text-gray-800'; // Default text color on hover
  let subTextColorClass = 'group-hover:text-gray-600';
  let iconHoverClass = 'group-hover:scale-110';

  // Define specific colors based on content
  if (fullText.includes('PEDIDOS')) {
    // Nuevo Pedido, Histórico de Pedidos
    iconColorClass = 'text-[#D10074] bg-pink-50';
    hoverColorClass = 'hover:bg-[#D10074]'; // Magenta
    textColorClass = 'group-hover:text-white';
    subTextColorClass = 'group-hover:text-white/90';
    iconHoverClass = 'group-hover:bg-white/20 group-hover:text-white group-hover:scale-110';
  } else if (fullText.includes('PRECIO')) {
    // Lista de Precios
    iconColorClass = 'text-[#FFC20E] bg-yellow-50';
    hoverColorClass = 'hover:bg-[#FFC20E]'; // Yellow
    // Yellow background might need dark text for better contrast, but user asked for "company colors". 
    // Usually yellow needs dark text. Let's keep it white for consistency unless it's too light.
    // #FFC20E is quite bright. Let's try dark text for Yellow or keep white if it's the brand style.
    // Given the other cards use white, let's stick to white but maybe add a slight shadow if needed.
    // Actually, for accessibility, dark text on yellow is better.
    textColorClass = 'group-hover:text-white';
    subTextColorClass = 'group-hover:text-white/90';
    iconHoverClass = 'group-hover:bg-white/20 group-hover:text-white group-hover:scale-110';
  } else if (fullText.includes('CUENTA') || fullText.includes('SALDO')) {
    // Cuenta Corriente, Saldo Cuenta, Cuentas
    iconColorClass = 'text-[#183050] bg-blue-50';
    hoverColorClass = 'hover:bg-[#183050]'; // Navy
    textColorClass = 'group-hover:text-white';
    subTextColorClass = 'group-hover:text-white/90';
    iconHoverClass = 'group-hover:bg-white/20 group-hover:text-white group-hover:scale-110';
  } else if (fullText.includes('CONSULTA') || fullText.includes('CLIENTE')) {
    // Consultas, Clientes
    iconColorClass = 'text-[#D10074] bg-pink-50';
    hoverColorClass = 'hover:bg-[#D10074]'; // Magenta
    textColorClass = 'group-hover:text-white';
    subTextColorClass = 'group-hover:text-white/90';
    iconHoverClass = 'group-hover:bg-white/20 group-hover:text-white group-hover:scale-110';
  } else if (fullText.includes('PEDIDO')) {
    // Explicit check for Historico if it didn't match Pedido (though it likely matched Pedido)
    // If we want a different color for Historico:
    iconColorClass = 'text-[#8CB818] bg-green-50';
    hoverColorClass = 'hover:bg-[#8CB818]'; // Green
    textColorClass = 'group-hover:text-white';
    subTextColorClass = 'group-hover:text-white/90';
    iconHoverClass = 'group-hover:bg-white/20 group-hover:text-white group-hover:scale-110';
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
        group relative flex-1 flex flex-col items-center justify-center p-6 h-40
        cursor-pointer transition-all duration-500 ease-in-out
        hover:flex-[2] ${hoverColorClass}
        ${!isLast ? 'border-r border-gray-100' : ''}
      `}
      {...props}
    >
      {tag && (
        <span className="absolute top-0 right-0 px-3 py-1 text-xs font-bold text-white bg-espint-magenta rounded-bl-lg z-10">
          {tag}
        </span>
      )}

      <div className={`p-3 rounded-full mb-3 ${iconColorClass} ${iconHoverClass} transition-all duration-300`}>
        <Icon className="w-6 h-6 md:w-8 md:h-8" />
      </div>

      <h3 className={`text-xs font-bold tracking-wider text-gray-400 uppercase mb-1 text-center whitespace-nowrap ${subTextColorClass} transition-colors duration-300`}>{displayTitle}</h3>

      {/* Content that appears/expands on hover */}
      <div className="max-h-0 opacity-0 group-hover:max-h-20 group-hover:opacity-100 transition-all duration-500 overflow-hidden flex flex-col items-center">
        <p className={`text-sm md:text-base font-semibold text-gray-800 text-center whitespace-nowrap px-2 ${textColorClass} transition-colors duration-300`}>{subTitle}</p>
        <div className={`mt-2 text-xs font-medium text-blue-600 flex items-center ${subTextColorClass} transition-colors duration-300`}>
          Acceder <span className="ml-1">&rarr;</span>
        </div>
      </div>
    </div>
  );
};

export default DashboardCard;
