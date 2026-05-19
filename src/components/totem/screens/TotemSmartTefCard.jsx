import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CreditCard, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function TotemSmartTefCard({ 
  total, 
  orderId, 
  customerId,
  onSuccess, 
  onCancel,
  primaryColor 
}) {
  const [loading, setLoading] = useState(false);
  const [cardData, setCardData] = useState({
    cardNumber: '',
    cardHolder: '',
    expiryDate: '',
    cvv: ''
  });
  const [paymentStatus, setPaymentStatus] = useState(null);

  const handleCardNumberChange = (e) => {
    let value = e.target.value.replace(/\s/g, '').replace(/[^\d]/g, '');
    if (value.length > 19) value = value.slice(0, 19);
    const formatted = value.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardData({ ...cardData, cardNumber: formatted });
  };

  const handleExpiryChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 4) value = value.slice(0, 4);
    if (value.length >= 2) {
      value = value.slice(0, 2) + '/' + value.slice(2);
    }
    setCardData({ ...cardData, expiryDate: value });
  };

  const handleCVVChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    setCardData({ ...cardData, cvv: value });
  };

  const validateCardData = () => {
    const cardNum = cardData.cardNumber.replace(/\s/g, '');
    if (cardNum.length < 13 || cardNum.length > 19) {
      toast.error('Número de cartão inválido');
      return false;
    }
    if (!cardData.cardHolder.trim()) {
      toast.error('Nome do titular obrigatório');
      return false;
    }
    if (!cardData.expiryDate || cardData.expiryDate.length !== 5) {
      toast.error('Data de vencimento inválida (MM/YY)');
      return false;
    }
    if (cardData.cvv.length < 3 || cardData.cvv.length > 4) {
      toast.error('CVV inválido');
      return false;
    }
    return true;
  };

  const handlePayment = async () => {
    if (!validateCardData()) return;

    setLoading(true);
    setPaymentStatus({ type: 'processing', message: 'Processando pagamento...' });

    try {
      const response = await base44.functions.invoke('createSmartTefPayment', {
        amount: total,
        orderId: orderId,
        customerId: customerId,
        description: `Pedido ${orderId}`
      });

      if (response.data.success) {
        setPaymentStatus({ 
          type: 'success', 
          message: `Pagamento aprovado!\nCódigo: ${response.data.authorizationCode}` 
        });
        toast.success('Pagamento realizado com sucesso!');
        
        setTimeout(() => {
          if (onSuccess) {
            onSuccess({
              transactionId: response.data.transactionId,
              authorizationCode: response.data.authorizationCode,
              amount: total,
              method: 'smarttef_card'
            });
          }
        }, 2000);
      } else {
        setPaymentStatus({ 
          type: 'error', 
          message: response.data.message || 'Erro ao processar pagamento' 
        });
        toast.error('Erro na transação');
      }
    } catch (error) {
      console.error('Payment error:', error);
      setPaymentStatus({ 
        type: 'error', 
        message: 'Erro ao processar pagamento. Tente novamente.' 
      });
      toast.error('Erro ao processar pagamento');
    } finally {
      setLoading(false);
    }
  };

  if (paymentStatus) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6 text-center space-y-4">
          {paymentStatus.type === 'success' && (
            <>
              <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto" />
              <p className="font-semibold text-green-700 whitespace-pre-line">
                {paymentStatus.message}
              </p>
            </>
          )}
          {paymentStatus.type === 'error' && (
            <>
              <AlertCircle className="w-16 h-16 text-red-600 mx-auto" />
              <p className="font-semibold text-red-700">{paymentStatus.message}</p>
              <Button 
                onClick={() => setPaymentStatus(null)}
                style={{ backgroundColor: primaryColor }}
                className="w-full text-white"
              >
                Tentar Novamente
              </Button>
            </>
          )}
          {paymentStatus.type === 'processing' && (
            <>
              <Loader2 className="w-16 h-16 animate-spin mx-auto" style={{ color: primaryColor }} />
              <p className="font-semibold">{paymentStatus.message}</p>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Cartão de Crédito/Débito
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-sm">Número do Cartão</Label>
          <Input
            type="text"
            placeholder="0000 0000 0000 0000"
            value={cardData.cardNumber}
            onChange={handleCardNumberChange}
            disabled={loading}
            maxLength="23"
            className="mt-1 font-mono text-lg tracking-widest"
          />
        </div>

        <div>
          <Label className="text-sm">Nome do Titular</Label>
          <Input
            type="text"
            placeholder="NOME COMPLETO"
            value={cardData.cardHolder}
            onChange={(e) => setCardData({ ...cardData, cardHolder: e.target.value.toUpperCase() })}
            disabled={loading}
            className="mt-1"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm">Vencimento</Label>
            <Input
              type="text"
              placeholder="MM/YY"
              value={cardData.expiryDate}
              onChange={handleExpiryChange}
              disabled={loading}
              maxLength="5"
              className="mt-1 font-mono text-lg"
            />
          </div>
          <div>
            <Label className="text-sm">CVV</Label>
            <Input
              type="password"
              placeholder="000"
              value={cardData.cvv}
              onChange={handleCVVChange}
              disabled={loading}
              maxLength="4"
              className="mt-1 font-mono text-lg"
            />
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
          💳 Acionar máquina de cartão agora para inserir/passar o cartão.
        </div>

        <div className="pt-2 space-y-2">
          <Button
            onClick={handlePayment}
            disabled={loading}
            style={{ backgroundColor: primaryColor }}
            className="w-full text-white"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              `Confirmar R$ ${(total / 100).toFixed(2)}`
            )}
          </Button>
          <Button
            onClick={onCancel}
            variant="outline"
            disabled={loading}
            className="w-full"
          >
            Cancelar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}