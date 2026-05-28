import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orderId, printerName } = await req.json();

    if (!orderId) {
      return Response.json({ error: 'orderId é obrigatório' }, { status: 400 });
    }

    const apiKey = Deno.env.get('PRINTNODE_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'PRINTNODE_API_KEY não configurado' }, { status: 500 });
    }

    // Buscar pedido
    const order = await base44.asServiceRole.entities.Order.filter({ id: orderId });
    if (!order || order.length === 0) {
      return Response.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    const orderData = order[0];

    // Buscar configurações
    const settingsList = await base44.asServiceRole.entities.StoreSettings.list();
    const settings = settingsList[0];

    // Buscar clientes para fidelidade
    const customers = await base44.asServiceRole.entities.Customer.list();
    const customerInfo = customers.find(c => c.phone === orderData.customer_phone);
    
    const allOrders = await base44.asServiceRole.entities.Order.list();
    const customerOrders = allOrders.filter(o => 
      o.customer_phone === orderData.customer_phone && 
      o.status !== 'cancelado'
    ).length || 0;

    const loyaltyTarget = settings?.loyalty_target || 10;
    let loyaltyText = '';
    if (orderData.reward_redeemed) {
      loyaltyText = '🎁 PREMIO RESGATADO NESTE PEDIDO!';
    } else if (customerInfo) {
      const remaining = loyaltyTarget - (customerInfo.loyalty_count || 0);
      loyaltyText = remaining <= 0 
        ? `🎁 Voce tem um premio disponivel!`
        : `Faltam ${remaining} pedido(s) para ganhar premio!`;
    }

    // Gerar HTML da notinha
    const printHTML = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
body { font-family: Arial, sans-serif; font-size: 14px; max-width: 300px; margin: 0 auto; }
.center { text-align: center; }
.bold { font-weight: bold; }
.line { border-top: 1px dashed #000; margin: 10px 0; }
</style>
</head>
<body>
<div class="center bold">${settings?.store_name || 'Loja'}</div>
<div class="center bold">PEDIDO #${String(orderData.order_number || '').padStart(3, '0')}</div>
<div class="center">${orderData.order_datetime || new Date().toLocaleString('pt-BR')}</div>
<div class="line"></div>

<div><strong>Cliente:</strong> ${orderData.customer_name || 'N/A'}</div>
<div>${orderData.customer_phone || ''}</div>
<div>Total de pedidos: ${customerOrders}</div>

<div class="center bold" style="margin: 10px 0;">${orderData.consumption_type === 'local' ? 'COMER NO LOCAL' : 'EMBALAR P/ VIAGEM'}</div>

<div class="line"></div>
<div class="bold">Itens:</div>
${orderData.items?.map(item => `
<div style="margin: 5px 0;">
  <div>${item.weight ? `${item.product_name} ${item.weight.toFixed(3)}kg` : `${item.quantity}x ${item.product_name}`}</div>
  <div style="text-align: right;">R$ ${item.total.toFixed(2)}</div>
  ${item.complements?.length > 0 ? item.complements.map(c => `<div style="margin-left: 20px; ${c.qty > 1 ? 'font-weight: bold;' : ''}">+ ${c.qty > 1 ? `<span style="background:#fff3cd; padding:0 3px; border-radius:3px;">&#9733; ${c.qty}x</span> ` : ''}${c.name}${c.price > 0 ? ` (R$ ${(c.price * (c.qty || 1)).toFixed(2)})` : ''}${c.qty > 1 ? ' <span style="color:#c00; font-weight:bold;">&#x25C4; MULT.</span>' : ''}</div>`).join('') : ''}
</div>
`).join('') || ''}

<div class="line"></div>
<div class="center bold" style="font-size: 16px;">TOTAL: R$ ${orderData.total.toFixed(2)}</div>
<div class="line"></div>

<div><strong>Pagamento:</strong> ${
orderData.payment_method === 'pix' && orderData.mercadopago_payment_id ? 'Pix Online - Pago' :
orderData.payment_method === 'pix' ? 'PIX' :
orderData.payment_method === 'debito' ? 'Cartão de Débito - Pago' :
orderData.payment_method === 'credito' ? 'Cartão de Crédito - Pago' :
orderData.payment_method === 'cartao' ? 'Cartão - Pago' :
orderData.payment_method === 'dinheiro' ? 'Dinheiro' : 'Cartão'
}</div>

${loyaltyText ? `<div class="center bold" style="margin: 10px 0;">${loyaltyText}</div>` : ''}

<div class="line"></div>
<div class="center">Obrigado pela preferencia!</div>
</body>
</html>
`;

    // Buscar impressoras do PrintNode
    const printersResponse = await fetch('https://api.printnode.com/printers', {
      headers: {
        'Authorization': `Basic ${btoa(apiKey + ':')}`
      }
    });

    if (!printersResponse.ok) {
      return Response.json({ 
        error: 'Erro ao buscar impressoras do PrintNode',
        details: await printersResponse.text()
      }, { status: 500 });
    }

    const printers = await printersResponse.json();
    
    if (!printers || printers.length === 0) {
      return Response.json({ 
        error: 'Nenhuma impressora encontrada no PrintNode. Instale o cliente: https://www.printnode.com/en/download'
      }, { status: 404 });
    }

    // Selecionar impressora (usar a configurada ou a primeira)
    let printer;
    if (printerName) {
      printer = printers.find(p => p.name === printerName);
    }
    if (!printer && settings?.default_printer) {
      printer = printers.find(p => p.name === settings.default_printer);
    }
    if (!printer) {
      printer = printers[0];
    }

    // Gerar conteúdo texto puro para impressora térmica
    let printContent = '\x1B\x40'; // ESC @ - Inicializar impressora

    printContent += `
    ================================
    ${settings?.store_name || 'Loja'}
    PEDIDO #${String(orderData.order_number || '').padStart(3, '0')}
    ================================

    ${orderData.order_datetime || new Date().toLocaleString('pt-BR')}

    Cliente: ${orderData.customer_name || 'N/A'}
    ${orderData.customer_phone || ''}
    Total de pedidos: ${customerOrders}

    ${orderData.consumption_type === 'local' ? 'COMER NO LOCAL' : 'EMBALAR P/ VIAGEM'}

    --------------------------------
    ITENS:
    ${orderData.items?.map(item => {
    let line = item.weight 
    ? `${item.product_name} ${item.weight.toFixed(3)}kg` 
    : `${item.quantity}x ${item.product_name}`;
    line += `\n         R$ ${item.total.toFixed(2)}`;
    if (item.complements?.length > 0) {
    line += '\n' + item.complements.map(c => `         + ${c.qty > 1 ? `[${c.qty}x] *** ` : ''}${c.name}${c.price > 0 ? ` (R$ ${(c.price * (c.qty || 1)).toFixed(2)})` : ''}${c.qty > 1 ? ' ***' : ''}`).join('\n');
    }
    return line;
    }).join('\n') || ''}

    --------------------------------
    TOTAL: R$ ${orderData.total.toFixed(2)}
    --------------------------------

    Pagamento: ${
    orderData.payment_method === 'pix' && orderData.mercadopago_payment_id ? 'Pix Online - Pago' :
    orderData.payment_method === 'pix' ? 'PIX' :
    orderData.payment_method === 'debito' ? 'Cartao de Debito - Pago' :
    orderData.payment_method === 'credito' ? 'Cartao de Credito - Pago' :
    orderData.payment_method === 'cartao' ? 'Cartao - Pago' :
    orderData.payment_method === 'dinheiro' ? 'Dinheiro' : 'Cartao'
    }

    ${loyaltyText ? `\n${loyaltyText}\n` : ''}

    ================================
    Obrigado pela preferencia!
    ================================


    `;

    // Adicionar comandos de feed e corte
    printContent += '\n\n\n\n'; // 4 linhas em branco para garantir que tudo seja impresso
    printContent += '\x1D\x56\x41\x00'; // GS V A - Corte parcial

    // Enviar para impressão
    const printJob = {
      printerId: printer.id,
      title: `Pedido #${orderData.order_number}`,
      contentType: 'raw_base64',
      content: btoa(printContent),
      source: 'Açaí Cup POS'
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
      message: 'Impressão enviada com sucesso!'
    });

  } catch (error) {
    console.error('Erro:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});