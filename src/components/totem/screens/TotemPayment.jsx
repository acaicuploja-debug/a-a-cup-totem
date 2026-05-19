import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { QrCode, CreditCard, Banknote, ArrowRight, Loader2 } from 'lucide-react';
import TotemHeader from '../TotemHeader';
import { useCart } from '../CartContext';
import { toast } from 'sonner';

const paymentIcons = {
  pix: QrCode,
  debito: CreditCard,
  credito: CreditCard,
  cartao: CreditCard,
  dinheiro: Banknote
};

const paymentLabels = {
  pix: { title: 'PIX', subtitle: '(recomendado)', description: 'Pagamento instantâneo via QR Code', emoji: '📱' },
  debito: { title: 'Débito', subtitle: '', description: 'Passe o cartão na maquininha', emoji: '💳' },
  credito: { title: 'Crédito', subtitle: '(à vista)', description: 'Passe o cartão na maquininha', emoji: '💳' },
  cartao: { title: 'Cartão', subtitle: '', description: 'Débito ou crédito na maquininha', emoji: '💳' },
  smarttef: { title: 'Cartão', subtitle: '(Smart TEF)', description: 'Pagamento integrado com inspeção', emoji: '💳' },
  dinheiro: { title: 'Dinheiro', subtitle: '', description: 'Pagamento em espécie', emoji: '💵' }
};

