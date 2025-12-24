import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import TotemHeader from '../TotemHeader';
import PixQRCode from '../PixQRCode';
import { useCart } from '../CartContext';
import { toast } from 'sonner';
import { Loader2, CheckCircle } from 'lucide-react';

export default function TotemPix({ 
  settings, 
  primaryColor,
  onConfirmPayment,
  onChangePaymentMethod 
}) {
  const { items, total, customer, consumptionType, setCurrentOrder } = useCart();
  
  // Calcular total com desconto do PIX
  const pixAdjustment = settings?.payment_adjustments?.pix || 0;
  const adjustedTotal = total * (1 + pixAdjustment / 100);
  const [mercadoPagoData, setMercadoPagoData] = useState(null);
  const [isLoadingMercadoPago, setIsLoadingMercadoPago] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);
  
  const createOrderMutation = useMutation({
    mutationFn: async (status) => {
      const now = new Date();
      const brasiliaTime = now.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      
      const orders = await base44.entities.Order.list('-order_number', 1);
      const nextNumber = orders.length > 0 ? (orders[0].order_number || 0) + 1 : 1;
      
      const orderData = {
        order_number: nextNumber,
        customer_id: customer?.id || null,
        customer_name: customer?.name || null,
        customer_phone: customer?.phone || null,
        items: items.map(item => ({
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          complements: item.complements || [],
          total: item.total
        })),
        subtotal: total,
        total: adjustedTotal,
        consumption_type: consumptionType,
        payment_method: 'pix',
        status: status,
        order_datetime: brasiliaTime,
        reward_redeemed: customer?.redeeming_reward || false
      };
      
      const order = await base44.entities.Order.create(orderData);
      
      // Update loyalty only if customer exists, order is not cancelled, and not using Mercado Pago
      // (Mercado Pago will update loyalty via webhook when payment is confirmed)
      if (status !== 'cancelado' && customer?.id && !settings?.mercadopago_enabled) {
        if (customer.redeeming_reward) {
          await base44.entities.Customer.update(customer.id, {
            loyalty_count: 0,
            has_pending_reward: false,
            reward_available_date: null
          });
          
          await base44.entities.LoyaltyLog.create({
            customer_id: customer.id,
            customer_phone: customer.phone,
            order_id: order.id,
            action: 'premio_resgatado',
            loyalty_count_before: customer.loyalty_count || 0,
            loyalty_count_after: 0,
            datetime_brasilia: brasiliaTime
          });
        } else {
          const currentCount = customer.loyalty_count || 0;
          const newCount = currentCount + 1;
          const loyaltyTarget = settings?.loyalty_target || 10;
          const hasPendingReward = newCount >= loyaltyTarget;
          
          await base44.entities.Customer.update(customer.id, {
            loyalty_count: hasPendingReward ? loyaltyTarget : newCount,
            has_pending_reward: hasPendingReward,
            reward_available_date: hasPendingReward ? new Date().toISOString() : customer.reward_available_date
          });
          
          await base44.entities.LoyaltyLog.create({
            customer_id: customer.id,
            customer_phone: customer.phone,
            order_id: order.id,
            action: hasPendingReward ? 'premio_disponivel' : 'pedido_contado',
            loyalty_count_before: currentCount,
            loyalty_count_after: newCount,
            datetime_brasilia: brasiliaTime
          });
        }
      }
      
      return order;
    },
    onSuccess: (order) => {
      setCurrentOrder(order);
    }
  });
  
  // Create order and Mercado Pago payment on mount if enabled
  useEffect(() => {
    if (!settings) return; // Wait for settings to load
    
    const initPayment = async () => {
      console.log('🔵 TotemPix - Settings:', settings);
      console.log('🔵 TotemPix - mercadopago_enabled:', settings?.mercadopago_enabled);
      console.log('🔵 TotemPix - mercadopago_public_key:', settings?.mercadopago_public_key);
      
      if (settings?.mercadopago_enabled === true) {
        console.log('✅ Mercado Pago está ATIVADO - Iniciando pagamento...');
        setIsLoadingMercadoPago(true);
        try {
          // Create order first
          const order = await createOrderMutation.mutateAsync('aguardando_pix');
          console.log('✅ Pedido criado:', order.id);
          
          // Create Mercado Pago payment
          console.log('🔵 Chamando createMercadoPagoPayment...');
          const response = await base44.functions.invoke('createMercadoPagoPayment', {
            orderId: order.id,
            amount: adjustedTotal,
            description: `Pedido #${String(order.order_number).padStart(3, '0')} - ${settings?.store_name || 'Loja'}`
          });
          
          console.log('🔵 Resposta do Mercado Pago:', response.data);
          
          if (response.data.error) {
            console.error('❌ Erro do Mercado Pago:', response.data.error);
            toast.error('Erro ao gerar PIX: ' + response.data.error);
            return;
          }
          
          console.log('✅ QR Code gerado com sucesso!');
          setMercadoPagoData(response.data);
          
          // Start checking payment status
          startPaymentCheck(order.id);
        } catch (error) {
          console.error('❌ Erro ao criar pagamento Mercado Pago:', error);
          toast.error('Erro ao criar pagamento');
        }
        setIsLoadingMercadoPago(false);
      } else {
        console.log('⚠️ Mercado Pago NÃO está ativado - Usando PIX manual');
      }
    };
    
    initPayment();
  }, [settings]);
  
  // Check payment status periodically
  const startPaymentCheck = (orderId) => {
    setCheckingPayment(true);
    const interval = setInterval(async () => {
      try {
        // Check directly with Mercado Pago via backend
        const response = await base44.functions.invoke('checkPaymentStatus', { orderId });

        if (response.data.confirmed) {
          clearInterval(interval);
          setPaymentConfirmed(true);
          setCheckingPayment(false);

          toast.success('Pagamento confirmado!');

          setTimeout(() => {
            onConfirmPayment();
          }, 2000);
        }
      } catch (error) {
        console.error('Error checking payment:', error);
      }
    }, 3000); // Check every 3 seconds

    // Stop checking after 10 minutes
    setTimeout(() => {
      clearInterval(interval);
      setCheckingPayment(false);
    }, 600000);
  };
  
  const handleConfirmPayment = async () => {
    try {
      await createOrderMutation.mutateAsync('em_preparo');
      toast.success('Pedido confirmado!');
      onConfirmPayment();
    } catch (error) {
      toast.error('Erro ao criar pedido');
    }
  };
  
  const handleExpired = () => {};

  // Show loading while creating Mercado Pago payment
  if (settings?.mercadopago_enabled && isLoadingMercadoPago) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin mx-auto mb-4" style={{ color: primaryColor }} />
          <p className="text-xl font-bold text-gray-900">Gerando PIX...</p>
        </div>
      </div>
    );
  }
  
  // Show payment confirmed screen
  if (paymentConfirmed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div 
            className="w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center"
            style={{ backgroundColor: `${primaryColor}20` }}
          >
            <CheckCircle className="w-16 h-16 text-green-500" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Pagamento Confirmado!
          </h2>
          <p className="text-gray-600">
            Seu pedido está sendo preparado...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TotemHeader 
        title="Pagamento PIX"
        primaryColor={primaryColor}
      />
      
      <main className="max-w-xl mx-auto">
        {settings?.mercadopago_enabled && mercadoPagoData ? (
          <div className="p-6 space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Escaneie o QR Code
              </h2>
              <p className="text-gray-600">
                O pagamento será confirmado automaticamente
              </p>
            </div>
            
            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <img 
                src={`data:image/png;base64,${mercadoPagoData.qr_code_base64}`}
                alt="QR Code PIX"
                className="w-full max-w-sm mx-auto"
              />
            </div>
            
            <div className="bg-white rounded-2xl p-4">
              <p className="text-sm text-gray-500 mb-2 text-center">
                Ou copie o código PIX:
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={mercadoPagoData.qr_code}
                  readOnly
                  className="flex-1 px-4 py-3 bg-gray-50 rounded-xl text-sm font-mono"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(mercadoPagoData.qr_code);
                    toast.success('Código copiado!');
                  }}
                  className="px-6 py-3 rounded-xl text-white font-bold"
                  style={{ backgroundColor: primaryColor }}
                >
                  Copiar
                </button>
              </div>
            </div>
            
            <div 
              className="text-center py-6 rounded-2xl"
              style={{ backgroundColor: `${primaryColor}10` }}
            >
              <p className="text-2xl font-bold mb-2" style={{ color: primaryColor }}>
                R$ {adjustedTotal.toFixed(2)}
              </p>
              {checkingPayment && (
                <p className="text-sm text-gray-600 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Aguardando pagamento...
                </p>
              )}
            </div>
            
            <button
              onClick={onChangePaymentMethod}
              className="w-full py-4 text-gray-600 font-medium"
            >
              Escolher outra forma de pagamento
            </button>
          </div>
        ) : (
          <PixQRCode
            settings={settings}
            total={adjustedTotal}
            onConfirmPayment={handleConfirmPayment}
            onChangePaymentMethod={onChangePaymentMethod}
            onExpired={handleExpired}
            primaryColor={primaryColor}
          />
        )}
      </main>
    </div>
  );
}