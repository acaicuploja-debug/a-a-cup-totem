import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { 
  LayoutDashboard, 
  FolderOpen, 
  Package, 
  ShoppingBag, 
  Users, 
  Settings,
  Star,
  TrendingUp,
  Gift,
  Menu,
  X,
  MessageCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import AdminDashboard from '../components/admin/AdminDashboard';
import AdminCategories from '../components/admin/AdminCategories';
import AdminProducts from '../components/admin/AdminProducts';
import AdminOrdersManager from '../components/admin/AdminOrdersManager';
import AdminOrderHistory from '../components/admin/AdminOrderHistory';
import AdminCustomers from '../components/admin/AdminCustomers';
import AdminSettings from '../components/admin/AdminSettings';
import AdminUpsell from '../components/admin/AdminUpsell';
import AdminLoyalty from '../components/admin/AdminLoyalty';
import AdminCoupons from '../components/admin/AdminCoupons';
import AdminWhatsApp from '../components/admin/AdminWhatsApp';
import { Tag, History } from 'lucide-react';

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'orders', label: 'Gestor de Pedidos', icon: ShoppingBag },
  { id: 'history', label: 'Histórico de Pedidos', icon: History },
  { id: 'categories', label: 'Categorias', icon: FolderOpen },
  { id: 'products', label: 'Produtos', icon: Package },
  { id: 'upsell', label: 'Upsell', icon: TrendingUp },
  { id: 'coupons', label: 'Cupons', icon: Tag },
  { id: 'customers', label: 'Clientes', icon: Users },
  { id: 'loyalty', label: 'Fidelidade', icon: Gift },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { id: 'settings', label: 'Configurações', icon: Settings }
];

