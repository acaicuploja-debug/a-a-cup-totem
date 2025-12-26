import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');

    if (!accessToken) {
      return Response.json({ error: 'Mercado Pago não configurado' }, { status: 500 });
    }

    // Listar devices disponíveis
    const response = await fetch('https://api.mercadopago.com/point/integration-api/devices', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      return Response.json({ 
        error: 'Erro ao buscar devices',
        details: errorText
      }, { status: 400 });
    }

    const data = await response.json();
    
    if (!data.devices || data.devices.length === 0) {
      return Response.json({ 
        error: 'Nenhum device encontrado',
        details: 'Você precisa ter uma Point Smart cadastrada na sua conta do Mercado Pago primeiro'
      }, { status: 400 });
    }

    // Usar o primeiro device disponível
    const device = data.devices[0];

    // Salvar o device ID nas configurações
    const settingsList = await base44.asServiceRole.entities.StoreSettings.list();
    if (settingsList.length > 0) {
      await base44.asServiceRole.entities.StoreSettings.update(settingsList[0].id, {
        mercadopago_device_id: device.id
      });
    }

    return Response.json({ 
      success: true,
      device: device,
      message: 'Point Smart vinculada com sucesso!'
    });

  } catch (error) {
    console.error('Erro completo:', error);
    return Response.json({ 
      error: error.message,
      details: error.stack || 'Erro interno'
    }, { status: 500 });
  }
});