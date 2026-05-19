import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { CreditCard, Loader2, CheckCircle2, AlertCircle, ChevronRight } from 'lucide-react';
import TotemHeader from '../TotemHeader';

export default function TotemSmartTefCard({ 
  total, 
  orderId,
  settings,
  primaryColor,
  onSuccess, 
  onCancel
}) {
  const [step, setStep] = useState('select'); // 'select' | 'processing' | 'success' | 'error'
  const [paymentType, setPaymentType] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSelectType = async (type) => {
    setPaymentType(type);
    setStep('processing');

    try {
      const response = await base44.functions.invoke('createSmartTefPayment', {
        amount: total,
        orderId: orderId,
        paymentType: type, // 'debito' ou 'credito'
        description: `Pedido #${orderId}`
      });

      if (response.data.success) {
        setStep('success');
        setTimeout(() => {
          onSuccess && onSuccess({ method: type, transactionId: response.data.transactionId });
        }, 2000);
      } else {
        setErrorMessage(response.data.message || 'Pagamento recusado. Tente novamente.');
        setStep('error');
      }
    } catch (error) {
      setErrorMessage('Erro ao comunicar com a maquininha. Tente novamente.');
      setStep('error');
    }
  };

  const formatTotal = (value) => `R$ ${Number(value).toFixed(2).replace('.', ',')}`;

  if (step === 'processing') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <TotemHeader title="Pagamento com Cartão" primaryColor={primaryColor} />
        <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
          <Loader2 className="w-20 h-20 animate-spin" style={{ color: primaryColor }} />
          <h2 className="text-2xl font-bold text-gray-900 text-center">Aguardando maquininha...</h2>
          <p className="text-gray-500 text-center text-lg">
            Insira ou aproxime o cartão na maquininha.
          </p>
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
              onClick={() => setStep('select')}
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