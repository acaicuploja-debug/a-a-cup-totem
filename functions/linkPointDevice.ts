import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');

    if (!accessToken) {
      return Response.json({ error: 'Mercado Pago não configurado' }, { status: 500 });
    }

    // Criar um device (terminal) para vincular a Point
    const response = await fetch('https://api.mercadopago.com/point/integration-api/devices', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        operating_mode: 'PDV',
        external_pos_id: 'base44-totem-1'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro ao criar device:', errorText);
      return Response.json({ 
        error: 'Erro ao criar device',
        details: errorText
      }, { status: 400 });
    }

    const deviceData = await response.json();

    // Salvar o device ID nas configurações
    const settingsList = await base44.asServiceRole.entities.StoreSettings.list();
    if (settingsList.length > 0) {
      await base44.asServiceRole.entities.StoreSettings.update(settingsList[0].id, {
        mercadopago_device_id: deviceData.id
      });
    }

    return Response.json({ 
      success: true,
      device: deviceData
    });

  } catch (error) {
    console.error('Erro completo:', error);
    return Response.json({ 
      error: error.message,
      details: error.stack || 'Erro interno'
    }, { status: 500 });
  }
});