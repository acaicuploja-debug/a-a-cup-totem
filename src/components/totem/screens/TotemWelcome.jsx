import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

export default function TotemWelcome({ settings, primaryColor, onStart }) {
  const bgStyle = settings?.background_url 
    ? { backgroundImage: `url(${settings.background_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: `linear-gradient(135deg, ${primaryColor} 0%, ${settings?.secondary_color || '#EC4899'} 100%)` };

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center p-8 cursor-pointer"
      style={bgStyle}
      onClick={onStart}
    >
      <div className="absolute inset-0 bg-black/30" />
      
      <motion.div 
        className="relative z-10 flex flex-col items-center text-center"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <motion.h1 
          className="text-4xl md:text-6xl font-light text-white mb-4 drop-shadow-lg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          Bem-vindo ao
        </motion.h1>
        
        <motion.h2 
          className="text-5xl md:text-7xl font-bold text-white mb-8 drop-shadow-lg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {settings?.store_name || 'Açaí Cup'}
        </motion.h2>
        
        <motion.div 
          className="text-white text-2xl font-light mt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          Clique na tela para iniciar seu pedido
        </motion.div>
      </motion.div>
    </div>
  );
}