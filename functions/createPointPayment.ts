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

    // Buscar device ID vinculado nas configurações
    const settingsList = await base44.asServiceRole.entities.StoreSettings.list();
    const settings = settingsList[0];

    if (!settings?.mercadopago_device_id) {
      return Response.json({ 
        error: 'Point não vinculada',
        details: 'Vincule sua Point Smart primeiro nas Configurações'
      }, { status: 400 });
    }

    const deviceId = settings.mercadopago_device_id;

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

    // Atualizar pedido com payment intent ID
    await base44.asServiceRole.entities.Order.update(orderId, {
      status: 'aguardando_point',
      mercadopago_payment_id: intentData.id
    });

    return Response.json({ 
      success: true,
      paymentIntentId: intentData.id,
      deviceId: deviceId
    });

  } catch (error) {
    console.error('Erro completo:', error);
    return Response.json({ 
      error: error.message,
      details: error.stack || 'Erro interno ao processar pagamento'
    }, { status: 500 });
  }
});