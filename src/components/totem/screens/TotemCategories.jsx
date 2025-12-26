import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import TotemHeader from '../TotemHeader';
import CategoryCard from '../CategoryCard';
import CartButton from '../CartButton';
import PromoBanner from '../PromoBanner';
import { Loader2 } from 'lucide-react';

export default function TotemCategories({ 
  settings, 
  primaryColor, 
  onSelectCategory,
  onCartClick 
}) {
  const { data: allCategories, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => base44.entities.Category.filter({ active: true }, 'order')
  });

  const categories = React.useMemo(() => {
    return allCategories?.filter(cat => !cat.pdv_only) || [];
  }, [allCategories]);

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <TotemHeader 
        title={settings?.store_name || 'Açaí Cup'}
        logoUrl={settings?.logo_url}
        showCart
        onCartClick={onCartClick}
        primaryColor={primaryColor}
      />
      
      <main className="max-w-xl mx-auto px-4 py-6">
        <PromoBanner settings={settings} />
        
        <motion.h2 
          className="text-2xl font-bold text-gray-900 mb-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Escolha uma categoria
        </motion.h2>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 
              className="w-10 h-10 animate-spin" 
              style={{ color: primaryColor }} 
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {categories?.map((category, index) => (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <CategoryCard 
                  category={category}
                  onClick={() => onSelectCategory(category)}
                  primaryColor={primaryColor}
                />
              </motion.div>
            ))}
          </div>
        )}
      </main>
      
      <CartButton onClick={onCartClick} primaryColor={primaryColor} />
    </div>
  );
}