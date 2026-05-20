Deno.serve(async (req) => {
  try {
    const { payment_identifier } = await req.json();

    if (!payment_identifier) {
      return Response.json({ error: 'Missing payment_identifier' }, { status: 400 });
    }

    const jwtToken = Deno.env.get('SMARTTEF_JWT_TOKEN');
    const apiKey = Deno.env.get('SMARTTEF_API_KEY');

    if (!jwtToken || !apiKey) {
      return Response.json({ error: 'Missing Smart TEF configuration' }, { status: 500 });
    }

    const response = await fetch('https://api.smarttef.mobi/pooling/order/get', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Ocp-Apim-Subscription-Key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ payment_identifier })
    });

    console.log(`[POST] /pooling/order/get: ${response.status}`);

    if (!response.ok) {
      const errText = await response.text();
      console.error('Error:', errText);
      return Response.json({ status: 'pending' });
    }

    const data = await response.json();
    console.log('Response:', JSON.stringify(data).substring(0, 500));

    // A API retorna um array — pegar o primeiro item
    const order = Array.isArray(data) ? data[0] : data;
    const rawStatus = (order?.payment_status || '').toUpperCase();
    console.log('payment_status:', rawStatus, '| full order keys:', Object.keys(order || {}));
    console.log('order full:', JSON.stringify(order));

    // PROC_PAG = pagamento já autorizado pela adquirente (aguardando impressão no POS)
    // CNC = Concluído (após impressão)
    // Ambos indicam pagamento aprovado para o totem
    if (['CNC', 'PROC_PAG', 'APPROVED', 'PAID', 'CONFIRMED', 'AUTHORIZED'].includes(rawStatus)) {
      return Response.json({
        status: 'approved',
        transactionId: order.nsu_host || order.nsu_sitef,
        authorizationCode: order.autorization_code
      });
    } else if (['DENIED', 'CANCELLED', 'REJECTED', 'ERROR', 'REFUSED', 'CAN', 'REJ_PAG', 'CAN_ERP'].includes(rawStatus)) {
      return Response.json({ status: 'denied', message: 'Pagamento recusado pela maquininha.' });
    } else {
      return Response.json({ status: 'pending', rawStatus });
    }

  } catch (error) {
    console.error('Error checking Smart TEF payment:', error);
    return Response.json({ status: 'pending' });
  }
});