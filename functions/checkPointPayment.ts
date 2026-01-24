import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { paymentIntentId, deviceId } = await req.json();

    if (!paymentIntentId || !deviceId) {
      return Response.json({ 
        error: 'paymentIntentId e deviceId são obrigatórios' 
      }, { status: 400 });
    }

    const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN_POINT');
    if (!accessToken) {
      return Response.json({ 
        error: 'MERCADOPAGO_ACCESS_TOKEN_POINT não configurado' 
      }, { status: 500 });
    }

    // Verificar status do pagamento no Point
    const response = await fetch(
      `https://api.mercadopago.com/point/integration-api/devices/${deviceId}/payment-intents/${paymentIntentId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return Response.json({ 
        error: 'Erro ao verificar pagamento',
        details: error
      }, { status: response.status });
    }

    const result = await response.json();

    return Response.json({
      success: true,
      status: result.state, // OPEN, PROCESSING, FINISHED, CANCELED, ERROR
      payment: result.payment
    });

  } catch (error) {
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});