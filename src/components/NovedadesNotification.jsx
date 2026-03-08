import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, ArrowRight, X } from 'lucide-react';
import apiService from '../api/apiService';

const NOTIFIED_KEY = 'espint_order_confirmed_notified';
const POLL_INTERVAL = 60 * 1000; // 1 minuto

function getNotifiedIds() {
  try {
    return JSON.parse(localStorage.getItem(NOTIFIED_KEY) || '[]');
  } catch {
    return [];
  }
}

function markNotified(orderId) {
  const ids = getNotifiedIds();
  if (!ids.includes(String(orderId))) {
    localStorage.setItem(NOTIFIED_KEY, JSON.stringify([...ids, String(orderId)]));
  }
}

export default function NovedadesNotification() {
  const [confirmedOrder, setConfirmedOrder] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();

  const checkOrders = useCallback(async () => {
    try {
      const orders = await apiService.fetchOrderHistory();
      if (!Array.isArray(orders)) return;
      const notified = getNotifiedIds();
      const newlyConfirmed = orders.find(
        (o) => o.status === 'Confirmado' && !notified.includes(String(o.id))
      );
      if (newlyConfirmed) {
        setConfirmedOrder(newlyConfirmed);
        setDismissed(false);
      }
    } catch {
      // ignorar errores de red silenciosamente
    }
  }, []);

  useEffect(() => {
    checkOrders();
    const interval = setInterval(checkOrders, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [checkOrders]);

  if (dismissed || !confirmedOrder) return null;

  const handleDismiss = () => {
    markNotified(confirmedOrder.id);
    setDismissed(true);
  };

  const handleView = () => {
    markNotified(confirmedOrder.id);
    setDismissed(true);
    navigate('/order-history');
  };

  return (
    <div className="fixed bottom-6 right-6 z-[200] w-80 bg-espint-blue rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-espint-green/20 rounded-xl flex-shrink-0">
            <CheckCircle className="w-5 h-5 text-espint-green" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm">¡Pedido confirmado!</p>
            <p className="text-white/60 text-xs mt-0.5 truncate">
              Tu pedido #{confirmedOrder.id} fue aprobado
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="text-white/40 hover:text-white/80 transition-colors flex-shrink-0 mt-0.5"
            aria-label="Cerrar notificación"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <button
          onClick={handleView}
          className="mt-3 w-full flex items-center justify-center gap-2 bg-espint-green hover:bg-[#aadd00] text-espint-blue text-xs font-bold px-4 py-2 rounded-lg transition-colors"
        >
          Ver pedido
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
