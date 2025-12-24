import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { orderId, amount, description } = await req.json();
    
    const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    if (!accessToken) {
      return Response.json({ 
        error: 'Mercado Pago não configurado. Configure MERCADOPAGO_ACCESS_TOKEN nas variáveis de ambiente.' 
      }, { status: 400 });
    }
    
    // Create payment in Mercado Pago
    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        transaction_amount: amount,
        description: description,
        payment_method_id: 'pix',
        payer: {
          email: 'cliente@email.com'
        },
        notification_url: `${new URL(req.url).origin}/api/functions/mercadoPagoWebhook`,
        external_reference: orderId
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return Response.json({ error: 'Erro ao criar pagamento', details: data }, { status: 500 });
    }
    
    // Update order with payment info
    await base44.asServiceRole.entities.Order.update(orderId, {
      mercadopago_payment_id: data.id,
      status: 'aguardando_pix'
    });
    
    return Response.json({
      payment_id: data.id,
      qr_code: data.point_of_interaction?.transaction_data?.qr_code,
      qr_code_base64: data.point_of_interaction?.transaction_data?.qr_code_base64,
      ticket_url: data.point_of_interaction?.transaction_data?.ticket_url
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});