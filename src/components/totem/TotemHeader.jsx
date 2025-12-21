import React from 'react';
import { ChevronLeft, ShoppingCart } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCart } from './CartContext';

export default function TotemHeader({ 
  title, 
  showBack = false, 
  onBack,
  showCart = false,
  onCartClick,
  logoUrl,
  primaryColor
}) {
  const { itemCount } = useCart();
  
  return (
    <motion.header 
      className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-4 py-4"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
    >
      <div className="flex items-center justify-between max-w-xl mx-auto">
        <div className="flex items-center gap-3">
          {showBack && (
            <button 
              onClick={onBack}
              className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
            >
              <ChevronLeft className="w-6 h-6 text-gray-600" />
            </button>
          )}
          
          {logoUrl && !showBack ? (
            <img src={logoUrl} alt="Logo" className="h-10 object-contain" />
          ) : (
            <h1 
              className="text-xl font-bold"
              style={{ color: primaryColor || '#6B21A8' }}
            >
              {title}
            </h1>
          )}
        </div>
        
        {showCart && itemCount > 0 && (
          <button 
            onClick={onCartClick}
            className="relative w-12 h-12 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${primaryColor}15` }}
          >
            <ShoppingCart 
              className="w-6 h-6" 
              style={{ color: primaryColor }} 
            />
            <span 
              className="absolute -top-1 -right-1 w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center"
              style={{ backgroundColor: primaryColor }}
            >
              {itemCount}
            </span>
          </button>
        )}
      </div>
    </motion.header>
  );
}