import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from './CartContext';
import { toast } from 'sonner';

export default function CartUpsell({ primaryColor, onProductSelect }) {
  const { addItem, removeItem, items } = useCart();

  const { data: upsellProducts, isLoading } = useQuery({
    queryKey: ['upsell-products'],
    queryFn: async () => {
      const result = await base44.entities.Product.filter({ is_upsell: true, active: true });
      return result.sort((a, b) => (a.order || 0) - (b.order || 0));
    }
  });

  const handleAddUpsell = (product) => {
    if (product.complements && product.complements.length > 0) {
      onProductSelect(product);
      return;
    }
    addItem(product, [], 1);
    toast.success(`${product.name} adicionado!`);
  };

  const handleRemoveUpsell = (product) => {
    const itemToRemove = [...items].reverse().find(item => item.product_id === product.id);
    if (itemToRemove) {
      removeItem(itemToRemove.id);
      toast.success(`${product.name} removido!`);
    }
  };

  const getProductCountInCart = (productId) =>
    items.filter(item => item.product_id === productId).length;

  if (isLoading || !upsellProducts || upsellProducts.length === 0) return null;

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">🎁</span>
        <h3 className="text-xl font-bold text-gray-900">Leve mais e pague menos</h3>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {upsellProducts.map((product, index) => {
          const hasPromo = product.promo_price && product.promo_price < product.price;
          const displayPrice = product.promo_price || product.price;
          const countInCart = getProductCountInCart(product.id);
          return (
            <motion.div
              key={product.id}
              className="bg-white rounded-2xl overflow-hidden shadow-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <div
                className="relative aspect-square cursor-pointer active:opacity-80 transition-opacity"
                onClick={() => handleAddUpsell(product)}
              >
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: `${primaryColor}20` }}>
                    <span className="text-5xl">🍨</span>
                  </div>
                )}
                {product.badges && product.badges.length > 0 && (
                  <div className="absolute top-2 left-2 flex flex-col gap-1.5">
                    {product.badges.map(badge => {
                      if (badge === 'leve_mais_pague_menos') {
                        return (
                          <div key={badge} className="px-2 py-1 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs font-black shadow-lg border-2 border-white">
                            🎁 LEVE MAIS
                          </div>
                        );
                      }
                      return (
                        <div key={badge} className="px-2 py-1 rounded-lg bg-black/70 text-white text-xs font-bold">
                          {badge === 'promocao' && '🔥 Promoção'}
                          {badge === 'novo' && '✨ Novo'}
                          {badge === 'mais_vendido' && '⭐ Top'}
                          {badge === 'oferta' && '💰 Oferta'}
                        </div>
                      );
                    })}
                  </div>
                )}
                {countInCart > 0 && (
                  <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    {countInCart}x
                  </div>
                )}
              </div>
              <div className="p-3">
                <h4 className="font-bold text-gray-900 text-sm line-clamp-2 mb-1">{product.name}</h4>
                <div className="flex items-center gap-1 mb-2 flex-wrap">
                  {hasPromo ? (
                    <>
                      <span className="text-lg font-bold" style={{ color: primaryColor }}>R$ {displayPrice.toFixed(2)}</span>
                      <span className="text-xs text-gray-400 line-through">R$ {product.price.toFixed(2)}</span>
                      <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-red-500 text-white">
                        -{Math.round((1 - product.promo_price / product.price) * 100)}%
                      </span>
                    </>
                  ) : (
                    <span className="text-lg font-bold" style={{ color: primaryColor }}>R$ {displayPrice.toFixed(2)}</span>
                  )}
                </div>
                {countInCart > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    <Button onClick={() => handleRemoveUpsell(product)} variant="outline" className="h-10 rounded-xl text-sm font-bold">
                      Remover
                    </Button>
                    <Button onClick={() => handleAddUpsell(product)} className="h-10 rounded-xl text-sm font-bold text-white" style={{ backgroundColor: primaryColor }}>
                      <Plus className="w-4 h-4 mr-1" />Add
                    </Button>
                  </div>
                ) : (
                  <Button onClick={() => handleAddUpsell(product)} className="w-full h-10 rounded-xl text-sm font-bold text-white" style={{ backgroundColor: primaryColor }}>
                    <Plus className="w-4 h-4 mr-1" />Adicionar
                  </Button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}