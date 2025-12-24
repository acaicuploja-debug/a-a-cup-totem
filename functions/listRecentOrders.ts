import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get recent orders
    const orders = await base44.asServiceRole.entities.Order.list('-created_date', 10);
    
    return Response.json({ 
      orders: orders.map(order => ({
        id: order.id,
        order_number: order.order_number,
        customer_phone: order.customer_phone,
        total: order.total,
        status: order.status,
        payment_method: order.payment_method,
        mercadopago_payment_id: order.mercadopago_payment_id,
        created_date: order.created_date,
        order_datetime: order.order_datetime
      }))
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});