export default function Admin({ onClose }) {
  const [activeTab, setActiveTab] = useState(() => {
    // Persistir aba ativa no localStorage
    return localStorage.getItem('admin_active_tab') || 'dashboard';
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    retry: false
  });
  
  const { data: settings, isLoading } = useQuery({
    queryKey: ['store-settings'],
    queryFn: async () => {
      const list = await base44.entities.StoreSettings.list();
      return list[0] || {};
    }
  });

  // Polling de pedidos em background - MÁXIMA VELOCIDADE
  const { data: allOrders } = useQuery({
    queryKey: ['admin-orders-background'],
    queryFn: async () => {
      console.log('🔄 Buscando pedidos...', new Date().toLocaleTimeString());
      const result = await base44.entities.Order.list('-created_date');
      console.log(`📦 ${result.length} pedidos retornados`);
      return result;
    },
    refetchInterval: 2000, // 2 segundos - mais rápido
    refetchIntervalInBackground: true,
    enabled: !!user && user.role === 'admin',
    staleTime: 0,
    gcTime: 0
  });

  // Auto-print via PrintNode — dispara para todo pedido que atinge em_preparo.
  // IDs já impressos são persistidos no localStorage para não reimprimir e para
  // não perder pedidos que chegaram enquanto o painel estava fechado ou durante
  // o carregamento da página (corrige a race condition da primeira carga).
  React.useEffect(() => {
    if (!allOrders || !settings?.default_printer) return;

    const PRINTED_KEY = 'admin_printed_order_ids';
    const currentPreparingOrders = allOrders.filter(o => o.status === 'em_preparo');

    // Primeira abertura (sem registro no localStorage): marca os pedidos atuais
    // como já impressos para não reimprimir pedidos antigos de aberturas passadas.
    if (!localStorage.getItem(PRINTED_KEY)) {
      localStorage.setItem(PRINTED_KEY, JSON.stringify(currentPreparingOrders.map(o => o.id).slice(-200)));
      return;
    }

    const printedIds = new Set(JSON.parse(localStorage.getItem(PRINTED_KEY) || '[]'));
    const ordersToPrint = currentPreparingOrders.filter(o => !printedIds.has(o.id));
    if (ordersToPrint.length === 0) return;

    // Marcar como impresso imediatamente para evitar reimpressão no próximo poll
    const updatedPrinted = [...printedIds, ...ordersToPrint.map(o => o.id)].slice(-200);
    localStorage.setItem(PRINTED_KEY, JSON.stringify(updatedPrinted));

    ordersToPrint.forEach((order) => {
      console.log(`📄 Imprimindo #${order.order_number}`);
      base44.functions.invoke('printWithPrintNode', {
        orderId: order.id,
        printerName: settings.default_printer
      }).then(() => {
        console.log(`✅ #${order.order_number} impresso`);
      }).catch((error) => {
        console.error(`❌ Erro ao imprimir #${order.order_number}:`, error);
        toast.error(`Falha ao imprimir o pedido #${order.order_number} (PrintNode). Verifique a impressora.`);
      });
    });
  }, [allOrders, settings]);
  
  const primaryColor = settings?.primary_color || '#6B21A8';
  
  // Verificar se está carregando
  if (userLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-4 border-gray-200 rounded-full"
          style={{ borderTopColor: primaryColor }}
        />
      </div>
    );
  }
  
  // Verificar se não está logado
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Acesso Restrito</h1>
          <p className="text-gray-600 mb-6">Você precisa estar logado para acessar o painel admin.</p>
          <button
            onClick={() => base44.auth.redirectToLogin('/admin')}
            className="px-6 py-3 rounded-xl text-white font-medium"
            style={{ backgroundColor: primaryColor }}
          >
            Fazer Login
          </button>
        </div>
      </div>
    );
  }
  
  // Verificar se não é admin
  if (user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Acesso Negado</h1>
          <p className="text-gray-600">Você não tem permissão para acessar o painel admin.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <header className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </Button>
          <h1 className="font-bold text-lg" style={{ color: primaryColor }}>
            {settings?.store_name || 'Açaí Cup'} Admin
          </h1>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-6 h-6" />
          </Button>
        )}
      </header>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 z-50
        transform transition-transform duration-300 ease-in-out overflow-y-auto
        lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {settings?.logo_url && (
                <img src={settings.logo_url} alt="Logo" className="h-10 w-auto" />
              )}
              <div>
                <h1 className="font-bold text-lg" style={{ color: primaryColor }}>
                  {settings?.store_name || 'Açaí Cup'}
                </h1>
                <p className="text-sm text-gray-500">Painel Admin</p>
              </div>
            </div>
            {onClose ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
              >
                <X className="w-5 h-5" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>
        
        <nav className="p-4 space-y-1">
          {menuItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  localStorage.setItem('admin_active_tab', item.id); // Persistir
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive 
                    ? 'text-white' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                style={isActive ? { backgroundColor: primaryColor } : {}}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 p-6 min-h-screen overflow-y-auto">
        {activeTab === 'dashboard' && <AdminDashboard settings={settings} primaryColor={primaryColor} />}
        {activeTab === 'categories' && <AdminCategories settings={settings} primaryColor={primaryColor} />}
        {activeTab === 'products' && <AdminProducts settings={settings} primaryColor={primaryColor} />}
        {activeTab === 'upsell' && <AdminUpsell settings={settings} primaryColor={primaryColor} />}
        {activeTab === 'coupons' && <AdminCoupons settings={settings} primaryColor={primaryColor} />}
        {activeTab === 'orders' && <AdminOrdersManager settings={settings} primaryColor={primaryColor} />}
        {activeTab === 'history' && <AdminOrderHistory settings={settings} primaryColor={primaryColor} />}
        {activeTab === 'customers' && <AdminCustomers settings={settings} primaryColor={primaryColor} />}
        {activeTab === 'loyalty' && <AdminLoyalty settings={settings} primaryColor={primaryColor} />}
        {activeTab === 'whatsapp' && <AdminWhatsApp settings={settings} primaryColor={primaryColor} />}
        {activeTab === 'settings' && <AdminSettings settings={settings} primaryColor={primaryColor} />}
      </main>
    </div>
  );
}