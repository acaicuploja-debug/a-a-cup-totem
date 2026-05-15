import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Minus, Plus, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TotemHeader from '../TotemHeader';
import ProductBadge from '../ProductBadge';
import ComplementSelector from '../ComplementSelector';
import { useCart } from '../CartContext';
import { toast } from 'sonner';

export default function TotemProductDetail({ 
  settings, 
  primaryColor,
  product,
  onBack,
  onAddToCart 
}) {
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedComplements, setSelectedComplements] = useState({});
  
  const handleToggleComplement = (groupIndex, item) => {
    setSelectedComplements(prev => {
      const current = prev[groupIndex] || [];
      const exists = current.some(c => c.name === item.name);
      if (exists) {
        return { ...prev, [groupIndex]: current.filter(c => c.name !== item.name) };
      } else {
        return { ...prev, [groupIndex]: [...current, { ...item, qty: 1 }] };
      }
    });
  };

  const handleIncrementComplement = (groupIndex, item) => {
    setSelectedComplements(prev => {
      const current = prev[groupIndex] || [];
      const group = product.complements[groupIndex];
      const totalQty = current.reduce((s, i) => s + (i.qty || 1), 0);
      if (group.max && totalQty >= group.max) return prev;
      const exists = current.find(c => c.name === item.name);
      if (exists) {
        return { ...prev, [groupIndex]: current.map(c => c.name === item.name ? { ...c, qty: (c.qty || 1) + 1 } : c) };
      }
      return { ...prev, [groupIndex]: [...current, { ...item, qty: 1 }] };
    });
  };

  const handleDecrementComplement = (groupIndex, item) => {
    setSelectedComplements(prev => {
      const current = prev[groupIndex] || [];
      const exists = current.find(c => c.name === item.name);
      if (!exists) return prev;
      if ((exists.qty || 1) <= 1) {
        return { ...prev, [groupIndex]: current.filter(c => c.name !== item.name) };
      }
      return { ...prev, [groupIndex]: current.map(c => c.name === item.name ? { ...c, qty: (c.qty || 1) - 1 } : c) };
    });
  };
  
  const allComplements = useMemo(() => {
    return Object.values(selectedComplements).flat();
  }, [selectedComplements]);
  
  const complementsTotal = useMemo(() => {
    return allComplements.reduce((sum, c) => sum + (c.price || 0) * (c.qty || 1), 0);
  }, [allComplements]);
  
  const basePrice = product?.promo_price || product?.price || 0;
  const unitTotal = basePrice + complementsTotal;
  const total = unitTotal * quantity;
  
  const canAddToCart = useMemo(() => {
    if (!product?.complements) return true;
    return product.complements.every((group, index) => {
      if (!group.required) return true;
      const selected = selectedComplements[index] || [];
      const count = group.allow_multiply
        ? selected.reduce((s, i) => s + (i.qty || 1), 0)
        : selected.length;
      return !group.min || count >= group.min;
    });
  }, [product?.complements, selectedComplements]);

  // Auto-scroll to first required complement group on product open
  useEffect(() => {
    if (!product?.complements) return;
    const firstRequired = product.complements.findIndex(group => group.required);
    if (firstRequired !== -1) {
      setTimeout(() => {
        const el = document.getElementById(`complement-group-${firstRequired}`);
        if (el) {
          const offsetTop = el.getBoundingClientRect().top + window.scrollY - 100;
          window.scrollTo({ top: offsetTop, behavior: 'smooth' });
        }
      }, 300);
    }
  }, [product]);

  const handleScrollToNextGroup = (currentIndex) => {
    const complements = product?.complements || [];
    for (let i = currentIndex + 1; i < complements.length; i++) {
      const group = complements[i];
      if (!group.required) continue;
      const selected = selectedComplements[i] || [];
      const count = group.allow_multiply
        ? selected.reduce((s, item) => s + (item.qty || 1), 0)
        : selected.length;
      const isFulfilled = group.min ? count >= group.min : count >= (group.max || 1);
      if (!isFulfilled) {
        const el = document.getElementById(`complement-group-${i}`);
        if (el) {
          const offsetTop = el.getBoundingClientRect().top + window.scrollY - 100;
          window.scrollTo({ top: offsetTop, behavior: 'smooth' });
        }
        return;
      }
    }
  };
  
  const handleAddToCart = () => {
    if (!canAddToCart) {
      toast.error('Selecione os itens obrigatórios');
      return;
    }
    addItem(product, allComplements, quantity);
    toast.success('Adicionado ao carrinho!');
    onAddToCart();
  };

  if (!product) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <TotemHeader 
        title={product.name}
        showBack
        onBack={onBack}
        primaryColor={primaryColor}
      />
      
      <div className="flex-1 overflow-auto pb-32">
        <div className="relative aspect-[4/3] bg-gray-200">
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
              <span className="text-6xl">🍨</span>
            </div>
          )}
          
          {product.badges && product.badges.length > 0 && (
            <div className="absolute top-4 left-4 flex flex-wrap gap-2">
              {product.badges.map(badge => (
                <ProductBadge key={badge} type={badge} />
              ))}
            </div>
          )}
        </div>
        
        <div className="px-4 py-6 max-w-xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {product.name}
          </h1>
          
          {product.description && (
            <p className="text-gray-500 mb-4">
              {product.description}
            </p>
          )}
          
          <div className="flex items-center gap-2 mb-6 flex-wrap product-price-section">
            {product.promo_price && product.promo_price < product.price ? (
              <>
                <span className="text-3xl font-bold" style={{ color: primaryColor }}>
                  R$ {product.promo_price.toFixed(2)}
                </span>
                <span className="text-lg text-gray-400 line-through">
                  R$ {product.price.toFixed(2)}
                </span>
                <span className="text-sm font-bold px-3 py-1 rounded-full bg-red-500 text-white">
                  -{Math.round((1 - product.promo_price / product.price) * 100)}%
                </span>
              </>
            ) : (
              <span className="text-3xl font-bold" style={{ color: primaryColor }}>
                R$ {product.price.toFixed(2)}
              </span>
            )}
          </div>
          
          {product.complements && product.complements.length > 0 && (
            <div className="border-t border-gray-200 pt-6">
              {product.complements.map((group, index) => (
                <div key={index} id={`complement-group-${index}`}>
                  <ComplementSelector
                    group={group}
                    selectedItems={selectedComplements[index] || []}
                    onToggle={(item) => handleToggleComplement(index, item)}
                    onIncrement={(item) => handleIncrementComplement(index, item)}
                    onDecrement={(item) => handleDecrementComplement(index, item)}
                    primaryColor={primaryColor}
                    onMaxReached={() => handleScrollToNextGroup(index)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Fixed bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-2xl z-50">
        <div className="w-full max-w-xl mx-auto px-safe">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center"
              >
                <Minus className="w-5 h-5 text-gray-600" />
              </button>
              
              <span className="text-2xl font-bold text-gray-900 w-8 text-center">
                {quantity}
              </span>
              
              <button 
                onClick={() => setQuantity(q => q + 1)}
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${primaryColor}15` }}
              >
                <Plus className="w-5 h-5" style={{ color: primaryColor }} />
              </button>
            </div>
            
            <div className="text-right">
              <p className="text-sm text-gray-500">Total</p>
              <p className="text-2xl font-bold" style={{ color: primaryColor }}>
                R$ {total.toFixed(2)}
              </p>
            </div>
          </div>
          
          <Button
            onClick={handleAddToCart}
            disabled={!canAddToCart}
            className="w-full h-16 text-lg md:text-xl font-bold rounded-2xl text-white disabled:opacity-50 whitespace-nowrap"
            style={{ backgroundColor: canAddToCart ? primaryColor : '#9CA3AF' }}
          >
            <ShoppingCart className="w-5 h-5 md:w-6 md:h-6 mr-2 flex-shrink-0" />
            <span className="truncate">Adicionar ao Carrinho</span>
          </Button>
        </div>
      </div>
    </div>
  );
}