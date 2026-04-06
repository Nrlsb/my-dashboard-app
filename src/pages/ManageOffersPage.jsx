import React, { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';
import { useNavigate } from 'react-router-dom';
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
  useMutation,
} from '@tanstack/react-query';
import { Loader2, ArrowLeft, Search, CheckCircle, XCircle, Edit2, Save, X, Filter, Upload, Eye, Tag, Percent, DollarSign, Layers, ChevronLeft, Clock, Calendar, Package } from 'lucide-react';
import apiService from '../api/apiService.js';
import { useAuth } from "../context/AuthContext.jsx";

// --- Componente Reutilizable para el Interruptor ---
const ToggleSwitch = ({ checked, onChange, disabled, labelOff, labelOn, colorClass = 'bg-green-600' }) => (
  <button
    type="button"
    onClick={onChange}
    disabled={disabled}
    className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${checked ? colorClass : 'bg-gray-300'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    aria-label={checked ? (labelOn || 'Desactivar') : (labelOff || 'Activar')}
  >
    <span
      className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-200 ease-in-out ${checked ? 'translate-x-6' : 'translate-x-1'
        }`}
    />
  </button>
);

// Helper: convert ISO timestamp to datetime-local input value (local time)
const toDateTimeLocal = (val) => {
  if (!val) return '';
  try {
    const d = new Date(val);
    if (isNaN(d)) return '';
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch { return ''; }
};

// --- Modal de Edición ---
const EditOfferModal = ({ product, onClose, onSave, isSaving }) => {
  const initialPriceType = product.discount_percentage != null
    ? 'discount'
    : product.offer_price != null
      ? 'fixed'
      : 'none';

  const [formData, setFormData] = useState({
    custom_title: product.custom_title || '',
    custom_description: product.custom_description || '',
    custom_image_url: product.custom_image_url || '',
    discount_percentage: product.discount_percentage ?? '',
    offer_price: product.offer_price ?? '',
    offer_start_date: toDateTimeLocal(product.offer_start_date),
    offer_end_date: toDateTimeLocal(product.offer_end_date),
    min_quantity: product.min_quantity ?? '',
    min_quantity_unit: product.min_quantity_unit ?? 'unidades',
    min_quantity_cumulative: product.min_quantity_cumulative ?? false,
    min_quantity_group_all: product.min_quantity_group_all ?? false,
    min_individual_quantity: product.min_individual_quantity ?? '',
    total_group_products: product.total_group_products ?? 1,
  });

  const [priceType, setPriceType] = useState(initialPriceType);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePriceTypeChange = (type) => {
    setPriceType(type);
    // Clear the other field when switching
    if (type === 'discount') {
      setFormData(prev => ({ ...prev, offer_price: '' }));
    } else if (type === 'fixed') {
      setFormData(prev => ({ ...prev, discount_percentage: '' }));
    } else {
      setFormData(prev => ({ ...prev, discount_percentage: '', offer_price: '' }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      custom_title: formData.custom_title,
      custom_description: formData.custom_description,
      custom_image_url: formData.custom_image_url,
      discount_percentage: priceType === 'discount' && formData.discount_percentage !== '' ? Number(formData.discount_percentage) : null,
      offer_price: priceType === 'fixed' && formData.offer_price !== '' ? Number(formData.offer_price) : null,
      offer_start_date: formData.offer_start_date || null,
      offer_end_date: formData.offer_end_date || null,
      min_quantity: formData.min_quantity !== '' ? Number(formData.min_quantity) : 0,
      min_quantity_unit: formData.min_quantity_unit,
      min_quantity_cumulative: formData.min_quantity_cumulative,
      min_quantity_group_all: formData.min_quantity_group_all,
      min_individual_quantity: formData.min_individual_quantity !== '' ? Number(formData.min_individual_quantity) : 0,
      total_group_products: formData.total_group_products,
    };

    onSave(product.id, payload);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-800">Editar Oferta</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Título Personalizado
              </label>
              <input
                type="text"
                name="custom_title"
                value={formData.custom_title}
                onChange={handleChange}
                placeholder={product.name}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Dejar en blanco para usar el nombre original.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción Personalizada
              </label>
              <textarea
                name="custom_description"
                value={formData.custom_description}
                onChange={handleChange}
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Precio promo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Precio Promocional
              </label>
              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => handlePriceTypeChange('none')}
                  className={`flex-1 py-2 px-3 text-xs font-medium rounded-md border transition-colors cursor-pointer ${priceType === 'none' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                >
                  Sin precio especial
                </button>
                <button
                  type="button"
                  onClick={() => handlePriceTypeChange('discount')}
                  className={`flex-1 py-2 px-3 text-xs font-medium rounded-md border transition-colors cursor-pointer flex items-center justify-center gap-1 ${priceType === 'discount' ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                >
                  <Percent className="w-3.5 h-3.5" />
                  % Descuento
                </button>
                <button
                  type="button"
                  onClick={() => handlePriceTypeChange('fixed')}
                  className={`flex-1 py-2 px-3 text-xs font-medium rounded-md border transition-colors cursor-pointer flex items-center justify-center gap-1 ${priceType === 'fixed' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  Precio final
                </button>
              </div>

              {priceType === 'discount' && (
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      name="discount_percentage"
                      value={formData.discount_percentage}
                      onChange={handleChange}
                      min="1"
                      max="99"
                      step="0.5"
                      placeholder="Ej: 15"
                      className="w-full px-3 py-2 pr-8 border border-orange-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">%</span>
                  </div>
                  <span className="text-xs text-gray-500">de descuento sobre el precio de lista</span>
                </div>
              )}

              {priceType === 'fixed' && (
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                    <input
                      type="number"
                      name="offer_price"
                      value={formData.offer_price}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                      placeholder="Ej: 12500.00"
                      className="w-full pl-7 pr-3 py-2 border border-green-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-400"
                    />
                  </div>
                  <span className="text-xs text-gray-500">precio final de la promo</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Imagen Personalizada
              </label>

              {/* Image Preview */}
              {(formData.custom_image_url || formData.previewUrl) && (
                <div className="mb-2 relative w-full h-48 bg-gray-100 rounded-md overflow-hidden border border-gray-200">
                  <img
                    src={formData.previewUrl || formData.custom_image_url}
                    alt="Preview"
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, custom_image_url: '', previewUrl: '' }))}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-sm"
                    title="Eliminar imagen"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* File Input */}
              <div className="flex items-center gap-2">
                <label className="flex-1 cursor-pointer bg-white border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2">
                  <Upload className="w-4 h-4" />
                  {formData.isUploading ? 'Subiendo...' : 'Seleccionar Imagen'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={formData.isUploading}
                    onChange={async (e) => {
                      const file = e.target.files[0];
                      if (!file) return;

                      // Preview
                      const previewUrl = URL.createObjectURL(file);
                      setFormData(prev => ({ ...prev, isUploading: true, previewUrl }));

                      // Upload
                      const data = new FormData();
                      data.append('image', file);

                      try {
                        const res = await apiService.uploadToDrive(data);
                        setFormData(prev => ({
                          ...prev,
                          custom_image_url: res.imageUrl,
                          isUploading: false
                        }));
                        toast.success('Imagen subida a Drive correctamente');
                      } catch (err) {
                        console.error(err);
                        toast.error('Error al subir imagen');
                        setFormData(prev => ({ ...prev, isUploading: false }));
                      }
                    }}
                  />
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-1">Sube una imagen para guardarla en Google Drive.</p>
            </div>

            {/* Vigencia programada */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-gray-500" />
                Vigencia programada
              </label>
              <p className="text-xs text-gray-500 mb-3">Dejá en blanco para activar/desactivar manualmente sin límite de fechas.</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Fecha de inicio</label>
                  <input
                    type="datetime-local"
                    name="offer_start_date"
                    value={formData.offer_start_date}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Fecha de fin</label>
                  <input
                    type="datetime-local"
                    name="offer_end_date"
                    value={formData.offer_end_date}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Opciones Avanzadas */}
            <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100">
              <label className="block text-sm font-bold text-blue-800 mb-3 flex items-center gap-1.5">
                <Layers className="w-4 h-4" />
                Opciones Avanzadas (Activación)
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Cantidad Mínima
                  </label>
                  <input
                    type="number"
                    name="min_quantity"
                    value={formData.min_quantity}
                    onChange={handleChange}
                    min="0"
                    step="0.1"
                    placeholder="Ej: 5"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Unidad
                  </label>
                  <select
                    name="min_quantity_unit"
                    value={formData.min_quantity_unit}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="unidades">Unidades</option>
                    <option value="litros">Litros</option>
                  </select>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between bg-white/50 p-2 rounded border border-blue-100">
                <span className="text-xs font-medium text-blue-800">Combinar productos del grupo</span>
                <ToggleSwitch
                  checked={formData.min_quantity_cumulative}
                  onChange={() => setFormData(prev => ({ ...prev, min_quantity_cumulative: !prev.min_quantity_cumulative }))}
                  colorClass="bg-blue-600"
                />
              </div>

              {formData.min_quantity_cumulative && (
                <div className="mt-3 bg-white/50 p-2 rounded border border-blue-100 animate-in fade-in slide-in-from-top-1 duration-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-medium text-blue-800 block">Total de productos en el grupo</span>
                      <p className="text-[9px] text-blue-500 leading-tight">La promo solo aplica si se lleva el mínimo requerido de cada producto seleccionado.</p>
                    </div>
                    <ToggleSwitch
                      checked={formData.min_quantity_group_all}
                      onChange={() => setFormData(prev => ({ ...prev, min_quantity_group_all: !prev.min_quantity_group_all }))}
                      colorClass="bg-blue-600"
                    />
                  </div>

                  <div className="pt-2 border-t border-blue-50">
                    <label className="block text-[10px] font-bold text-blue-800 mb-1 uppercase tracking-wider">
                      Mínimo por cada ítem individual
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        name="min_individual_quantity"
                        value={formData.min_individual_quantity}
                        onChange={handleChange}
                        min="0"
                        step="0.1"
                        placeholder="Ej: 3 (Para 6x3 con 3 lts del mismo color)"
                        className="flex-1 px-3 py-1.5 text-xs border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      />
                      <span className="text-[10px] text-blue-500 font-medium">{formData.min_quantity_unit}</span>
                    </div>
                    <p className="text-[9px] text-blue-400 mt-1 leading-tight">
                      * Define cuántas unidades/litros como mínimo debe tener al menos un producto del grupo para activar la oferta.
                    </p>
                  </div>
                </div>
              )}

              <p className="text-[10px] text-blue-600 mt-2 font-medium">
                * Si está activo, el mínimo se cumple sumando las cantidades de todos los productos (ej: 60 lts + 40 lts). Si no, debe cumplirse por cada producto individual.
              </p>
            </div>

            <div className="pt-4 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving || formData.isUploading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 flex items-center disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Guardar Cambios
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// --- Modal de Vista Previa de Oferta ---
const PreviewOfferModal = ({ product, onClose }) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-800">Vista Previa de Oferta</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-8 bg-gray-100 flex justify-center">
          {/* Card emulation from OffersPage.jsx */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col justify-between w-full border border-gray-100 max-w-[280px]">
            {(product.custom_image_url || product.imageUrl) && (
              <div className="h-40 w-full overflow-hidden relative">
                <img
                  src={product.custom_image_url || product.imageUrl}
                  alt={product.custom_title || product.name}
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-0 right-0 bg-black/50 text-white text-[9px] px-2 py-0.5 pointer-events-none uppercase tracking-wider font-bold rounded-tl-md backdrop-blur-sm">
                  Imagen ilustrativa
                </span>
              </div>
            )}
            <div className="p-5 flex-grow flex flex-col">
              <div className="flex items-start justify-between mb-2">
                <span className="inline-block bg-blue-100 text-blue-800 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase">
                  {product.brand || 'Marca'}
                </span>
                <Tag className="w-5 h-5 text-blue-500" />
              </div>
              <h3
                className={`text-sm font-semibold text-gray-800 mb-2 ${!product.custom_description ? 'h-10 overflow-hidden' : ''}`}
                title={product.custom_title || product.name}
              >
                {product.custom_title || product.name}
              </h3>
              {(product.custom_description || product.description) && (
                <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                  {product.custom_description || product.description}
                </p>
              )}
              <p className="text-[10px] text-gray-500 mb-3 font-mono">Cód: {product.code}</p>
              <div className="mt-auto">
                {product.discount_percentage != null && (
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <p className="text-xl font-bold text-red-600">
                      {formatCurrency(product.price * (1 - product.discount_percentage / 100))}
                    </p>
                    <p className="text-sm text-gray-400 line-through">
                      {formatCurrency(product.price)}
                    </p>
                    <span className="text-xs font-semibold bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">
                      -{product.discount_percentage}%
                    </span>
                  </div>
                )}
                {product.offer_price != null && product.discount_percentage == null && (
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <p className="text-xl font-bold text-green-700">
                      {formatCurrency(product.offer_price)}
                    </p>
                    <p className="text-sm text-gray-400 line-through">
                      {formatCurrency(product.price)}
                    </p>
                  </div>
                )}
                {product.discount_percentage == null && product.offer_price == null && (
                  <p className="text-xl font-bold text-gray-900">
                    {formatCurrency(product.price)}
                  </p>
                )}
              </div>
            </div>
            <div className="p-3 bg-gray-50 mt-auto">
              <button
                className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg text-sm font-medium opacity-80 cursor-default"
                disabled
              >
                Ver Detalle
              </button>
            </div>
          </div>
        </div>

        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-500 italic">Así es como se visualiza en la sección de ofertas.</p>
        </div>
      </div>
    </div>
  );
};


// --- Badge de estado de oferta (con soporte para programada/expirada) ---
const OfferStatusBadge = ({ product, size = 'md' }) => {
  const isEnabled = product.is_on_offer !== undefined ? product.is_on_offer : product.oferta;
  const iconClass = size === 'sm' ? 'w-3 h-3 mr-1' : 'w-4 h-4 mr-1';
  const baseClass = size === 'sm'
    ? 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium'
    : 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';

  if (!isEnabled) {
    return (
      <span className={`${baseClass} bg-gray-100 text-gray-800`}>
        <XCircle className={iconClass} />Sin Oferta
      </span>
    );
  }

  const now = new Date();
  const isFuture = product.offer_start_date && new Date(product.offer_start_date) > now;
  const isExpired = product.offer_end_date && new Date(product.offer_end_date) < now;

  if (isFuture) {
    const startStr = new Date(product.offer_start_date).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    return (
      <span className={`${baseClass} bg-yellow-100 text-yellow-800`} title={`Inicia: ${startStr}`}>
        <Clock className={iconClass} />Programada
      </span>
    );
  }

  if (isExpired) {
    return (
      <span className={`${baseClass} bg-red-100 text-red-700`}>
        <XCircle className={iconClass} />Expirada
      </span>
    );
  }

  const hasEndDate = product.offer_end_date && new Date(product.offer_end_date) > now;
  if (hasEndDate) {
    const endStr = new Date(product.offer_end_date).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    return (
      <span className={`${baseClass} bg-green-100 text-green-800`} title={`Vence: ${endStr}`}>
        <CheckCircle className={iconClass} />En Oferta
      </span>
    );
  }

  return (
    <span className={`${baseClass} bg-green-100 text-green-800`}>
      <CheckCircle className={iconClass} />En Oferta
    </span>
  );
};

// --- Componente para la Fila de Producto ---
const ProductRow = ({ product, onToggle, isToggling, onEdit, onPreview }) => (
  <tr className="border-b border-gray-200 hover:bg-gray-50">
    <td className="py-3 px-4 text-sm text-gray-500 font-mono">
      {product.code}
    </td>
    <td className="py-3 px-4 text-sm text-gray-900 font-medium">
      <div>
        {product.custom_title || product.name}
        {product.custom_title && (
          <span className="ml-2 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
            Personalizado
          </span>
        )}
      </div>
    </td>
    <td className="py-3 px-4 text-sm text-gray-500">
      <OfferStatusBadge product={product} />
    </td>
    <td className="py-3 px-4 text-center">
      <div className="flex items-center justify-center space-x-4">
        <ToggleSwitch
          checked={product.is_on_offer !== undefined ? product.is_on_offer : product.oferta}
          onChange={onToggle}
          disabled={isToggling}
          labelOff="Activar oferta"
          labelOn="Desactivar oferta"
        />
        <div className="flex items-center space-x-2 border-l pl-4 border-gray-100">
          <button
            onClick={() => onPreview(product)}
            className="p-1 text-gray-400 hover:text-blue-600 transition-colors cursor-pointer"
            title="Vista previa de oferta"
          >
            <Eye className="w-5 h-5" />
          </button>
          <button
            onClick={() => onEdit(product)}
            className="p-1 text-gray-400 hover:text-blue-600 transition-colors cursor-pointer"
            title="Editar detalles de oferta"
          >
            <Edit2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </td>
  </tr>
);

// --- Modal de Edición por Marca (aplica a todos los productos) ---
const GroupEditModal = ({ brandName, productCount, onClose, onSave, onPreview, isSaving, initialData }) => {
  const [formData, setFormData] = useState({
    custom_title: initialData?.title || '',
    custom_description: initialData?.description || '',
    custom_image_url: initialData?.image || '',
    discount_percentage: initialData?.discount_percentage ?? '',
    offer_price: initialData?.offer_price ?? '',
    offer_start_date: toDateTimeLocal(initialData?.offer_start_date) || '',
    offer_end_date: toDateTimeLocal(initialData?.offer_end_date) || '',
    min_quantity: initialData?.min_quantity ?? '',
    min_quantity_unit: initialData?.min_quantity_unit || 'unidades',
    min_quantity_cumulative: initialData?.min_quantity_cumulative ?? false,
    min_quantity_group_all: initialData?.min_quantity_group_all ?? false,
    min_individual_quantity: initialData?.min_individual_quantity ?? '',
  });

  const [priceType, setPriceType] = useState(
    initialData?.discount_percentage != null ? 'discount' :
      initialData?.offer_price != null ? 'fixed' : 'none'
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePriceTypeChange = (type) => {
    setPriceType(type);
    if (type === 'discount') {
      setFormData(prev => ({ ...prev, offer_price: '' }));
    } else if (type === 'fixed') {
      setFormData(prev => ({ ...prev, discount_percentage: '' }));
    } else {
      setFormData(prev => ({ ...prev, discount_percentage: '', offer_price: '' }));
    }
  };

  const handlePreview = () => {
    const previewData = {
      name: `Producto de la marca ${brandName}`,
      code: 'MUESTRA',
      brand: brandName,
      price: 15000, // Precio base de muestra
      custom_title: formData.custom_title,
      custom_description: formData.custom_description,
      custom_image_url: formData.custom_image_url,
      discount_percentage: priceType === 'discount' && formData.discount_percentage !== '' ? Number(formData.discount_percentage) : null,
      offer_price: priceType === 'fixed' && formData.offer_price !== '' ? Number(formData.offer_price) : null,
      offer_start_date: formData.offer_start_date || null,
      offer_end_date: formData.offer_end_date || null,
      min_quantity: formData.min_quantity !== '' ? Number(formData.min_quantity) : 0,
      min_quantity_unit: formData.min_quantity_unit,
      min_quantity_cumulative: formData.min_quantity_cumulative,
      min_quantity_group_all: formData.min_quantity_group_all,
      min_individual_quantity: formData.min_individual_quantity !== '' ? Number(formData.min_individual_quantity) : 0,
      total_group_products: productCount,
      is_on_offer: true,

      oferta: true
    };
    onPreview(previewData);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      custom_title: formData.custom_title,
      custom_description: formData.custom_description,
      custom_image_url: formData.custom_image_url,
      discount_percentage: priceType === 'discount' && formData.discount_percentage !== '' ? Number(formData.discount_percentage) : null,
      offer_price: priceType === 'fixed' && formData.offer_price !== '' ? Number(formData.offer_price) : null,
      offer_start_date: formData.offer_start_date || null,
      offer_end_date: formData.offer_end_date || null,
      min_quantity: formData.min_quantity !== '' ? Number(formData.min_quantity) : null,
      min_quantity_unit: formData.min_quantity !== '' ? formData.min_quantity_unit : null,
      min_quantity_cumulative: formData.min_quantity !== '' ? formData.min_quantity_cumulative : null,
      min_quantity_group_all: formData.min_quantity !== '' ? formData.min_quantity_group_all : null,
      min_individual_quantity: formData.min_individual_quantity !== '' ? Number(formData.min_individual_quantity) : null,
      total_group_products: formData.min_quantity !== '' ? productCount : null,
    };

    onSave(payload);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Editar Oferta por Marca</h3>
            <p className="text-xs text-gray-500 mt-0.5">{brandName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-3 bg-blue-50 border-b border-blue-100">
          <p className="text-xs text-blue-700">
            Los cambios se aplicarán a los <strong>{productCount}</strong> productos seleccionados de la marca <strong>{brandName}</strong>.
          </p>
          <p className="text-[10px] text-blue-600 mt-1 italic">
            Tip: Si asignas el <strong>mismo título e imagen</strong> a todos, el sistema creará automáticamente una <strong>portada única</strong> en la tienda.
          </p>
        </div>

        <div className="overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Título Personalizado
              </label>
              <input
                type="text"
                name="custom_title"
                value={formData.custom_title}
                onChange={handleChange}
                placeholder="Dejar en blanco para no modificar"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Dejar en blanco para no modificar el título de cada producto.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción Personalizada
              </label>
              <textarea
                name="custom_description"
                value={formData.custom_description}
                onChange={handleChange}
                rows="3"
                placeholder="Dejar en blanco para no modificar"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Precio Promocional
              </label>
              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => handlePriceTypeChange('none')}
                  className={`flex-1 py-2 px-3 text-xs font-medium rounded-md border transition-colors cursor-pointer ${priceType === 'none' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                >
                  Sin precio especial
                </button>
                <button
                  type="button"
                  onClick={() => handlePriceTypeChange('discount')}
                  className={`flex-1 py-2 px-3 text-xs font-medium rounded-md border transition-colors cursor-pointer flex items-center justify-center gap-1 ${priceType === 'discount' ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                >
                  <Percent className="w-3.5 h-3.5" />
                  % Descuento
                </button>
                <button
                  type="button"
                  onClick={() => handlePriceTypeChange('fixed')}
                  className={`flex-1 py-2 px-3 text-xs font-medium rounded-md border transition-colors cursor-pointer flex items-center justify-center gap-1 ${priceType === 'fixed' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  Precio final
                </button>
              </div>

              {priceType === 'discount' && (
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      name="discount_percentage"
                      value={formData.discount_percentage}
                      onChange={handleChange}
                      min="1"
                      max="99"
                      step="0.5"
                      placeholder="Ej: 15"
                      className="w-full px-3 py-2 pr-8 border border-orange-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">%</span>
                  </div>
                  <span className="text-xs text-gray-500">de descuento sobre el precio de lista</span>
                </div>
              )}

              {priceType === 'fixed' && (
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                    <input
                      type="number"
                      name="offer_price"
                      value={formData.offer_price}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                      placeholder="Ej: 12500.00"
                      className="w-full pl-7 pr-3 py-2 border border-green-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-400"
                    />
                  </div>
                  <span className="text-xs text-gray-500">precio final de la promo</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Imagen Personalizada
              </label>
              {(formData.custom_image_url || formData.previewUrl) && (
                <div className="mb-2 relative w-full h-48 bg-gray-100 rounded-md overflow-hidden border border-gray-200">
                  <img
                    src={formData.previewUrl || formData.custom_image_url}
                    alt="Preview"
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, custom_image_url: '', previewUrl: '' }))}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-sm"
                    title="Eliminar imagen"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2">
                <label className="flex-1 cursor-pointer bg-white border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2">
                  <Upload className="w-4 h-4" />
                  {formData.isUploading ? 'Subiendo...' : 'Seleccionar Imagen'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={formData.isUploading}
                    onChange={async (e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      const previewUrl = URL.createObjectURL(file);
                      setFormData(prev => ({ ...prev, isUploading: true, previewUrl }));
                      const data = new FormData();
                      data.append('image', file);
                      try {
                        const res = await apiService.uploadToDrive(data);
                        setFormData(prev => ({ ...prev, custom_image_url: res.imageUrl, isUploading: false }));
                        toast.success('Imagen subida a Drive correctamente');
                      } catch (err) {
                        console.error(err);
                        toast.error('Error al subir imagen');
                        setFormData(prev => ({ ...prev, isUploading: false }));
                      }
                    }}
                  />
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-1">Sube una imagen para guardarla en Google Drive.</p>
            </div>

            {/* Vigencia programada */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-gray-500" />
                Vigencia programada
              </label>
              <p className="text-xs text-gray-500 mb-3">Dejá en blanco para no modificar las fechas de cada producto.</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Fecha de inicio</label>
                  <input
                    type="datetime-local"
                    name="offer_start_date"
                    value={formData.offer_start_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, offer_start_date: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Fecha de fin</label>
                  <input
                    type="datetime-local"
                    name="offer_end_date"
                    value={formData.offer_end_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, offer_end_date: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Opciones Avanzadas */}
            <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100">
              <label className="block text-sm font-bold text-blue-800 mb-3 flex items-center gap-1.5">
                <Layers className="w-4 h-4" />
                Opciones Avanzadas (Activación)
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Cantidad Mínima
                  </label>
                  <input
                    type="number"
                    name="min_quantity"
                    value={formData.min_quantity}
                    onChange={handleChange}
                    min="0"
                    step="0.1"
                    placeholder="No modificar"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Unidad
                  </label>
                  <select
                    name="min_quantity_unit"
                    value={formData.min_quantity_unit}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="unidades">Unidades</option>
                    <option value="litros">Litros</option>
                  </select>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between bg-white/50 p-2 rounded border border-blue-100">
                <span className="text-xs font-medium text-blue-800">Combinar productos del grupo</span>
                <ToggleSwitch
                  checked={formData.min_quantity_cumulative}
                  onChange={() => setFormData(prev => ({ ...prev, min_quantity_cumulative: !prev.min_quantity_cumulative }))}
                  colorClass="bg-blue-600"
                />
              </div>

              {formData.min_quantity_cumulative && (
                <div className="mt-3 bg-white/50 p-2 rounded border border-blue-100 animate-in fade-in slide-in-from-top-1 duration-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-medium text-blue-800 block">Total de productos en el grupo</span>
                      <p className="text-[9px] text-blue-500 leading-tight">La promo solo aplica si se lleva el mínimo requerido de cada producto seleccionado.</p>
                    </div>
                    <ToggleSwitch
                      checked={formData.min_quantity_group_all}
                      onChange={() => setFormData(prev => ({ ...prev, min_quantity_group_all: !prev.min_quantity_group_all }))}
                      colorClass="bg-blue-600"
                    />
                  </div>

                  <div className="pt-2 border-t border-blue-50">
                    <label className="block text-[10px] font-bold text-blue-800 mb-1 uppercase tracking-wider">
                      Mínimo por cada ítem individual
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        name="min_individual_quantity"
                        value={formData.min_individual_quantity}
                        onChange={handleChange}
                        min="0"
                        step="0.1"
                        placeholder="Sin modificar"
                        className="flex-1 px-3 py-1.5 text-xs border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      />
                      <span className="text-[10px] text-blue-500 font-medium">{formData.min_quantity_unit}</span>
                    </div>
                    <p className="text-[9px] text-blue-400 mt-1 leading-tight">
                      * Define cuántas unidades/litros como mínimo debe tener al menos un producto del grupo para activar la oferta.
                    </p>
                  </div>
                </div>
              )}

              <p className="text-[10px] text-blue-600 mt-2 font-medium">
                * Si está activo, el mínimo se cumple sumando las cantidades de todos los productos (ej: 60 lts + 40 lts). Si no, debe cumplirse por cada producto individual.
              </p>

            </div>

            <div className="pt-4 flex justify-between space-x-3">
              <button
                type="button"
                onClick={handlePreview}
                className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 flex items-center cursor-pointer"
              >
                <Eye className="w-4 h-4 mr-2" />
                Vista Previa
              </button>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving || formData.isUploading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 flex items-center disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Aplicar a seleccionados
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// --- Pestaña Ofertas por Grupo ---
const GroupOffersTab = ({ onPreview, onEdit }) => {
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]); // Array de IDs seleccionados
  const [selectedGroupData, setSelectedGroupData] = useState(null);
  const [brandFilter, setBrandFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [debounceSearchTerm, setDebounceSearchTerm] = useState('');
  const [isBrandEditorOpen, setIsBrandEditorOpen] = useState(false);
  const [isFetchingAllIds, setIsFetchingAllIds] = useState(false);
  const debounceTimeout = useRef(null);
  const lastAutoSelectedBrand = useRef(null);
  const processedProductIds = useRef(new Set());
  const queryClient = useQueryClient();

  // --- Lógica de Grupos Activos ---
  const { data: activeOffers, isLoading: isLoadingActiveGroups } = useQuery({
    queryKey: ['activeOffers-grouping'],
    queryFn: () => apiService.fetchOffers(),
    staleTime: 1000 * 60 * 5,
    enabled: !selectedBrand,
  });

  const activeGroups = React.useMemo(() => {
    if (!activeOffers) return [];
    const groupsMap = new Map();
    activeOffers.forEach(product => {
      // Un grupo se define por tener un título personalizado (la imagen es opcional)
      if (!product.custom_title) return;
      const key = `${product.custom_image_url || ''}_${product.custom_title}`;
      if (!groupsMap.has(key)) {
        groupsMap.set(key, {
          title: product.custom_title,
          image: product.custom_image_url,
          brand: product.brand,
          description: product.custom_description || product.description,
          productIds: [],
          products: [],
          min_quantity: product.min_quantity,
          min_quantity_unit: product.min_quantity_unit,
          min_quantity_cumulative: product.min_quantity_cumulative,
          min_quantity_group_all: product.min_quantity_group_all,
          discount_percentage: product.discount_percentage,
          offer_price: product.offer_price,
          offer_start_date: product.offer_start_date,
          offer_end_date: product.offer_end_date
        });
      }
      const group = groupsMap.get(key);
      group.productIds.push(product.id);
      group.products.push(product);
    });
    return Array.from(groupsMap.values()).sort((a, b) => a.title.localeCompare(b.title));
  }, [activeOffers]);

  useEffect(() => {
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => {
      setDebounceSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(debounceTimeout.current);
  }, [searchTerm]);

  const { data: brandsData, isLoading: isLoadingBrands } = useQuery({
    queryKey: ['brands'],
    queryFn: () => apiService.fetchProtheusBrands(),
    staleTime: 1000 * 60 * 10,
  });

  const brands = brandsData || [];

  // Eliminar el useEffect que limpiaba selectedIds al cambiar de marca
  // para permitir que "Editar Grupo" los establezca primero.

  const {
    data: infiniteData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetching: isFetchingProducts, // Añadir isFetching para mejor estado de carga
    isLoading: isLoadingProducts,
    isError: isErrorProducts,
    error: errorProducts,
  } = useInfiniteQuery({
    queryKey: ['products-by-brand', selectedBrand, debounceSearchTerm],
    queryFn: ({ pageParam = 1 }) =>
      apiService.fetchProducts(pageParam, debounceSearchTerm, selectedBrand ? [selectedBrand] : [], true),
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((acc, page) => acc + page.products.length, 0);
      return loaded < lastPage.totalProducts ? allPages.length + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: !!selectedBrand,
  });

  const { mutate: toggleOffer, isPending: isToggling } = useMutation({
    mutationFn: (productId) => apiService.toggleProductOffer(productId),
    onSuccess: (data) => {
      queryClient.setQueryData(
        ['products-by-brand', selectedBrand, debounceSearchTerm],
        (oldData) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page) => ({
              ...page,
              products: page.products.map((p) =>
                p.id === data.id ? { ...p, oferta: data.oferta, is_on_offer: data.oferta } : p
              ),
            })),
          };
        }
      );
      queryClient.invalidateQueries({ queryKey: ['activeOffers'] });
      queryClient.invalidateQueries({ queryKey: ['offers'] });
      toast.success(data.oferta ? 'Oferta activada' : 'Oferta desactivada');
    },
    onError: (err) => toast.error(`Error: ${err.message}`),
  });

  const products = infiniteData?.pages.flatMap((page) => page.products) || [];

  const activeOfferProducts = products.filter((p) => p.oferta);

  const handleSelectAll = async (e) => {
    const isChecked = e.target.checked;
    if (isChecked) {
      if (hasNextPage) {
        setIsFetchingAllIds(true);
        try {
          // fetchAllProductsForPDF ya tiene un límite de 9999 y devuelve los productos de la marca/búsqueda
          const allProducts = await apiService.fetchAllProductsForPDF(debounceSearchTerm, selectedBrand ? [selectedBrand] : []);
          setSelectedIds(allProducts.map(p => p.id));
        } catch (error) {
          console.error("Error fetching all product IDs:", error);
          toast.error("Error al seleccionar todos los productos");
          // Fallback a los ya cargados
          setSelectedIds(products.map(p => p.id));
        } finally {
          setIsFetchingAllIds(false);
        }
      } else {
        setSelectedIds(products.map(p => p.id));
      }
    } else {
      setSelectedIds([]);
    }
  };

  // Auto-seleccionar productos que ya están en oferta al entrar a una marca o al cargar más páginas
  useEffect(() => {
    if (!selectedBrand) {
      lastAutoSelectedBrand.current = null;
      processedProductIds.current.clear();
      return;
    }

    if (products.length > 0) {
      // Si cambiamos de marca, limpiamos el set de IDs procesados
      if (selectedBrand !== lastAutoSelectedBrand.current) {
        processedProductIds.current.clear();
        lastAutoSelectedBrand.current = selectedBrand;
        setSelectedIds([]); // Limpiar selección previa al cambiar de marca
      }

      // Identificar NUEVOS productos que están en oferta y no han sido procesados aún
      const newOnOfferIds = products
        .filter(p => p.oferta && !processedProductIds.current.has(p.id))
        .map(p => p.id);

      if (newOnOfferIds.length > 0) {
        setSelectedIds(prev => [...new Set([...prev, ...newOnOfferIds])]);
        // Marcar estos IDs como procesados para no volver a auto-seleccionarlos si el usuario los quita
        newOnOfferIds.forEach(id => processedProductIds.current.add(id));
      }

      // También marcar como procesados los que NO están en oferta para no evaluarlos de nuevo
      products.forEach(p => {
        if (!p.oferta) processedProductIds.current.add(p.id);
      });
    }
  }, [selectedBrand, products]);

  // Mutación para guardar detalles por lote
  const { mutate: saveBrandOfferDetails, isPending: isSavingBrandDetails } = useMutation({
    mutationFn: async (details) => {
      if (selectedIds.length === 0) throw new Error("No hay productos seleccionados.");

      await Promise.all(selectedIds.map((id) => apiService.updateProductOfferDetails(id, details)));
      return details;
    },
    onSuccess: (details) => {
      queryClient.setQueryData(
        ['products-by-brand', selectedBrand, debounceSearchTerm],
        (oldData) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page) => ({
              ...page,
              products: page.products.map((p) =>
                selectedIds.includes(p.id) ? { ...p, ...details, oferta: true, is_on_offer: true } : p
              ),
            })),
          };
        }
      );
      queryClient.invalidateQueries({ queryKey: ['activeOffers'] });
      queryClient.invalidateQueries({ queryKey: ['offers'] });
      setIsBrandEditorOpen(false);
      setSelectedIds([]); // Limpiar selección tras aplicar cambios
      toast.success(`Detalles actualizados y ofertas activadas para ${selectedIds.length} productos de ${selectedBrand}`);
    },
    onError: (err) => toast.error(`Error al guardar los detalles: ${err.message}`),
  });

  // Mutación para desactivación masiva
  const { mutate: batchDeactivateOffers, isPending: isDeactivating } = useMutation({
    mutationFn: (ids) => apiService.batchDeactivateOffers(ids),
    onSuccess: (data) => {
      queryClient.setQueryData(
        ['products-by-brand', selectedBrand, debounceSearchTerm],
        (oldData) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page) => ({
              ...page,
              products: page.products.map((p) =>
                selectedIds.includes(p.id) ? { ...p, oferta: false, is_on_offer: false, discount_percentage: null, offer_price: null } : p
              ),
            })),
          };
        }
      );
      queryClient.invalidateQueries({ queryKey: ['activeOffers'] });
      queryClient.invalidateQueries({ queryKey: ['offers'] });
      setSelectedIds([]); // Limpiar selección tras desactivar
      toast.success(`Se han dado de baja ${data.count} ofertas correctamente.`);
    },
    onError: (err) => toast.error(`Error al dar de baja: ${err.message}`),
  });

  const filteredBrands = brandFilter.trim()
    ? brands.filter((b) => b.toLowerCase().includes(brandFilter.toLowerCase()))
    : brands;

  // --- Vista: Lista de marcas y Grupos Activos ---
  if (!selectedBrand) {
    return (
      <div>
        {/* Sección de Grupos Activos Consolidados */}
        {!brandFilter.trim() && (
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-blue-100 rounded-lg">
                <Layers className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">Ofertas Grupales Activas</h2>
              {activeGroups.length > 0 && (
                <span className="ml-2 px-2.5 py-0.5 bg-blue-600 text-white text-xs font-bold rounded-full">
                  {activeGroups.length} {activeGroups.length === 1 ? 'grupo' : 'grupos'}
                </span>
              )}
            </div>

            {isLoadingActiveGroups ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-48 bg-gray-100 animate-pulse rounded-xl border border-gray-200"></div>
                ))}
              </div>
            ) : activeGroups.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeGroups.map((group, idx) => (
                  <div
                    key={idx}
                    className="group bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg hover:border-blue-300 transition-all duration-300 flex flex-col"
                  >
                    <div className="relative h-40 w-full bg-gray-50 overflow-hidden">
                      {group.image ? (
                        <img
                          src={group.image}
                          alt={group.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-500 to-blue-700 flex flex-col items-center justify-center p-4 text-white/90">
                          <Package className="w-10 h-10 mb-2 opacity-50" />
                          <span className="text-[10px] font-bold uppercase tracking-widest text-center">
                            Promoción Especial
                          </span>
                        </div>
                      )}
                      <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold rounded-md uppercase tracking-wider">
                        Consolidado
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                        <span className="text-[10px] font-bold text-blue-300 uppercase">{group.brand}</span>
                        <h3 className="text-white text-sm font-bold truncate leading-tight">{group.title}</h3>
                      </div>
                    </div>
                    <div className="p-4 flex-grow flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-gray-400 uppercase font-bold tracking-tight">Productos</span>
                          <span className="text-sm font-bold text-gray-700">{group.productIds.length} ítems</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] text-gray-400 uppercase font-bold tracking-tight">Beneficio</span>
                          <span className="text-sm font-bold text-orange-600">
                            {group.discount_percentage ? `-${group.discount_percentage}%` : group.offer_price ? `$${group.offer_price}` : 'Especial'}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const normalizedBrand = group.brand?.trim() || "";
                          setSelectedBrand(normalizedBrand);
                          // Importante: No limpiamos selectedIds aquí porque los estamos estableciendo
                          setSelectedIds(group.productIds);
                          setSelectedGroupData(group);
                          setSearchTerm('');
                          setDebounceSearchTerm('');
                          setIsBrandEditorOpen(true);
                        }}
                        className="w-full flex items-center justify-center gap-2 py-2 bg-blue-50 text-blue-600 text-sm font-bold rounded-lg hover:bg-blue-600 hover:text-white transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-4 h-4" />
                        Editar Grupo
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
                <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                  <Layers className="w-6 h-6 text-gray-400" />
                </div>
                <h3 className="text-sm font-bold text-gray-600">No hay ofertas grupales activas</h3>
                <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
                  Asigna el mismo título e imagen a varios productos de una marca para crear un grupo consolidado.
                </p>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 bg-gray-100 rounded-lg">
            <Search className="w-5 h-5 text-gray-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-800">Gestionar por Marca</h2>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          <div>
            <p className="text-sm text-gray-500">
              Seleccioná una marca para ver y gestionar las ofertas de sus productos.
            </p>
            <p className="text-[11px] text-blue-600 mt-1 font-medium bg-blue-50 px-2 py-0.5 rounded-full inline-block border border-blue-100">
              Nuevo: Agrupa productos con el mismo título e imagen para crear una portada única.
            </p>
          </div>
          <div className="relative sm:ml-auto sm:w-64">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              placeholder="Filtrar marcas..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        {isLoadingBrands ? (
          <LoadingSpinner text="Cargando marcas..." />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {filteredBrands.map((brand) => (
              <button
                key={brand}
                onClick={() => {
                  setSelectedBrand(brand);
                  setSelectedIds([]); // Limpiar selección manualmente solo aquí
                }}
                className="bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm font-medium text-gray-700 hover:border-blue-400 hover:text-blue-700 hover:shadow-md transition-all text-left cursor-pointer"
              >
                <Layers className="w-4 h-4 mb-1 text-gray-400" />
                {brand}
              </button>
            ))}
            {filteredBrands.length === 0 && (
              <p className="col-span-full text-center text-gray-500 py-8">
                No se encontraron marcas{brandFilter ? ` para "${brandFilter}"` : ''}.
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  // --- Vista: Productos de la marca seleccionada ---
  return (
    <div>
      {/* Header de la marca */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setSelectedBrand(null); setSearchTerm(''); setDebounceSearchTerm(''); }}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            Todas las marcas
          </button>
          <span className="text-gray-400">/</span>
          <span className="text-sm font-semibold text-gray-800">{selectedBrand}</span>
        </div>
        <div className="flex items-center flex-wrap justify-end gap-2">
          {products.length > 0 && (
            <>
              <button
                onClick={() => {
                  const target = selectedIds.length > 0
                    ? products.find(p => selectedIds.includes(p.id))
                    : activeOfferProducts[0] || products[0];
                  if (target) onPreview(target);
                  else toast.error("No hay productos para previsualizar");
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors cursor-pointer ${selectedIds.length > 0
                  ? 'text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100'
                  : 'text-gray-400 bg-gray-50 border border-gray-200 hover:bg-gray-100'
                  }`}
                title="Vista previa de un producto (usa el primero seleccionado)"
              >
                <Eye className="w-4 h-4" />
                Vista Previa {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
              </button>
              <button
                onClick={() => {
                  if (selectedIds.length === 0) {
                    toast.error("Seleccioná al menos un producto para editar la oferta del grupo.");
                    return;
                  }

                  // Intentar pre-cargar datos de una oferta activa existente entre los seleccionados
                  // si no tenemos datos de grupo establecidos ya
                  if (!selectedGroupData) {
                    const templateProduct = products.find(p => selectedIds.includes(p.id) && (p.oferta || p.is_on_offer));
                    if (templateProduct) {
                      setSelectedGroupData({
                        title: templateProduct.custom_title,
                        description: templateProduct.custom_description || templateProduct.description,
                        image: templateProduct.custom_image_url,
                        brand: templateProduct.brand,
                        min_quantity: templateProduct.min_quantity,
                        min_quantity_unit: templateProduct.min_quantity_unit,
                        min_quantity_cumulative: templateProduct.min_quantity_cumulative,
                        min_quantity_group_all: templateProduct.min_quantity_group_all,
                        min_individual_quantity: templateProduct.min_individual_quantity,
                        discount_percentage: templateProduct.discount_percentage,
                        offer_price: templateProduct.offer_price,
                        offer_start_date: templateProduct.offer_start_date,
                        offer_end_date: templateProduct.offer_end_date,
                      });
                    }
                  }

                  setIsBrandEditorOpen(true);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white rounded-lg transition-colors cursor-pointer ${selectedIds.length > 0 ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'
                  }`}
              >
                <Edit2 className="w-4 h-4" />
                Editar oferta para seleccionados
              </button>
              <button
                onClick={() => {
                  if (selectedIds.length === 0) {
                    toast.error("Seleccioná al menos un producto para dar de baja.");
                    return;
                  }
                  if (window.confirm(`¿Estás seguro de que deseas dar de baja las ofertas de los ${selectedIds.length} productos seleccionados?`)) {
                    batchDeactivateOffers(selectedIds);
                  }
                }}
                disabled={isDeactivating}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white rounded-lg transition-colors cursor-pointer ${selectedIds.length > 0 ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-400 cursor-not-allowed'}`}
              >
                {isDeactivating ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                Dar de baja seleccionados
              </button>
            </>
          )}
        </div>
      </div>

      {/* Búsqueda dentro de la marca */}
      <div className="relative mb-4 max-w-sm">
        <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar en esta marca..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Tabla de productos */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Mobile */}
        <div className="md:hidden divide-y divide-gray-200">
          {(isLoadingProducts || isFetchingProducts) && <div className="p-4"><LoadingSpinner text="Cargando productos..." /></div>}
          {isErrorProducts && <div className="p-8 text-center text-red-500">Error: {errorProducts?.message}</div>}
          {!isLoadingProducts && !isFetchingProducts && !isErrorProducts && products.length === 0 && (
            <div className="p-8 text-center text-gray-500">No se encontraron productos de esta marca para tu búsqueda.</div>
          )}
          {products.map((product) => (
            <div key={product.id} className="p-4 flex flex-col space-y-3">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(product.id)}
                  onChange={() => {
                    setSelectedIds(prev =>
                      prev.includes(product.id)
                        ? prev.filter(id => id !== product.id)
                        : [...prev, product.id]
                    );
                  }}
                  className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                />
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-gray-900 line-clamp-2">{product.custom_title || product.name}</h3>
                  <p className="text-xs text-gray-500 font-mono mt-1">Cód: {product.code}</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                <OfferStatusBadge product={product} size="sm" />
                <div className="flex items-center space-x-3">
                  <ToggleSwitch
                    checked={product.is_on_offer !== undefined ? product.is_on_offer : product.oferta}
                    onChange={() => toggleOffer(product.id)}
                    disabled={isToggling}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-100 border-b border-gray-300">
              <tr>
                <th className="py-3 px-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    {isFetchingAllIds ? (
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    ) : (
                      <input
                        type="checkbox"
                        checked={products.length > 0 && selectedIds.length >= (infiniteData?.pages[0]?.totalProducts || products.length)}
                        onChange={handleSelectAll}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                      />
                    )}
                  </div>
                </th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase">Código</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase">Descripción</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase">Estado Actual</th>
                <th className="py-3 px-4 text-center text-xs font-semibold text-gray-600 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {(isLoadingProducts || isFetchingProducts) && (
                <tr><td colSpan="5" className="p-0"><LoadingSpinner text="Cargando productos..." /></td></tr>
              )}
              {isErrorProducts && (
                <tr><td colSpan="5" className="p-8 text-center text-red-500">Error: {errorProducts?.message}</td></tr>
              )}
              {!isLoadingProducts && !isFetchingProducts && !isErrorProducts && products.length === 0 && (
                <tr><td colSpan="5" className="p-8 text-center text-gray-500">No se encontraron productos de esta marca para tu búsqueda.</td></tr>
              )}
              {products.map((product) => (
                <tr key={product.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="py-3 px-4 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(product.id)}
                      onChange={() => {
                        setSelectedIds(prev =>
                          prev.includes(product.id)
                            ? prev.filter(id => id !== product.id)
                            : [...prev, product.id]
                        );
                      }}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                    />
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-500 font-mono">{product.code}</td>
                  <td className="py-3 px-4 text-sm text-gray-900 font-medium">
                    <div>
                      {product.custom_title || product.name}
                      {product.custom_title && (
                        <span className="ml-2 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">Personalizado</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-500">
                    <OfferStatusBadge product={product} />
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center">
                      <ToggleSwitch
                        checked={product.is_on_offer !== undefined ? product.is_on_offer : product.oferta}
                        onChange={() => toggleOffer(product.id)}
                        disabled={isToggling}
                        labelOff="Activar oferta"
                        labelOn="Desactivar oferta"
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="p-4 text-center">
          {hasNextPage && (
            <button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
            >
              {isFetchingNextPage ? 'Cargando...' : 'Cargar más productos'}
            </button>
          )}
          {!hasNextPage && !isLoadingProducts && products.length > 0 && (
            <p className="text-gray-500 text-sm">Fin de los resultados.</p>
          )}
        </div>
      </div>

      {/* Modal de edición para toda la marca */}
      {isBrandEditorOpen && (
        <GroupEditModal
          brandName={selectedBrand}
          productCount={selectedIds.length}
          onClose={() => {
            setIsBrandEditorOpen(false);
            setSelectedGroupData(null);
          }}
          onSave={(details) => saveBrandOfferDetails(details)}
          onPreview={onPreview}
          isSaving={isSavingBrandDetails}
          initialData={selectedGroupData}
        />
      )}
    </div>
  );
};

// --- Componente Principal de la Página ---
export default function ManageOffersPage() {
  const [activeTab, setActiveTab] = useState('individual');
  const [searchTerm, setSearchTerm] = useState('');
  const [debounceSearchTerm, setDebounceSearchTerm] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);
  const [previewProduct, setPreviewProduct] = useState(null);
  const [showOnlyActive, setShowOnlyActive] = useState(false);
  const debounceTimeout = useRef(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Debounce para el campo de búsqueda
  useEffect(() => {
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => {
      setDebounceSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(debounceTimeout.current);
  }, [searchTerm]);

  // Query para obtener TODOS los productos (paginado)
  const {
    data: infiniteData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingInfinite,
    isError: isErrorInfinite,
    error: errorInfinite,
  } = useInfiniteQuery({
    queryKey: ['products', debounceSearchTerm, []],
    queryFn: ({ pageParam = 1 }) =>
      apiService.fetchProducts(pageParam, debounceSearchTerm, [], true),
    getNextPageParam: (lastPage, allPages) => {
      const productsLoaded = allPages.reduce(
        (acc, page) => acc + page.products.length,
        0
      );
      return productsLoaded < lastPage.totalProducts
        ? allPages.length + 1
        : undefined;
    },
    initialPageParam: 1,
    enabled: !!(user?.is_admin || user?.role === 'marketing') && !showOnlyActive, // Deshabilitar si filtramos por activos
  });

  // Query para obtener SOLO productos en oferta
  const {
    data: activeOffersData,
    isLoading: isLoadingActive,
    isError: isErrorActive,
    error: errorActive,
  } = useQuery({
    queryKey: ['activeOffers', debounceSearchTerm],
    queryFn: async () => {
      const offers = await apiService.fetchOffers();
      // Filtro local por nombre si hay búsqueda (la API de offers devuelve todo)
      if (!debounceSearchTerm) return offers;
      const lowerInfos = debounceSearchTerm.toLowerCase();
      return offers.filter(p =>
        p.name.toLowerCase().includes(lowerInfos) ||
        p.code.toLowerCase().includes(lowerInfos)
      );
    },
    enabled: !!(user?.is_admin || user?.role === 'marketing') && showOnlyActive,
  });

  // Mutación para cambiar el estado de la oferta
  const { mutate: toggleOffer, isPending: isToggling } = useMutation({
    mutationFn: (productId) => apiService.toggleProductOffer(productId),
    onSuccess: (data) => {
      // Actualizar caché de productoss
      queryClient.setQueryData(
        ['products', debounceSearchTerm, []],
        (oldData) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page) => ({
              ...page,
              products: page.products.map((p) =>
                p.id === data.id
                  ? { ...p, oferta: data.oferta, is_on_offer: data.oferta }
                  : p
              ),
            })),
          };
        }
      );

      // Actualizar caché de ofertas activas
      queryClient.invalidateQueries({ queryKey: ['activeOffers'] });

      // Invalidate offers query to refresh the public offers page immediately
      queryClient.invalidateQueries({ queryKey: ['offers'] });

      toast.success(
        data.oferta
          ? 'Oferta activada correctamente'
          : 'Oferta desactivada correctamente'
      );
    },
    onError: (err) => {
      toast.error(`Error al cambiar el estado de la oferta: ${err.message}`);
    },
  });

  // Mutación para guardar detalles personalizados
  const { mutate: saveOfferDetails, isPending: isSavingDetails } = useMutation({
    mutationFn: ({ productId, details }) => apiService.updateProductOfferDetails(productId, details),
    onSuccess: (data, variables) => {
      // Actualizar caché local de productos
      queryClient.setQueryData(
        ['products', debounceSearchTerm, []],
        (oldData) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page) => ({
              ...page,
              products: page.products.map((p) =>
                p.id === variables.productId
                  ? { ...p, ...variables.details }
                  : p
              ),
            })),
          };
        }
      );

      queryClient.invalidateQueries({ queryKey: ['activeOffers'] });
      queryClient.invalidateQueries({ queryKey: ['offers'] });

      setEditingProduct(null);
      toast.success('Detalles de la oferta actualizados');
    },
    onError: (err) => {
      toast.error(`Error al guardar los detalles: ${err.message}`);
    },
  });

  // Determinar qué lista de productos mostrar
  const productsToShow = showOnlyActive
    ? (activeOffersData || [])
    : (infiniteData?.pages.flatMap((page) => page.products) || []);

  const isLoading = showOnlyActive ? isLoadingActive : isLoadingInfinite;
  const isError = showOnlyActive ? isErrorActive : isErrorInfinite;
  const error = showOnlyActive ? errorActive : errorInfinite;


  if (!user?.is_admin && user?.role !== 'marketing') {
    return <div className="p-8 text-center text-red-500">Acceso denegado.</div>;
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/manage-content')}
            className="flex items-center justify-center p-2 mr-4 text-gray-600 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors cursor-pointer"
            aria-label="Volver a Configuración"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              Gestionar Ofertas
            </h1>
            <p className="text-gray-500">
              Activa o desactiva productos en oferta y personaliza su apariencia.
            </p>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-6">
          <button
            onClick={() => setActiveTab('individual')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors cursor-pointer ${activeTab === 'individual'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            Ofertas Individuales
          </button>
          <button
            onClick={() => setActiveTab('group')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${activeTab === 'group'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            <Layers className="w-4 h-4" />
            Ofertas por Grupo
          </button>
        </nav>
      </div>

      {/* Pestaña: Ofertas por Grupo */}
      {activeTab === 'group' && <GroupOffersTab onPreview={setPreviewProduct} onEdit={setEditingProduct} />}

      {/* Pestaña: Ofertas Individuales */}
      {activeTab === 'individual' && (
        <>
          <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nombre o código..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center space-x-3 bg-white p-2 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center space-x-2">
                <Filter className={`w-5 h-5 ${showOnlyActive ? 'text-blue-600' : 'text-gray-400'}`} />
                <span className="text-sm font-medium text-gray-700">Ver solo activas</span>
              </div>
              <ToggleSwitch
                checked={showOnlyActive}
                onChange={() => setShowOnlyActive(!showOnlyActive)}
                labelOff="Mostrar todo"
                labelOn="Solo activos"
                colorClass="bg-blue-600"
              />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-gray-200">
              {isLoading && (
                <div className="p-4">
                  <LoadingSpinner text="Cargando productos..." />
                </div>
              )}
              {isError && (
                <div className="p-8 text-center text-red-500">
                  Error: {error?.message}
                </div>
              )}
              {!isLoading && !isError && productsToShow.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  No se encontraron productos{showOnlyActive ? ' activos.' : '.'}
                </div>
              )}
              {productsToShow.map((product) => (
                <div key={product.id} className="p-4 flex flex-col space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="pr-4">
                      <h3 className="text-sm font-bold text-gray-900 line-clamp-2">
                        {product.custom_title || product.name}
                      </h3>
                      <p className="text-xs text-gray-500 font-mono mt-1">
                        Cód: {product.code}
                      </p>
                      {product.custom_title && (
                        <span className="inline-block mt-1 text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                          Personalizado
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                    <OfferStatusBadge product={product} size="sm" />
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => setPreviewProduct(product)}
                        className="p-2 text-gray-400 hover:text-blue-600 bg-gray-50 rounded-full transition-colors cursor-pointer"
                        aria-label="Vista previa"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setEditingProduct(product)}
                        className="p-2 text-gray-400 hover:text-blue-600 bg-gray-50 rounded-full transition-colors cursor-pointer"
                        aria-label="Editar oferta"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <ToggleSwitch
                        checked={product.is_on_offer !== undefined ? product.is_on_offer : product.oferta}
                        onChange={() => toggleOffer(product.id)}
                        disabled={isToggling}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead className="bg-gray-100 border-b border-gray-300">
                  <tr>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase">
                      Código
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase">
                      Descripción
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase">
                      Estado Actual
                    </th>
                    <th className="py-3 px-4 text-center text-xs font-semibold text-gray-600 uppercase">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {isLoading && (
                    <tr>
                      <td colSpan="4" className="p-0">
                        <LoadingSpinner text="Cargando productos..." />
                      </td>
                    </tr>
                  )}
                  {isError && (
                    <tr>
                      <td colSpan="4" className="p-8 text-center text-red-500">
                        Error: {error?.message}
                      </td>
                    </tr>
                  )}
                  {!isLoading && !isError && productsToShow.length === 0 && (
                    <tr>
                      <td colSpan="4" className="p-8 text-center text-gray-500">
                        No se encontraron productos{showOnlyActive ? ' activos.' : '.'}
                      </td>
                    </tr>
                  )}
                  {productsToShow.map((product) => (
                    <ProductRow
                      key={product.id}
                      product={product}
                      onToggle={() => toggleOffer(product.id)}
                      isToggling={isToggling}
                      onEdit={setEditingProduct}
                      onPreview={setPreviewProduct}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Helper for pagination only when not filtering */}
            {!showOnlyActive && (
              <div className="p-4 text-center">
                {hasNextPage && (
                  <button
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    className="mt-4 px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                  >
                    {isFetchingNextPage ? 'Cargando...' : 'Cargar más productos'}
                  </button>
                )}
                {!hasNextPage && !isLoading && productsToShow.length > 0 && (
                  <p className="text-gray-500 text-sm">Fin de los resultados.</p>
                )}
              </div>
            )}
          </div>

        </>
      )}

      {editingProduct && (
        <EditOfferModal
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSave={(productId, details) => saveOfferDetails({ productId, details })}
          isSaving={isSavingDetails}
        />
      )}

      {previewProduct && (
        <PreviewOfferModal
          product={previewProduct}
          onClose={() => setPreviewProduct(null)}
        />
      )}
    </div>
  );
}
