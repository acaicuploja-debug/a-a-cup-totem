import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  // Webhooks do Mercado Pago não têm autenticação de usuário
  // Criar cliente apenas com service role
  const base44 = createClientFromRequest(req);
  
  try {
    console.log('========== WEBHOOK INICIADO ==========');
    console.log('🔔 Requisição recebida:', {
      method: req.method,
      url: req.url,
      timestamp: new Date().toISOString(),
      headers: Object.fromEntries(req.headers.entries())
    });
    
    // Mercado Pago sends notifications via query params or body
    const url = new URL(req.url);
    let topic = url.searchParams.get('topic') || url.searchParams.get('type');
    let id = url.searchParams.get('id') || url.searchParams.get('data.id');
    
    // Se não veio por query params, tenta ler do body
    if (!topic || !id) {
      try {
        const body = await req.json();
        topic = topic || body.topic || body.type;
        id = id || body.id || body.data?.id;
        console.log('📦 Body recebido:', body);
      } catch (e) {
        console.log('⚠️ Não foi possível ler body:', e.message);
      }
    }
    
    console.log('📋 Parâmetros extraídos:', { 
      topic, 
      id, 
      allParams: Object.fromEntries(url.searchParams.entries())
    });
    
    console.log('🔍 Verificando topic:', topic);
    
    if (topic !== 'payment' && topic !== 'merchant_order') {
      console.log('⚠️ Topic ignorado:', topic);
      return Response.json({ status: 'ignored' });
    }
    
    console.log('✅ Topic válido:', topic);
    
    const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    if (!accessToken) {
      return Response.json({ error: 'Access token not configured' }, { status: 500 });
    }
    
    // Get payment details from Mercado Pago
    const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    const payment = await paymentResponse.json();
    console.log('💳 Payment details COMPLETO:', JSON.stringify(payment, null, 2));
    console.log('💳 Payment status:', payment.status);
    console.log('💳 External reference:', payment.external_reference);

    if (payment.status === 'approved') {
      console.log('✅ Status APPROVED - Processando...');
      const orderId = payment.external_reference;
      
      if (!orderId) {
        console.log('❌ No order ID in external_reference');
        return Response.json({ status: 'no_order' });
      }
      
      console.log('🔍 Looking for order:', orderId);

      // Get order
      const orders = await base44.asServiceRole.entities.Order.filter({ id: orderId });
      console.log('📦 Orders encontrados:', orders.length);
      const order = orders[0];

      if (!order) {
        console.log('❌ Order not found:', orderId);
        return Response.json({ status: 'order_not_found' });
      }

      console.log('✅ Order encontrado:', { 
        id: order.id, 
        status: order.status, 
        order_number: order.order_number 
      });
      
      // Update order status to em_preparo (payment confirmed)
      console.log('🔄 Atualizando pedido para em_preparo...');
      const updateResult = await base44.asServiceRole.entities.Order.update(orderId, {
        status: 'em_preparo',
        payment_confirmed_at: new Date().toISOString()
      });

      console.log('✅ Order atualizado com sucesso!', updateResult);
      console.log('✅ Novo status:', updateResult.status);
      
      // Update customer loyalty if needed
      if (order.customer_id && !order.reward_redeemed) {
        const customers = await base44.asServiceRole.entities.Customer.filter({ id: order.customer_id });
        const customer = customers[0];
        
        if (customer) {
          const settings = (await base44.asServiceRole.entities.StoreSettings.list())[0];
          const currentCount = customer.loyalty_count || 0;
          const newCount = currentCount + 1;
          const loyaltyTarget = settings?.loyalty_target || 10;
          const hasPendingReward = newCount >= loyaltyTarget;
          
          await base44.asServiceRole.entities.Customer.update(customer.id, {
            loyalty_count: hasPendingReward ? loyaltyTarget : newCount,
            has_pending_reward: hasPendingReward,
            reward_available_date: hasPendingReward ? new Date().toISOString() : customer.reward_available_date
          });
          
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
          
          await base44.asServiceRole.entities.LoyaltyLog.create({
            customer_id: customer.id,
            customer_phone: customer.phone,
            order_id: orderId,
            action: hasPendingReward ? 'premio_disponivel' : 'pedido_contado',
            loyalty_count_before: currentCount,
            loyalty_count_after: newCount,
            datetime_brasilia: brasiliaTime
          });
        }
      }
      
      return Response.json({ status: 'processed' });
    }
    
    console.log('⚠️ Payment status not approved:', payment.status);
    return Response.json({ status: 'ok', payment_status: payment.status });
  } catch (error) {
    console.error('Webhook error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});