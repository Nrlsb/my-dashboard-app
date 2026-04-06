import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tag, ArrowLeft, X, ChevronRight, Package, Info, ShoppingCart, CheckCircle, Minus, Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import apiService from '../api/apiService.js';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useProductQuantity } from '../hooks/useProductQuantity';

// --- Nuevo: Selector de Cantidad Reutilizable ---
const QuantitySelector = ({ product, onQuantityChange }) => {
  const {
    quantity,
    increment,
    decrement,
    handleInputChange,
    handleBlur,
  } = useProductQuantity(product);

  // Sincronizar con el componente padre cuando cambie la cantidad local
  React.useEffect(() => {
    onQuantityChange(quantity);
  }, [quantity, onQuantityChange]);

  return (
    <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden h-9 bg-white shadow-sm">
      <button
        onClick={(e) => {
          e.stopPropagation();
          decrement();
        }}
        className="px-2 h-full text-gray-500 hover:bg-gray-50 hover:text-blue-600 transition-colors"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>
      <input
        type="number"
        value={quantity}
        onChange={(e) => {
          e.stopPropagation();
          handleInputChange(e);
        }}
        onBlur={(e) => {
          e.stopPropagation();
          handleBlur();
        }}
        onClick={(e) => e.stopPropagation()}
        className="w-10 text-center border-l border-r border-gray-100 text-sm font-medium focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button
        onClick={(e) => {
          e.stopPropagation();
          increment();
        }}
        className="px-2 h-full text-gray-500 hover:bg-gray-50 hover:text-blue-600 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

const LoadingSkeleton = () => (
  <div className="animate-pulse grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    <div className="bg-gray-200 h-48 rounded-lg"></div>
    <div className="bg-gray-200 h-48 rounded-lg"></div>
    <div className="bg-gray-200 h-48 rounded-lg"></div>
  </div>
);

const ErrorMessage = ({ message }) => (
  <div className="flex flex-col items-center justify-center p-10 bg-white rounded-lg shadow-md">
    <p className="text-red-500 font-semibold text-lg">
      Error al cargar las ofertas
    </p>
    <p className="text-gray-600 mt-2">{message}</p>
  </div>
);

const formatCurrency = (amount) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);

const ProductOfferCard = ({ product }) => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { user, isAuthenticated } = useAuth();
  const [isAdded, setIsAdded] = useState(false);
  const [selectedQuantity, setSelectedQuantity] = useState(1);

  const handleAddToCart = (e) => {
    e.stopPropagation();
    addToCart(product, selectedQuantity);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  const renderPrice = () => {
    if (product.discount_percentage != null) {
      const discounted = product.discountedPrice ?? product.price * (1 - product.discount_percentage / 100);
      return (
        <div className="flex items-baseline gap-2 flex-wrap">
          <p className="text-xl font-bold text-red-600">{formatCurrency(discounted)}</p>
          <p className="text-sm text-gray-400 line-through">{product.formattedPrice}</p>
          <span className="text-xs font-semibold bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">
            -{product.discount_percentage}%
          </span>
        </div>
      );
    }
    if (product.offer_price != null) {
      return (
        <div className="flex items-baseline gap-2 flex-wrap">
          <p className="text-xl font-bold text-green-700">{formatCurrency(product.offer_price)}</p>
          <p className="text-sm text-gray-400 line-through">{product.formattedPrice}</p>
        </div>
      );
    }
    return <p className="text-2xl font-bold text-gray-900">{product.formattedPrice}</p>;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden transform transition-transform hover:scale-105 duration-300 flex flex-col justify-between h-full border border-gray-100">
      {product.custom_image_url && (
        <div className="h-48 w-full overflow-hidden relative bg-white">
          <img
            src={product.custom_image_url}
            alt={product.custom_title || product.name}
            className="w-full h-full object-contain"
          />
          <span className="absolute bottom-0 right-0 bg-black/50 text-white text-[9px] px-2 py-0.5 pointer-events-none uppercase tracking-wider font-bold rounded-tl-md backdrop-blur-sm">
            Imagen ilustrativa
          </span>
        </div>
      )}
      <div className="p-6 flex-grow flex flex-col">
        <div className="flex items-start justify-between mb-3">
          <span className="inline-block bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full uppercase">
            {product.brand || 'Marca'}
          </span>
          <Tag className="w-6 h-6 text-blue-500" />
        </div>
        <h3
          className={`text-base font-semibold text-gray-800 mb-2 ${!product.custom_description ? 'h-12 overflow-hidden' : ''}`}
          title={product.custom_title || product.name}
        >
          {product.custom_title || product.name}
        </h3>
        {product.custom_description && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-3">
            {product.custom_description}
          </p>
        )}
        <p className="text-sm text-gray-500 mb-4 font-mono">Cód: {product.code}</p>
        <div className="mt-auto">{renderPrice()}</div>
      </div>
      <div className="p-4 bg-gray-50 mt-auto border-t border-gray-100 flex flex-col gap-3">
        {isAuthenticated && user?.role !== 'vendedor' && (
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <QuantitySelector
                product={product}
                onQuantityChange={setSelectedQuantity}
              />
            </div>
            <button
              onClick={handleAddToCart}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-semibold transition-all duration-300 shadow-sm border ${isAdded
                ? 'bg-green-100 text-green-700 border-green-200'
                : 'bg-blue-600 text-white border-blue-700 hover:bg-blue-700'
                }`}
            >
              {isAdded ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Agregado</span>
                </>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4" />
                  <span>Agregar</span>
                </>
              )}
            </button>
          </div>
        )}
        <button
          onClick={() => navigate(`/product-detail/${product.id}`)}
          className="w-full bg-white text-gray-700 py-2 px-4 rounded-lg font-medium border border-gray-200 hover:bg-gray-50 transition-colors duration-200 cursor-pointer text-sm shadow-sm"
        >
          Ver Detalle
        </button>
      </div>
    </div>
  );
};

// --- Nuevo: Card para Ofertas por Grupo ---
const GroupOfferCard = ({ group, onSelect }) => {
  const productsCount = group.products.length;
  const brand = group.products[0].brand || 'Varios';

  return (
    <div
      onClick={onSelect}
      className="bg-white rounded-lg shadow-lg overflow-hidden transform transition-transform hover:scale-105 duration-300 flex flex-col justify-between h-full border-2 border-blue-100 cursor-pointer group"
    >
      <div className={`h-48 w-full overflow-hidden relative flex items-center justify-center ${group.custom_image_url ? 'bg-white' : 'bg-gradient-to-br from-blue-500 to-blue-700'}`}>
        {group.custom_image_url ? (
          <img
            src={group.custom_image_url}
            alt={group.custom_title}
            className="w-full h-full object-contain group-hover:opacity-90 transition-opacity"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-white/80 p-4">
            <Package className="w-12 h-12 mb-2 opacity-50" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-center">
              Promoción Especial
            </span>
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 flex items-end justify-between">
          <span className="inline-block bg-white/20 backdrop-blur-md text-white text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase border border-white/30">
            {brand}
          </span>
          <div className="bg-blue-600/90 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-lg flex items-center gap-1.5 backdrop-blur-sm border border-blue-400/50">
            <Package className="w-3 h-3" />
            <span>{productsCount} {productsCount === 1 ? 'Producto' : 'Productos'}</span>
          </div>
        </div>
      </div>

      <div className="p-6 flex-grow flex flex-col">
        <h3 className="text-lg font-bold text-gray-800 mb-2 leading-tight group-hover:text-blue-600 transition-colors">
          {group.custom_title}
        </h3>
        {group.custom_description && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-3">
            {group.custom_description}
          </p>
        )}
        <div className="mt-auto flex items-center text-blue-600 font-semibold text-sm">
          Ver promoción completa
          <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
      <div className="p-4 bg-blue-50 mt-auto border-t border-blue-100 group-hover:bg-blue-100 transition-colors">
        <button
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium shadow-sm"
        >
          Ver Productos
        </button>
      </div>
    </div>
  );
};

// --- Nuevo: Item de producto dentro del modal para manejar su propio estado ---
const GroupProductItem = ({ product, onAddToCart, navigate }) => {
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);
  const { user, isAuthenticated } = useAuth();

  const handleAdd = () => {
    onAddToCart(product, selectedQuantity);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  return (
    <div className="group border border-gray-100 hover:border-blue-200 rounded-xl p-0 overflow-hidden transition-all hover:shadow-md bg-white flex flex-col h-full">
      <div className="relative aspect-square bg-gray-50 overflow-hidden border-b border-gray-50">
        {product.imageUrl || product.custom_image_url ? (
          <img
            src={product.thumbnailUrl || product.imageUrl || product.custom_image_url}
            alt={product.name}
            className="w-full h-full object-contain p-4 transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-200">
            <Package className="w-12 h-12 mb-2" />
            <span className="text-xs">Sin imagen</span>
          </div>
        )}
        <div className="absolute top-2 left-2">
          <span className="text-[10px] font-bold text-blue-600 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
            {product.brand}
          </span>
        </div>
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <h4 className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors line-clamp-2 min-h-[2.5rem] text-sm">
          {product.name}
        </h4>
        <p className="text-[10px] text-gray-400 font-mono mt-1 mb-3">Cód: {product.code}</p>

        <div className="mb-4">
          {product.discount_percentage != null ? (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-red-600">
                  {formatCurrency(product.price * (1 - product.discount_percentage / 100))}
                </span>
                <span className="bg-orange-100 text-orange-700 text-[10px] font-black px-1.5 py-0.5 rounded uppercase">
                  -{product.discount_percentage}%
                </span>
              </div>
              <span className="text-sm text-gray-400 line-through">
                {formatCurrency(product.price)}
              </span>
            </div>
          ) : product.offer_price != null ? (
            <div className="space-y-1">
              <span className="text-2xl font-bold text-green-700">
                {formatCurrency(product.offer_price)}
              </span>
              <div className="text-sm text-gray-400 line-through">
                {formatCurrency(product.price)}
              </div>
            </div>
          ) : (
            <span className="text-2xl font-bold text-gray-900">
              {formatCurrency(product.price)}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 mt-auto">
        {isAuthenticated && user?.role !== 'vendedor' && (
          <div className="flex items-center gap-2">
            <div className="flex-grow">
              <QuantitySelector
                product={product}
                onQuantityChange={setSelectedQuantity}
              />
            </div>
            <button
              onClick={handleAdd}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-2 rounded-lg font-semibold transition-all duration-300 shadow-sm border text-xs ${isAdded
                ? 'bg-green-100 text-green-700 border-green-200'
                : 'bg-blue-600 text-white border-blue-700 hover:bg-blue-700'
                }`}
            >
              {isAdded ? <CheckCircle className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
              <span>{isAdded ? 'Agregado' : 'Añadir'}</span>
            </button>
          </div>
        )}
        <button
          onClick={() => navigate(`/product-detail/${product.id}`)}
          className="w-full py-2 px-4 bg-gray-50 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 transition-all duration-200 flex items-center justify-center gap-2 text-xs border border-gray-100"
        >
          Ver detalle
        </button>
      </div>
    </div>
  );
};

