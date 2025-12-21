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
        {settings?.logo_url && (
          <motion.img 
            src={settings.logo_url} 
            alt="Logo"
            className="h-32 w-auto mb-8 drop-shadow-2xl"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
          />
        )}
        
        <motion.h1 
          className="text-4xl md:text-6xl font-light text-white mb-4 drop-shadow-lg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          Bem-vindo ao
        </motion.h1>
        
        <motion.h2 
          className="text-5xl md:text-7xl font-bold text-white mb-16 drop-shadow-lg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {settings?.store_name || 'Açaí Cup'}
        </motion.h2>
      </motion.div>
      
      <motion.div 
        className="absolute bottom-12 text-white text-xl font-light"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        Clique na tela para iniciar seu pedido
      </motion.div>
    </div>
  );
}