export default function TotemPayment({ 
  settings, 
  primaryColor,
  onSelectPayment,
  onBack 
}) {
  const { items, total, customer, consumptionType, setPaymentMethod, setCurrentOrder } = useCart();
  const configuredMethods = settings?.payment_methods || ['pix', 'cartao'];
  const [processingPayment, setProcessingPayment] = useState(null);
  
  // Garantir que PIX apareça sempre primeiro
  const sortedMethods = [...configuredMethods].sort((a, b) => {
    if (a === 'pix') return -1;
    if (b === 'pix') return 1;
    return 0;
  });
  
  // Calcular total ajustado para cada forma de pagamento
  const calculateAdjustedTotal = (method) => {
    const adjustment = settings?.payment_adjustments?.[method] || 0;
    if (adjustment === 0) return total;
    return total * (1 + adjustment / 100);
  };
  
  const createOrderMutation = useMutation({
    mutationFn: async (paymentMethod) => {
      const now = new Date();
      const brasiliaTime = now.toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });

      const orders = await base44.entities.Order.list('-order_number', 1);
      const nextNumber = orders.length > 0 ? (orders[0].order_number || 0) + 1 : 1;

      const finalTotal = calculateAdjustedTotal(paymentMethod);

      const order = await base44.entities.Order.create({
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
          total: item.total,
          cost_price: item.cost_price || 0
        })),
        subtotal: total,
        total: finalTotal,
        consumption_type: consumptionType,
        payment_method: paymentMethod,
        status: 'em_preparo',
        order_datetime: brasiliaTime,
        reward_redeemed: customer?.redeeming_reward || false
      });

      // Update loyalty
      if (customer?.id) {
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
  
  const handleSelect = async (method) => {
    // Prevenir cliques múltiplos
    if (processingPayment) return;
    
    setProcessingPayment(method);
    setPaymentMethod(method);

    try {
      // Se for cartão ou dinheiro - criar pedido direto (pagamento manual)
      if (method === 'cartao' || method === 'dinheiro') {
        toast.info('Criando pedido...');
        await createOrderMutation.mutateAsync(method);
        toast.success('Pedido criado!');
        onSelectPayment(method);
      } 
      // Smart TEF - criar pedido e vai para tela de Smart TEF
      else if (method === 'smarttef') {
        toast.info('Criando pedido...');
        await createOrderMutation.mutateAsync(method);
        toast.success('Pedido criado!');
        onSelectPayment(method);
      }
      // PIX - vai para tela de PIX
      else {
        onSelectPayment(method);
      }
    } catch (error) {
      setProcessingPayment(null);
      toast.error('Erro ao processar pagamento');
    }
  };
  


  return (
    <div className="min-h-screen bg-gray-50">
      <TotemHeader 
        title="Pagamento"
        showBack
        onBack={onBack}
        primaryColor={primaryColor}
      />
      
      <main className="max-w-xl mx-auto px-4 py-6">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Como você vai pagar?
          </h2>
          <div 
            className="inline-block px-6 py-3 rounded-2xl mt-4"
            style={{ backgroundColor: `${primaryColor}15` }}
          >
            <span className="text-sm text-gray-500">Total a pagar</span>
            <p 
              className="text-3xl font-bold"
              style={{ color: primaryColor }}
            >
              R$ {total.toFixed(2)}
            </p>
          </div>
        </div>
        
        <div className="space-y-4">
          {sortedMethods.map((method, index) => {
            const Icon = paymentIcons[method];
            const label = paymentLabels[method];
            const isPix = method === 'pix';
            const adjustment = settings?.payment_adjustments?.[method] || 0;
            const adjustedTotal = calculateAdjustedTotal(method);
            const hasDiscount = adjustment < 0;
            const hasSurcharge = adjustment > 0;

            if (!Icon || !label) return null;

            const isProcessing = processingPayment === method;
            const isDisabled = processingPayment !== null;

            return (
              <button
                key={method}
                onClick={() => handleSelect(method)}
                disabled={isDisabled}
                className={`w-full flex items-center gap-6 p-6 rounded-2xl border-2 transition-all ${
                  isProcessing
                    ? 'bg-gradient-to-r from-green-500 to-green-600 border-green-600 scale-95 shadow-2xl'
                    : isDisabled
                    ? 'bg-gray-100 border-gray-200 opacity-50 cursor-not-allowed'
                    : isPix 
                    ? 'bg-white border-green-400 shadow-lg shadow-green-100 hover:scale-105 active:scale-95' 
                    : 'bg-white border-gray-200 hover:border-gray-300 hover:scale-105 active:scale-95'
                }`}
              >
                <div 
                  className={`w-20 h-20 rounded-2xl flex items-center justify-center text-4xl transition-all ${
                    isProcessing ? 'animate-pulse' : ''
                  }`}
                  style={{ backgroundColor: isProcessing ? '#ffffff30' : isPix ? '#22c55e15' : `${primaryColor}15` }}
                >
                  {isProcessing ? (
                    <Loader2 className="w-10 h-10 text-white animate-spin" />
                  ) : (
                    label.emoji
                  )}
                </div>

                <div className="flex-1 text-left">
                  <div className="flex items-baseline gap-2 mb-1">
                    <h3 className={`text-xl font-bold ${isProcessing ? 'text-white' : 'text-gray-900'}`}>
                      {isProcessing ? 'Processando...' : label.title}
                    </h3>
                    {!isProcessing && label.subtitle && (
                      <span className={`text-sm font-normal ${isPix ? 'text-green-600' : 'text-gray-500'}`}>
                        {label.subtitle}
                      </span>
                    )}
                  </div>
                  {!isProcessing && (
                    <>
                      <p className="text-gray-500 mb-1">
                        {label.description}
                      </p>
                      {hasDiscount && (
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-semibold text-green-600">
                            💰 {Math.abs(adjustment)}% de desconto
                          </span>
                          <span className="text-sm text-gray-400 line-through ml-2">
                            R$ {total.toFixed(2)}
                          </span>
                          <span className="text-sm font-bold text-green-600 ml-1">
                            R$ {adjustedTotal.toFixed(2)}
                          </span>
                        </div>
                      )}
                      {hasSurcharge && (
                        <div className="text-sm text-amber-600">
                          +{adjustment}% • Total: R$ {adjustedTotal.toFixed(2)}
                        </div>
                      )}
                    </>
                  )}
                  {isProcessing && (
                    <p className="text-white text-sm font-medium">
                      Aguarde um momento...
                    </p>
                  )}
                </div>

                {isProcessing ? (
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                ) : (
                  <ArrowRight className={`w-6 h-6 ${isPix ? 'text-green-500' : 'text-gray-400'}`} />
                )}
              </button>
            );
          })}
        </div>
        
        {!settings?.pix_key && sortedMethods.includes('pix') && (
          <p className="text-center text-amber-600 text-sm mt-4">
            ⚠️ Chave PIX não configurada
          </p>
        )}
      </main>
    </div>
  );
}