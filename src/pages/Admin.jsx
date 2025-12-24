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

export default function Admin() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const { data: settings, isLoading } = useQuery({
    queryKey: ['store-settings'],
    queryFn: async () => {
      const list = await base44.entities.StoreSettings.list();
      return list[0] || {};
    }
  });
  
  const primaryColor = settings?.primary_color || '#6B21A8';

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
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
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
      <main className="lg:ml-64 p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-10 h-10 border-4 border-gray-200 rounded-full"
              style={{ borderTopColor: primaryColor }}
            />
          </div>
        ) : (
          <>
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
          </>
        )}
      </main>
    </div>
  );
}