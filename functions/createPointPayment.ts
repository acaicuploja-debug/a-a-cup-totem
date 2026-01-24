import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { orderId, paymentType } = await req.json();

    console.log('🔵 createPointPayment recebido:', { orderId, paymentType });

    if (!orderId || !paymentType) {
      return Response.json({ 
        error: 'orderId e paymentType são obrigatórios' 
      }, { status: 400 });
    }

    const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN_POINT');
    console.log('🔵 Access Token Point:', accessToken ? 'OK' : 'NÃO CONFIGURADO');
    
    if (!accessToken) {
      return Response.json({ 
        error: 'MERCADOPAGO_ACCESS_TOKEN_POINT não configurado' 
      }, { status: 500 });
    }

    // Buscar o pedido
    const order = await base44.entities.Order.get(orderId);
    console.log('🔵 Pedido encontrado:', order);
    
    if (!order) {
      return Response.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    // Buscar settings para pegar device_id
    const settings = await base44.entities.StoreSettings.list();
    const deviceId = settings[0]?.mercadopago_device_id;
    
    console.log('🔵 Device ID:', deviceId);

    if (!deviceId) {
      return Response.json({ 
        error: 'Device Point não vinculado' 
      }, { status: 400 });
    }

    // Criar intenção de pagamento no Point
    const paymentData = {
      amount: Math.round(order.total * 100), // Centavos
      description: `Pedido #${order.order_number}`,
      payment: {
        installments: 1,
        type: paymentType === 'debito' ? 'debit_card' : 'credit_card'
      }
    };

    console.log('🔵 Dados do pagamento:', paymentData);
    console.log('🔵 URL:', `https://api.mercadopago.com/point/integration-api/devices/${deviceId}/payment-intents`);

    const response = await fetch(
      `https://api.mercadopago.com/point/integration-api/devices/${deviceId}/payment-intents`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(paymentData)
      }
    );

    console.log('🔵 Status da resposta:', response.status);

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Erro da API Mercado Pago:', error);
      return Response.json({ 
        error: 'Erro ao criar pagamento no Point',
        details: error,
        status: response.status
      }, { status: response.status });
    }

    const result = await response.json();

    // Atualizar pedido com payment_intent_id
    await base44.entities.Order.update(orderId, {
      status: 'aguardando_point',
      mercadopago_payment_intent_id: result.id
    });

    return Response.json({
      success: true,
      payment_intent_id: result.id,
      device_id: deviceId
    });

  } catch (error) {
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});