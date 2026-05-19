import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount, orderId, paymentType, description } = await req.json();

    if (!amount || !orderId) {
      return Response.json({ error: 'Missing required fields: amount, orderId' }, { status: 400 });
    }

    const apiKey = Deno.env.get('SMARTTEF_API_KEY');
    const jwtToken = Deno.env.get('SMARTTEF_JWT_TOKEN');
    const terminalId = Deno.env.get('SMARTTEF_TERMINAL_ID');

    if (!apiKey || !jwtToken || !terminalId) {
      return Response.json({ error: 'Missing Smart TEF configuration' }, { status: 500 });
    }

    // Mapear tipo de pagamento para Smart TEF
    // debito = DEBIT, credito = CREDIT
    const transactionType = paymentType === 'debito' ? 'DEBIT' : 'CREDIT';

    const payload = {
      terminalId: terminalId,
      amount: Math.round(amount * 100), // Converter para centavos
      orderId: orderId.toString(),
      description: description || 'Pedido',
      transactionType: transactionType,
      installments: 1
    };

    const response = await fetch('https://app-web-04-smtef-api-prd.azurewebsites.net/api/v1/cards', {
      method: 'POST',
      headers: {
        'Cgp-Aqim-Subscription-Key': apiKey,
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Smart TEF API error:', errorText);
      return Response.json({ 
        success: false,
        message: `Erro na maquininha (${response.status})`,
        details: errorText 
      }, { status: 200 }); // Retornar 200 para o frontend tratar como recusa
    }

    const data = await response.json();

    // Após pagamento aprovado, atualizar pedido para em_preparo
    if (data.transactionId || data.authorizationCode) {
      await base44.asServiceRole.entities.Order.update(orderId, {
        status: 'em_preparo',
        payment_method: paymentType, // 'debito' ou 'credito'
        payment_confirmed_at: new Date().toISOString()
      });
    }

    return Response.json({
      success: true,
      transactionId: data.transactionId,
      authorizationCode: data.authorizationCode,
      responseCode: data.responseCode,
      message: data.message
    });

  } catch (error) {
    console.error('Error creating Smart TEF payment:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});