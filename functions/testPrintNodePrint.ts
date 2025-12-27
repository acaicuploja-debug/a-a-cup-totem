import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { printerName } = await req.json();

    const apiKey = Deno.env.get('PRINTNODE_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'PRINTNODE_API_KEY não configurado' }, { status: 500 });
    }

    // Buscar impressoras
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
    
    if (!printers || printers.length === 0) {
      return Response.json({ 
        error: 'Nenhuma impressora encontrada. Instale o PrintNode no seu computador.'
      }, { status: 404 });
    }

    // Selecionar impressora
    let printer;
    if (printerName) {
      printer = printers.find(p => p.name === printerName);
    }
    if (!printer) {
      printer = printers[0];
    }

    // Buscar configurações da loja
    const settingsList = await base44.asServiceRole.entities.StoreSettings.list();
    const settings = settingsList[0];

    const testContent = `
================================
TESTE DE IMPRESSAO
================================

Loja: ${settings?.store_name || 'Minha Loja'}
Data: ${new Date().toLocaleString('pt-BR', {timeZone: 'America/Sao_Paulo'})}

Esta e uma impressao de teste!

Se voce consegue ler isso,
sua impressora esta funcionando
corretamente.

================================
Impressora: ${printer.name}
================================
`;

    // Enviar para impressão
    const printJob = {
      printerId: printer.id,
      title: 'Teste de Impressão',
      contentType: 'raw_base64',
      content: btoa(testContent),
      source: 'Admin Settings Test'
    };

    const printResponse = await fetch('https://api.printnode.com/printjobs', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(apiKey + ':')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(printJob)
    });

    if (!printResponse.ok) {
      return Response.json({ 
        error: 'Erro ao enviar impressão',
        details: await printResponse.text()
      }, { status: 500 });
    }

    const result = await printResponse.json();

    return Response.json({ 
      success: true,
      printJobId: result,
      printer: printer.name,
      message: 'Teste de impressão enviado com sucesso!'
    });

  } catch (error) {
    console.error('Erro:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});