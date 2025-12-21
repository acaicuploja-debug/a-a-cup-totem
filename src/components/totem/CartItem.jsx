import React from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function CartItem({ 
  item, 
  onUpdateQuantity, 
  onRemove,
  primaryColor 
}) {
  return (
    <motion.div 
      className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      layout
    >
      <div className="flex gap-4">
        {item.product_image ? (
          <img 
            src={item.product_image} 
            alt={item.product_name}
            className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
          />
        ) : (
          <div 
            className="w-20 h-20 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${primaryColor}15` }}
          >
            <span className="text-2xl">🍨</span>
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 mb-1 truncate">
            {item.product_name}
          </h3>
          
          {item.complements && item.complements.length > 0 && (
            <div className="text-sm text-gray-500 mb-2">
              {item.complements.map((c, i) => (
                <span key={i}>
                  {c.name}
                  {c.price > 0 && ` (+R$ ${c.price.toFixed(2)})`}
                  {i < item.complements.length - 1 && ', '}
                </span>
              ))}
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"
              >
                {item.quantity === 1 ? (
                  <Trash2 className="w-4 h-4 text-red-500" />
                ) : (
                  <Minus className="w-4 h-4 text-gray-600" />
                )}
              </button>
              
              <span className="w-8 text-center font-bold text-gray-900">
                {item.quantity}
              </span>
              
              <button 
                onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${primaryColor}15` }}
              >
                <Plus className="w-4 h-4" style={{ color: primaryColor }} />
              </button>
            </div>
            
            <span 
              className="font-bold text-lg"
              style={{ color: primaryColor }}
            >
              R$ {item.total.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}