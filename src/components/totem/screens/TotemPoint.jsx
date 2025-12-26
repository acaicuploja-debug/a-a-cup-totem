import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { CreditCard, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TotemHeader from '../TotemHeader';
import { useCart } from '../CartContext';

export default function TotemPoint({ 
  settings, 
  primaryColor,
  onSuccess,
  onBack,
  onChangePayment,
  cardType = 'debito'
}) {
  const { items, total, customer, consumptionType, clearCart, appliedCoupon, paymentMethod } = useCart();
  const [paymentStatus, setPaymentStatus] = useState('creating'); // creating, waiting, paid, error
  const [orderId, setOrderId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const createOrderMutation = useMutation({
    mutationFn: async (orderData) => {
      return await base44.entities.Order.create(orderData);
    }
  });

  const createPointPaymentMutation = useMutation({
    mutationFn: async ({ orderId, amount, description }) => {
      return await base44.functions.invoke('createPointPayment', {
        orderId,
        amount,
        description
      });
    }
  });

  useEffect(() => {
    const initPayment = async () => {
      try {
        // Calcular ajuste baseado no tipo de cartão (débito/crédito)
        const paymentType = paymentMethod || cardType;
        const adjustment = settings?.payment_adjustments?.[paymentType] || settings?.payment_adjustments?.cartao || 0;
        const adjustedTotal = total * (1 + adjustment / 100);

        // Criar pedido
        const order = await createOrderMutation.mutateAsync({
          customer_id: customer?.id,
          customer_name: customer?.name,
          customer_phone: customer?.phone,
          items: items.map(item => ({
            product_id: item.product.id,
            product_name: item.product.name,
            quantity: item.quantity,
            unit_price: item.product.promo_price || item.product.price,
            complements: item.complements,
            total: item.total,
            cost_price: item.cost_price || 0
          })),
          subtotal: total,
          total: adjustedTotal,
          consumption_type: consumptionType,
          payment_method: paymentMethod || cardType,
          status: 'aguardando_point',
          order_datetime: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
          reward_redeemed: customer?.redeemReward || false
        });

        setOrderId(order.id);

        // Criar payment intent na Point
        const pointPayment = await createPointPaymentMutation.mutateAsync({
          orderId: order.id,
          amount: adjustedTotal,
          description: `Pedido #${order.order_number || order.id}`,
          paymentType: paymentMethod || cardType
        });

        if (pointPayment.error) {
          setPaymentStatus('error');
          setErrorMessage(pointPayment.details || pointPayment.error);
          return;
        }

        setPaymentStatus('waiting');

        // Iniciar polling
        const checkInterval = setInterval(async () => {
          try {
            const { data } = await base44.functions.invoke('checkPointPayment', {
              orderId: order.id
            });

            if (data.status === 'paid') {
              clearInterval(checkInterval);
              setPaymentStatus('paid');
              
              // Atualizar cupom se aplicado
              if (appliedCoupon) {
                await base44.entities.Coupon.update(appliedCoupon.id, {
                  used_count: (appliedCoupon.used_count || 0) + 1
                });
              }

              setTimeout(() => {
                clearCart();
                onSuccess(order);
              }, 2000);
            } else if (data.status === 'canceled' || data.status === 'error') {
              clearInterval(checkInterval);
              setPaymentStatus('error');
              setErrorMessage(data.message || 'Pagamento cancelado');
            }
          } catch (error) {
            console.error('Erro ao verificar status:', error);
          }
        }, 3000);

        // Timeout de 5 minutos
        setTimeout(() => {
          clearInterval(checkInterval);
          if (paymentStatus === 'waiting') {
            setPaymentStatus('error');
            setErrorMessage('Tempo esgotado. Tente novamente.');
          }
        }, 300000);

      } catch (error) {
        console.error('Erro ao criar pedido:', error);
        setPaymentStatus('error');
        setErrorMessage('Erro ao processar pedido');
      }
    };

    initPayment();
  }, []);

  if (paymentStatus === 'paid') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div 
            className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ backgroundColor: `${primaryColor}15` }}
          >
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Pagamento Confirmado!
          </h2>
          <p className="text-gray-500">
            Redirecionando...
          </p>
        </motion.div>
      </div>
    );
  }

  if (paymentStatus === 'error') {
    return (
      <div className="min-h-screen bg-gray-50">
        <TotemHeader 
          title="Pagamento na Point"
          showBack
          onBack={onBack}
          primaryColor={primaryColor}
        />
        
        <div className="flex flex-col items-center justify-center px-6 py-20">
          <div className="w-24 h-24 rounded-full bg-red-100 flex items-center justify-center mb-6">
            <XCircle className="w-12 h-12 text-red-600" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Erro no Pagamento
          </h2>
          <p className="text-gray-500 text-center mb-8">
            {errorMessage}
          </p>
          
          <div className="space-y-3 w-full max-w-md">
            <Button
              onClick={onChangePayment}
              className="w-full h-14 text-lg font-semibold rounded-xl text-white"
              style={{ backgroundColor: primaryColor }}
            >
              Tentar Outro Método
            </Button>
            <Button
              onClick={onBack}
              variant="outline"
              className="w-full h-14 text-lg font-semibold rounded-xl"
            >
              Voltar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TotemHeader 
        title="Pagamento na Point"
        primaryColor={primaryColor}
      />
      
      <div className="flex flex-col items-center justify-center px-6 py-20">
        <motion.div
          className="w-32 h-32 rounded-full flex items-center justify-center mb-8"
          style={{ backgroundColor: `${primaryColor}15` }}
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <CreditCard className="w-16 h-16" style={{ color: primaryColor }} />
        </motion.div>
        
        <h2 className="text-3xl font-bold text-gray-900 mb-4 text-center">
          {paymentStatus === 'creating' ? 'Preparando Pagamento...' : `Passe o Cartão de ${(paymentMethod || cardType) === 'debito' ? 'Débito' : 'Crédito'}`}
        </h2>
        
        <p className="text-xl text-gray-500 text-center mb-8">
          {paymentStatus === 'creating' 
            ? 'Conectando com a maquininha...'
            : `Aguardando pagamento ${(paymentMethod || cardType) === 'debito' ? 'no débito' : 'no crédito'} na Point Smart`
          }
        </p>
        
        <div className="bg-white rounded-2xl p-8 shadow-lg text-center mb-8">
          <p className="text-gray-500 mb-2">Total a pagar</p>
          <p 
            className="text-5xl font-bold"
            style={{ color: primaryColor }}
          >
            R$ {total.toFixed(2)}
          </p>
        </div>
        
        <Loader2 
          className="w-10 h-10 animate-spin mb-8" 
          style={{ color: primaryColor }}
        />
        
        <Button
          onClick={onChangePayment}
          variant="outline"
          className="h-12 px-6 text-base"
        >
          Mudar Forma de Pagamento
        </Button>
      </div>
    </div>
  );
}