import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function PDVPixPayment({ 
  open, 
  onClose, 
  order, 
  settings, 
  primaryColor,
  onPaymentConfirmed 
}) {
  const [mercadoPagoData, setMercadoPagoData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState('pending'); // pending, confirmed, error, timeout
  const [checkingPayment, setCheckingPayment] = useState(false);

  useEffect(() => {
    if (!open || !order) return;

    const initPayment = async () => {
      setIsLoading(true);
      try {
        console.log('🔵 PDV - Criando pagamento Mercado Pago para pedido:', order.id);
        
        const response = await base44.functions.invoke('createMercadoPagoPayment', {
          orderId: order.id,
          amount: order.total,
          description: `Pedido #${String(order.order_number).padStart(3, '0')} - ${settings?.store_name || 'PDV'}`
        });

        console.log('🔵 PDV - Resposta Mercado Pago:', response.data);

        if (response.data.error) {
          console.error('❌ Erro do Mercado Pago:', response.data.error);
          setPaymentStatus('error');
          toast.error('Erro ao gerar PIX: ' + response.data.error);
          return;
        }

        console.log('✅ QR Code gerado com sucesso!');
        setMercadoPagoData(response.data);
        setIsLoading(false);

        // Iniciar verificação de pagamento
        startPaymentCheck(order.id);

        // Timeout de 5 minutos
        setTimeout(() => {
          if (paymentStatus === 'pending') {
            setPaymentStatus('timeout');
            toast.error('Tempo esgotado para pagamento');
          }
        }, 300000); // 5 minutos
      } catch (error) {
        console.error('❌ Erro ao criar pagamento:', error);
        setPaymentStatus('error');
        toast.error('Erro ao criar pagamento');
        setIsLoading(false);
      }
    };

    initPayment();
  }, [open, order]);

  const startPaymentCheck = (orderId) => {
    setCheckingPayment(true);
    
    const interval = setInterval(async () => {
      try {
        const response = await base44.functions.invoke('checkPaymentStatus', { orderId });

        if (response.data.confirmed) {
          clearInterval(interval);
          setPaymentStatus('confirmed');
          setCheckingPayment(false);
          toast.success('Pagamento confirmado!');

          setTimeout(() => {
            onPaymentConfirmed();
          }, 2000);
        }
      } catch (error) {
        console.error('Erro ao verificar pagamento:', error);
      }
    }, 3000); // Verificar a cada 3 segundos

    // Parar de verificar após 5 minutos
    setTimeout(() => {
      clearInterval(interval);
      setCheckingPayment(false);
    }, 300000);
  };

  const handleCopyCode = () => {
    if (mercadoPagoData?.qr_code) {
      navigator.clipboard.writeText(mercadoPagoData.qr_code);
      toast.success('Código PIX copiado!');
    }
  };

  if (paymentStatus === 'confirmed') {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <div className="text-center py-8">
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
              Pedido #{String(order?.order_number).padStart(3, '0')} pago com sucesso
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (paymentStatus === 'error' || paymentStatus === 'timeout') {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <div className="text-center py-8">
            <div className="w-24 h-24 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-16 h-16 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {paymentStatus === 'timeout' ? 'Tempo Esgotado' : 'Erro no Pagamento'}
            </h2>
            <p className="text-gray-600 mb-6">
              {paymentStatus === 'timeout' 
                ? 'O tempo para pagamento expirou' 
                : 'Não foi possível gerar o QR Code PIX'}
            </p>
            <Button onClick={onClose} className="w-full" style={{ backgroundColor: primaryColor }}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="w-16 h-16 animate-spin mx-auto mb-4" style={{ color: primaryColor }} />
            <p className="text-xl font-bold text-gray-900">Gerando PIX...</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Pagamento PIX
              </h2>
              <p className="text-gray-600">
                Escaneie o QR Code ou copie o código
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 border-2 border-gray-200">
              <img 
                src={`data:image/png;base64,${mercadoPagoData?.qr_code_base64}`}
                alt="QR Code PIX"
                className="w-full max-w-xs mx-auto"
              />
            </div>

            <div 
              className="text-center py-4 rounded-2xl"
              style={{ backgroundColor: `${primaryColor}15` }}
            >
              <p className="text-sm text-gray-500 mb-1">Total a pagar</p>
              <p className="text-3xl font-bold" style={{ color: primaryColor }}>
                R$ {order?.total?.toFixed(2)}
              </p>
              {checkingPayment && (
                <p className="text-sm text-gray-600 flex items-center justify-center gap-2 mt-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Aguardando pagamento...
                </p>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-sm text-gray-500 text-center">
                Ou copie o código PIX:
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={mercadoPagoData?.qr_code || ''}
                  readOnly
                  className="flex-1 px-4 py-3 bg-gray-50 rounded-xl text-xs font-mono border"
                />
                <Button
                  onClick={handleCopyCode}
                  style={{ backgroundColor: primaryColor }}
                >
                  Copiar
                </Button>
              </div>
            </div>

            <div className="text-center text-sm text-gray-500">
              ⏱️ Tempo limite: 5 minutos
            </div>

            <Button
              onClick={onClose}
              variant="outline"
              className="w-full"
            >
              Cancelar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}