import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { orderId } = await req.json();
    
    // Get order
    const orders = await base44.asServiceRole.entities.Order.filter({ id: orderId });
    const order = orders[0];
    
    if (!order) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }
    
    if (!order.mercadopago_payment_id) {
      return Response.json({ error: 'No Mercado Pago payment ID' }, { status: 400 });
    }
    
    const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    if (!accessToken) {
      return Response.json({ error: 'Access token not configured' }, { status: 500 });
    }
    
    // Check payment status in Mercado Pago
    const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${order.mercadopago_payment_id}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    const payment = await paymentResponse.json();
    
    // If approved, update order
    if (payment.status === 'approved' && order.status === 'aguardando_pix') {
      await base44.asServiceRole.entities.Order.update(orderId, {
        status: 'em_preparo',
        payment_confirmed_at: new Date().toISOString()
      });
      
      // Update loyalty
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
      
      return Response.json({ 
        success: true, 
        message: 'Payment confirmed and order updated',
        payment_status: payment.status,
        order_status: 'em_preparo'
      });
    }
    
    return Response.json({ 
      success: false,
      payment_status: payment.status,
      order_status: order.status,
      message: `Payment status: ${payment.status}, Order status: ${order.status}`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});