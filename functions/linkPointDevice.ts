import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN_POINT');
    if (!accessToken) {
      return Response.json({ 
        error: 'MERCADOPAGO_ACCESS_TOKEN_POINT não configurado' 
      }, { status: 500 });
    }

    // Buscar dispositivos Point vinculados à conta
    const response = await fetch('https://api.mercadopago.com/point/integration-api/devices', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.text();
      return Response.json({ 
        error: 'Erro ao buscar dispositivos',
        details: error
      }, { status: response.status });
    }

    const data = await response.json();
    
    // Pegar o primeiro dispositivo disponível
    if (data.devices && data.devices.length > 0) {
      const device = data.devices[0];
      
      // Salvar o device_id nas settings
      const settings = await base44.asServiceRole.entities.StoreSettings.list();
      if (settings.length > 0) {
        await base44.asServiceRole.entities.StoreSettings.update(settings[0].id, {
          mercadopago_device_id: device.id
        });
      }

      return Response.json({
        success: true,
        device_id: device.id,
        device_name: device.operating_mode || 'Point Smart'
      });
    }

    return Response.json({
      error: 'Nenhum dispositivo Point encontrado na conta'
    }, { status: 404 });

  } catch (error) {
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});