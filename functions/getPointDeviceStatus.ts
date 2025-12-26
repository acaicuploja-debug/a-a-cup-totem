import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');

    if (!accessToken) {
      return Response.json({ error: 'Mercado Pago não configurado' }, { status: 500 });
    }

    // Buscar device ID salvo nas configurações
    const settingsList = await base44.asServiceRole.entities.StoreSettings.list();
    const settings = settingsList[0];
    
    if (!settings?.mercadopago_device_id) {
      return Response.json({ 
        linked: false,
        message: 'Nenhum device vinculado'
      });
    }

    // Verificar status do device
    const response = await fetch(`https://api.mercadopago.com/point/integration-api/devices/${settings.mercadopago_device_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      return Response.json({ 
        linked: false,
        message: 'Device não encontrado ou desvinculado'
      });
    }

    const deviceData = await response.json();

    return Response.json({ 
      linked: true,
      device: deviceData
    });

  } catch (error) {
    console.error('Erro:', error);
    return Response.json({ 
      error: error.message
    }, { status: 500 });
  }
});