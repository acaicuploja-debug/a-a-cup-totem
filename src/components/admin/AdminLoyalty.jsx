import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Gift, Star, Clock, CheckCircle, XCircle, Loader2, DollarSign, TrendingUp, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const actionConfig = {
  pedido_contado: { label: 'Pedido Contado', color: 'bg-blue-100 text-blue-800', icon: Star },
  premio_disponivel: { label: 'Prêmio Disponível', color: 'bg-amber-100 text-amber-800', icon: Gift },
  premio_resgatado: { label: 'Prêmio Resgatado', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  premio_adiado: { label: 'Prêmio Adiado', color: 'bg-gray-100 text-gray-800', icon: Clock }
};

export default function AdminLoyalty({ settings, primaryColor }) {
  const [dateFilter, setDateFilter] = useState('today');
  const [customStartDate, setCustomStartDate] = useState(null);
  const [customEndDate, setCustomEndDate] = useState(null);
  
  const getDateRange = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (dateFilter) {
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
      case 'january':
        return { start: new Date(now.getFullYear(), 0, 1), end: new Date(now.getFullYear(), 1, 1) };
      case 'february':
        return { start: new Date(now.getFullYear(), 1, 1), end: new Date(now.getFullYear(), 2, 1) };
      case 'march':
        return { start: new Date(now.getFullYear(), 2, 1), end: new Date(now.getFullYear(), 3, 1) };
      case 'april':
        return { start: new Date(now.getFullYear(), 3, 1), end: new Date(now.getFullYear(), 4, 1) };
      case 'may':
        return { start: new Date(now.getFullYear(), 4, 1), end: new Date(now.getFullYear(), 5, 1) };
      case 'june':
        return { start: new Date(now.getFullYear(), 5, 1), end: new Date(now.getFullYear(), 6, 1) };
      case 'july':
        return { start: new Date(now.getFullYear(), 6, 1), end: new Date(now.getFullYear(), 7, 1) };
      case 'august':
        return { start: new Date(now.getFullYear(), 7, 1), end: new Date(now.getFullYear(), 8, 1) };
      case 'september':
        return { start: new Date(now.getFullYear(), 8, 1), end: new Date(now.getFullYear(), 9, 1) };
      case 'october':
        return { start: new Date(now.getFullYear(), 9, 1), end: new Date(now.getFullYear(), 10, 1) };
      case 'november':
        return { start: new Date(now.getFullYear(), 10, 1), end: new Date(now.getFullYear(), 11, 1) };
      case 'december':
        return { start: new Date(now.getFullYear(), 11, 1), end: new Date(now.getFullYear() + 1, 0, 1) };
      case 'custom':
        return { start: customStartDate, end: customEndDate };
      default:
        return { start: today, end: new Date(today.getTime() + 24 * 60 * 60 * 1000) };
    }
  };
  
  const { data: allLogs, isLoading } = useQuery({
    queryKey: ['loyalty-logs'],
    queryFn: () => base44.entities.LoyaltyLog.list('-created_date')
  });
  
  const { data: customers } = useQuery({
    queryKey: ['admin-customers'],
    queryFn: () => base44.entities.Customer.list()
  });
  
  const { data: allOrders } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: () => base44.entities.Order.list()
  });
  
  const { data: products } = useQuery({
    queryKey: ['admin-products'],
    queryFn: () => base44.entities.Product.list()
  });
  
  const logs = useMemo(() => {
    const { start, end } = getDateRange();
    if (!start || !end || !allLogs) return [];
    
    return allLogs.filter(log => {
      const logDate = new Date(log.created_date);
      return logDate >= start && logDate < end;
    });
  }, [allLogs, dateFilter, customStartDate, customEndDate]);
  
  const stats = useMemo(() => {
    if (!logs || !allOrders || !products || !settings) {
      return { total: 0, redeemed: 0, pending: 0, totalCost: 0, grossRevenue: 0, netProfit: 0 };
    }
    
    const redeemed = logs.filter(l => l.action === 'premio_resgatado').length;
    const pending = customers?.filter(c => c.has_pending_reward).length || 0;
    
    // Buscar o produto do prêmio
    const rewardProduct = products.find(p => p.id === settings.loyalty_reward_product_id);
    const rewardCost = rewardProduct?.cost_price || 0;
    
    // Custo total = quantidade de prêmios resgatados * custo do produto
    const totalCost = redeemed * rewardCost;
    
    // Pegar pedidos que resultaram em resgate de prêmio no período
    const { start, end } = getDateRange();
    const rewardedOrders = allOrders.filter(order => {
      const orderDate = new Date(order.created_date);
      return order.reward_redeemed && 
             order.status !== 'cancelado' && 
             orderDate >= start && 
             orderDate < end;
    });
    
    // Calcular faturamento bruto necessário para atingir os resgates
    // Para cada prêmio resgatado, o cliente fez X pedidos (loyalty_target)
    const loyaltyTarget = settings.loyalty_target || 10;
    const ordersNeededForRewards = rewardedOrders.length * loyaltyTarget;
    
    // Faturamento bruto dos pedidos relacionados à fidelidade
    const ordersForLoyalty = allOrders
      .filter(o => {
        const orderDate = new Date(o.created_date);
        return o.status !== 'cancelado' && orderDate >= start && orderDate < end;
      })
      .slice(0, ordersNeededForRewards);
    
    const grossRevenue = ordersForLoyalty.reduce((sum, o) => sum + (o.total || 0), 0);
    
    // Lucro = faturamento - custo investido em prêmios
    const netProfit = grossRevenue - totalCost;
    
    return { total: logs.length, redeemed, pending, totalCost, grossRevenue, netProfit };
  }, [logs, allOrders, products, settings, customers, dateFilter, customStartDate, customEndDate]);

  const rewardProduct = products?.find(p => p.id === settings?.loyalty_reward_product_id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Programa de Fidelidade</h1>
        
        <div className="flex items-center gap-3">
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="yesterday">Ontem</SelectItem>
              <SelectItem value="last7">Últimos 7 dias</SelectItem>
              <SelectItem value="last15">Últimos 15 dias</SelectItem>
              <SelectItem value="last30">Últimos 30 dias</SelectItem>
              <SelectItem value="january">Janeiro</SelectItem>
              <SelectItem value="february">Fevereiro</SelectItem>
              <SelectItem value="march">Março</SelectItem>
              <SelectItem value="april">Abril</SelectItem>
              <SelectItem value="may">Maio</SelectItem>
              <SelectItem value="june">Junho</SelectItem>
              <SelectItem value="july">Julho</SelectItem>
              <SelectItem value="august">Agosto</SelectItem>
              <SelectItem value="september">Setembro</SelectItem>
              <SelectItem value="october">Outubro</SelectItem>
              <SelectItem value="november">Novembro</SelectItem>
              <SelectItem value="december">Dezembro</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>
          
          {dateFilter === 'custom' && (
            <div className="flex items-center gap-2">
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
              
              <span className="text-gray-500">até</span>
              
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
            </div>
          )}
        </div>
      </div>
      
      {/* ROI Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Prêmios Resgatados</p>
                <p className="text-2xl font-bold text-gray-900">{stats.redeemed}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Custo Investido</p>
                <p className="text-2xl font-bold text-red-600">
                  R$ {stats.totalCost.toFixed(2)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Faturamento Gerado</p>
                <p className="text-2xl font-bold text-blue-600">
                  R$ {stats.grossRevenue.toFixed(2)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Lucro Obtido</p>
                <p className="text-2xl font-bold text-green-600">
                  R$ {stats.netProfit.toFixed(2)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Prêmios Pendentes</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
                <Gift className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Current Reward with Product Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Prêmio Atual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div 
                className="w-16 h-16 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${primaryColor}15` }}
              >
                <Gift className="w-8 h-8" style={{ color: primaryColor }} />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">
                  {rewardProduct?.name || settings?.loyalty_reward_description || 'Açaí 300ml grátis'}
                </p>
                <p className="text-gray-500">
                  Após {settings?.loyalty_target || 10} pedidos
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Custo do Prêmio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {rewardProduct ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Produto:</span>
                    <span className="font-medium">{rewardProduct.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Preço de Venda:</span>
                    <span className="font-medium">R$ {rewardProduct.price.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Custo Unitário:</span>
                    <span className="font-medium text-red-600">
                      R$ {(rewardProduct.cost_price || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="pt-2 border-t flex justify-between">
                    <span className="font-bold">Custo por Resgate:</span>
                    <span className="font-bold text-red-600">
                      R$ {(rewardProduct.cost_price || 0).toFixed(2)}
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-amber-600 text-sm">
                  ⚠️ Configure o produto do prêmio nas Configurações para visualizar custos e ROI
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Ações</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: primaryColor }} />
            </div>
          ) : logs?.length === 0 ? (
            <p className="text-center text-gray-500 py-10">
              Nenhum registro de fidelidade ainda
            </p>
          ) : (
            <div className="space-y-3">
              {logs?.map(log => {
                const config = actionConfig[log.action] || actionConfig.pedido_contado;
                const Icon = config.icon;
                
                return (
                  <div 
                    key={log.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${config.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">
                            {log.customer_phone}
                          </span>
                          <Badge className={config.color}>{config.label}</Badge>
                        </div>
                        <p className="text-sm text-gray-500">
                          {log.loyalty_count_before} → {log.loyalty_count_after} pontos
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-sm text-gray-500">
                        {log.datetime_brasilia || format(new Date(log.created_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}