import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chargeId } = await req.json();

    if (!chargeId) {
      return Response.json({ error: 'Missing chargeId' }, { status: 400 });
    }

    const jwtToken = Deno.env.get('SMARTTEF_JWT_TOKEN');
    const apiKey = Deno.env.get('SMARTTEF_API_KEY');

    if (!jwtToken || !apiKey) {
      return Response.json({ error: 'Missing Smart TEF configuration' }, { status: 500 });
    }

    // Pooling - consulta cards do dia atual
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const datetimeInitial = `${dateStr} 00:00:00`;
    const datetimeFinal = `${dateStr} 23:59:59`;

    // Testar variações para consultar ordem específica pelo chargeId
    const getEndpoints = [
      { method: 'GET',  url: `https://api.smarttef.mobi/commands/order/${chargeId}` },
      { method: 'GET',  url: `https://api.smarttef.mobi/commands/order/charge/${chargeId}` },
      { method: 'POST', url: `https://api.smarttef.mobi/commands/order/status`, body: JSON.stringify({ charge_id: chargeId }) },
      { method: 'POST', url: `https://api.smarttef.mobi/commands/order/get`,    body: JSON.stringify({ charge_id: chargeId }) },
      { method: 'POST', url: `https://api.smarttef.mobi/commands/pooling`,       body: JSON.stringify({ datetimeInitial, datetimeFinal }) },
    ];

    let card = null;
    let rawStatus = '';

    for (const ep of getEndpoints) {
      const fetchOpts = {
        method: ep.method,
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
          'Ocp-Apim-Subscription-Key': apiKey,
          'Content-Type': 'application/json'
        }
      };
      if (ep.body) fetchOpts.body = ep.body;

      const response = await fetch(ep.url, fetchOpts);
      console.log(`[${ep.method}] ${ep.url}: ${response.status}`);

      if (response.ok) {
        const data = await response.json();
        console.log('Response data:', JSON.stringify(data).substring(0, 500));

        // Pode ser um objeto direto (ordem única) ou array
        const orders = Array.isArray(data) ? data : (data.orders || data.data || [data]);
        card = orders.find(o => 
          o.charge_id === chargeId || o.chargeId === chargeId || 
          o.id === chargeId || String(o.orderId) === chargeId
        );

        if (card) {
          rawStatus = (card.status || card.transactionStatus || card.payment_status || '').toUpperCase();
          console.log('Found card, status:', rawStatus);
          break;
        } else {
          console.log('Endpoint ok but card not found. Total items:', orders.length, 'Sample:', JSON.stringify(orders[0] || {}).substring(0, 200));
        }
      } else {
        const errText = await response.text();
        console.error(`Error [${ep.url}]:`, errText);
      }
    }

    if (!card) {
      return Response.json({ status: 'pending' });
    }

    if (rawStatus === 'APPROVED' || rawStatus === 'PAID' || rawStatus === 'CONFIRMED' || rawStatus === 'AUTHORIZED') {
      return Response.json({ 
        status: 'approved',
        transactionId: card.transactionId || card.id,
        authorizationCode: card.authorizationCode || card.authorization_code
      });
    } else if (rawStatus === 'DENIED' || rawStatus === 'CANCELLED' || rawStatus === 'REJECTED' || rawStatus === 'ERROR') {
      return Response.json({ status: 'denied', message: 'Pagamento recusado pela maquininha.' });
    } else {
      return Response.json({ status: 'pending', rawStatus });
    }

  } catch (error) {
    console.error('Error checking Smart TEF payment:', error);
    return Response.json({ status: 'pending' });
  }
});