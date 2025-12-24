import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orderId } = await req.json();

    if (!orderId) {
      return Response.json({ error: 'orderId obrigatório' }, { status: 400 });
    }

    // Buscar pedido
    const orders = await base44.asServiceRole.entities.Order.filter({ id: orderId });
    if (orders.length === 0) {
      return Response.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    const order = orders[0];

    if (!order.customer_phone) {
      return Response.json({ error: 'Pedido sem telefone do cliente' }, { status: 400 });
    }

    // Buscar configurações para pegar link do Google
    const settings = await base44.asServiceRole.entities.StoreSettings.list();
    const googleReviewLink = settings[0]?.google_review_link || '';

    // Criar registro de feedback
    const feedback = await base44.asServiceRole.entities.Feedback.create({
      order_id: order.id,
      order_number: order.order_number,
      customer_phone: order.customer_phone,
      customer_name: order.customer_name,
      sentiment: 'pending',
      feedback_datetime: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    });

    // Criar conversa com o agente de feedback
    const conversation = await base44.asServiceRole.agents.createConversation({
      agent_name: 'feedback',
      metadata: {
        name: `Feedback - Pedido #${order.order_number}`,
        customer_phone: order.customer_phone,
        customer_name: order.customer_name,
        order_id: order.id,
        feedback_id: feedback.id,
        google_review_link: googleReviewLink
      }
    });

    // Atualizar feedback com conversation_id
    await base44.asServiceRole.entities.Feedback.update(feedback.id, {
      conversation_id: conversation.id
    });

    // Obter URL do WhatsApp
    const whatsappUrl = base44.agents.getWhatsAppConnectURL('feedback');

    return Response.json({ 
      success: true,
      feedbackId: feedback.id,
      conversationId: conversation.id,
      whatsappUrl: whatsappUrl,
      message: 'Solicitação de feedback criada. Cliente pode acessar via WhatsApp.'
    });

  } catch (error) {
    console.error('Erro ao enviar solicitação de feedback:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});