import React from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import TotemHeader from '../TotemHeader';
import PixQRCode from '../PixQRCode';
import { useCart } from '../CartContext';
import { toast } from 'sonner';

export default function TotemPix({ 
  settings, 
  primaryColor,
  onConfirmPayment,
  onChangePaymentMethod 
}) {
  const { items, total, customer, consumptionType, setCurrentOrder } = useCart();
  
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
        total: total,
        consumption_type: consumptionType,
        payment_method: 'pix',
        status: status,
        order_datetime: brasiliaTime,
        reward_redeemed: customer?.redeeming_reward || false
      };
      
      const order = await base44.entities.Order.create(orderData);
      
      // Update loyalty only if customer exists and order is not cancelled
      if (status !== 'cancelado' && customer?.id) {
        if (customer.redeeming_reward) {
          // Resgatando prêmio
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
          // Contando pedido normal
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
  
  const handleConfirmPayment = async () => {
    try {
      await createOrderMutation.mutateAsync('pagamento_informado');
      toast.success('Pedido confirmado!');
      onConfirmPayment();
    } catch (error) {
      toast.error('Erro ao criar pedido');
    }
  };
  
  const handleExpired = () => {};

  return (
    <div className="min-h-screen bg-gray-50">
      <TotemHeader 
        title="Pagamento PIX"
        primaryColor={primaryColor}
      />
      
      <main className="max-w-xl mx-auto">
        <PixQRCode
          settings={settings}
          total={total}
          onConfirmPayment={handleConfirmPayment}
          onChangePaymentMethod={onChangePaymentMethod}
          onExpired={handleExpired}
          primaryColor={primaryColor}
        />
      </main>
    </div>
  );
}