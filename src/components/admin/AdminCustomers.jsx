import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Users, Gift, Star, Phone, Loader2 } from 'lucide-react';

export default function AdminCustomers({ settings, primaryColor }) {
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  
  const { data: customers, isLoading } = useQuery({
    queryKey: ['admin-customers'],
    queryFn: () => base44.entities.Customer.list('-created_date')
  });
  
  const { data: orders } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: () => base44.entities.Order.list()
  });
  
  const filteredCustomers = React.useMemo(() => {
    if (!customers) return [];
    if (!search) return customers;
    
    const searchLower = search.toLowerCase();
    return customers.filter(c => 
      c.name?.toLowerCase().includes(searchLower) ||
      c.phone?.includes(search) ||
      c.cpf?.includes(search)
    );
  }, [customers, search]);
  
  const getCustomerOrders = (customerId) => {
    return orders?.filter(o => o.customer_id === customerId) || [];
  };
  
  const getCustomerTotal = (customerId) => {
    const customerOrders = getCustomerOrders(customerId);
    return customerOrders
      .filter(o => o.status !== 'cancelado')
      .reduce((sum, o) => sum + (o.total || 0), 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-gray-900">Clientes</h1>
        
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar por nome, telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin" style={{ color: primaryColor }} />
        </div>
      ) : filteredCustomers.length === 0 ? (
        <Card>
          <CardContent className="py-20 text-center">
            <Users className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">
              {search ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredCustomers.map(customer => {
            const customerOrders = getCustomerOrders(customer.id);
            const totalSpent = getCustomerTotal(customer.id);
            const loyaltyTarget = settings?.loyalty_target || 10;
            
            return (
              <Card 
                key={customer.id} 
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedCustomer(customer)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: primaryColor }}
                      >
                        {customer.name?.[0]?.toUpperCase() || '?'}
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-gray-900">
                            {customer.name || 'Cliente sem nome'}
                          </h3>
                          {customer.has_pending_reward && (
                            <Badge className="bg-amber-100 text-amber-800">
                              <Gift className="w-3 h-3 mr-1" />
                              Prêmio disponível
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {customer.phone}
                          </span>
                          {customer.cpf && (
                            <span>CPF: {customer.cpf}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="flex items-center gap-2 mb-1">
                        <Star className="w-4 h-4 text-amber-500" />
                        <span className="font-medium text-gray-900">
                          {customer.loyalty_count || 0}/{loyaltyTarget}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        {customerOrders.length} pedidos • R$ {totalSpent.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      
      <Dialog open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes do Cliente</DialogTitle>
          </DialogHeader>
          
          {selectedCustomer && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div 
                  className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold"
                  style={{ backgroundColor: primaryColor }}
                >
                  {selectedCustomer.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <h3 className="text-xl font-bold">{selectedCustomer.name || 'Sem nome'}</h3>
                  <p className="text-gray-500">{selectedCustomer.phone}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-500">CPF</p>
                  <p className="font-medium">{selectedCustomer.cpf || 'Não informado'}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-500">Fidelidade</p>
                  <p className="font-medium">
                    {selectedCustomer.loyalty_count || 0}/{settings?.loyalty_target || 10}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-500">Total de Pedidos</p>
                  <p className="font-medium">{getCustomerOrders(selectedCustomer.id).length}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-500">Total Gasto</p>
                  <p className="font-medium">R$ {getCustomerTotal(selectedCustomer.id).toFixed(2)}</p>
                </div>
              </div>
              
              {selectedCustomer.has_pending_reward && (
                <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 flex items-center gap-3">
                  <Gift className="w-6 h-6 text-amber-500" />
                  <div>
                    <p className="font-medium text-amber-800">Prêmio Disponível</p>
                    <p className="text-sm text-amber-600">
                      {settings?.loyalty_reward_description || 'Açaí grátis'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}