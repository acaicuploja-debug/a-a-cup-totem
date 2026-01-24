import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Mercado Pago envia notificações via POST
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const body = await req.json();
    console.log('📨 Webhook recebido:', JSON.stringify(body, null, 2));

    // Estrutura do webhook: { action: "payment.created", data: { id: "payment_intent_id" }, type: "payment_intent" }
    if (body.type !== 'payment_intent' || !body.data?.id) {
      console.log('⚠️ Webhook ignorado - tipo não é payment_intent');
      return Response.json({ received: true });
    }

    const paymentIntentId = body.data.id;
    const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');

    if (!accessToken) {
      console.error('❌ MERCADOPAGO_ACCESS_TOKEN não configurado');
      return Response.json({ error: 'Token não configurado' }, { status: 500 });
    }

    // Buscar detalhes do payment intent
    const intentResponse = await fetch(
      `https://api.mercadopago.com/point/integration-api/payment-intents/${paymentIntentId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!intentResponse.ok) {
      console.error('❌ Erro ao buscar payment intent:', await intentResponse.text());
      return Response.json({ error: 'Erro ao buscar dados' }, { status: 500 });
    }

    const intentData = await intentResponse.json();
    console.log('💳 Payment Intent:', JSON.stringify(intentData, null, 2));

    const externalReference = intentData.additional_info?.external_reference;
    
    if (!externalReference) {
      console.log('⚠️ Sem external_reference no payment intent');
      return Response.json({ received: true });
    }

    // Buscar pedido pelo ID
    const orders = await base44.asServiceRole.entities.Order.filter({ id: externalReference });
    
    if (orders.length === 0) {
      console.error('❌ Pedido não encontrado:', externalReference);
      return Response.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    const order = orders[0];
    console.log('📦 Pedido encontrado:', order.order_number, 'Status atual:', order.status);

    // Processar apenas se FINISHED e com pagamento aprovado
    if (intentData.state === 'FINISHED' && intentData.payment) {
      const paymentStatus = intentData.payment.status;

      if (paymentStatus === 'approved') {
        console.log('✅ Pagamento APROVADO! Atualizando pedido...');
        
        const now = new Date().toISOString();
        await base44.asServiceRole.entities.Order.update(order.id, {
          status: 'em_preparo',
          payment_confirmed_at: now
        });

        // Atualizar fidelidade do cliente (se não for resgate de prêmio)
        if (order.customer_id && !order.reward_redeemed) {
          const customers = await base44.asServiceRole.entities.Customer.filter({ id: order.customer_id });
          
          if (customers.length > 0) {
            const customer = customers[0];
            const settings = await base44.asServiceRole.entities.StoreSettings.list();
            const loyaltyTarget = settings[0]?.loyalty_target || 10;
            const newCount = (customer.loyalty_count || 0) + 1;
            
            await base44.asServiceRole.entities.Customer.update(customer.id, {
              loyalty_count: newCount,
              has_pending_reward: newCount >= loyaltyTarget,
              reward_available_date: newCount >= loyaltyTarget ? now : customer.reward_available_date
            });

            await base44.asServiceRole.entities.LoyaltyLog.create({
              customer_id: customer.id,
              customer_phone: customer.phone,
              order_id: order.id,
              action: newCount >= loyaltyTarget ? 'premio_disponivel' : 'pedido_contado',
              loyalty_count_before: customer.loyalty_count || 0,
              loyalty_count_after: newCount,
              datetime_brasilia: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
            });
          }
        }

        console.log('🎉 Pedido #' + order.order_number + ' confirmado com sucesso!');
        return Response.json({ success: true, message: 'Pagamento processado' });
      }

      console.log('⚠️ Pagamento com status:', paymentStatus);
    }

    // Se cancelado ou com erro
    if (intentData.state === 'CANCELED' || intentData.state === 'ERROR') {
      console.log('❌ Payment intent cancelado/erro');
      await base44.asServiceRole.entities.Order.update(order.id, {
        status: 'cancelado',
        cancellation_reason: 'Pagamento cancelado na Point'
      });
    }

    return Response.json({ received: true });

  } catch (error) {
    console.error('❌ Erro no webhook:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});