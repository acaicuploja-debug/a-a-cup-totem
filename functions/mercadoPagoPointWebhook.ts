import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    console.log('🔵 Point Webhook recebido:', JSON.stringify(body, null, 2));

    // Verificar se é notificação de payment intent
    if (body.type === 'payment_intent') {
      const paymentIntentId = body.data?.id;

      if (!paymentIntentId) {
        return Response.json({ received: true });
      }

      // Buscar pedido com esse payment_intent_id
      const orders = await base44.asServiceRole.entities.Order.filter({
        mercadopago_payment_intent_id: paymentIntentId
      });

      if (orders.length === 0) {
        console.log('⚠️ Pedido não encontrado para payment_intent:', paymentIntentId);
        return Response.json({ received: true });
      }

      const order = orders[0];

      // Se já foi confirmado, ignorar
      if (order.status === 'em_preparo' || order.status === 'pronto' || order.status === 'finalizado') {
        return Response.json({ received: true });
      }

      // Buscar detalhes do payment intent
      const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
      const settings = await base44.asServiceRole.entities.StoreSettings.list();
      const deviceId = settings[0]?.mercadopago_device_id;

      if (!deviceId || !accessToken) {
        return Response.json({ received: true });
      }

      const response = await fetch(
        `https://api.mercadopago.com/point/integration-api/devices/${deviceId}/payment-intents/${paymentIntentId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        return Response.json({ received: true });
      }

      const paymentIntent = await response.json();
      console.log('🔵 Payment Intent Status:', paymentIntent.state);

      // Se pagamento foi aprovado, confirmar pedido
      if (paymentIntent.state === 'FINISHED' && paymentIntent.payment?.status === 'approved') {
        await base44.asServiceRole.entities.Order.update(order.id, {
          status: 'em_preparo',
          payment_confirmed_at: new Date().toISOString(),
          mercadopago_payment_id: paymentIntent.payment.id
        });

        console.log('✅ Pedido confirmado automaticamente:', order.order_number);
      }
    }

    return Response.json({ received: true });

  } catch (error) {
    console.error('❌ Erro no webhook Point:', error);
    return Response.json({ received: true });
  }
});