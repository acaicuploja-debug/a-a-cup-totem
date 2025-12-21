import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { Monitor, Settings, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-700 to-pink-600 flex items-center justify-center p-8">
      <motion.div 
        className="max-w-2xl w-full text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <motion.div
          className="text-8xl mb-8"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
        >
          🍇
        </motion.div>
        
        <h1 className="text-5xl font-bold text-white mb-4">
          Açaí Cup
        </h1>
        <p className="text-xl text-white/80 mb-12">
          Sistema de Totem de Autoatendimento
        </p>
        
        <div className="grid md:grid-cols-2 gap-6">
          <Link to={createPageUrl('Totem')}>
            <motion.div
              className="bg-white rounded-2xl p-8 shadow-2xl hover:shadow-3xl transition-all cursor-pointer group"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="w-16 h-16 rounded-xl bg-purple-100 flex items-center justify-center mx-auto mb-4">
                <Monitor className="w-8 h-8 text-purple-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Totem de Atendimento
              </h2>
              <p className="text-gray-500 mb-4">
                Acesse o totem para fazer pedidos
              </p>
              <div className="flex items-center justify-center gap-2 text-purple-600 font-medium">
                Acessar
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.div>
          </Link>
          
          <Link to={createPageUrl('Admin')}>
            <motion.div
              className="bg-white rounded-2xl p-8 shadow-2xl hover:shadow-3xl transition-all cursor-pointer group"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="w-16 h-16 rounded-xl bg-pink-100 flex items-center justify-center mx-auto mb-4">
                <Settings className="w-8 h-8 text-pink-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Painel Administrativo
              </h2>
              <p className="text-gray-500 mb-4">
                Gerencie produtos, pedidos e configurações
              </p>
              <div className="flex items-center justify-center gap-2 text-pink-600 font-medium">
                Acessar
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.div>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}