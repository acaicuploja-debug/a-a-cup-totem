import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { CartProvider, useCart } from '../components/totem/CartContext';
import TotemWelcome from '../components/totem/screens/TotemWelcome.jsx';
import TotemCategories from '../components/totem/screens/TotemCategories';
import TotemCatalog from '../components/totem/screens/TotemCatalog';
import TotemProducts from '../components/totem/screens/TotemProducts';
import TotemProductDetail from '../components/totem/screens/TotemProductDetail';
import TotemCart from '../components/totem/screens/TotemCart';
import TotemUpsell from '../components/totem/screens/TotemUpsell';
import TotemCustomer from '../components/totem/screens/TotemCustomer';
import TotemConsumption from '../components/totem/screens/TotemConsumption';
import TotemPayment from '../components/totem/screens/TotemPayment';
import TotemPix from '../components/totem/screens/TotemPix';
import TotemSmartTefCard from '../components/totem/screens/TotemSmartTefCard';
import TotemSuccess from '../components/totem/screens/TotemSuccess';
import InactivityWarning from '../components/totem/InactivityWarning.jsx';

import Admin from './Admin';

Totem.publicPage = true;

const SCREENS = {
  WELCOME: 'welcome',
  CATALOG: 'catalog',
  CATEGORIES: 'categories',
  PRODUCTS: 'products',
  PRODUCT_DETAIL: 'product_detail',
  CART: 'cart',
  UPSELL: 'upsell',
  CUSTOMER: 'customer',
  CONSUMPTION: 'consumption',
  PAYMENT: 'payment',
  PIX: 'pix',
  SMARTTEF: 'smarttef',
  SUCCESS: 'success'
};

function TotemContent() {
  const [screen, setScreen] = useState(SCREENS.WELCOME);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [smartTefType, setSmartTefType] = useState(null);
  const { clearCart, setCurrentOrder, total, currentOrder, customer } = useCart();
  
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
  
  // Reset inactivity timer on user interaction
  React.useEffect(() => {
    const resetTimer = () => setLastActivity(Date.now());
    
    window.addEventListener('click', resetTimer);
    window.addEventListener('touchstart', resetTimer);
    window.addEventListener('keydown', resetTimer);
    
    return () => {
      window.removeEventListener('click', resetTimer);
      window.removeEventListener('touchstart', resetTimer);
      window.removeEventListener('keydown', resetTimer);
    };
  }, []);
  
  // Inatividade: aviso visual aos 45s e encerramento aos 60s.
  // Contador único derivado de lastActivity (sem timers duplicados / sem race condition).
  const [showInactivityWarning, setShowInactivityWarning] = useState(false);
  const [warningCountdown, setWarningCountdown] = useState(15);

  React.useEffect(() => {
    const interval = setInterval(() => {
      // Não atuar em pagamento em andamento, admin ou tela inicial
      if (screen === SCREENS.PIX || screen === SCREENS.SMARTTEF || showAdmin) {
        // Garante que um aviso disparado em tela anterior seja fechado ao entrar no pagamento
        if (showInactivityWarning) setShowInactivityWarning(false);
        return;
      }
      if (screen === SCREENS.WELCOME) {
        if (showInactivityWarning) setShowInactivityWarning(false);
        return;
      }

      const inactive = Date.now() - lastActivity;

      if (showInactivityWarning) {
        // Qualquer interação reseta lastActivity → fechar aviso e manter o pedido intacto
        if (inactive < 45000) {
          setShowInactivityWarning(false);
          return;
        }
        const remaining = 15 - Math.floor((inactive - 45000) / 1000);
        if (remaining <= 0) {
          setShowInactivityWarning(false);
          handleNewOrder();
        } else {
          setWarningCountdown(remaining);
        }
      } else if (inactive >= 45000) {
        setShowInactivityWarning(true);
        setWarningCountdown(15);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [screen, lastActivity, showAdmin, showInactivityWarning]);
  
  const handleStartOrder = () => setScreen(SCREENS.CATALOG);
  
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
    setScreen(SCREENS.CATALOG);
  };
  
  const handleBackToProducts = () => {
    setSelectedProduct(null);
    setScreen(SCREENS.CATALOG);
  };
  
  const handleGoToCart = () => setScreen(SCREENS.CART);
  
  const handleContinueShopping = () => setScreen(SCREENS.CATALOG);
  
  const handleProceedFromCart = () => setScreen(SCREENS.CUSTOMER);
  
  const handleSkipUpsell = () => setScreen(SCREENS.CUSTOMER);
  
  const handleCustomerComplete = () => setScreen(SCREENS.CONSUMPTION);
  
  const handleConsumptionComplete = () => setScreen(SCREENS.PAYMENT);
  
  const handlePaymentSelect = (method, subType) => {
    if (method === 'pix') {
      setShowInactivityWarning(false);
      setLastActivity(Date.now());
      setScreen(SCREENS.PIX);
    } else if (method === 'smarttef') {
      setShowInactivityWarning(false);
      setLastActivity(Date.now());
      setSmartTefType(subType || null);
      setScreen(SCREENS.SMARTTEF);
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

  const handleContinueOrder = () => {
    setLastActivity(Date.now());
    setShowInactivityWarning(false);
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
              onOpenAdmin={() => setShowAdmin(true)}
            />
          )}
          
          {screen === SCREENS.CATALOG && (
            <TotemCatalog
              {...screenProps}
              onSelectProduct={(product) => {
                setSelectedProduct(product);
                setScreen(SCREENS.PRODUCT_DETAIL);
              }}
              onCartClick={handleGoToCart}
              onBack={() => setScreen(SCREENS.WELCOME)}
            />
          )}

          {screen === SCREENS.PRODUCT_DETAIL && (
            <TotemProductDetail 
              {...screenProps}
              product={selectedProduct}
              onBack={handleBackToProducts}
              onAddToCart={() => setScreen(SCREENS.CART)}
            />
          )}

          {screen === SCREENS.CART && (
            <TotemCart 
              {...screenProps}
              onContinueShopping={handleContinueShopping}
              onProceed={handleProceedFromCart}
              onBack={handleBackToProducts}
              onProductSelect={(product) => {
                setSelectedProduct(product);
                setScreen(SCREENS.PRODUCT_DETAIL);
              }}
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
              onBack={() => setScreen(SCREENS.CART)}
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

          {screen === SCREENS.SMARTTEF && (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
              <TotemSmartTefCard 
                {...screenProps}
                total={total}
                initialPaymentType={smartTefType}
                onSuccess={handlePaymentConfirmed}
                onCancel={() => setScreen(SCREENS.PAYMENT)}
              />
            </div>
          )}

          {screen === SCREENS.SUCCESS && (
            <TotemSuccess 
              {...screenProps}
              onNewOrder={handleNewOrder}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {showAdmin && (
        <div className="hidden md:block fixed inset-0 z-50 bg-white">
          <Admin onClose={() => setShowAdmin(false)} />
        </div>
      )}

      {showInactivityWarning && (
        <InactivityWarning
          countdown={warningCountdown}
          onContinue={handleContinueOrder}
          primaryColor={primaryColor}
        />
      )}
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