import React from 'react';
import { motion } from 'framer-motion';
import { UtensilsCrossed, Package, ArrowRight } from 'lucide-react';
import TotemHeader from '../TotemHeader';
import { useCart } from '../CartContext';

export default function TotemConsumption({ 
  settings, 
  primaryColor,
  onComplete,
  onBack 
}) {
  const { consumptionType, setConsumptionType } = useCart();
  
  const options = [
    {
      id: 'local',
      icon: UtensilsCrossed,
      title: 'Comer no Local',
      description: 'Consumir aqui na loja',
      emoji: '🍽'
    },
    {
      id: 'viagem',
      icon: Package,
      title: 'Embalar para Viagem',
      description: 'Levar para consumir depois',
      emoji: '📦'
    }
  ];
  
  const handleSelect = (type) => {
    setConsumptionType(type);
    onComplete();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <TotemHeader 
        title="Tipo de Consumo"
        showBack
        onBack={onBack}
        primaryColor={primaryColor}
      />
      
      <main className="max-w-xl mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl font-bold text-gray-900 mb-3">
            Como você vai consumir?
          </h2>
          <p className="text-lg text-gray-500">
            Escolha uma opção
          </p>
        </motion.div>
        
        <div className="space-y-6">
          {options.map((option, index) => {
            const Icon = option.icon;
            const isSelected = consumptionType === option.id;
            
            return (
              <motion.button
                key={option.id}
                onClick={() => handleSelect(option.id)}
                className={`w-full flex items-center gap-8 p-8 rounded-3xl border-2 transition-all ${
                  isSelected 
                    ? 'border-current shadow-lg' 
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
                style={isSelected ? { 
                  borderColor: primaryColor, 
                  backgroundColor: `${primaryColor}08` 
                } : {}}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileTap={{ scale: 0.98 }}
              >
                <div 
                  className="w-28 h-28 rounded-3xl flex items-center justify-center text-6xl"
                  style={{ backgroundColor: `${primaryColor}15` }}
                >
                  {option.emoji}
                </div>
                
                <div className="flex-1 text-left">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {option.title}
                  </h3>
                  <p className="text-lg text-gray-500">
                    {option.description}
                  </p>
                </div>
                
                <ArrowRight 
                  className="w-8 h-8 text-gray-400"
                  style={isSelected ? { color: primaryColor } : {}}
                />
              </motion.button>
            );
          })}
        </div>
      </main>
    </div>
  );
}