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

    const response = await fetch('https://api.smarttef.mobi/commands/order/list', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Ocp-Apim-Subscription-Key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        datetimeInitial,
        datetimeFinal
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Smart TEF polling error:', errorText);
      return Response.json({ status: 'pending' });
    }

    const data = await response.json();
    const orders = Array.isArray(data) ? data : (data.orders || data.data || []);

    // Buscar o card pelo charge_id
    const card = orders.find(o => o.charge_id === chargeId || o.chargeId === chargeId);

    if (!card) {
      return Response.json({ status: 'pending' });
    }

    // Status: APPROVED, DENIED, CANCELLED, PENDING
    const rawStatus = (card.status || card.transactionStatus || '').toUpperCase();

    if (rawStatus === 'APPROVED' || rawStatus === 'PAID' || rawStatus === 'CONFIRMED') {
      return Response.json({ 
        status: 'approved',
        transactionId: card.transactionId || card.id,
        authorizationCode: card.authorizationCode || card.authorization_code
      });
    } else if (rawStatus === 'DENIED' || rawStatus === 'CANCELLED' || rawStatus === 'REJECTED') {
      return Response.json({ status: 'denied', message: 'Pagamento recusado pela maquininha.' });
    } else {
      return Response.json({ status: 'pending' });
    }

  } catch (error) {
    console.error('Error checking Smart TEF payment:', error);
    return Response.json({ status: 'pending' });
  }
});