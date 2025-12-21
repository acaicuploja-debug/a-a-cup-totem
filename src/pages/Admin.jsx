import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
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
import AdminOrders from '../components/admin/AdminOrders';
import AdminCustomers from '../components/admin/AdminCustomers';
import AdminSettings from '../components/admin/AdminSettings';
import AdminUpsell from '../components/admin/AdminUpsell';
import AdminLoyalty from '../components/admin/AdminLoyalty';

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'orders', label: 'Pedidos', icon: ShoppingBag },
  { id: 'categories', label: 'Categorias', icon: FolderOpen },
  { id: 'products', label: 'Produtos', icon: Package },
  { id: 'upsell', label: 'Upsell', icon: TrendingUp },
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
    switch (activeTab) {
      case 'dashboard':
        return <AdminDashboard settings={settings} primaryColor={primaryColor} />;
      case 'categories':
        return <AdminCategories settings={settings} primaryColor={primaryColor} />;
      case 'products':
        return <AdminProducts settings={settings} primaryColor={primaryColor} />;
      case 'upsell':
        return <AdminUpsell settings={settings} primaryColor={primaryColor} />;
      case 'orders':
        return <AdminOrders settings={settings} primaryColor={primaryColor} />;
      case 'customers':
        return <AdminCustomers settings={settings} primaryColor={primaryColor} />;
      case 'loyalty':
        return <AdminLoyalty settings={settings} primaryColor={primaryColor} />;
      case 'settings':
        return <AdminSettings settings={settings} primaryColor={primaryColor} />;
      default:
        return <AdminDashboard settings={settings} primaryColor={primaryColor} />;
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
        transform transition-transform duration-300 ease-in-out
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
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {renderContent()}
        </motion.div>
      </main>
    </div>
  );
}