const GroupProductsModal = ({ group, onClose }) => {
  const navigate = useNavigate();
  const { addToCart } = useCart();

  if (!group) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-100 animate-in fade-in zoom-in duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
          <div>
            <h3 className="text-xl font-bold text-gray-800">{group.custom_title}</h3>
            <p className="text-sm text-gray-500 mt-1">{group.products.length} productos en promoción</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors cursor-pointer">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 bg-white flex-1 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
          {group.custom_description && (
            <div className="mb-8 p-4 bg-blue-50 rounded-xl border border-blue-100 flex gap-4 items-start">
              <div className="p-2 bg-blue-100 rounded-lg text-blue-600 shrink-0 mt-0.5">
                <Info className="w-5 h-5" />
              </div>
              <p className="text-gray-700 leading-relaxed italic">{group.custom_description}</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {group.products.map((product) => (
              <GroupProductItem
                key={product.id}
                product={product}
                onAddToCart={(p, q) => addToCart(p, q)}
                navigate={navigate}
              />
            ))}
          </div>
        </div>

        <div className="p-6 bg-gray-50 border-t border-gray-100 text-center">
          <button
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-700 font-medium hover:underline cursor-pointer"
          >
            Cerrar esta promoción
          </button>
        </div>
      </div>
    </div>
  );
};

export default function OffersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedGroup, setSelectedGroup] = useState(null);

  const {
    data: offers = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['offers', user?.id],
    queryFn: () => apiService.fetchOffers(),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  });

  // --- Lógica de Agrupación ---
  const processedOffers = useMemo(() => {
    if (!offers.length) return [];

    const groups = new Map();
    const result = [];

    offers.forEach(product => {
      // Agrupamos si tiene un título personalizado definido
      if (product.custom_title && product.custom_title.trim() !== '') {
        const cleanTitle = product.custom_title.trim();
        const cleanImage = (product.custom_image_url || '').trim();
        const groupKey = `${cleanImage}_${cleanTitle}`;

        if (!groups.has(groupKey)) {
          groups.set(groupKey, {
            isGroup: true,
            id: `group_${groupKey}`,
            custom_title: cleanTitle,
            custom_description: product.custom_description || product.description,
            custom_image_url: cleanImage,
            products: []
          });
          result.push(groups.get(groupKey));
        }
        groups.get(groupKey).products.push(product);
      } else {
        result.push({ ...product, isGroup: false });
      }
    });

    // Filtramos grupos que terminaron con 1 solo producto (los volvemos individuales si queremos,
    // pero aquí los mantenemos como grupo si tienen portada explícita configurada)
    // Opcional: Podríamos aplanar grupos de 1 producto
    return result;
  }, [offers]);

  const renderContent = () => {
    if (!user?.id) {
      return (
        <div className="text-center py-20 bg-white rounded-lg shadow-md">
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            Inicia sesión para ver las ofertas
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Necesitas estar autenticado para acceder a esta sección.
          </p>
        </div>
      );
    }

    if (isLoading) {
      return <LoadingSkeleton />;
    }

    if (isError) {
      return <ErrorMessage message={error.message} />;
    }

    if (processedOffers.length === 0) {
      return (
        <div className="text-center py-20 bg-white rounded-lg shadow-md">
          <Tag className="mx-auto w-16 h-16 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            No hay ofertas disponibles
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Vuelve a consultar más tarde para ver nuevas promociones.
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
        {processedOffers.map((item) => (
          item.isGroup ? (
            <GroupOfferCard
              key={item.id}
              group={item}
              onSelect={() => setSelectedGroup(item)}
            />
          ) : (
            <ProductOfferCard key={item.id} product={item} />
          )
        ))}
      </div>
    );
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <header className="mb-10 flex items-center">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center justify-center p-2 mr-6 text-gray-600 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors cursor-pointer"
          aria-label="Volver al dashboard"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">
            Ofertas y Promociones
          </h1>
          <p className="text-gray-500 mt-1">
            Descubre los productos con descuentos vigentes que tenemos para ti.
          </p>
        </div>
      </header>

      {renderContent()}

      {selectedGroup && (
        <GroupProductsModal
          group={selectedGroup}
          onClose={() => setSelectedGroup(null)}
        />
      )}
    </div>
  );
}
