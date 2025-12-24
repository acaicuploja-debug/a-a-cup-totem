import React from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { QrCode, CreditCard, Banknote, ArrowRight } from 'lucide-react';
import TotemHeader from '../TotemHeader';
import { useCart } from '../CartContext';
import { toast } from 'sonner';

const paymentIcons = {
  pix: QrCode,
  cartao: CreditCard,
  dinheiro: Banknote
};

const paymentLabels = {
  pix: { title: 'PIX', subtitle: '(recomendado)', description: 'Pagamento instantâneo via QR Code', emoji: '📱' },
  cartao: { title: 'Cartão', subtitle: '', description: 'Débito ou crédito na maquininha', emoji: '💳' },
  dinheiro: { title: 'Dinheiro', subtitle: '', description: 'Pagamento em espécie', emoji: '💵' }
};

export default function TotemPayment({ 
  settings, 
  primaryColor,
  onSelectPayment,
  onBack 
}) {
  const { items, total, customer, consumptionType, setPaymentMethod, setCurrentOrder } = useCart();
  const availableMethods = settings?.payment_methods || ['pix', 'cartao'];
  
  const createOrderMutation = useMutation({
    mutationFn: async (paymentMethod) => {
      const now = new Date();
      const brasiliaTime = new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).format(now).replace(',', '');
      
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
        payment_method: paymentMethod,
        status: 'em_preparo',
        order_datetime: brasiliaTime,
        reward_redeemed: customer?.redeeming_reward || false
      };
      
      const order = await base44.entities.Order.create(orderData);
      
      // Update loyalty only if customer exists
      if (customer?.id) {
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
  
  const handleSelect = async (method) => {
    console.log('=== PAYMENT SELECT ===', method);
    setPaymentMethod(method);
    
    // Se for cartão ou dinheiro, cria o pedido direto
    if (method === 'cartao' || method === 'dinheiro') {
      console.log('Criando pedido para', method);
      try {
        const order = await createOrderMutation.mutateAsync(method);
        console.log('Pedido criado:', order);
        toast.success('Pedido #' + order.data.order_number + ' criado!');
        onSelectPayment(method);
      } catch (error) {
        console.error('ERRO ao criar pedido:', error);
        toast.error('Erro ao criar pedido: ' + error.message);
        return;
      }
    } else {
      // PIX segue o fluxo normal
      console.log('PIX - pulando criação');
      onSelectPayment(method);
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
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
        </motion.div>
        
        <div className="space-y-4">
          {availableMethods.map((method, index) => {
            const Icon = paymentIcons[method];
            const label = paymentLabels[method];
            
            if (!Icon || !label) return null;
            
            return (
              <motion.button
                key={method}
                onClick={() => handleSelect(method)}
                className="w-full flex items-center gap-6 p-6 bg-white rounded-2xl border-2 border-gray-200 hover:border-gray-300 transition-all"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileTap={{ scale: 0.98 }}
              >
                <div 
                  className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl"
                  style={{ backgroundColor: `${primaryColor}15` }}
                >
                  {label.emoji}
                </div>
                
                <div className="flex-1 text-left">
                  <div className="flex items-baseline gap-2 mb-1">
                    <h3 className="text-xl font-bold text-gray-900">
                      {label.title}
                    </h3>
                    {label.subtitle && (
                      <span className="text-sm text-gray-500 font-normal">
                        {label.subtitle}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-500">
                    {label.description}
                  </p>
                </div>
                
                <ArrowRight className="w-6 h-6 text-gray-400" />
              </motion.button>
            );
          })}
        </div>
        
        {!settings?.pix_key && availableMethods.includes('pix') && (
          <p className="text-center text-amber-600 text-sm mt-4">
            ⚠️ Chave PIX não configurada
          </p>
        )}
      </main>
    </div>
  );
}