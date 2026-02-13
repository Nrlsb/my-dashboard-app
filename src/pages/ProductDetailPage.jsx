import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import apiService from '../api/apiService.js';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useProductQuantity } from '../hooks/useProductQuantity';
import {
  ArrowLeft,
  Package,
  DollarSign,
  CheckCircle,
  AlertTriangle,
  Loader2,
  ShoppingCart,
  Info,

  Circle,
  Sparkles,
  Edit,
} from 'lucide-react';

// Formateador de moneda
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);
};

// Componente de UI para el estado de carga (Skeleton)
const LoadingSkeleton = () => (
  <div className="animate-pulse">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="bg-gray-200 h-96 rounded-lg"></div>
      <div className="space-y-4">
        <div className="bg-gray-200 h-8 w-1/3 rounded"></div>
        <div className="bg-gray-200 h-12 w-3/4 rounded"></div>
        <div className="bg-gray-200 h-8 w-1/4 rounded"></div>
        <div className="bg-gray-200 h-20 w-full rounded"></div>
        <div className="bg-gray-200 h-12 w-1/2 rounded"></div>
      </div>
    </div>
  </div>
);

// Componente de UI para el estado de error
const ErrorMessage = ({ message }) => (
  <div className="flex flex-col items-center justify-center p-10 bg-white rounded-lg shadow-md">
    <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
    <p className="text-red-500 font-semibold text-lg">
      Error al cargar el producto
    </p>
    <p className="text-gray-600 mt-2">{message}</p>
  </div>
);

