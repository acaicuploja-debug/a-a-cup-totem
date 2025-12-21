import React from 'react';
import { motion } from 'framer-motion';
import { Gift, Star, PartyPopper } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LoyaltyCard({ 
  customer, 
  settings,
  onRedeem,
  onSkip,
  primaryColor
}) {
  const loyaltyTarget = settings?.loyalty_target || 10;
  const currentCount = customer?.loyalty_count || 0;
  const hasReward = customer?.has_pending_reward;
  const remaining = loyaltyTarget - currentCount;
  const progress = (currentCount / loyaltyTarget) * 100;
  
  if (hasReward) {
    return (
      <motion.div 
        className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border-2 border-amber-200"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-amber-400 flex items-center justify-center">
            <PartyPopper className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              🎉 Parabéns!
            </h3>
            <p className="text-amber-700">
              Você tem um prêmio disponível!
            </p>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-4 mb-4">
          <div className="flex items-center gap-3">
            <Gift className="w-8 h-8 text-amber-500" />
            <div>
              <p className="text-sm text-gray-500">Seu prêmio</p>
              <p className="font-bold text-lg text-gray-900">
                {settings?.loyalty_reward_description || 'Açaí 300ml grátis'}
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col gap-3">
          <Button
            onClick={onRedeem}
            className="h-14 text-lg font-semibold rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
          >
            <Gift className="w-5 h-5 mr-2" />
            Resgatar Agora
          </Button>
          
          <Button
            variant="outline"
            onClick={onSkip}
            className="h-12 text-base font-medium rounded-xl"
          >
            Deixar para o Próximo Pedido
          </Button>
        </div>
      </motion.div>
    );
  }
  
  return (
    <motion.div 
      className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div 
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ backgroundColor: `${primaryColor}20` }}
        >
          <Star className="w-5 h-5" style={{ color: primaryColor }} />
        </div>
        <div>
          <h3 className="font-bold text-gray-900">Programa de Fidelidade</h3>
          <p className="text-sm text-gray-500">
            {currentCount} de {loyaltyTarget} pedidos
          </p>
        </div>
      </div>
      
      <div className="relative h-4 bg-gray-100 rounded-full overflow-hidden mb-3">
        <motion.div 
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ backgroundColor: primaryColor }}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
      
      <div className="flex items-center gap-2 text-sm">
        <Gift className="w-4 h-4 text-amber-500" />
        <span className="text-gray-600">
          Faltam <strong>{remaining} pedidos</strong> para ganhar seu prêmio 🎁
        </span>
      </div>
    </motion.div>
  );
}