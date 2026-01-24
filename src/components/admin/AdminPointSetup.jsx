import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, Check, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminPointSetup({ settings, primaryColor }) {
  const [linking, setLinking] = useState(false);
  const queryClient = useQueryClient();

  const handleLinkDevice = async () => {
    setLinking(true);
    try {
      const response = await base44.functions.invoke('linkPointDevice', {});
      
      if (response.data.success) {
        toast.success(`Point Smart vinculado: ${response.data.device_name}`);
        queryClient.invalidateQueries(['store-settings']);
      } else {
        toast.error(response.data.error || 'Erro ao vincular dispositivo');
      }
    } catch (error) {
      toast.error('Erro ao vincular Point: ' + error.message);
    }
    setLinking(false);
  };

  const isLinked = !!settings?.mercadopago_device_id;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Point Smart (Maquininha)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-800">
            <strong>Como funciona:</strong> Vincule seu Point Smart para que pagamentos com cartão 
            sejam processados automaticamente na maquininha. O pedido é confirmado assim que o pagamento for aprovado.
          </p>
        </div>

        {isLinked ? (
          <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
            <Check className="w-6 h-6 text-green-600" />
            <div className="flex-1">
              <p className="font-medium text-green-900">Point Smart Vinculado</p>
              <p className="text-sm text-green-700">Device ID: {settings.mercadopago_device_id}</p>
            </div>
            <Button
              onClick={handleLinkDevice}
              disabled={linking}
              variant="outline"
              size="sm"
            >
              {linking ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Revincular'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div className="flex-1 text-sm text-amber-800">
                <p className="font-medium mb-1">Dispositivo não vinculado</p>
                <p>Certifique-se de que:</p>
                <ul className="list-disc ml-4 mt-1 space-y-1">
                  <li>Você tem um Point Smart na sua conta Mercado Pago</li>
                  <li>O Access Token está configurado corretamente</li>
                  <li>O dispositivo está ligado e conectado</li>
                </ul>
              </div>
            </div>

            <Button
              onClick={handleLinkDevice}
              disabled={linking}
              className="w-full"
              style={{ backgroundColor: primaryColor }}
            >
              {linking ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Buscando dispositivo...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Vincular Point Smart
                </>
              )}
            </Button>
          </div>
        )}

        <div className="border-t pt-4">
          <h4 className="font-medium text-gray-900 mb-2">📋 Configuração do Webhook</h4>
          <p className="text-sm text-gray-600 mb-2">
            Configure este webhook no Mercado Pago para confirmação automática:
          </p>
          <div className="bg-gray-900 text-green-400 p-3 rounded-lg font-mono text-xs break-all">
            {window.location.origin}/api/functions/mercadoPagoPointWebhook
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Em: Mercado Pago → Seu negócio → Configurações → Webhooks → payment_intent.status.updated
          </p>
        </div>
      </CardContent>
    </Card>
  );
}