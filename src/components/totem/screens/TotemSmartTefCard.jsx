import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, AlertCircle, ChevronRight } from 'lucide-react';
import TotemHeader from '../TotemHeader';
import { useCart } from '../CartContext';

const POLL_INTERVAL = 3000; // 3 segundos
const POLL_TIMEOUT = 120000; // 2 minutos máximo

export default function TotemSmartTefCard({ 
  total, 
  settings,
  primaryColor,
  initialPaymentType,
  onSuccess, 
  onCancel
}) {
  const { items, customer, consumptionType, setCurrentOrder } = useCart();
  const [step, setStep] = useState(initialPaymentType ? 'processing' : 'select');
  const [paymentType, setPaymentType] = useState(initialPaymentType || null);
  const [errorMessage, setErrorMessage] = useState('');
  const [countdown, setCountdown] = useState(10);
  const countdownRef = useRef(null);
  const pollingRef = useRef(null);
  const timeoutRef = useRef(null);
  // Ref para evitar stale closure dentro do polling
  const customerRef = useRef(customer);
  const itemsRef = useRef(items);
  const consumptionTypeRef = useRef(consumptionType);
  useEffect(() => { customerRef.current = customer; }, [customer]);
  useEffect(() => { itemsRef.current = items; }, [items]);
  useEffect(() => { consumptionTypeRef.current = consumptionType; }, [consumptionType]);

  const stopPolling = () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  };

  const startCountdown = () => {
    setCountdown(10);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    if (initialPaymentType) {
      handleSelectType(initialPaymentType);
    }
    return () => stopPolling();
  }, []);

  const startPolling = (type, paymentIdentifier) => {
    // Timeout máximo
    timeoutRef.current = setTimeout(() => {
      stopPolling();
      setErrorMessage('Tempo limite atingido. Por favor, tente novamente.');
      setStep('error');
    }, POLL_TIMEOUT);

    pollingRef.current = setInterval(async () => {
      try {
        const res = await base44.functions.invoke('checkSmartTefPayment', { payment_identifier: paymentIdentifier });
        const { status, transactionId, authorizationCode } = res.data;

        console.log('[SmartTEF] poll status:', status, res.data);
        if (status === 'approved') {
          stopPolling();
          setStep('success');
          // Criar pedido SOMENTE após pagamento confirmado
          await createOrder(type);
          setTimeout(() => {
            onSuccess && onSuccess({ method: type, transactionId, authorizationCode });
          }, 2000);
        } else if (status === 'denied' || status === 'cancelled' || status === 'canceled') {
          stopPolling();
          // Pagamento recusado/cancelado — mostrar tela de erro para o cliente tentar novamente
          setErrorMessage('Cartão recusado. Verifique o saldo ou tente outro cartão.');
          setStep('error');
        }
        // 'pending' => continua polling
      } catch (e) {
        // ignora erros de rede e continua tentando
      }
    }, POLL_INTERVAL);
  };

  const createOrder = async (paymentMethod) => {
    // Usar refs para garantir valores atualizados (evita stale closure no polling)
    const currentCustomer = customerRef.current;
    const currentItems = itemsRef.current;
    const currentConsumptionType = consumptionTypeRef.current;

    const now = new Date();
    const brasiliaTime = now.toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    });

    const orders = await base44.entities.Order.list('-order_number', 1);
    const nextNumber = orders.length > 0 ? (orders[0].order_number || 0) + 1 : 1;

    const order = await base44.entities.Order.create({
      order_number: nextNumber,
      customer_id: currentCustomer?.id || null,
      customer_name: currentCustomer?.name || null,
      customer_phone: currentCustomer?.phone || null,
      items: currentItems.map(item => ({
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        complements: item.complements || [],
        total: item.total,
        cost_price: item.cost_price || 0
      })),
      subtotal: total,
      total: total,
      consumption_type: currentConsumptionType,
      payment_method: paymentMethod,
      status: 'em_preparo',
      order_datetime: brasiliaTime,
      payment_confirmed_at: new Date().toISOString(),
      reward_redeemed: currentCustomer?.redeeming_reward || false
    });

    // Fidelidade — incrementa pedido do cliente
    if (currentCustomer?.id) {
      const loyaltyTarget = settings?.loyalty_target || 10;
      if (currentCustomer.redeeming_reward) {
        await base44.entities.Customer.update(currentCustomer.id, {
          loyalty_count: 0,
          has_pending_reward: false,
          reward_available_date: null
        });
        await base44.entities.LoyaltyLog.create({
          customer_id: currentCustomer.id,
          customer_phone: currentCustomer.phone,
          order_id: order.id,
          action: 'premio_resgatado',
          loyalty_count_before: currentCustomer.loyalty_count || 0,
          loyalty_count_after: 0,
          datetime_brasilia: brasiliaTime
        });
      } else {
        const currentCount = currentCustomer.loyalty_count || 0;
        const newCount = currentCount + 1;
        const hasPendingReward = newCount >= loyaltyTarget;
        await base44.entities.Customer.update(currentCustomer.id, {
          loyalty_count: hasPendingReward ? loyaltyTarget : newCount,
          has_pending_reward: hasPendingReward,
          reward_available_date: hasPendingReward ? new Date().toISOString() : currentCustomer.reward_available_date
        });
        await base44.entities.LoyaltyLog.create({
          customer_id: currentCustomer.id,
          customer_phone: currentCustomer.phone,
          order_id: order.id,
          action: hasPendingReward ? 'premio_disponivel' : 'pedido_contado',
          loyalty_count_before: currentCount,
          loyalty_count_after: newCount,
          datetime_brasilia: brasiliaTime
        });
      }
    }

    setCurrentOrder(order);
    return order;
  };

  const handleSelectType = async (type) => {
    setPaymentType(type);
    setStep('processing');

    try {
      const response = await base44.functions.invoke('createSmartTefPayment', {
        amount: total,
        orderId: Date.now().toString(),
        paymentType: type,
        description: `Pagamento cartao`,
        customerName: customer?.name || '',
        customerCpf: customer?.cpf || ''
      });

      if (response.data.success && response.data.payment_identifier) {
        // Card criado na maquininha — agora faz polling usando o payment_identifier
        startCountdown();
        startPolling(type, response.data.payment_identifier);
      } else {
        setErrorMessage(response.data.message || 'Erro ao enviar para maquininha. Tente novamente.');
        setStep('error');
      }
    } catch (error) {
      setErrorMessage('Erro ao comunicar com a maquininha. Tente novamente.');
      setStep('error');
    }
  };

  const handleRetry = () => {
    stopPolling();
    setStep('select');
    setPaymentType(null);
    setErrorMessage('');
  };

  const formatTotal = (value) => `R$ ${Number(value).toFixed(2).replace('.', ',')}`;

  if (step === 'processing') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <TotemHeader title="Pagamento com Cartão" primaryColor={primaryColor} />
        <div className="flex-1 flex flex-col items-center justify-center gap-8 p-8">
          {countdown > 0 ? (
            <>
              <div
                className="w-28 h-28 rounded-full flex items-center justify-center text-5xl font-bold border-4"
                style={{ borderColor: primaryColor, color: primaryColor }}
              >
                {countdown}
              </div>
              <h2 className="text-2xl font-bold text-gray-900 text-center">Preparando maquininha...</h2>
              <p className="text-gray-500 text-center text-lg">
                Aguarde <strong>{countdown} segundo{countdown !== 1 ? 's' : ''}</strong> que já aparecerá na maquininha ao lado.
              </p>
            </>
          ) : (
            <>
              <Loader2 className="w-20 h-20 animate-spin" style={{ color: primaryColor }} />
              <h2 className="text-2xl font-bold text-gray-900 text-center">Aguardando maquininha...</h2>
              <p className="text-gray-500 text-center text-lg">
                Insira ou aproxime o cartão na maquininha.
              </p>
            </>
          )}

          <div
            className="px-8 py-4 rounded-2xl text-center"
            style={{ backgroundColor: `${primaryColor}15` }}
          >
            <p className="text-sm text-gray-500 mb-1">
              {paymentType === 'debito' ? 'Débito' : 'Crédito à Vista'}
            </p>
            <p className="text-3xl font-bold" style={{ color: primaryColor }}>
              {formatTotal(total)}
            </p>
          </div>

          <Button
            onClick={() => { stopPolling(); onCancel && onCancel(); }}
            variant="outline"
            className="mt-4 h-12 px-8 text-base"
          >
            Cancelar Pagamento
          </Button>
        </div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <TotemHeader title="Pagamento com Cartão" primaryColor={primaryColor} />
        <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
          <CheckCircle2 className="w-24 h-24 text-green-500" />
          <h2 className="text-3xl font-bold text-green-700 text-center">Pagamento Aprovado!</h2>
          <p className="text-gray-500 text-center text-lg">Seu pedido foi registrado com sucesso.</p>
        </div>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <TotemHeader title="Pagamento com Cartão" primaryColor={primaryColor} />
        <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
          <AlertCircle className="w-24 h-24 text-red-500" />
          <h2 className="text-2xl font-bold text-red-700 text-center">Pagamento Recusado</h2>
          <p className="text-gray-600 text-center">{errorMessage}</p>
          <div className="flex flex-col gap-3 w-full max-w-sm">
            <Button
              onClick={handleRetry}
              className="w-full h-14 text-lg text-white"
              style={{ backgroundColor: primaryColor }}
            >
              Tentar Novamente
            </Button>
            <Button
              onClick={onCancel}
              variant="outline"
              className="w-full h-14 text-lg"
            >
              Voltar ao Pagamento
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // step === 'select'
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <TotemHeader 
        title="Pagamento com Cartão"
        showBack
        onBack={onCancel}
        primaryColor={primaryColor}
      />

      <main className="max-w-xl mx-auto px-4 py-6 w-full">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Como vai pagar no cartão?</h2>
          <div
            className="inline-block px-6 py-3 rounded-2xl"
            style={{ backgroundColor: `${primaryColor}15` }}
          >
            <span className="text-sm text-gray-500">Total a pagar</span>
            <p className="text-3xl font-bold" style={{ color: primaryColor }}>
              {formatTotal(total)}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Débito */}
          <button
            onClick={() => handleSelectType('debito')}
            className="w-full flex items-center gap-6 p-6 rounded-2xl border-2 border-gray-200 bg-white hover:border-gray-300 hover:scale-105 active:scale-95 transition-all"
          >
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl"
              style={{ backgroundColor: `${primaryColor}15` }}
            >
              💳
            </div>
            <div className="flex-1 text-left">
              <h3 className="text-xl font-bold text-gray-900">Débito</h3>
              <p className="text-gray-500">Débito à vista</p>
              <p className="text-lg font-bold mt-1" style={{ color: primaryColor }}>
                {formatTotal(total)}
              </p>
            </div>
            <ChevronRight className="w-6 h-6 text-gray-400" />
          </button>

          {/* Crédito */}
          <button
            onClick={() => handleSelectType('credito')}
            className="w-full flex items-center gap-6 p-6 rounded-2xl border-2 border-gray-200 bg-white hover:border-gray-300 hover:scale-105 active:scale-95 transition-all"
          >
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl"
              style={{ backgroundColor: `${primaryColor}15` }}
            >
              💳
            </div>
            <div className="flex-1 text-left">
              <h3 className="text-xl font-bold text-gray-900">Crédito à Vista</h3>
              <p className="text-gray-500">Crédito em 1x</p>
              <p className="text-lg font-bold mt-1" style={{ color: primaryColor }}>
                {formatTotal(total)}
              </p>
            </div>
            <ChevronRight className="w-6 h-6 text-gray-400" />
          </button>
        </div>
      </main>
    </div>
  );
}