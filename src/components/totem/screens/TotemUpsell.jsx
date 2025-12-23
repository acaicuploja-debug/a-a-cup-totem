import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowRight, Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TotemHeader from '../TotemHeader';
import { useCart } from '../CartContext';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

export default function TotemUpsell({ 
  settings, 
  primaryColor,
  onSkip,
  onProceed 
}) {
  const { addItem, total } = useCart();
  
  const { data: upsellProducts, isLoading } = useQuery({
    queryKey: ['upsell-products'],
    queryFn: () => base44.entities.Product.filter({ is_upsell: true, active: true })
  });
  
  const [addedProducts, setAddedProducts] = React.useState({});
  
  const handleAddUpsell = (product) => {
    addItem(product, [], 1);
    setAddedProducts(prev => ({
      ...prev,
      [product.id]: (prev[product.id] || 0) + 1
    }));
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
        title=""
        primaryColor={primaryColor}
      />
      
      <main className="max-w-xl mx-auto px-4 py-8">
        <motion.div 
          className="text-center mb-10"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-4xl font-bold text-gray-900">
            Vamos turbinar seu pedido?
          </h2>
        </motion.div>
        
        <div className="grid grid-cols-2 gap-4">
          {upsellProducts.map((product, index) => {
            const hasPromo = product.promo_price && product.promo_price < product.price;
            const displayPrice = product.promo_price || product.price;
            
            return (
              <motion.div
                key={product.id}
                className="bg-white rounded-2xl overflow-hidden shadow-lg"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="relative aspect-square">
                  {product.image_url ? (
                    <img 
                      src={product.image_url} 
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div 
                      className="w-full h-full flex items-center justify-center"
                      style={{ backgroundColor: `${primaryColor}20` }}
                    >
                      <span className="text-5xl">🍨</span>
                    </div>
                  )}
                  {product.badges && product.badges.length > 0 && (
                    <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                      {product.badges.map(badge => (
                        <div key={badge} className="px-2 py-1 rounded-lg bg-black/70 text-white text-xs font-bold">
                          {badge === 'promocao' && '🔥 Promoção'}
                          {badge === 'novo' && '✨ Novo'}
                          {badge === 'mais_vendido' && '⭐ Top'}
                          {badge === 'oferta' && '💰 Oferta'}
                        </div>
                      ))}
                    </div>
                  )}
                  {addedProducts[product.id] > 0 && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                      {addedProducts[product.id]}x
                    </div>
                  )}
                </div>
                
                <div className="p-3">
                  <h3 className="font-bold text-gray-900 text-sm line-clamp-2 mb-1">
                    {product.name}
                  </h3>
                  
                  <div className="flex items-center gap-1 mb-2 flex-wrap">
                    {hasPromo ? (
                      <>
                        <span className="text-lg font-bold" style={{ color: primaryColor }}>
                          R$ {displayPrice.toFixed(2)}
                        </span>
                        <span className="text-xs text-gray-400 line-through">
                          R$ {product.price.toFixed(2)}
                        </span>
                        <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-red-500 text-white">
                          -{Math.round((1 - product.promo_price / product.price) * 100)}%
                        </span>
                      </>
                    ) : (
                      <span className="text-lg font-bold" style={{ color: primaryColor }}>
                        R$ {displayPrice.toFixed(2)}
                      </span>
                    )}
                  </div>
                  
                  <Button
                    onClick={() => handleAddUpsell(product)}
                    className="w-full h-10 rounded-xl text-sm font-bold text-white"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Adicionar
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </main>
      
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-2xl">
        <div className="max-w-xl mx-auto space-y-3">
          <div className="flex items-center justify-between px-4">
            <span className="text-gray-600">Total do carrinho</span>
            <span className="text-2xl font-bold" style={{ color: primaryColor }}>
              R$ {total.toFixed(2)}
            </span>
          </div>
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