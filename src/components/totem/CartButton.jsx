import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart } from 'lucide-react';
import { useCart } from './CartContext';

export default function CartButton({ onClick, primaryColor }) {
  const { itemCount, total } = useCart();
  
  if (itemCount === 0) return null;
  
  return (
    <AnimatePresence>
      <motion.button
        onClick={onClick}
        className="fixed bottom-6 left-4 right-4 z-50 flex items-center justify-center gap-3 px-6 py-5 rounded-full text-white shadow-2xl"
        style={{ backgroundColor: primaryColor || '#6B21A8' }}
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        whileTap={{ scale: 0.95 }}
      >
        <div className="relative flex-shrink-0">
          <ShoppingCart className="w-6 h-6" />
          <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-white text-xs font-bold flex items-center justify-center"
            style={{ color: primaryColor || '#6B21A8' }}
          >
            {itemCount}
          </span>
        </div>
        
        <span className="font-semibold text-lg">
          Ver Carrinho
        </span>
        
        <span className="font-bold text-xl ml-auto">
          R$ {total.toFixed(2)}
        </span>
      </motion.button>
    </AnimatePresence>
  );
}