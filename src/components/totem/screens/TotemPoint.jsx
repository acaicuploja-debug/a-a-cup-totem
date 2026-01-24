import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { CreditCard, Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TotemHeader from '../TotemHeader';
import { useCart } from '../CartContext';
import { motion } from 'framer-motion';

export default function TotemPoint({ settings, primaryColor, onSuccess, onChangePayment }) {
  const [status, setStatus] = useState('processing'); // processing, success, error
  const [paymentIntentId, setPaymentIntentId] = useState(null);
  const [deviceId, setDeviceId] = useState(null);
  const { currentOrder } = useCart();

  useEffect(() => {
    if (!currentOrder?.id) return;

    const initiatePayment = async () => {
      try {
        const response = await base44.functions.invoke('createPointPayment', {
          orderId: currentOrder.id,
          paymentType: currentOrder.payment_method // 'debito' ou 'credito'
        });

        if (response.data.success) {
          setPaymentIntentId(response.data.payment_intent_id);
          setDeviceId(response.data.device_id);
        } else {
          setStatus('error');
        }
      } catch (error) {
        setStatus('error');
      }
    };

    initiatePayment();
  }, [currentOrder]);

  // Polling para verificar status
  useEffect(() => {
    if (!paymentIntentId || !deviceId) return;

    const interval = setInterval(async () => {
      try {
        const response = await base44.functions.invoke('checkPointPayment', {
          paymentIntentId,
          deviceId
        });

        if (response.data.success) {
          const state = response.data.status;

          if (state === 'FINISHED') {
            if (response.data.payment?.status === 'approved') {
              setStatus('success');
              clearInterval(interval);
              setTimeout(() => onSuccess(), 2000);
            } else {
              setStatus('error');
              clearInterval(interval);
            }
          } else if (state === 'CANCELED' || state === 'ERROR') {
            setStatus('error');
            clearInterval(interval);
          }
        }
      } catch (error) {
        console.error('Erro ao verificar pagamento:', error);
      }
    }, 3000); // Verificar a cada 3 segundos

    return () => clearInterval(interval);
  }, [paymentIntentId, deviceId]);

  return (
    <div className="min-h-screen bg-gray-50">
      <TotemHeader 
        title="Pagamento"
        primaryColor={primaryColor}
      />

      <main className="max-w-xl mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-xl p-8"
        >
          {status === 'processing' && (
            <div className="text-center space-y-6">
              <div className="w-24 h-24 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <CreditCard className="w-12 h-12 text-white animate-pulse" />
              </div>
              
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Passe o cartão na maquininha
                </h2>
                <p className="text-gray-600">
                  Aguardando pagamento...
                </p>
              </div>

              <div className="flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: primaryColor }} />
                <span className="text-sm text-gray-500">Processando</span>
              </div>

              <div className="pt-6 border-t">
                <div className="text-center mb-4">
                  <span className="text-sm text-gray-500">Total a pagar</span>
                  <p className="text-3xl font-bold" style={{ color: primaryColor }}>
                    R$ {currentOrder?.total?.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center space-y-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-24 h-24 mx-auto bg-green-500 rounded-full flex items-center justify-center"
              >
                <CheckCircle className="w-12 h-12 text-white" />
              </motion.div>
              
              <div>
                <h2 className="text-2xl font-bold text-green-600 mb-2">
                  Pagamento Aprovado!
                </h2>
                <p className="text-gray-600">
                  Seu pedido está sendo preparado
                </p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center space-y-6">
              <div className="w-24 h-24 mx-auto bg-red-500 rounded-full flex items-center justify-center">
                <XCircle className="w-12 h-12 text-white" />
              </div>
              
              <div>
                <h2 className="text-2xl font-bold text-red-600 mb-2">
                  Pagamento Não Autorizado
                </h2>
                <p className="text-gray-600">
                  Houve um problema com o pagamento
                </p>
              </div>

              <Button
                onClick={onChangePayment}
                className="w-full"
                style={{ backgroundColor: primaryColor }}
              >
                Tentar Outro Método
              </Button>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}