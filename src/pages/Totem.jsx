import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { CartProvider, useCart } from '../components/totem/CartContext';
import TotemWelcome from '../components/totem/screens/TotemWelcome';
import TotemCategories from '../components/totem/screens/TotemCategories';
import TotemProducts from '../components/totem/screens/TotemProducts';
import TotemProductDetail from '../components/totem/screens/TotemProductDetail';
import TotemCart from '../components/totem/screens/TotemCart';
import TotemUpsell from '../components/totem/screens/TotemUpsell';
import TotemCustomer from '../components/totem/screens/TotemCustomer';
import TotemConsumption from '../components/totem/screens/TotemConsumption';
import TotemPayment from '../components/totem/screens/TotemPayment';
import TotemPix from '../components/totem/screens/TotemPix';
import TotemSuccess from '../components/totem/screens/TotemSuccess';
import TotemPoint from '../components/totem/screens/TotemPoint';

Totem.publicPage = true;

const SCREENS = {
  WELCOME: 'welcome',
  CATEGORIES: 'categories',
  PRODUCTS: 'products',
  PRODUCT_DETAIL: 'product_detail',
  CART: 'cart',
  UPSELL: 'upsell',
  CUSTOMER: 'customer',
  CONSUMPTION: 'consumption',
  PAYMENT: 'payment',
  PIX: 'pix',
  POINT: 'point',
  SUCCESS: 'success'
};

function TotemContent() {
  const [screen, setScreen] = useState(SCREENS.WELCOME);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const { clearCart, setCurrentOrder } = useCart();
  
  const { data: settings } = useQuery({
    queryKey: ['store-settings'],
    queryFn: async () => {
      const list = await base44.entities.StoreSettings.list();
      console.log('🔵 Totem - Settings carregadas:', list[0]);
      console.log('🔵 Totem - mercadopago_enabled:', list[0]?.mercadopago_enabled);
      console.log('🔵 Totem - mercadopago_public_key:', list[0]?.mercadopago_public_key);
      return list[0] || {};
    }
  });
  
  const primaryColor = settings?.primary_color || '#6B21A8';
  
  const handleStartOrder = () => setScreen(SCREENS.CATEGORIES);
  
  const handleSelectCategory = (category) => {
    setSelectedCategory(category);
    setScreen(SCREENS.PRODUCTS);
  };
  
  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
    setScreen(SCREENS.PRODUCT_DETAIL);
  };
  
  const handleBackToCategories = () => {
    setSelectedCategory(null);
    setScreen(SCREENS.CATEGORIES);
  };
  
  const handleBackToProducts = () => {
    setSelectedProduct(null);
    setScreen(SCREENS.PRODUCTS);
  };
  
  const handleGoToCart = () => setScreen(SCREENS.CART);
  
  const handleContinueShopping = () => setScreen(SCREENS.CATEGORIES);
  
  const handleProceedFromCart = () => setScreen(SCREENS.UPSELL);
  
  const handleSkipUpsell = () => setScreen(SCREENS.CUSTOMER);
  
  const handleCustomerComplete = () => setScreen(SCREENS.CONSUMPTION);
  
  const handleConsumptionComplete = () => setScreen(SCREENS.PAYMENT);
  
  const handlePaymentSelect = (method) => {
    if (method === 'pix') {
      setScreen(SCREENS.PIX);
    } else if (typeof method === 'object' && method.screen === 'point') {
      setScreen(SCREENS.POINT);
    } else {
      setScreen(SCREENS.SUCCESS);
    }
  };
  
  const handlePaymentConfirmed = () => setScreen(SCREENS.SUCCESS);
  
  const handleChangePaymentMethod = () => setScreen(SCREENS.PAYMENT);
  
  const handleNewOrder = () => {
    clearCart();
    setSelectedCategory(null);
    setSelectedProduct(null);
    setCurrentOrder(null);
    setScreen(SCREENS.WELCOME);
  };
  
  const screenProps = {
    settings,
    primaryColor,
    onBack: () => window.history.back()
  };

  return (
    <div 
      className="min-h-screen bg-gray-50"
      style={{ 
        '--primary-color': primaryColor,
        '--secondary-color': settings?.secondary_color || '#EC4899'
      }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={screen}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="min-h-screen"
        >
          {screen === SCREENS.WELCOME && (
            <TotemWelcome 
              {...screenProps}
              onStart={handleStartOrder}
            />
          )}
          
          {screen === SCREENS.CATEGORIES && (
            <TotemCategories 
              {...screenProps}
              onSelectCategory={handleSelectCategory}
              onCartClick={handleGoToCart}
            />
          )}
          
          {screen === SCREENS.PRODUCTS && (
            <TotemProducts 
              {...screenProps}
              category={selectedCategory}
              onSelectProduct={handleSelectProduct}
              onBack={handleBackToCategories}
              onCartClick={handleGoToCart}
            />
          )}
          
          {screen === SCREENS.PRODUCT_DETAIL && (
            <TotemProductDetail 
              {...screenProps}
              product={selectedProduct}
              onBack={handleBackToProducts}
              onAddToCart={() => setScreen(SCREENS.PRODUCTS)}
            />
          )}
          
          {screen === SCREENS.CART && (
            <TotemCart 
              {...screenProps}
              onContinueShopping={handleContinueShopping}
              onProceed={handleProceedFromCart}
              onBack={handleBackToProducts}
            />
          )}
          
          {screen === SCREENS.UPSELL && (
            <TotemUpsell 
              {...screenProps}
              onSkip={handleSkipUpsell}
              onProceed={handleSkipUpsell}
              onProductSelect={handleSelectProduct}
            />
          )}
          
          {screen === SCREENS.CUSTOMER && (
            <TotemCustomer 
              {...screenProps}
              onComplete={handleCustomerComplete}
              onBack={() => setScreen(SCREENS.UPSELL)}
            />
          )}
          
          {screen === SCREENS.CONSUMPTION && (
            <TotemConsumption 
              {...screenProps}
              onComplete={handleConsumptionComplete}
              onBack={() => setScreen(SCREENS.CUSTOMER)}
            />
          )}
          
          {screen === SCREENS.PAYMENT && (
            <TotemPayment 
              {...screenProps}
              onSelectPayment={handlePaymentSelect}
              onBack={() => setScreen(SCREENS.CONSUMPTION)}
            />
          )}
          
          {screen === SCREENS.PIX && (
            <TotemPix 
              {...screenProps}
              onConfirmPayment={handlePaymentConfirmed}
              onChangePaymentMethod={handleChangePaymentMethod}
            />
          )}
          
          {screen === SCREENS.POINT && (
            <TotemPoint 
              {...screenProps}
              onSuccess={() => setScreen(SCREENS.SUCCESS)}
              onBack={() => setScreen(SCREENS.PAYMENT)}
              onChangePayment={handleChangePaymentMethod}
            />
          )}
          
          {screen === SCREENS.SUCCESS && (
            <TotemSuccess 
              {...screenProps}
              onNewOrder={handleNewOrder}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default function Totem() {
  return (
    <CartProvider>
      <TotemContent />
    </CartProvider>
  );
}