import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { orderId, amount, description, paymentType = 'debito' } = await req.json();
    const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');

    if (!accessToken) {
      return Response.json({ error: 'Mercado Pago não configurado' }, { status: 500 });
    }

    // Criar intenção de pagamento na Point
    const paymentData = {
      amount: amount,
      description: description || `Pedido #${orderId}`,
      external_reference: orderId,
      payment_mode: paymentType === 'credito' ? 'credit' : 'debit'
    };

    // Crédito: forçar pagamento à vista (sem parcelamento)
    if (paymentType === 'credito') {
      paymentData.installments = 1;
      paymentData.installments_cost = 'buyer';
    }

    const response = await fetch('https://api.mercadopago.com/point/integration-api/devices', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('Erro ao buscar devices Point:', await response.text());
      return Response.json({ 
        error: 'Erro ao conectar com Point',
        details: 'Verifique se a Point está configurada na conta'
      }, { status: 400 });
    }

    const devices = await response.json();
    
    if (!devices.devices || devices.devices.length === 0) {
      return Response.json({ 
        error: 'Nenhuma Point encontrada',
        details: 'Configure sua Point Smart no app do Mercado Pago'
      }, { status: 400 });
    }

    // Usar o primeiro device disponível
    const deviceId = devices.devices[0].id;

    // Criar payment intent
    const intentResponse = await fetch(`https://api.mercadopago.com/point/integration-api/devices/${deviceId}/payment-intents`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `order-${orderId}-${Date.now()}`
      },
      body: JSON.stringify(paymentData)
    });

    if (!intentResponse.ok) {
      const errorText = await intentResponse.text();
      console.error('Erro ao criar payment intent:', errorText);
      return Response.json({ 
        error: 'Erro ao criar pagamento na Point',
        details: errorText
      }, { status: 400 });
    }

    const intentData = await intentResponse.json();

    // Atualizar pedido com payment intent ID usando service role direto
    const updateResponse = await fetch(`https://api.base44.com/v1/entities/Order/${orderId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('BASE44_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: 'aguardando_point',
        mercadopago_payment_id: intentData.id
      })
    });

    return Response.json({ 
      success: true,
      paymentIntentId: intentData.id,
      deviceId: deviceId
    });

  } catch (error) {
    console.error('Erro:', error);
    return Response.json({ 
      error: error.message,
      details: 'Erro interno ao processar pagamento'
    }, { status: 500 });
  }
});