import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, RotateCcw, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '../CartContext';

export default function TotemSuccess({ 
  settings, 
  primaryColor,
  onNewOrder 
}) {
  const { currentOrder, customer } = useCart();
  
  useEffect(() => {
    const timer = setTimeout(() => {
      onNewOrder();
    }, 30000);
    
    return () => clearTimeout(timer);
  }, [onNewOrder]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
      <motion.div 
        className="text-center"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="w-32 h-32 rounded-full mx-auto flex items-center justify-center mb-8"
          style={{ backgroundColor: '#22C55E' }}
        >
          <CheckCircle className="w-20 h-20 text-white" />
        </motion.div>
        
        <motion.h1 
          className="text-4xl font-bold text-gray-900 mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          Pedido Confirmado!
        </motion.h1>
        
        {currentOrder?.order_number && (
          <motion.div
            className="mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <p className="text-gray-500 mb-2">Número do pedido</p>
            <p 
              className="text-6xl font-bold"
              style={{ color: primaryColor }}
            >
              #{String(currentOrder.order_number).padStart(3, '0')}
            </p>
          </motion.div>
        )}
        
        <motion.div 
          className="text-center mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          {customer?.name ? (
            <>
              <p className="text-xl text-gray-600 mb-2">
                {currentOrder?.payment_method === 'pix' 
                  ? 'Pagamento informado. Aguarde a confirmação.'
                  : `${customer.name}, aguarde ser chamada pelo seu nome para retirar o pedido no balcão.`
                }
              </p>
            </>
          ) : (
            <p className="text-xl text-gray-600 mb-2">
              {currentOrder?.payment_method === 'pix' 
                ? 'Pagamento informado. Aguarde a confirmação.'
                : 'Aguarde seu pedido ser preparado.'
              }
            </p>
          )}
        </motion.div>
        
        {currentOrder?.reward_redeemed && (
          <motion.div
            className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 mb-8 inline-flex items-center gap-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <Gift className="w-6 h-6 text-amber-500" />
            <span className="font-medium text-amber-800">
              🎁 Prêmio RESGATADO neste pedido
            </span>
          </motion.div>
        )}
        
        {customer?.has_pending_reward && !currentOrder?.reward_redeemed && (
          <motion.div
            className="bg-green-50 border-2 border-green-200 rounded-2xl p-4 mb-8 inline-flex items-center gap-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <Gift className="w-6 h-6 text-green-500" />
            <span className="font-medium text-green-800">
              🎁 Prêmio disponível para resgate
            </span>
          </motion.div>
        )}
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <Button
            onClick={onNewOrder}
            size="lg"
            className="h-16 px-12 text-xl font-bold rounded-2xl text-white"
            style={{ backgroundColor: primaryColor }}
          >
            <RotateCcw className="w-6 h-6 mr-3" />
            Novo Pedido
          </Button>
        </motion.div>
        
        <motion.p 
          className="text-gray-400 mt-8 text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          Esta tela será reiniciada automaticamente em 30 segundos
        </motion.p>
      </motion.div>
    </div>
  );
}