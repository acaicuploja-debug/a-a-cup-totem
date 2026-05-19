import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    const rawStatus = (data.payment_status || '').toUpperCase();

    if (rawStatus === 'APPROVED' || rawStatus === 'PAID' || rawStatus === 'CONFIRMED' || rawStatus === 'AUTHORIZED') {
      return Response.json({
        status: 'approved',
        transactionId: data.nsu_host || data.nsu_sitef,
        authorizationCode: data.autorization_code
      });
    } else if (rawStatus === 'DENIED' || rawStatus === 'CANCELLED' || rawStatus === 'REJECTED' || rawStatus === 'ERROR' || rawStatus === 'REFUSED') {
      return Response.json({ status: 'denied', message: 'Pagamento recusado pela maquininha.' });
    } else {
      return Response.json({ status: 'pending', rawStatus });
    }

  } catch (error) {
    console.error('Error checking Smart TEF payment:', error);
    return Response.json({ status: 'pending' });
  }
});