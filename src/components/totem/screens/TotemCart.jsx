import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, ArrowRight, Plus, Tag, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import TotemHeader from '../TotemHeader';
import CartItem from '../CartItem';
import CartUpsell from '../CartUpsell';
import { useCart } from '../CartContext';
import { toast } from 'sonner';

export default function TotemCart({ 
  settings, 
  primaryColor,
  onContinueShopping,
  onProceed,
  onBack,
  onProductSelect
}) {
  const { items, updateItemQuantity, removeItem, subtotal, discount, total, appliedCoupon, setAppliedCoupon } = useCart();
  
  const handleProceed = () => {
    const hasNonUpsellItem = items.some(item => !item.is_upsell);
    if (!hasNonUpsellItem) {
      toast.error('⚠️ Você só tem produtos extras no carrinho. Adicione pelo menos um produto do cardápio principal para continuar!', {
        duration: 5000
      });
      return;
    }
    onProceed();
  };
  const [couponCode, setCouponCode] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <TotemHeader 
          title="Carrinho"
          showBack
          onBack={onBack}
          primaryColor={primaryColor}
        />
        
        <div className="flex flex-col items-center justify-center px-4 py-20">
          <div 
            className="w-24 h-24 rounded-full flex items-center justify-center mb-6"
            style={{ backgroundColor: `${primaryColor}15` }}
          >
            <ShoppingBag 
              className="w-12 h-12" 
              style={{ color: primaryColor }} 
            />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Carrinho Vazio
          </h2>
          <p className="text-gray-500 text-center mb-8">
            Adicione produtos ao seu carrinho para continuar
          </p>
          
          <Button
            onClick={onContinueShopping}
            className="h-14 px-8 text-lg font-semibold rounded-xl text-white"
            style={{ backgroundColor: primaryColor }}
          >
            <Plus className="w-5 h-5 mr-2" />
            Adicionar Produtos
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-48">
      <TotemHeader 
        title="Carrinho"
        showBack
        onBack={onBack}
        primaryColor={primaryColor}
      />
      
      <main className="max-w-xl mx-auto px-4 py-6">
        <div className="space-y-4">
          <AnimatePresence>
            {items.map(item => (
              <CartItem
                key={item.id}
                item={item}
                onUpdateQuantity={updateItemQuantity}
                onRemove={removeItem}
                primaryColor={primaryColor}
              />
            ))}
          </AnimatePresence>
        </div>
        
        <div className="mt-6 space-y-4">
          {!appliedCoupon ? (
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="Código do cupom"
                    className="pl-10 h-12 text-base"
                  />
                </div>
                <Button
                  onClick={async () => {
                    if (!couponCode.trim()) return;
                    setApplyingCoupon(true);
                    try {
                      const coupons = await base44.entities.Coupon.filter({ code: couponCode, active: true });
                      if (coupons.length === 0) {
                        toast.error('Cupom inválido');
                        setApplyingCoupon(false);
                        return;
                      }
                      
                      const coupon = coupons[0];
                      
                      if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
                        toast.error('Cupom expirado');
                        setApplyingCoupon(false);
                        return;
                      }
                      
                      if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
                        toast.error('Cupom esgotado');
                        setApplyingCoupon(false);
                        return;
                      }
                      
                      if (coupon.min_order_value && subtotal < coupon.min_order_value) {
                        toast.error(`Pedido mínimo: R$ ${coupon.min_order_value.toFixed(2)}`);
                        setApplyingCoupon(false);
                        return;
                      }
                      
                      setAppliedCoupon(coupon);
                      toast.success('Cupom aplicado!');
                      setCouponCode('');
                    } catch (error) {
                      toast.error('Erro ao aplicar cupom');
                    }
                    setApplyingCoupon(false);
                  }}
                  disabled={applyingCoupon || !couponCode.trim()}
                  className="h-12 px-6"
                  style={{ backgroundColor: primaryColor }}
                >
                  Aplicar
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Tag className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-800">Cupom {appliedCoupon.code}</p>
                  <p className="text-sm text-green-600">
                    {appliedCoupon.discount_type === 'percentage' 
                      ? `${appliedCoupon.discount_value}% de desconto`
                      : `R$ ${appliedCoupon.discount_value.toFixed(2)} de desconto`
                    }
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setAppliedCoupon(null)}
                className="text-green-600 hover:text-green-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}
          
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex justify-between items-center text-gray-500 mb-2">
              <span>Subtotal</span>
              <span>R$ {subtotal.toFixed(2)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between items-center text-green-600 mb-2">
                <span>Desconto</span>
                <span>- R$ {discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-xl font-bold text-gray-900">
              <span>Total</span>
              <span style={{ color: primaryColor }}>R$ {total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <CartUpsell primaryColor={primaryColor} onProductSelect={onProductSelect} />
      </main>
      
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-2xl">
        <div className="max-w-xl mx-auto space-y-3">
          <Button
            onClick={handleProceed}
            className="w-full h-16 text-xl font-bold rounded-2xl text-white"
            style={{ backgroundColor: primaryColor }}
          >
            Seguir com o Pedido
            <ArrowRight className="w-6 h-6 ml-3" />
          </Button>
          
          <Button
            variant="outline"
            onClick={onContinueShopping}
            className="w-full h-14 text-lg font-semibold rounded-xl"
          >
            <Plus className="w-5 h-5 mr-2" />
            Comprar Mais
          </Button>
        </div>
      </div>
    </div>
  );
}