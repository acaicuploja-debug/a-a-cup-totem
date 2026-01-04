import React, { useEffect, useRef } from 'react';
import { Check, Plus, Minus } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ComplementSelector({ 
  group, 
  selectedItems, 
  onToggle, 
  primaryColor,
  onMaxReached
}) {
  const selectedCount = selectedItems.length;
  const canSelectMore = !group.max || selectedCount < group.max;
  const meetsMinimum = !group.min || selectedCount >= group.min;
  const prevCountRef = useRef(selectedCount);
  
  useEffect(() => {
    if (group.required && group.max && selectedCount === group.max && prevCountRef.current < selectedCount) {
      setTimeout(() => {
        onMaxReached?.();
      }, 400);
    }
    prevCountRef.current = selectedCount;
  }, [selectedCount, group.required, group.max, onMaxReached]);
  
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="font-bold text-gray-900 text-lg">{group.name}</h4>
          <p className="text-sm text-gray-500">
            {group.required ? 'Obrigatório' : 'Opcional'}
            {group.min && group.max && ` • Escolha de ${group.min} a ${group.max}`}
            {group.min && !group.max && ` • Mínimo ${group.min}`}
            {!group.min && group.max && ` • Máximo ${group.max}`}
          </p>
        </div>
        <span 
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            meetsMinimum ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
          }`}
        >
          {selectedCount}/{group.max || '∞'}
        </span>
      </div>
      
      <div className="space-y-2">
        {group.items?.map((item, idx) => {
          const isSelected = selectedItems.some(s => s.name === item.name);
          const canSelect = isSelected || canSelectMore;
          
          return (
            <motion.button
              key={idx}
              onClick={() => canSelect && onToggle(item)}
              disabled={!canSelect}
              className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                isSelected 
                  ? 'border-current bg-opacity-10' 
                  : 'border-gray-200 hover:border-gray-300'
              } ${!canSelect ? 'opacity-50 cursor-not-allowed' : ''}`}
              style={isSelected ? { 
                borderColor: primaryColor, 
                backgroundColor: `${primaryColor}10` 
              } : {}}
              whileTap={canSelect ? { scale: 0.98 } : {}}
            >
              <div className="flex items-center gap-3">
                <div 
                  className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    isSelected ? 'text-white' : 'border-2 border-gray-300'
                  }`}
                  style={isSelected ? { backgroundColor: primaryColor } : {}}
                >
                  {isSelected && <Check className="w-4 h-4" />}
                </div>
                <span className="font-medium text-gray-900">{item.name}</span>
                {(!item.price || item.price === 0) && (
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                    GRÁTIS
                  </span>
                )}
              </div>
              
              {item.price > 0 && (
                <span className="font-semibold text-gray-700">
                  + R$ {item.price.toFixed(2)}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}