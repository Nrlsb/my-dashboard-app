import React, { useState } from 'react';
import {
  ShoppingCart,
  Clock,
  DollarSign,
  Gift,
  Banknote,
  FileText,
  HelpCircle,
  UploadCloud,
  Building,
  ChevronDown
} from 'lucide-react';

// --- Componente de Login ---
// Este es el nuevo componente para la página de inicio de sesión.
const LoginPage = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // Lógica de autenticación de simulación
    // En un proyecto real, aquí llamarías a tu API
    if (username.trim() !== '' && password.trim() !== '') {
      setError('');
      onLoginSuccess(); // Llama a la función del padre para cambiar el estado
    } else {
      setError('Usuario o contraseña no pueden estar vacíos.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 font-sans">
      <div className="w-full max-w-sm p-8 space-y-6 bg-white rounded-lg shadow-xl">
        {/* Logo */}
        <div className="text-center">
          {/* Cambiado 'KUM' y ajustado el tamaño de fuente */}
          <span className="text-3xl font-bold text-red-600">Pintureria Mercurio</span>
          {/* Eliminada la línea 'APORTES EN VIRTUAL' para mejor ajuste */}
        </div>
        
        <h2 className="text-2xl font-bold text-center text-gray-800">Iniciar Sesión</h2>
        
        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* Campo Usuario */}
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">
              Usuario
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Tu usuario"
            />
          </div>
          
          {/* Campo Contraseña */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {/* Mensaje de Error */}
          {error && (
            <p className="text-sm text-center text-red-600">{error}</p>
          )}

          {/* Botón de Ingreso */}
          <button
            type="submit"
            className="w-full px-4 py-2 font-semibold text-white bg-red-600 rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors duration-200"
          >
            Ingresar
          </button>
        </form>
      </div>
    </div>
  );
};


// --- Componentes del Dashboard (el código original) ---

// El Header
const Header = () => {
  return (
    <header className="bg-white shadow-md">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <div className="flex-shrink-0">
            {/* Cambiado 'KUM' y ajustado el tamaño de fuente */}
            <span className="text-2xl font-bold text-red-600">Pintureria Mercurio</span>
            {/* Eliminada la línea 'APORTES EN VIRTUAL' para mejor ajuste */}
          </div>
          
          {/* Perfil de Usuario */}
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gray-100 rounded-full">
              <Building className="w-6 h-6 text-gray-600" />
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-800">Nombre de la Empresa</p>
              <p className="text-xs text-gray-500">Usuario Logueado</p>
            </div>
            <button className="p-2 rounded-full hover:bg-gray-100">
              <ChevronDown className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

// El Card
const DashboardCard = ({ title, subTitle, icon: Icon, tag, bgColor = 'bg-gray-700', ...props }) => {
  return (
    <div 
      className="relative flex flex-col items-center justify-center p-4 pt-8 text-center bg-white border border-gray-200 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 cursor-pointer overflow-hidden"
      {...props}
    >
      {tag && (
        <span className="absolute top-0 right-0 px-3 py-1 text-xs font-bold text-white bg-red-600 rounded-bl-lg">
          {tag}
        </span>
      )}
      
      <div className="flex items-center justify-center w-16 h-16 mb-4">
        <Icon className="w-12 h-12 text-gray-700" />
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

// El Contenido del Dashboard
const Dashboard = () => {
  const cards = [
    { title: '', subTitle: 'Nuevo Pedido', icon: ShoppingCart, bgColor: 'bg-gray-700' },
    { title: 'Historico', subTitle: 'Histórico de Pedidos', icon: Clock, bgColor: 'bg-gray-700' },
    { title: 'Precios', subTitle: 'Lista de Precios', icon: DollarSign, bgColor: 'bg-gray-700' },
    { title: 'Ofertas', subTitle: 'Nuevas Ofertas', icon: Gift, tag: 'NUEVO', bgColor: 'bg-gray-700' },
    { title: 'Cuenta Corriente', subTitle: 'Saldo Cuenta', icon: Banknote, bgColor: 'bg-gray-700' },
    { title: 'Información Importante', subTitle: 'Información', icon: FileText, bgColor: 'bg-gray-700' },
    { title: 'Consultas', subTitle: 'Envío de Consultas', icon: HelpCircle, bgColor: 'bg-gray-700' },
    { title: 'Cupones Tarjeta', subTitle: 'Carga Comprobantes', icon: UploadCloud, bgColor: 'bg-gray-700' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
      {cards.map((card, index) => (
        <DashboardCard
          key={index}
          title={card.title}
          subTitle={card.subTitle}
          icon={card.icon}
          tag={card.tag}
          bgColor={card.bgColor}
        />
      ))}
    </div>
  );
};


// --- Página Principal del Dashboard ---
// (Esto era el 'App' original)
const DashboardPage = () => {
  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <Header />
      <main className="p-4 md:p-8 max-w-7xl mx-auto">
        <Dashboard />
      </main>
    </div>
  );
};

// --- Componente Raíz (Maneja la autenticación) ---
// Este es el componente principal que decide qué página mostrar.
export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Simula un login exitoso
  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  // Renderizado condicional
  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  // Si está autenticado, muestra el dashboard
  return <DashboardPage />;
}


