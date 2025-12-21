import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  DollarSign, 
  ShoppingBag, 
  Users, 
  TrendingUp,
  Package
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function AdminDashboard({ settings, primaryColor }) {
  const { data: orders } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: () => base44.entities.Order.list('-created_date', 100)
  });
  
  const { data: customers } = useQuery({
    queryKey: ['admin-customers'],
    queryFn: () => base44.entities.Customer.list()
  });
  
  const stats = React.useMemo(() => {
    if (!orders) return { revenue: 0, orderCount: 0, avgTicket: 0, todayOrders: 0 };
    
    const completedOrders = orders.filter(o => 
      o.status !== 'cancelado' && o.status !== 'aguardando_pix'
    );
    
    const revenue = completedOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const orderCount = completedOrders.length;
    const avgTicket = orderCount > 0 ? revenue / orderCount : 0;
    
    const today = new Date().toDateString();
    const todayOrders = completedOrders.filter(o => 
      new Date(o.created_date).toDateString() === today
    ).length;
    
    return { revenue, orderCount, avgTicket, todayOrders };
  }, [orders]);
  
  const paymentData = React.useMemo(() => {
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
  
  const productData = React.useMemo(() => {
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
      <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Faturamento Total</p>
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
                <p className="text-sm text-gray-500">Total de Pedidos</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.orderCount}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-green-50">
                <ShoppingBag className="w-6 h-6 text-green-600" />
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
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-blue-50">
                <Users className="w-6 h-6 text-blue-600" />
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