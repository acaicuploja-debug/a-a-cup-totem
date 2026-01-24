import React from 'react';
import { motion } from 'framer-motion';
import { Hand, Settings } from 'lucide-react';

export default function TotemWelcome({ settings, primaryColor, onStart, onOpenAdmin }) {
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

      {/* Admin Button - Desktop Only */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onOpenAdmin();
        }}
        className="hidden lg:block absolute top-6 right-6 z-20 p-2 bg-white/10 backdrop-blur-sm rounded-lg hover:bg-white/20 transition-all"
      >
        <Settings className="w-5 h-5 text-white" />
      </button>

      <motion.div 
        className="relative z-10 flex flex-col items-center text-center"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <motion.h1 
          className="text-6xl md:text-8xl font-bold text-white mb-12 drop-shadow-lg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          Faça seu pedido aqui
        </motion.h1>
        
        <motion.div 
          className="text-white text-2xl font-light mt-4 flex flex-col items-center gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <motion.div
            animate={{ 
              scale: [1, 1.2, 1],
              rotate: [0, 10, -10, 0]
            }}
            transition={{ 
              duration: 1.5,
              repeat: Infinity,
              repeatDelay: 0.5
            }}
          >
            <Hand className="w-16 h-16 text-white drop-shadow-lg" />
          </motion.div>
          <span>Clique na tela para iniciar seu pedido</span>
        </motion.div>
      </motion.div>
      

    </div>
  );
}