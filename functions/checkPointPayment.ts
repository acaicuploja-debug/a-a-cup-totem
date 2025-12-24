import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { orderId } = await req.json();

    if (!orderId) {
      return Response.json({ error: 'orderId é obrigatório' }, { status: 400 });
    }

    const order = await base44.asServiceRole.entities.Order.filter({ id: orderId });
    
    if (!order || order.length === 0) {
      return Response.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    const orderData = order[0];

    if (orderData.status === 'em_preparo' || orderData.status === 'pronto') {
      return Response.json({ 
        success: true, 
        status: 'paid',
        message: 'Pagamento já confirmado'
      });
    }

    if (!orderData.mercadopago_payment_id) {
      return Response.json({ 
        success: false, 
        status: 'pending',
        message: 'Aguardando pagamento'
      });
    }

    const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    
    if (!accessToken) {
      return Response.json({ error: 'Mercado Pago não configurado' }, { status: 500 });
    }

    // Buscar status do payment intent
    const response = await fetch(
      `https://api.mercadopago.com/point/integration-api/payment-intents/${orderData.mercadopago_payment_id}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      console.error('Erro ao buscar payment intent:', await response.text());
      return Response.json({ 
        success: false, 
        status: 'error',
        message: 'Erro ao verificar pagamento'
      });
    }

    const intentData = await response.json();

    if (intentData.state === 'FINISHED' && intentData.payment) {
      // Pagamento aprovado
      const now = new Date().toISOString();
      await base44.asServiceRole.entities.Order.update(orderId, {
        status: 'em_preparo',
        payment_confirmed_at: now
      });

      // Atualizar fidelidade do cliente
      if (orderData.customer_id && !orderData.reward_redeemed) {
        const customers = await base44.asServiceRole.entities.Customer.filter({ id: orderData.customer_id });
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
            order_id: orderId,
            action: newCount >= loyaltyTarget ? 'premio_disponivel' : 'pedido_contado',
            loyalty_count_before: customer.loyalty_count || 0,
            loyalty_count_after: newCount,
            datetime_brasilia: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
          });
        }
      }

      return Response.json({ 
        success: true, 
        status: 'paid',
        message: 'Pagamento confirmado!'
      });
    }

    if (intentData.state === 'CANCELED' || intentData.state === 'ERROR') {
      return Response.json({ 
        success: false, 
        status: 'canceled',
        message: 'Pagamento cancelado ou erro'
      });
    }

    return Response.json({ 
      success: false, 
      status: 'pending',
      message: 'Aguardando pagamento na Point...'
    });

  } catch (error) {
    console.error('Erro:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});