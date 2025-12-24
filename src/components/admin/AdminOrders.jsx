import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  ChefHat, 
  Package,
  Printer,
  Bell,
  RefreshCw,
  Calendar as CalendarIcon,
  X as CloseIcon
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const statusConfig = {
  em_preparo: { label: 'Em Preparo', color: 'bg-purple-100 text-purple-800', icon: ChefHat },
  pronto: { label: 'Pronto', color: 'bg-green-100 text-green-800', icon: Package },
  finalizado: { label: 'Finalizado', color: 'bg-gray-100 text-gray-800', icon: CheckCircle },
  cancelado: { label: 'Cancelado', color: 'bg-red-100 text-red-800', icon: XCircle }
};

export default function AdminOrders({ settings, primaryColor }) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);
  const [dateFilter, setDateFilter] = useState('all');
  const [customStartDate, setCustomStartDate] = useState(null);
  const [customEndDate, setCustomEndDate] = useState(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelDetails, setCancelDetails] = useState('');
  const previousOrderCount = useRef(0);
  const audioRef = useRef(null);
  const queryClient = useQueryClient();
  
  const { data: orders, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: async () => {
      console.log('🔵 AdminOrders: Buscando pedidos...');
      const result = await base44.entities.Order.list('-created_date');
      console.log('🔵 AdminOrders: Total de pedidos recebidos:', result?.length);
      console.log('🔵 AdminOrders: Pedidos:', result);
      return result;
    },
    refetchInterval: 3000
  });
  
  // Play sound on new order
  useEffect(() => {
    if (orders && orders.length > previousOrderCount.current) {
      if (previousOrderCount.current > 0) {
        playNotificationSound();
        toast.success('Novo pedido recebido!');
      }
      previousOrderCount.current = orders.length;
    }
  }, [orders?.length]);
  
  const playNotificationSound = () => {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.volume = 0.5;
    audio.play().catch(e => console.log('Audio play failed:', e));
  };
  
  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }) => {
      await base44.entities.Order.update(orderId, { status });
      return { orderId, status };
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-orders']);
      toast.success('Status atualizado!');
    }
  });
  
  const cancelOrderMutation = useMutation({
    mutationFn: async ({ orderId, reason, details }) => {
      const order = orders.find(o => o.id === orderId);
      
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
      queryClient.invalidateQueries(['admin-orders']);
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
  

  
  const getDateRange = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (dateFilter) {
      case 'all':
        return { start: null, end: null };
      case 'today':
        return { start: today, end: new Date(today.getTime() + 24 * 60 * 60 * 1000) };
      case 'yesterday':
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        return { start: yesterday, end: today };
      case 'last7':
        return { start: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000), end: new Date() };
      case 'last15':
        return { start: new Date(today.getTime() - 15 * 24 * 60 * 60 * 1000), end: new Date() };
      case 'last30':
        return { start: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000), end: new Date() };
      case 'custom':
        return { start: customStartDate, end: customEndDate };
      default:
        return { start: null, end: null };
    }
  };
  
  const filteredOrders = React.useMemo(() => {
    console.log('🟡 Filtrando pedidos...');
    console.log('🟡 Total de pedidos antes do filtro:', orders?.length);
    console.log('🟡 Status filter:', statusFilter);
    console.log('🟡 Date filter:', dateFilter);
    
    if (!orders) return [];
    const { start, end } = getDateRange();
    
    console.log('🟡 Date range:', { start, end });
    
    let filtered = orders;
    
    if (start && end) {
      console.log('🟡 Aplicando filtro de data...');
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.created_date);
        const passes = orderDate >= start && orderDate < end;
        if (!passes) {
          console.log('🟡 Pedido filtrado por data:', order.order_number, orderDate);
        }
        return passes;
      });
      console.log('🟡 Após filtro de data:', filtered.length);
    }
    
    if (statusFilter !== 'all') {
      console.log('🟡 Aplicando filtro de status...');
      filtered = filtered.filter(o => o.status === statusFilter);
      console.log('🟡 Após filtro de status:', filtered.length);
    }
    
    console.log('🟡 Total de pedidos após filtros:', filtered.length);
    return filtered;
  }, [orders, statusFilter, dateFilter, customStartDate, customEndDate]);
  
  const handlePrint = (order) => {
    const customerInfo = getCustomerInfo(order.customer_phone);
    const loyaltyTarget = settings?.loyalty_target || 10;
    const customerOrders = orders?.filter(o => 
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
    
    const printWindow = window.open('', '', 'width=300,height=600');
    printWindow.document.write(`
      <html>
        <head>
          <title>Pedido #${String(order.order_number || '').padStart(3, '0')}</title>
          <style>
            @page { margin: 0; size: 80mm auto; }
            @media print {
              * { margin: 0; padding: 0; }
              body { 
                margin: 0; 
                padding: 0; 
                font-family: Arial, Helvetica, sans-serif; 
                font-size: 16px;
                font-weight: bold;
                width: 80mm;
                max-width: 80mm;
              }
              .header { 
                text-align: center; 
                border-bottom: 2px dashed #000; 
                padding: 10px 0; 
                margin-bottom: 10px; 
              }
              .header h2 { margin: 0 0 5px 0; font-size: 20px; font-weight: bold; }
              .header p { margin: 3px 0; font-size: 15px; font-weight: bold; }
              .section { margin-bottom: 15px; font-weight: bold; }
              .item { 
                margin-bottom: 10px; 
                line-height: 1.5;
                font-weight: bold;
              }
              .complements {
                margin-left: 0;
                margin-top: 4px;
              }
              .complement-item {
                display: block;
                margin: 3px 0;
                font-weight: bold;
              }
              .total { 
                border-top: 2px dashed #000; 
                padding-top: 10px; 
                margin-top: 10px; 
                font-weight: bold; 
                font-size: 18px;
                text-align: center;
              }
              .loyalty {
                background: #f0f0f0;
                padding: 8px;
                margin: 10px 0;
                text-align: center;
                font-size: 14px;
              }
              .footer { 
                text-align: center; 
                margin-top: 15px; 
                border-top: 2px dashed #000; 
                padding-top: 10px;
                font-weight: bold;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>${settings?.store_name || 'Loja'}</h2>
            <p>PEDIDO #${String(order.order_number || '').padStart(3, '0')}</p>
            <p>${order.order_datetime || new Date().toLocaleString('pt-BR')}</p>
          </div>
          
          <div class="section">
            <strong>Cliente:</strong><br/>
            ${order.customer_name || 'N/A'}<br/>
            ${order.customer_phone || ''}<br/>
            <div style="margin-top: 5px;">Total de pedidos: ${customerOrders}</div>
          </div>
          
          <div class="section">
            <strong>Itens:</strong><br/>
            ${order.items?.map(item => `
              <div class="item">
                <div>${item.quantity}x ${item.product_name}</div>
                <div>R$ ${item.total.toFixed(2)}</div>
                ${item.complements?.length > 0 ? `
                  <div class="complements">
                    ${item.complements.map(c => `<div class="complement-item">+ ${c.name}</div>`).join('')}
                  </div>
                ` : ''}
              </div>
            `).join('') || ''}
          </div>
          
          <div class="total">
            TOTAL: R$ ${order.total.toFixed(2)}
          </div>
          
          <div class="section">
            <strong>Consumo:</strong> ${order.consumption_type === 'local' ? '🍽 No local' : '📦 Para viagem'}<br/>
            <strong>Pagamento:</strong> ${
              order.payment_method === 'pix' ? 'PIX' :
              order.payment_method === 'cartao' ? 'Cartao' : 'Dinheiro'
            }
          </div>
          
          ${loyaltyText ? `<div class="loyalty">${loyaltyText}</div>` : ''}
          
          <div class="footer">
            <p>Obrigado pela preferencia!</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const { data: customers } = useQuery({
    queryKey: ['admin-customers'],
    queryFn: () => base44.entities.Customer.list()
  });

  const getCustomerInfo = (phone) => {
    if (!phone || !customers) return null;
    return customers.find(c => c.phone === phone);
  };

  const handleFinalizeAll = async () => {
    const activeOrders = orders?.filter(o => 
      o.status !== 'finalizado' && o.status !== 'cancelado'
    ) || [];
    
    if (activeOrders.length === 0) {
      toast.info('Não há pedidos para finalizar');
      return;
    }
    
    setShowFinalizeDialog(true);
  };
  
  const confirmFinalizeAll = async () => {
    const activeOrders = orders?.filter(o => 
      o.status !== 'finalizado' && o.status !== 'cancelado'
    ) || [];
    
    try {
      await Promise.all(
        activeOrders.map(order => 
          base44.entities.Order.update(order.id, { status: 'finalizado' })
        )
      );
      queryClient.invalidateQueries(['admin-orders']);
      toast.success(`${activeOrders.length} pedido(s) finalizado(s)!`);
      setShowFinalizeDialog(false);
    } catch (error) {
      toast.error('Erro ao finalizar pedidos');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold text-gray-900">Pedidos</h1>
        
        <div className="flex flex-wrap items-center gap-3">
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="yesterday">Ontem</SelectItem>
              <SelectItem value="last7">Últimos 7 dias</SelectItem>
              <SelectItem value="last15">Últimos 15 dias</SelectItem>
              <SelectItem value="last30">Últimos 30 dias</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>
          
          {dateFilter === 'custom' && (
            <>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {customStartDate ? format(customStartDate, 'dd/MM') : 'Início'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={customStartDate} onSelect={setCustomStartDate} />
                </PopoverContent>
              </Popover>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {customEndDate ? format(customEndDate, 'dd/MM') : 'Fim'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={customEndDate} onSelect={setCustomEndDate} />
                </PopoverContent>
              </Popover>
            </>
          )}
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {Object.entries(statusConfig).map(([key, config]) => (
                <SelectItem key={key} value={key}>{config.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button 
            variant="outline" 
            onClick={handleFinalizeAll}
            className="bg-green-50 hover:bg-green-100 text-green-700"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Finalizar Todos
          </Button>
          
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-10 h-10 border-4 border-gray-200 rounded-full"
            style={{ borderTopColor: primaryColor }}
          />
        </div>
      ) : filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="py-20 text-center">
            <p className="text-gray-500">Nenhum pedido encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredOrders.map((order, index) => {
            console.log(`🔴 Renderizando pedido ${index + 1}/${filteredOrders.length}:`, order.order_number, order.status);

            const status = statusConfig[order.status] || statusConfig.em_preparo;
            const StatusIcon = status.icon;
            const nextStatus = 
              order.status === 'em_preparo' ? 'pronto' :
              order.status === 'pronto' ? 'finalizado' : 
              (!order.status || order.status === 'aguardando_pix' || order.status === 'pagamento_informado') ? 'em_preparo' : null;
            
            return (
              <Card key={order.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div 
                        className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg text-white"
                        style={{ backgroundColor: primaryColor }}
                      >
                        #{String(order.order_number).padStart(3, '0')}
                      </div>
                      <Badge className={status.color}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {status.label}
                      </Badge>
                    </div>
                    
                    <div>
                      <p className="font-bold text-gray-900 truncate">
                        {order.customer_name || 'Cliente'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {order.order_datetime?.split(' ')[1] || new Date(order.created_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {order.reward_redeemed && (
                        <Badge className="bg-amber-100 text-amber-800 text-xs mt-1">
                          🎁 Prêmio
                        </Badge>
                      )}
                    </div>
                    
                    <div className="text-xs text-gray-600">
                      {order.consumption_type === 'local' ? '🍽 Local' : '📦 Viagem'}
                      {' • '}
                      {order.payment_method === 'pix' ? 'PIX' : order.payment_method === 'cartao' ? 'Cartão' : 'Dinheiro'}
                    </div>
                    
                    <p className="text-xs text-gray-600 line-clamp-2">
                      {order.items?.map(item => `${item.quantity}x ${item.product_name}`).join(', ')}
                    </p>
                    
                    <div className="pt-2 border-t">
                      <span 
                        className="text-xl font-bold block"
                        style={{ color: primaryColor }}
                      >
                        R$ {order.total?.toFixed(2)}
                      </span>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      {nextStatus && order.status !== 'finalizado' && order.status !== 'cancelado' && (
                        <Button 
                          className="w-full h-9 text-sm"
                          style={{ backgroundColor: primaryColor }}
                          onClick={() => updateStatusMutation.mutate({ orderId: order.id, status: nextStatus })}
                        >
                          {nextStatus === 'em_preparo' && '👨‍🍳 Iniciar Preparo'}
                          {nextStatus === 'pronto' && '✓ Marcar Pronto'}
                          {nextStatus === 'finalizado' && '✓ Finalizar'}
                        </Button>
                      )}
                      
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="flex-1 h-8 text-xs"
                          onClick={() => setSelectedOrder(order)}
                        >
                          Ver
                        </Button>
                        
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="h-8 px-2"
                          onClick={() => handlePrint(order)}
                        >
                          <Printer className="w-3 h-3" />
                        </Button>
                        
                        {order.status !== 'cancelado' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="h-8 px-2 text-red-600 hover:bg-red-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelOrder(order);
                            }}
                          >
                            <CloseIcon className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      
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
            Você está prestes a finalizar {orders?.filter(o => o.status !== 'finalizado' && o.status !== 'cancelado').length} pedido(s). 
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