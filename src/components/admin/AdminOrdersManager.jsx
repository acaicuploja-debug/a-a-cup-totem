import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChefHat, Package, CheckCircle, Printer, Eye, X } from 'lucide-react';
import { toast } from 'sonner';
import PendingOrderNotification from './PendingOrderNotification';

const statusConfig = {
  em_preparo: { label: 'Em Preparo', color: 'bg-purple-500', icon: ChefHat },
  pronto: { label: 'Pronto', color: 'bg-green-500', icon: Package },
  finalizado: { label: 'Finalizado', color: 'bg-gray-400', icon: CheckCircle }
};

export default function AdminOrdersManager({ settings, primaryColor }) {
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [pendingOrders, setPendingOrders] = useState([]);
  const previousOrderCount = useRef(0);
  const notificationIntervalRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: allOrders, isLoading } = useQuery({
    queryKey: ['admin-orders-manager'],
    queryFn: async () => {
      const result = await base44.entities.Order.list('-created_date');
      return result;
    },
    refetchInterval: 3000
  });

  const { data: customers } = useQuery({
    queryKey: ['admin-customers'],
    queryFn: () => base44.entities.Customer.list()
  });

  // Filter only today's orders
  const todayOrders = React.useMemo(() => {
    if (!allOrders) return [];
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    
    return allOrders.filter(order => {
      const orderDate = new Date(order.created_date);
      return orderDate >= today && orderDate < tomorrow && order.status !== 'cancelado';
    });
  }, [allOrders]);

  // Check for new pending orders and start notifications
  useEffect(() => {
    if (!allOrders) return;
    
    const newPendingOrders = allOrders.filter(o => 
      o.status === 'aguardando_pix' || 
      o.status === 'pagamento_informado' ||
      (!o.status)
    );
    
    const hasNewOrders = newPendingOrders.length > previousOrderCount.current;
    
    if (hasNewOrders && previousOrderCount.current > 0) {
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
      
      if ('Notification' in window && Notification.permission === 'granted') {
        const count = newPendingOrders.length;
        new Notification('Novo Pedido!', {
          body: count === 1 
            ? `Pedido #${newPendingOrders[0].order_number} - R$ ${newPendingOrders[0].total?.toFixed(2)}`
            : `${count} novos pedidos aguardando`,
          icon: settings?.logo_url || '/favicon.ico',
          tag: 'new-order',
          requireInteraction: true
        });
      }
    }
    
    previousOrderCount.current = allOrders.length;
    setPendingOrders(newPendingOrders);
    
    if (newPendingOrders.length > 0) {
      startNotificationLoop();
    } else {
      stopNotificationLoop();
    }
    
    return () => stopNotificationLoop();
  }, [allOrders, settings]);

  const getSoundUrl = () => {
    const sound = settings?.notification_sound || 'bell';
    const sounds = {
      bell: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
      chime: 'https://assets.mixkit.co/active_storage/sfx/2870/2870-preview.mp3',
      ding: 'https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3',
      alert: 'https://assets.mixkit.co/active_storage/sfx/2860/2860-preview.mp3'
    };
    return sounds[sound] || sounds.bell;
  };

  const playNotificationSound = () => {
    const audio = new Audio(getSoundUrl());
    audio.volume = settings?.notification_volume || 0.8;
    audio.play().catch(e => console.log('Audio play failed:', e));
  };

  const startNotificationLoop = () => {
    if (notificationIntervalRef.current) return;
    
    playNotificationSound();
    notificationIntervalRef.current = setInterval(() => {
      playNotificationSound();
    }, 5000);
  };

  const stopNotificationLoop = () => {
    if (notificationIntervalRef.current) {
      clearInterval(notificationIntervalRef.current);
      notificationIntervalRef.current = null;
    }
  };

  const handleAcceptPendingOrders = () => {
    stopNotificationLoop();
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

  const handleStatusChange = (order, newStatus) => {
    updateStatusMutation.mutate({ orderId: order.id, status: newStatus });
  };

  const handlePrint = (order) => {
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
      if (groups[order.status]) {
        groups[order.status].push(order);
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

  return (
    <div className="space-y-6">
      <PendingOrderNotification
        orders={pendingOrders}
        onAccept={handleAcceptPendingOrders}
        primaryColor={primaryColor}
      />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestor de Pedidos</h1>
          <p className="text-gray-500 mt-1">Pedidos de hoje • {todayOrders.length} total</p>
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
                      
                      <div className="flex gap-2">
                        {status === 'em_preparo' && (
                          <Button
                            onClick={() => handleStatusChange(order, 'pronto')}
                            className="flex-1 h-9 text-sm"
                            style={{ backgroundColor: statusConfig.pronto.color.replace('bg-', '#') }}
                          >
                            Marcar Pronto
                          </Button>
                        )}
                        
                        {status === 'pronto' && (
                          <Button
                            onClick={() => handleStatusChange(order, 'finalizado')}
                            className="flex-1 h-9 text-sm"
                            style={{ backgroundColor: statusConfig.finalizado.color.replace('bg-', '#') }}
                          >
                            Finalizar
                          </Button>
                        )}
                        
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 px-3"
                          onClick={() => setSelectedOrder(order)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 px-3"
                          onClick={() => handlePrint(order)}
                        >
                          <Printer className="w-4 h-4" />
                        </Button>
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
    </div>
  );
}