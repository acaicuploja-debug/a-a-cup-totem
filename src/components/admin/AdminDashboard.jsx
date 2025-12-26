import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { 
  DollarSign, 
  ShoppingBag, 
  Users, 
  TrendingUp,
  Calendar as CalendarIcon
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format } from 'date-fns';

export default function AdminDashboard({ settings, primaryColor }) {
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
  const { data: allOrders } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: () => base44.entities.Order.list('-created_date')
  });
  
  const { data: allCustomers } = useQuery({
    queryKey: ['admin-customers'],
    queryFn: () => base44.entities.Customer.list()
  });
  
  const { data: products } = useQuery({
    queryKey: ['admin-products'],
    queryFn: () => base44.entities.Product.list()
  });
  
  const orders = useMemo(() => {
    const { start, end } = getDateRange();
    if (!start || !end || !allOrders) return [];
    
    return allOrders.filter(order => {
      const orderDate = new Date(order.created_date);
      return orderDate >= start && orderDate < end;
    });
  }, [allOrders, dateFilter, customStartDate, customEndDate]);
  
  const customers = useMemo(() => {
    const { start, end } = getDateRange();
    if (!start || !end || !allCustomers) return [];
    
    return allCustomers.filter(customer => {
      const customerDate = new Date(customer.created_date);
      return customerDate >= start && customerDate < end;
    });
  }, [allCustomers, dateFilter, customStartDate, customEndDate]);
  
  const stats = useMemo(() => {
    if (!orders || !products) return { revenue: 0, orderCount: 0, avgTicket: 0, totalCost: 0, netProfit: 0 };

    const completedOrders = orders.filter(o => 
      o.status !== 'cancelado' && o.status !== 'aguardando_pix'
    );

    const revenue = completedOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const orderCount = completedOrders.length;
    const avgTicket = orderCount > 0 ? revenue / orderCount : 0;

    // Calcular custo total baseado nos produtos vendidos
    let totalCost = 0;
    completedOrders.forEach(order => {
      order.items?.forEach(item => {
        // Se o item já tem custo calculado (produtos por peso), usar ele
        if (item.cost_price !== undefined) {
          totalCost += item.cost_price;
        } else {
          // Caso contrário, buscar do produto
          const product = products.find(p => p.id === item.product_id);
          if (product && product.cost_price) {
            totalCost += product.cost_price * item.quantity;
          }
        }
      });
    });

    // Calcular desconto dado por forma de pagamento
    let totalDiscountGiven = 0;
    completedOrders.forEach(order => {
      const subtotal = order.subtotal || order.total;
      const adjustment = settings?.payment_adjustments?.[order.payment_method] || 0;
      if (adjustment < 0) {
        // Desconto negativo = valor dado ao cliente
        const discountAmount = Math.abs(subtotal * (adjustment / 100));
        totalDiscountGiven += discountAmount;
      }
    });

    const netProfit = revenue - totalCost - totalDiscountGiven;

    return { revenue, orderCount, avgTicket, totalCost, netProfit };
  }, [orders, products, settings]);
  
  const paymentData = useMemo(() => {
    if (!orders) return [];
    
    const completedOrders = orders.filter(o => o.status !== 'cancelado');
    const methods = {};
    
    completedOrders.forEach(order => {
      const method = order.payment_method || 'outro';
      methods[method] = (methods[method] || 0) + 1;
    });
    
    return Object.entries(methods).map(([name, value]) => ({
      name: name === 'pix' ? 'PIX' : name === 'cartao' ? 'Cartão' : name === 'dinheiro' ? 'Dinheiro' : 'Outro',
      value
    }));
  }, [orders]);
  
  const productData = useMemo(() => {
    if (!orders) return [];
    
    const products = {};
    
    orders.filter(o => o.status !== 'cancelado').forEach(order => {
      order.items?.forEach(item => {
        products[item.product_name] = (products[item.product_name] || 0) + item.quantity;
      });
    });
    
    return Object.entries(products)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }));
  }, [orders]);
  
  const COLORS = [primaryColor, '#EC4899', '#10B981', '#F59E0B', '#6366F1'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        
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
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Faturamento Bruto</p>
                <p className="text-2xl font-bold text-gray-900">
                  R$ {stats.revenue.toFixed(2)}
                </p>
              </div>
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${primaryColor}15` }}
              >
                <DollarSign className="w-6 h-6" style={{ color: primaryColor }} />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm text-gray-500">Lucro Líquido</p>
                  {stats.revenue > 0 && (
                    <Badge className="bg-green-100 text-green-700 text-xs font-semibold">
                      {((stats.netProfit / stats.revenue) * 100).toFixed(1)}%
                    </Badge>
                  )}
                </div>
                <p className="text-2xl font-bold text-green-600">
                  R$ {stats.netProfit.toFixed(2)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-green-50">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total de Pedidos</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.orderCount}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-blue-50">
                <ShoppingBag className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Ticket Médio</p>
                <p className="text-2xl font-bold text-gray-900">
                  R$ {stats.avgTicket.toFixed(2)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-amber-50">
                <TrendingUp className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Clientes</p>
                <p className="text-2xl font-bold text-gray-900">
                  {customers?.length || 0}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-purple-50">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Produtos Mais Vendidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={productData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill={primaryColor} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Formas de Pagamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {paymentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 mt-4">
                {paymentData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm text-gray-600">{entry.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}