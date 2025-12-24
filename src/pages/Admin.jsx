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
  X
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
  { id: 'settings', label: 'Configurações', icon: Settings }
];

export default function Admin() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const { data: settings } = useQuery({
    queryKey: ['store-settings'],
    queryFn: async () => {
      const list = await base44.entities.StoreSettings.list();
      return list[0] || {};
    }
  });
  
  const primaryColor = settings?.primary_color || '#6B21A8';

  const renderContent = () => {
    try {
      switch (activeTab) {
        case 'dashboard':
          return <AdminDashboard settings={settings} primaryColor={primaryColor} />;
        case 'categories':
          return <AdminCategories settings={settings} primaryColor={primaryColor} />;
        case 'products':
          return <AdminProducts settings={settings} primaryColor={primaryColor} />;
        case 'upsell':
          return <AdminUpsell settings={settings} primaryColor={primaryColor} />;
        case 'coupons':
          return <AdminCoupons settings={settings} primaryColor={primaryColor} />;
        case 'orders':
          return <AdminOrdersManager settings={settings} primaryColor={primaryColor} />;
        case 'history':
          return <AdminOrderHistory settings={settings} primaryColor={primaryColor} />;
        case 'customers':
          return <AdminCustomers settings={settings} primaryColor={primaryColor} />;
        case 'loyalty':
          return <AdminLoyalty settings={settings} primaryColor={primaryColor} />;
        case 'settings':
          return <AdminSettings settings={settings} primaryColor={primaryColor} />;
        default:
          return <AdminDashboard settings={settings} primaryColor={primaryColor} />;
      }
    } catch (error) {
      return (
        <div className="p-8 bg-red-50 border border-red-200 rounded-xl">
          <h2 className="text-red-800 font-bold text-xl mb-2">Erro ao carregar componente</h2>
          <p className="text-red-600 mb-4">{error.message}</p>
          <button 
            onClick={() => setActiveTab('dashboard')}
            className="px-4 py-2 bg-red-600 text-white rounded-lg"
          >
            Voltar ao Dashboard
          </button>
        </div>
      );
    }
  };

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
        {renderContent()}
      </main>
    </div>
  );
}