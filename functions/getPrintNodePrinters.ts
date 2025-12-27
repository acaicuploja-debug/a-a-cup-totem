import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiKey = Deno.env.get('PRINTNODE_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'PRINTNODE_API_KEY não configurado' }, { status: 500 });
    }

    const printersResponse = await fetch('https://api.printnode.com/printers', {
      headers: {
        'Authorization': `Basic ${btoa(apiKey + ':')}`
      }
    });

    if (!printersResponse.ok) {
      return Response.json({ 
        error: 'Erro ao buscar impressoras',
        details: await printersResponse.text()
      }, { status: 500 });
    }

    const printers = await printersResponse.json();
    
    return Response.json({ 
      success: true,
      printers: printers.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        state: p.state
      }))
    });

  } catch (error) {
    console.error('Erro:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});