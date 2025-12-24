import React from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { QrCode, CreditCard, Banknote, ArrowRight } from 'lucide-react';
import TotemHeader from '../TotemHeader';
import { useCart } from '../CartContext';
import { toast } from 'sonner';

const paymentIcons = {
  pix: QrCode,
  cartao: CreditCard,
  dinheiro: Banknote
};

const paymentLabels = {
  pix: { title: 'PIX', subtitle: '(recomendado)', description: 'Pagamento instantâneo via QR Code', emoji: '📱' },
  cartao: { title: 'Cartão', subtitle: '', description: 'Débito ou crédito na maquininha', emoji: '💳' },
  dinheiro: { title: 'Dinheiro', subtitle: '', description: 'Pagamento em espécie', emoji: '💵' }
};

export default function TotemPayment({ 
  settings, 
  primaryColor,
  onSelectPayment,
  onBack 
}) {
  const { items, total, customer, consumptionType, setPaymentMethod, setCurrentOrder } = useCart();
  const availableMethods = settings?.payment_methods || ['pix', 'cartao'];
  
  const handleSelect = (method) => {
    setPaymentMethod(method);
    onSelectPayment(method);
  };
  


  return (
    <div className="min-h-screen bg-gray-50">
      <TotemHeader 
        title="Pagamento"
        showBack
        onBack={onBack}
        primaryColor={primaryColor}
      />
      
      <main className="max-w-xl mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Como você vai pagar?
          </h2>
          <div 
            className="inline-block px-6 py-3 rounded-2xl mt-4"
            style={{ backgroundColor: `${primaryColor}15` }}
          >
            <span className="text-sm text-gray-500">Total a pagar</span>
            <p 
              className="text-3xl font-bold"
              style={{ color: primaryColor }}
            >
              R$ {total.toFixed(2)}
            </p>
          </div>
        </motion.div>
        
        <div className="space-y-4">
          {availableMethods.map((method, index) => {
            const Icon = paymentIcons[method];
            const label = paymentLabels[method];
            
            if (!Icon || !label) return null;
            
            return (
              <motion.button
                key={method}
                onClick={() => handleSelect(method)}
                className="w-full flex items-center gap-6 p-6 bg-white rounded-2xl border-2 border-gray-200 hover:border-gray-300 transition-all"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileTap={{ scale: 0.98 }}
              >
                <div 
                  className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl"
                  style={{ backgroundColor: `${primaryColor}15` }}
                >
                  {label.emoji}
                </div>
                
                <div className="flex-1 text-left">
                  <div className="flex items-baseline gap-2 mb-1">
                    <h3 className="text-xl font-bold text-gray-900">
                      {label.title}
                    </h3>
                    {label.subtitle && (
                      <span className="text-sm text-gray-500 font-normal">
                        {label.subtitle}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-500">
                    {label.description}
                  </p>
                </div>
                
                <ArrowRight className="w-6 h-6 text-gray-400" />
              </motion.button>
            );
          })}
        </div>
        
        {!settings?.pix_key && availableMethods.includes('pix') && (
          <p className="text-center text-amber-600 text-sm mt-4">
            ⚠️ Chave PIX não configurada
          </p>
        )}
      </main>
    </div>
  );
}