import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  ChefHat, 
  Package,
  Printer,
  RefreshCw,
  Calendar as CalendarIcon
} from 'lucide-react';
import { format } from 'date-fns';

const statusConfig = {
  aguardando_pix: { label: 'Aguardando PIX', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  pagamento_informado: { label: 'Pagamento Informado', color: 'bg-blue-100 text-blue-800', icon: Clock },
  em_preparo: { label: 'Em Preparo', color: 'bg-purple-100 text-purple-800', icon: ChefHat },
  pronto: { label: 'Pronto', color: 'bg-green-100 text-green-800', icon: Package },
  finalizado: { label: 'Finalizado', color: 'bg-gray-100 text-gray-800', icon: CheckCircle },
  cancelado: { label: 'Cancelado', color: 'bg-red-100 text-red-800', icon: XCircle }
};

export default function AdminOrderHistory({ settings, primaryColor }) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [customStartDate, setCustomStartDate] = useState(null);
  const [customEndDate, setCustomEndDate] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const { data: orders, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-orders-history'],
    queryFn: async () => {
      const result = await base44.entities.Order.list('-created_date');
      return result;
    }
  });

  const { data: customers } = useQuery({
    queryKey: ['admin-customers'],
    queryFn: () => base44.entities.Customer.list()
  });

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
    if (!orders) return [];
    const { start, end } = getDateRange();
    
    let filtered = orders;
    
    if (start && end) {
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.created_date);
        return orderDate >= start && orderDate < end;
      });
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(o => o.status === statusFilter);
    }
    
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

  const getCustomerInfo = (phone) => {
    if (!phone || !customers) return null;
    return customers.find(c => c.phone === phone);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold text-gray-900">Histórico de Pedidos</h1>
        
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
          {filteredOrders.map((order) => {
            const status = statusConfig[order.status] || statusConfig.em_preparo;
            const StatusIcon = status.icon;
            
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
                        {order.order_datetime?.split(' ')[0]} • {order.order_datetime?.split(' ')[1]}
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
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <Badge className={statusConfig[selectedOrder.status]?.color}>
                    {statusConfig[selectedOrder.status]?.label}
                  </Badge>
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