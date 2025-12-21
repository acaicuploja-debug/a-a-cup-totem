import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, ArrowRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TotemHeader from '../TotemHeader';
import CartItem from '../CartItem';
import { useCart } from '../CartContext';

export default function TotemCart({ 
  settings, 
  primaryColor,
  onContinueShopping,
  onProceed,
  onBack 
}) {
  const { items, updateItemQuantity, removeItem, subtotal, total } = useCart();

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
        
        <div className="mt-6 bg-white rounded-xl p-4 shadow-sm">
          <div className="flex justify-between items-center text-gray-500 mb-2">
            <span>Subtotal</span>
            <span>R$ {subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center text-xl font-bold text-gray-900">
            <span>Total</span>
            <span style={{ color: primaryColor }}>R$ {total.toFixed(2)}</span>
          </div>
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
            Seguir com o Pedido
            <ArrowRight className="w-6 h-6 ml-3" />
          </Button>
          
          <Button
            variant="outline"
            onClick={onContinueShopping}
            className="w-full h-14 text-lg font-semibold rounded-xl"
          >
            <Plus className="w-5 h-5 mr-2" />
            Continuar Comprando
          </Button>
        </div>
      </div>
    </div>
  );
}