export default function ProductDetailPage() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { user } = useAuth();

  const {
    data: product,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['product', productId, user?.id],
    queryFn: () => apiService.fetchProductById(productId),
    enabled: !!productId,
  });

  const {
    quantity,
    increment,
    decrement,
    handleInputChange,
    handleBlur,
  } = useProductQuantity(product, 1);

  const [isAdded, setIsAdded] = useState(false);

  const handleAddToCart = () => {
    if (!product) return;
    addToCart(product, quantity);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };



  const renderContent = () => {
    if (isLoading) {
      return <LoadingSkeleton />;
    }

    if (isError) {
      return <ErrorMessage message={error.message} />;
    }

    if (!product) {
      return <ErrorMessage message="No se encontró el producto." />;
    }

    return (
      <div className="bg-white p-6 md:p-8 rounded-lg shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="flex items-center justify-center bg-gray-100 rounded-lg h-80 md:h-96 overflow-hidden">
            {(product.custom_image_url || product.imageUrl) ? (
              <div className="relative w-full h-full">
                <img
                  src={product.custom_image_url || product.imageUrl}
                  alt={product.custom_title || product.name}
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
                <span className="absolute bottom-0 right-0 bg-black/50 text-white text-[10px] px-2 py-1 pointer-events-none uppercase tracking-widest font-bold rounded-tl-md backdrop-blur-sm">
                  Imagen ilustrativa
                </span>
              </div>
            ) : (
              <>
                <Package className="w-24 h-24 text-gray-400" />
                <span className="absolute text-gray-500 text-sm mt-32">
                  Imagen de producto
                </span>
              </>
            )}
          </div>

          <div className="flex flex-col justify-center space-y-4">
            <span className="text-sm font-medium text-blue-600 uppercase">
              {product.brand || 'Marca'}
            </span>
            <h2 className="text-3xl font-bold text-gray-900">{product.custom_title || product.name}</h2>

            <div className="flex items-center space-x-3">
              <p className="text-4xl font-extrabold text-gray-800">
                {formatCurrency(product.price)}
              </p>
              {product.oferta && (
                <span className="flex items-center px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full uppercase tracking-wider animate-pulse">
                  <Sparkles className="w-4 h-4 mr-1" />
                  ¡En Oferta!
                </span>
              )}
            </div>

            <p className="text-gray-600 leading-relaxed">
              {product.custom_description || product.description ||
                product.capacity_description}
            </p>

            <div className="flex items-center space-x-4">
              <span className="font-medium text-gray-700">Cantidad:</span>
              <div className="flex items-center border border-gray-300 rounded-lg">
                <button
                  onClick={decrement}
                  className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-l-lg cursor-pointer"
                >
                  -
                </button>
                <input
                  type="number"
                  value={quantity}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  className="w-16 text-center border-none focus:ring-0"
                  min="1"
                />
                <button
                  onClick={increment}
                  className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-r-lg cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            {user?.role !== 'vendedor' && (
              <button
                onClick={handleAddToCart}
                className={`w-full py-3 px-6 rounded-lg text-white font-semibold transition-colors duration-300 cursor-pointer ${isAdded
                  ? 'bg-green-500 hover:bg-green-600'
                  : 'bg-blue-600 hover:bg-blue-700'
                  }`}
              >
                {isAdded ? (
                  <span className="flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Agregado
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    Agregar al Carrito
                  </span>
                )}
              </button>
            )}

            <div className="flex items-center text-sm text-gray-500 justify-between mt-4">
              <div className="flex items-center">
                <Info className="w-4 h-4 mr-2" />
                <span>Cód: {product.code}</span>
              </div>
              <div className="flex items-center font-medium">
                <div className="flex items-center mt-1">
                  {product.stock_disponible <= 0 ? (
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-red-600">
                        Sin Stock
                      </span>
                      {product.stock_de_seguridad > 0 && (
                        <span className="ml-2 text-xs text-blue-600 font-medium">
                          | Previsto de ingreso
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-600">
                        Stock: {product.stock_disponible > 100 ? '+100' : product.stock_disponible}
                      </span>
                      {product.stock_de_seguridad > 0 && (
                        <span className="ml-2 text-xs text-blue-600 font-medium">
                          | Previsto de ingreso
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>


        {/* AI Description Section */}
        <div className="mt-12 border-t pt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-2xl font-bold text-gray-800 flex items-center">
              <Sparkles className="w-6 h-6 text-purple-600 mr-2" />
              Detalles del Producto
            </h3>
          </div>

          <AiDescriptionEditor product={product} isAdmin={user?.is_admin} />
        </div>
      </div >
    );
  };

  return (
    <div className="p-6 bg-white min-h-screen">
      <header className="mb-6 flex items-center">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center p-2 mr-4 text-gray-600 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors cursor-pointer"
          aria-label="Volver"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            Detalle del Producto
          </h1>
        </div>
      </header>

      {renderContent()}
    </div>
  );
}

const AiDescriptionEditor = ({ product, isAdmin }) => {
  const [description, setDescription] = useState(product.ai_description || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const data = await apiService.generateAiDescription(product.id, {
        name: product.name,
        brand: product.brand,
        price: product.price, // Send raw price if needed, or formatted
        formattedPrice: product.formattedPrice
      });
      setDescription(data.description);
      setIsEditing(true); // Allow editing after generation
    } catch (error) {
      console.error('Error generating description:', error);
      alert('Error al generar la descripción');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await apiService.saveAiDescription(product.id, description);
      setIsEditing(false);
      // Optionally refresh product data or show success toast
    } catch (error) {
      console.error('Error saving description:', error);
      alert('Error al guardar la descripción');
    } finally {
      setIsSaving(false);
    }
  };

  // If not admin and no description, show nothing
  if (!isAdmin && !description) return null;

  return (
    <div className="bg-purple-50 p-6 rounded-lg border border-purple-100">
      {!isEditing && !description ? (
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">No hay descripción generada por IA para este producto.</p>
          {isAdmin && (
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generar Descripción con IA
                </>
              )}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {isEditing ? (
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full h-40 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Descripción del producto..."
            />
          ) : (

            <div className="prose max-w-none text-gray-700">
              {description.split('\n').map((line, index) => {
                const trimmedLine = line.trim();
                if (!trimmedLine) return <div key={index} className="h-2"></div>;

                // Headers like **Header**
                if (trimmedLine.startsWith('**') && trimmedLine.endsWith('**') && !trimmedLine.includes(':')) {
                  return (
                    <h4 key={index} className="text-lg font-bold text-gray-900 mt-4 mb-2">
                      {trimmedLine.replace(/\*\*/g, '')}
                    </h4>
                  );
                }

                // List items
                if (trimmedLine.startsWith('* ') || trimmedLine.startsWith('- ')) {
                  const content = trimmedLine.substring(2);
                  const parts = content.split(/(\*\*.*?\*\*)/g);
                  return (
                    <div key={index} className="flex items-start mb-1 ml-4">
                      <span className="mr-2 text-purple-500">•</span>
                      <span>
                        {parts.map((part, i) => {
                          if (part.startsWith('**') && part.endsWith('**')) {
                            return <strong key={i} className="font-semibold text-gray-900">{part.replace(/\*\*/g, '')}</strong>;
                          }
                          return part;
                        })}
                      </span>
                    </div>
                  );
                }

                // Regular text with bold
                const parts = line.split(/(\*\*.*?\*\*)/g);
                return (
                  <p key={index} className="mb-2 leading-relaxed">
                    {parts.map((part, i) => {
                      if (part.startsWith('**') && part.endsWith('**')) {
                        return <strong key={i} className="font-semibold text-gray-900">{part.replace(/\*\*/g, '')}</strong>;
                      }
                      return part;
                    })}
                  </p>
                );
              })}
            </div>
          )}

          {isAdmin && (
            <div className="flex justify-end space-x-3">
              {isEditing ? (
                <>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                  >
                    {isSaving ? 'Guardando...' : 'Guardar'}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="px-4 py-2 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors"
                  >
                    {isGenerating ? 'Regenerando...' : 'Regenerar'}
                  </button>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Editar
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )
      }
    </div >
  );
};
