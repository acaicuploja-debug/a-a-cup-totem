import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowRight, Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TotemHeader from '../TotemHeader';
import { useCart } from '../CartContext';
import { toast } from 'sonner';

export default function TotemUpsell({ 
  settings, 
  primaryColor,
  onSkip,
  onProceed 
}) {
  const { addItem } = useCart();
  
  const { data: upsellProducts, isLoading } = useQuery({
    queryKey: ['upsell-products'],
    queryFn: () => base44.entities.Product.filter({ is_upsell: true, active: true })
  });
  
  const handleAddUpsell = (product) => {
    addItem(product, [], 1);
    toast.success(`${product.name} adicionado!`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-4 border-gray-200 rounded-full"
          style={{ borderTopColor: primaryColor }}
        />
      </div>
    );
  }

  if (!upsellProducts || upsellProducts.length === 0) {
    onSkip();
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <TotemHeader 
        title="Que tal adicionar?"
        primaryColor={primaryColor}
      />
      
      <main className="max-w-xl mx-auto px-4 py-6">
        <motion.div 
          className="text-center mb-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div 
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4"
            style={{ backgroundColor: `${primaryColor}15` }}
          >
            <Sparkles className="w-5 h-5" style={{ color: primaryColor }} />
            <span className="font-medium" style={{ color: primaryColor }}>
              Sugestões para você
            </span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
            Complemente seu pedido!
          </h2>
        </motion.div>
        
        <div className="space-y-4">
          {upsellProducts.map((product, index) => (
            <motion.div
              key={product.id}
              className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              {product.image_url ? (
                <img 
                  src={product.image_url} 
                  alt={product.name}
                  className="w-20 h-20 rounded-xl object-cover"
                />
              ) : (
                <div 
                  className="w-20 h-20 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${primaryColor}15` }}
                >
                  <span className="text-2xl">🍨</span>
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 truncate">
                  {product.name}
                </h3>
                {product.description && (
                  <p className="text-sm text-gray-500 truncate">
                    {product.description}
                  </p>
                )}
                <p 
                  className="text-lg font-bold mt-1"
                  style={{ color: primaryColor }}
                >
                  R$ {(product.promo_price || product.price).toFixed(2)}
                </p>
              </div>
              
              <Button
                onClick={() => handleAddUpsell(product)}
                size="icon"
                className="w-12 h-12 rounded-full flex-shrink-0 text-white"
                style={{ backgroundColor: primaryColor }}
              >
                <Plus className="w-6 h-6" />
              </Button>
            </motion.div>
          ))}
        </div>
      </main>
      
      {/* Fixed bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-2xl">
        <div className="max-w-xl mx-auto space-y-3">
          <Button
            onClick={onProceed}
            className="w-full h-16 text-xl font-bold rounded-2xl text-white"
            style={{ backgroundColor: primaryColor }}
          >
            Continuar
            <ArrowRight className="w-6 h-6 ml-3" />
          </Button>
          
          <Button
            variant="ghost"
            onClick={onSkip}
            className="w-full h-12 text-gray-500"
          >
            Pular esta etapa
          </Button>
        </div>
      </div>
    </div>
  );
}