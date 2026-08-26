import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart } from 'lucide-react';

export default function InactivityWarning({ countdown, onContinue, primaryColor }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        style={{ background: 'rgba(17,17,17,0.55)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
        onClick={onContinue}
      >
        <motion.div
          initial={{ scale: 0.9, y: 24, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 280, damping: 24 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-5"
            style={{ background: `${primaryColor}15` }}
          >
            <ShoppingCart size={40} style={{ color: primaryColor }} />
          </div>

          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Seu pedido ainda está aqui!
          </h2>
          <p className="text-gray-500 mb-6">
            Você está há algum tempo sem interagir com a tela.
          </p>

          <div className="mb-6">
            <motion.div
              key={countdown}
              initial={{ scale: 1.25, opacity: 0.5 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="inline-flex items-center justify-center w-28 h-28 rounded-full font-bold text-5xl"
              style={{
                color: primaryColor,
                background: `${primaryColor}10`,
                border: `3px solid ${primaryColor}40`
              }}
            >
              {countdown}
            </motion.div>
          </div>

          <p className="text-gray-700 font-semibold mb-6 leading-relaxed">
            Seu pedido será reiniciado em{' '}
            <span style={{ color: primaryColor }}>{countdown}</span>{' '}
            segundos e os itens selecionados serão perdidos.
          </p>

          <button
            onClick={onContinue}
            className="w-full py-4 rounded-2xl text-white text-lg font-bold shadow-lg transition-transform active:scale-95"
            style={{ background: primaryColor }}
          >
            CONTINUAR PEDIDO
          </button>

          <p className="text-gray-400 text-sm mt-3">
            Toque para continuar de onde parou.
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}