Deno.serve(async (req) => {
  try {
    const { amount, orderId, paymentType, description, customerName, customerCpf } = await req.json();

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
      value: amount,
      payment_type: transactionType,
      installments: 1,
      charge_id: orderId.toString(),
      order_type: 'NRM',
      extras: {
        CPF: customerCpf || '',
        Nome: customerName || ''
      },
      has_details: false
    };

    const response = await fetch('https://api.smarttef.mobi/commands/order/create', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Ocp-Apim-Subscription-Key': apiKey,
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

    return Response.json({
      success: true,
      payment_identifier: data.payment_identifier,
      charge_id: data.charge_id,
      payment_status: data.payment_status,
      order_type: data.order_type
    });

  } catch (error) {
    console.error('Error creating Smart TEF payment:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});