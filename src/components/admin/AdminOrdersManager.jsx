import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ChefHat, Package, CheckCircle, Printer, Eye, X, ShoppingCart } from 'lucide-react';
import AdminPDV from './AdminPDV';
import { toast } from 'sonner';
import PendingOrderNotification from './PendingOrderNotification';
import qz from 'qz-tray';

const statusConfig = {
  em_preparo: { label: 'Em Preparo', color: 'bg-purple-500', icon: ChefHat },
  pronto: { label: 'Pronto', color: 'bg-green-500', icon: Package },
  finalizado: { label: 'Finalizado', color: 'bg-gray-400', icon: CheckCircle }
};

export default function AdminOrdersManager({ settings, primaryColor }) {
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelDetails, setCancelDetails] = useState('');
  const previousPendingOrderIds = useRef(new Set());
  const isFirstLoad = useRef(true);
  const notificationIntervalRef = useRef(null);
  const previousPreparingOrderIds = useRef(new Set());
  const [qzConnected, setQzConnected] = useState(false);
  const [showPDV, setShowPDV] = useState(false);
  const queryClient = useQueryClient();

  const { data: allOrders, isLoading } = useQuery({
    queryKey: ['admin-orders-manager'],
    queryFn: async () => {
      const result = await base44.entities.Order.list('-created_date');
      return result;
    },
    refetchInterval: 5000,
    refetchIntervalInBackground: false
  });

  const { data: customers } = useQuery({
    queryKey: ['admin-customers'],
    queryFn: () => base44.entities.Customer.list()
  });

  // Initialize QZ Tray connection
  useEffect(() => {
    const connectQZ = async () => {
      try {
        if (!qz.websocket.isActive()) {
          await qz.websocket.connect();
          setQzConnected(true);
          toast.success('QZ Tray conectado! Impressão automática ativada.');
        }
      } catch (err) {
        console.log('QZ Tray não está rodando:', err);
        setQzConnected(false);
      }
    };
    
    connectQZ();
    
    return () => {
      try {
        if (qz.websocket.isActive()) {
          qz.websocket.disconnect();
        }
      } catch (err) {
        console.log('Erro ao desconectar QZ:', err);
      }
    };
  }, []);

  // Filter only today's orders (exclude aguardando_pix and cancelado)
  const todayOrders = React.useMemo(() => {
    if (!allOrders) return [];

    const now = new Date();
    const todayBrasilia = now.toLocaleDateString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    return allOrders.filter(order => {
      if (order.status === 'cancelado' || order.status === 'aguardando_pix' || order.status === 'aguardando_point') return false;
      
      // Extrair apenas a data (antes da vírgula ou espaço)
      const orderDate = order.order_datetime?.split(',')[0]?.trim();
      return orderDate === todayBrasilia;
    });
  }, [allOrders]);

  // Check for new pending orders and start notifications
  useEffect(() => {
    if (!allOrders) return;

    const currentPendingOrders = allOrders.filter(o => 
      o.status === 'aguardando_pix' || 
      o.status === 'pagamento_informado' ||
      (!o.status)
    );

    const currentPendingIds = new Set(currentPendingOrders.map(o => o.id));

    // Load seen orders from localStorage
    const seenOrdersKey = 'admin_seen_orders';
    const seenOrders = new Set(JSON.parse(localStorage.getItem(seenOrdersKey) || '[]'));

    // Detect truly NEW orders (not seen before)
    const newOrderIds = [...currentPendingIds].filter(id => 
      !previousPendingOrderIds.current.has(id) && !seenOrders.has(id)
    );

    if (newOrderIds.length > 0 && !isFirstLoad.current) {
      // Only notify for truly NEW orders (not on first load)
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }

      if ('Notification' in window && Notification.permission === 'granted') {
        const newOrders = currentPendingOrders.filter(o => newOrderIds.includes(o.id));
        new Notification('Novo Pedido!', {
          body: newOrders.length === 1 
            ? `Pedido #${newOrders[0].order_number} - R$ ${newOrders[0].total?.toFixed(2)}`
            : `${newOrders.length} novos pedidos aguardando`,
          icon: settings?.logo_url || '/favicon.ico',
          tag: 'new-order',
          requireInteraction: true
        });
      }
    }

    if (isFirstLoad.current) {
      isFirstLoad.current = false;
    }

    previousPendingOrderIds.current = currentPendingIds;
    setPendingOrders(currentPendingOrders);
  }, [allOrders, settings]);

  // Auto-print new orders in "em_preparo" status
  useEffect(() => {
    if (!allOrders || !settings) return;

    const currentPreparingOrders = allOrders.filter(o => o.status === 'em_preparo');
    const currentPreparingIds = new Set(currentPreparingOrders.map(o => o.id));

    // Detect NEW orders in em_preparo
    const newPreparingIds = [...currentPreparingIds].filter(id => !previousPreparingOrderIds.current.has(id));

    if (newPreparingIds.length > 0 && !isFirstLoad.current) {
      console.log(`🖨️ ${newPreparingIds.length} novo(s) pedido(s) detectado(s) - iniciando impressão automática`);
      
      // Auto-print each new order
      newPreparingIds.forEach(orderId => {
        const order = currentPreparingOrders.find(o => o.id === orderId);
        if (order) {
          console.log(`📄 Imprimindo pedido #${order.order_number}`);
          setTimeout(() => handlePrint(order, false), 500);
        }
      });
    }

    previousPreparingOrderIds.current = currentPreparingIds;
  }, [allOrders, settings]);



  const handleAcceptPendingOrders = () => {
    // Save accepted order IDs to localStorage to prevent future notifications
    const seenOrdersKey = 'admin_seen_orders';
    const seenOrders = new Set(JSON.parse(localStorage.getItem(seenOrdersKey) || '[]'));
    pendingOrders.forEach(order => seenOrders.add(order.id));
    localStorage.setItem(seenOrdersKey, JSON.stringify([...seenOrders]));

    // Update refs to prevent notifications
    previousPendingOrderIds.current = new Set(pendingOrders.map(o => o.id));
    setPendingOrders([]);
  };

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }) => {
      await base44.entities.Order.update(orderId, { status });
      return { orderId, status };
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-orders-manager']);
      toast.success('Status atualizado!');
    }
  });

  const handleStatusChange = async (order, newStatus) => {
    updateStatusMutation.mutate({ orderId: order.id, status: newStatus });

    // Se finalizou o pedido e tem telefone, enviar feedback request
    if (newStatus === 'finalizado' && order.customer_phone && settings?.whatsapp_number) {
      try {
        await base44.functions.invoke('sendFeedbackRequest', { orderId: order.id });
        toast.success('Pedido finalizado! Solicitação de feedback enviada ao cliente.');
      } catch (error) {
        console.error('Erro ao enviar feedback:', error);
      }
    }
  };

  const cancelOrderMutation = useMutation({
    mutationFn: async ({ orderId, reason, details }) => {
      const order = allOrders.find(o => o.id === orderId);
      
      await base44.entities.Order.update(orderId, { 
        status: 'cancelado',
        cancellation_reason: reason,
        cancellation_details: details
      });
      
      // Reverter fidelidade se necessário
      if (order?.customer_id && !order.reward_redeemed) {
        const customer = customers?.find(c => c.id === order.customer_id);
        if (customer) {
          const newCount = Math.max(0, (customer.loyalty_count || 0) - 1);
          await base44.entities.Customer.update(customer.id, {
            loyalty_count: newCount,
            has_pending_reward: newCount >= (settings?.loyalty_target || 10)
          });
        }
      }
      
      return { orderId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-orders-manager']);
      queryClient.invalidateQueries(['admin-customers']);
      toast.success('Pedido cancelado');
      setShowCancelDialog(false);
      setOrderToCancel(null);
      setCancelReason('');
      setCancelDetails('');
    }
  });

  const handleCancelOrder = (order) => {
    setOrderToCancel(order);
    setShowCancelDialog(true);
  };

  const confirmCancel = () => {
    if (!cancelReason) {
      toast.error('Selecione um motivo');
      return;
    }
    if (cancelReason === 'outro' && !cancelDetails.trim()) {
      toast.error('Descreva o motivo');
      return;
    }
    cancelOrderMutation.mutate({
      orderId: orderToCancel.id,
      reason: cancelReason,
      details: cancelDetails
    });
  };

  const handleFinalizeAll = async () => {
    const activeOrders = todayOrders.filter(o => 
      o.status !== 'finalizado' && o.status !== 'cancelado'
    );
    
    if (activeOrders.length === 0) {
      toast.info('Não há pedidos para finalizar');
      return;
    }
    
    setShowFinalizeDialog(true);
  };
  
  const confirmFinalizeAll = async () => {
    const activeOrders = todayOrders.filter(o => 
      o.status !== 'finalizado' && o.status !== 'cancelado'
    );
    
    try {
      await Promise.all(
        activeOrders.map(order => 
          base44.entities.Order.update(order.id, { status: 'finalizado' })
        )
      );
      queryClient.invalidateQueries(['admin-orders-manager']);
      toast.success(`${activeOrders.length} pedido(s) finalizado(s)!`);
      setShowFinalizeDialog(false);
    } catch (error) {
      toast.error('Erro ao finalizar pedidos');
    }
  };

  const handlePrint = async (order, showToast = true) => {
    try {
      // Tentar PrintNode primeiro
      const { data } = await base44.functions.invoke('printWithPrintNode', {
        orderId: order.id,
        printerName: settings?.default_printer
      });

      if (data.success) {
        console.log('✅ Impresso via PrintNode:', data.printer);
        if (showToast) toast.success('Pedido impresso!');
        return;
      }
    } catch (printNodeError) {
      console.log('⚠️ PrintNode falhou, tentando fallback:', printNodeError.message);
      
      // Fallback: Impressão do navegador
      const customerInfo = getCustomerInfo(order.customer_phone);
      const loyaltyTarget = settings?.loyalty_target || 10;
      const customerOrders = allOrders?.filter(o => 
        o.customer_phone === order.customer_phone && 
        o.status !== 'cancelado'
      ).length || 0;

      let loyaltyText = '';
      if (order.reward_redeemed) {
        loyaltyText = '🎁 PREMIO RESGATADO NESTE PEDIDO!';
      } else if (customerInfo) {
        const remaining = loyaltyTarget - (customerInfo.loyalty_count || 0);
        loyaltyText = remaining <= 0 
          ? `🎁 Voce tem um premio disponivel!`
          : `Faltam ${remaining} pedido(s) para ganhar premio!`;
      }

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
  <div class="center bold">PEDIDO #${String(order.order_number || '').padStart(3, '0')}</div>
  <div class="center">${order.order_datetime || new Date().toLocaleString('pt-BR')}</div>
  <div class="line"></div>

  <div><strong>Cliente:</strong> ${order.customer_name || 'N/A'}</div>
  <div>${order.customer_phone || ''}</div>
  <div>Total de pedidos: ${customerOrders}</div>

  <div class="center bold" style="margin: 10px 0;">${order.consumption_type === 'local' ? 'COMER NO LOCAL' : 'EMBALAR P/ VIAGEM'}</div>

  <div class="line"></div>
  <div class="bold">Itens:</div>
  ${order.items?.map(item => `
  <div style="margin: 5px 0;">
    <div>${item.weight ? `${item.product_name} ${item.weight.toFixed(3)}kg` : `${item.quantity}x ${item.product_name}`}</div>
    <div style="text-align: right;">R$ ${item.total.toFixed(2)}</div>
    ${item.complements?.length > 0 ? item.complements.map(c => `<div style="margin-left: 20px;">+ ${c.name}</div>`).join('') : ''}
  </div>
  `).join('') || ''}

  <div class="line"></div>
  <div class="center bold" style="font-size: 16px;">TOTAL: R$ ${order.total.toFixed(2)}</div>
  <div class="line"></div>

  <div><strong>Pagamento:</strong> ${
  order.payment_method === 'pix' && order.mercadopago_payment_id ? 'Pix Online - Pago' :
  order.payment_method === 'pix' ? 'PIX' :
  order.payment_method === 'cartao' ? 'Cartão' :
  order.payment_method === 'dinheiro' ? 'Dinheiro' : 'Cartão'
  }</div>

  ${loyaltyText ? `<div class="center bold" style="margin: 10px 0;">${loyaltyText}</div>` : ''}

  <div class="line"></div>
  <div class="center">Obrigado pela preferencia!</div>
  </body>
  </html>
  `;

      const printWindow = window.open('', '_blank');
      printWindow.document.write(printHTML);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
      console.log('✅ Impresso via navegador');
      if (showToast) toast.success('Abrindo impressão...');
    }
  };

const getCustomerInfo = (phone) => {
    if (!phone || !customers) return null;
    return customers.find(c => c.phone === phone);
  };

  const ordersByStatus = React.useMemo(() => {
    const groups = {
      em_preparo: [],
      pronto: [],
      finalizado: []
    };
    
    todayOrders.forEach(order => {
      // Pedidos sem status ou com pagamento_informado vão para em_preparo
      let status = order.status;
      if (!status || status === 'pagamento_informado') {
        status = 'em_preparo';
      }
      
      if (groups[status]) {
        groups[status].push(order);
      }
    });
    
    return groups;
  }, [todayOrders]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-10 h-10 border-4 border-gray-200 rounded-full"
          style={{ borderTopColor: primaryColor }}
        />
      </div>
    );
  }

  if (showPDV) {
    return <AdminPDV settings={settings} primaryColor={primaryColor} onClose={() => setShowPDV(false)} />;
  }

  return (
    <div className="space-y-6">
      {qzConnected && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <div className="text-green-600">✅</div>
          <div>
            <p className="font-medium text-green-900">QZ Tray conectado</p>
            <p className="text-sm text-green-700">
              Impressão automática silenciosa ativada!
            </p>
          </div>
        </div>
      )}
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestor de Pedidos</h1>
          <p className="text-gray-500 mt-1">
            Pedidos de hoje • {todayOrders.length} total
            {qzConnected && <span className="ml-2 text-green-600">• 🖨️ Impressão automática ativa</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setShowPDV(true)}
            style={{ backgroundColor: primaryColor }}
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            PDV - Loja
          </Button>
          <Button 
            variant="outline" 
            onClick={handleFinalizeAll}
            className="bg-green-50 hover:bg-green-100 text-green-700"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Finalizar Todos
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(ordersByStatus).map(([status, orders]) => {
          const config = statusConfig[status];
          const Icon = config.icon;
          
          return (
            <div key={status} className="flex flex-col">
              <div 
                className={`${config.color} text-white rounded-t-2xl p-4 flex items-center justify-between`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-6 h-6" />
                  <span className="font-bold text-lg">{config.label}</span>
                </div>
                <Badge variant="secondary" className="bg-white/20 text-white">
                  {orders.length}
                </Badge>
              </div>
              
              <div className="bg-gray-100 rounded-b-2xl p-4 min-h-[600px] space-y-3">
                {orders.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <Icon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Nenhum pedido</p>
                  </div>
                ) : (
                  orders.map(order => (
                    <div 
                      key={order.id} 
                      className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span 
                              className="font-bold text-xl"
                              style={{ color: primaryColor }}
                            >
                              #{String(order.order_number).padStart(3, '0')}
                            </span>
                            {order.reward_redeemed && (
                              <Badge className="bg-amber-100 text-amber-800 text-xs">
                                🎁
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm font-medium text-gray-900">
                            {order.customer_name || 'Cliente'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {order.order_datetime?.split(' ')[1] || new Date(order.created_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-xs text-gray-600 mb-3">
                        {order.items?.map(item => `${item.quantity}x ${item.product_name}`).join(', ')}
                      </div>
                      
                      <div 
                        className="text-lg font-bold mb-3"
                        style={{ color: primaryColor }}
                      >
                        R$ {order.total?.toFixed(2)}
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        {status === 'em_preparo' && (
                          <Button
                            onClick={() => handleStatusChange(order, 'pronto')}
                            className="flex-1 min-w-[120px] h-9 text-sm"
                            style={{ backgroundColor: statusConfig.pronto.color.replace('bg-', '#') }}
                          >
                            Marcar Pronto
                          </Button>
                        )}
                        
                        {status === 'pronto' && (
                          <Button
                            onClick={() => handleStatusChange(order, 'finalizado')}
                            className="flex-1 min-w-[120px] h-9 text-sm"
                            style={{ backgroundColor: statusConfig.finalizado.color.replace('bg-', '#') }}
                          >
                            Finalizar
                          </Button>
                        )}
                        
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 px-3 flex-shrink-0"
                          onClick={() => setSelectedOrder(order)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 px-3 flex-shrink-0"
                          onClick={() => handlePrint(order)}
                        >
                          <Printer className="w-4 h-4" />
                        </Button>
                        
                        {status !== 'finalizado' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 px-3 text-red-600 hover:bg-red-50 flex-shrink-0"
                            onClick={() => handleCancelOrder(order)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Pedido #{selectedOrder?.order_number?.toString().padStart(3, '0')}
            </DialogTitle>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Cliente</p>
                  <p className="font-medium">{selectedOrder.customer_name || 'Não informado'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Telefone</p>
                  <p className="font-medium">{selectedOrder.customer_phone || 'Não informado'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Data/Hora</p>
                  <p className="font-medium">{selectedOrder.order_datetime}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Consumo</p>
                  <p className="font-medium">
                    {selectedOrder.consumption_type === 'local' ? 'No Local' : 'Para Viagem'}
                  </p>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <h4 className="font-bold mb-3">Itens</h4>
                <div className="space-y-2">
                  {selectedOrder.items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between">
                      <div>
                        <span className="font-medium">{item.quantity}x {item.product_name}</span>
                        {item.complements?.length > 0 && (
                          <p className="text-sm text-gray-500">
                            + {item.complements.map(c => c.name).join(', ')}
                          </p>
                        )}
                      </div>
                      <span className="font-medium">R$ {item.total.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="border-t pt-4 flex justify-between">
                <span className="text-xl font-bold">Total</span>
                <span className="text-xl font-bold" style={{ color: primaryColor }}>
                  R$ {selectedOrder.total?.toFixed(2)}
                </span>
              </div>
              
              <Button 
                className="w-full"
                onClick={() => handlePrint(selectedOrder)}
              >
                <Printer className="w-4 h-4 mr-2" />
                Imprimir Notinha
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Finalize All Confirmation Dialog */}
      <Dialog open={showFinalizeDialog} onOpenChange={setShowFinalizeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalizar Todos os Pedidos</DialogTitle>
          </DialogHeader>
          <p className="text-gray-600">
            Você está prestes a finalizar {todayOrders.filter(o => o.status !== 'finalizado' && o.status !== 'cancelado').length} pedido(s). 
            Esta ação não pode ser desfeita. Deseja continuar?
          </p>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setShowFinalizeDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={confirmFinalizeAll}
              className="bg-green-600 hover:bg-green-700"
            >
              Sim, Finalizar Todos
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Cancel Order Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar Pedido</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-gray-600">
              Pedido #{orderToCancel?.order_number?.toString().padStart(3, '0')} - {orderToCancel?.customer_name}
            </p>
            
            <div className="space-y-3">
              <Label>Motivo do Cancelamento *</Label>
              <RadioGroup value={cancelReason} onValueChange={setCancelReason}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="desistiu" id="desistiu" />
                  <Label htmlFor="desistiu" className="font-normal cursor-pointer">
                    Cliente desistiu do pedido
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="sem_pagamento" id="sem_pagamento" />
                  <Label htmlFor="sem_pagamento" className="font-normal cursor-pointer">
                    Cliente não tinha condições de pagar
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="prazo" id="prazo" />
                  <Label htmlFor="prazo" className="font-normal cursor-pointer">
                    Cliente não aceitou o prazo de preparo
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="outro" id="outro" />
                  <Label htmlFor="outro" className="font-normal cursor-pointer">
                    Outro
                  </Label>
                </div>
              </RadioGroup>
              
              {cancelReason === 'outro' && (
                <Textarea
                  placeholder="Descreva o motivo..."
                  value={cancelDetails}
                  onChange={(e) => setCancelDetails(e.target.value)}
                  rows={3}
                />
              )}
            </div>
          </div>
          
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              Voltar
            </Button>
            <Button 
              onClick={confirmCancel}
              className="bg-red-600 hover:bg-red-700"
              disabled={cancelOrderMutation.isPending}
            >
              Confirmar Cancelamento
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}