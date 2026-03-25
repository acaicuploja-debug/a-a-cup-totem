import React, { createContext, useContext, useState, useCallback } from 'react';

const CartContext = createContext();

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [consumptionType, setConsumptionType] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [appliedCoupon, setAppliedCoupon] = useState(null);

  const addItem = useCallback((product, complements = [], quantity = 1) => {
    const complementsTotal = complements.reduce((sum, c) => sum + (c.price || 0) * (c.qty || 1), 0);
    const unitPrice = (product.promo_price || product.price) + complementsTotal;
    
    // Calcular custo do item
    const itemCost = product.cost_price ? product.cost_price * quantity : 0;
    
    const newItem = {
      id: `${product.id}-${Date.now()}`,
      product_id: product.id,
      product_name: product.name,
      product_image: product.image_url,
      quantity,
      unit_price: unitPrice,
      base_price: product.promo_price || product.price,
      complements,
      total: unitPrice * quantity,
      cost_price: itemCost,
      is_upsell: product.is_upsell || false
    };
    
    setItems(prev => [...prev, newItem]);
  }, []);

  const updateItemQuantity = useCallback((itemId, quantity) => {
    if (quantity <= 0) {
      setItems(prev => prev.filter(item => item.id !== itemId));
    } else {
      setItems(prev => prev.map(item => {
        if (item.id === itemId) {
          // Recalcular custo proporcional à quantidade
          const unitCost = item.cost_price ? item.cost_price / item.quantity : 0;
          return { 
            ...item, 
            quantity, 
            total: item.unit_price * quantity,
            cost_price: unitCost * quantity
          };
        }
        return item;
      }));
    }
  }, []);

  const removeItem = useCallback((itemId) => {
    setItems(prev => prev.filter(item => item.id !== itemId));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setCustomer(null);
    setConsumptionType(null);
    setPaymentMethod(null);
    setCurrentOrder(null);
    setAppliedCoupon(null);
  }, []);

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  
  const calculateDiscount = useCallback(() => {
    if (!appliedCoupon) return 0;
    
    if (appliedCoupon.discount_type === 'percentage') {
      return subtotal * (appliedCoupon.discount_value / 100);
    } else {
      return appliedCoupon.discount_value;
    }
  }, [appliedCoupon, subtotal]);
  
  const discount = calculateDiscount();
  const total = Math.max(0, subtotal - discount);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider value={{
      items,
      addItem,
      updateItemQuantity,
      removeItem,
      clearCart,
      subtotal,
      discount,
      total,
      itemCount,
      customer,
      setCustomer,
      consumptionType,
      setConsumptionType,
      paymentMethod,
      setPaymentMethod,
      currentOrder,
      setCurrentOrder,
      appliedCoupon,
      setAppliedCoupon
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}