import React from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
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
  
  // Garantir que PIX apareça sempre primeiro
  const sortedMethods = [...availableMethods].sort((a, b) => {
    if (a === 'pix') return -1;
    if (b === 'pix') return 1;
    return 0;
  });
  
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
          total: item.total
        })),
        subtotal: total,
        total: total,
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
    setPaymentMethod(method);

    if (method === 'cartao' || method === 'dinheiro') {
      toast.info('Criando pedido...');
      await createOrderMutation.mutateAsync(method);
      toast.success('Pedido criado!');
      onSelectPayment(method);
    } else {
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

            if (!Icon || !label) return null;

            return (
              <button
                key={method}
                onClick={() => handleSelect(method)}
                className={`w-full flex items-center gap-6 p-6 bg-white rounded-2xl border-2 transition-all active:scale-95 ${
                  isPix 
                    ? 'border-green-400 shadow-lg shadow-green-100' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div 
                  className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl"
                  style={{ backgroundColor: isPix ? '#22c55e15' : `${primaryColor}15` }}
                >
                  {label.emoji}
                </div>

                <div className="flex-1 text-left">
                  <div className="flex items-baseline gap-2 mb-1">
                    <h3 className="text-xl font-bold text-gray-900">
                      {label.title}
                    </h3>
                    {label.subtitle && (
                      <span className={`text-sm font-normal ${isPix ? 'text-green-600' : 'text-gray-500'}`}>
                        {label.subtitle}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-500">
                    {label.description}
                  </p>
                </div>

                <ArrowRight className={`w-6 h-6 ${isPix ? 'text-green-500' : 'text-gray-400'}`} />
              </button>
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