import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PendingOrderNotification({ orders, onAccept, primaryColor }) {
  if (!orders || orders.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-full px-4"
      >
        <div 
          className="rounded-2xl shadow-2xl p-6 border-4 animate-pulse"
          style={{ 
            backgroundColor: 'white',
            borderColor: primaryColor
          }}
        >
          <div className="flex items-start gap-4">
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center animate-bounce"
              style={{ backgroundColor: `${primaryColor}20` }}
            >
              <Bell className="w-8 h-8" style={{ color: primaryColor }} />
            </div>
            
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {orders.length === 1 ? 'Novo Pedido!' : `${orders.length} Novos Pedidos!`}
              </h3>
              
              <div className="space-y-2 mb-4">
                {orders.slice(0, 3).map(order => (
                  <div key={order.id} className="text-sm text-gray-600">
                    <span className="font-bold" style={{ color: primaryColor }}>
                      #{String(order.order_number).padStart(3, '0')}
                    </span>
                    {' - '}
                    {order.customer_name || 'Cliente'}
                    {' - '}
                    R$ {order.total?.toFixed(2)}
                  </div>
                ))}
                {orders.length > 3 && (
                  <p className="text-sm text-gray-500">
                    E mais {orders.length - 3} pedido(s)...
                  </p>
                )}
              </div>
              
              <Button
                onClick={onAccept}
                className="w-full text-white font-bold"
                style={{ backgroundColor: primaryColor }}
              >
                Aceitar Pedido{orders.length > 1 ? 's' : ''}
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}