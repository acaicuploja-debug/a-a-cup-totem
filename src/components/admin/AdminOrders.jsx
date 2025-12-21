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
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const statusConfig = {
  aguardando_pix: { label: 'Aguardando PIX', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  pagamento_informado: { label: 'Pagamento Informado', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
  em_preparo: { label: 'Em Preparo', color: 'bg-purple-100 text-purple-800', icon: ChefHat },
  pronto: { label: 'Pronto', color: 'bg-green-100 text-green-800', icon: Package },
  finalizado: { label: 'Finalizado', color: 'bg-gray-100 text-gray-800', icon: CheckCircle },
  cancelado: { label: 'Cancelado', color: 'bg-red-100 text-red-800', icon: XCircle }
};

export default function AdminOrders({ settings, primaryColor }) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const previousOrderCount = useRef(0);
  const audioRef = useRef(null);
  const queryClient = useQueryClient();
  
  const { data: orders, isLoading, refetch } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: () => base44.entities.Order.list('-created_date', 100),
    refetchInterval: 5000 // Auto refresh every 5 seconds
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
      
      // If finalizing, trigger WhatsApp message
      if (status === 'finalizado' && settings?.whatsapp_number) {
        // WhatsApp integration would go here
      }
      
      return { orderId, status };
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-orders']);
      toast.success('Status atualizado!');
    }
  });
  
  const filteredOrders = React.useMemo(() => {
    if (!orders) return [];
    if (statusFilter === 'all') return orders;
    return orders.filter(o => o.status === statusFilter);
  }, [orders, statusFilter]);
  
  const handlePrint = (order) => {
    const printContent = `
      =====================
      ${settings?.store_name || 'AÇAÍ CUP'}
      =====================
      
      Pedido #${String(order.order_number).padStart(3, '0')}
      Data: ${order.order_datetime || new Date(order.created_date).toLocaleString('pt-BR')}
      
      Cliente: ${order.customer_name || 'Não informado'}
      Telefone: ${order.customer_phone || 'Não informado'}
      
      Consumo: ${order.consumption_type === 'local' ? 'Comer no Local' : 'Para Viagem'}
      
      ---------------------
      ITENS:
      ---------------------
      ${order.items?.map(item => 
        `${item.quantity}x ${item.product_name} - R$ ${item.total.toFixed(2)}
        ${item.complements?.length > 0 ? `   + ${item.complements.map(c => c.name).join(', ')}` : ''}`
      ).join('\n')}
      
      ---------------------
      TOTAL: R$ ${order.total.toFixed(2)}
      ---------------------
      
      Pagamento: ${order.payment_method === 'pix' ? 'PIX' : order.payment_method === 'cartao' ? 'Cartão' : 'Dinheiro'}
      
      ${order.reward_redeemed ? '🎁 PRÊMIO RESGATADO neste pedido' : ''}
      
      =====================
      Obrigado pela preferência!
      =====================
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`<pre style="font-family: monospace; font-size: 14px;">${printContent}</pre>`);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-gray-900">Pedidos</h1>
        
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {Object.entries(statusConfig).map(([key, config]) => (
                <SelectItem key={key} value={key}>{config.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
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
        <div className="grid gap-4">
          {filteredOrders.map(order => {
            const status = statusConfig[order.status] || statusConfig.aguardando_pix;
            const StatusIcon = status.icon;
            
            return (
              <Card key={order.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div 
                        className="w-14 h-14 rounded-xl flex items-center justify-center font-bold text-xl text-white"
                        style={{ backgroundColor: primaryColor }}
                      >
                        #{String(order.order_number).padStart(3, '0')}
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-gray-900">
                            {order.customer_name || 'Cliente'}
                          </span>
                          <Badge className={status.color}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {status.label}
                          </Badge>
                          {order.reward_redeemed && (
                            <Badge className="bg-amber-100 text-amber-800">
                              🎁 Prêmio
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-sm text-gray-500">
                          {order.order_datetime || new Date(order.created_date).toLocaleString('pt-BR')}
                          {' • '}
                          {order.consumption_type === 'local' ? '🍽 Local' : '📦 Viagem'}
                          {' • '}
                          {order.payment_method === 'pix' ? '📱 PIX' : order.payment_method === 'cartao' ? '💳 Cartão' : '💵 Dinheiro'}
                        </p>
                        
                        <p className="text-sm text-gray-600 mt-1">
                          {order.items?.map(item => `${item.quantity}x ${item.product_name}`).join(', ')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-3">
                      <span 
                        className="text-2xl font-bold"
                        style={{ color: primaryColor }}
                      >
                        R$ {order.total?.toFixed(2)}
                      </span>
                      
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedOrder(order)}
                        >
                          Detalhes
                        </Button>
                        
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handlePrint(order)}
                        >
                          <Printer className="w-4 h-4" />
                        </Button>
                        
                        {order.status !== 'finalizado' && order.status !== 'cancelado' && (
                          <Select 
                            value={order.status}
                            onValueChange={(status) => updateStatusMutation.mutate({ orderId: order.id, status })}
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pagamento_informado">Pagamento Informado</SelectItem>
                              <SelectItem value="em_preparo">Em Preparo</SelectItem>
                              <SelectItem value="pronto">Pronto</SelectItem>
                              <SelectItem value="finalizado">Finalizado</SelectItem>
                              <SelectItem value="cancelado">Cancelado</SelectItem>
                            </SelectContent>
                          </Select>
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
    </div>
  );
}