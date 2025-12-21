import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Gift, Star, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const actionConfig = {
  pedido_contado: { label: 'Pedido Contado', color: 'bg-blue-100 text-blue-800', icon: Star },
  premio_disponivel: { label: 'Prêmio Disponível', color: 'bg-amber-100 text-amber-800', icon: Gift },
  premio_resgatado: { label: 'Prêmio Resgatado', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  premio_adiado: { label: 'Prêmio Adiado', color: 'bg-gray-100 text-gray-800', icon: Clock }
};

export default function AdminLoyalty({ settings, primaryColor }) {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['loyalty-logs'],
    queryFn: () => base44.entities.LoyaltyLog.list('-created_date', 100)
  });
  
  const { data: customers } = useQuery({
    queryKey: ['admin-customers'],
    queryFn: () => base44.entities.Customer.list()
  });
  
  const stats = React.useMemo(() => {
    if (!logs) return { total: 0, redeemed: 0, pending: 0 };
    
    const redeemed = logs.filter(l => l.action === 'premio_resgatado').length;
    const pending = customers?.filter(c => c.has_pending_reward).length || 0;
    
    return { total: logs.length, redeemed, pending };
  }, [logs, customers]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Programa de Fidelidade</h1>
      
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Meta de Pedidos</p>
                <p className="text-2xl font-bold text-gray-900">
                  {settings?.loyalty_target || 10} pedidos
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center">
                <Star className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
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
      
      {/* Current Reward */}
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
                {settings?.loyalty_reward_description || 'Açaí 300ml grátis'}
              </p>
              <p className="text-gray-500">
                Após {settings?.loyalty_target || 10} pedidos
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
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