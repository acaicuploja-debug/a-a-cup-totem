import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import TotemHeader from '../TotemHeader';
import ProductCard from '../ProductCard';
import CartButton from '../CartButton';
import { Loader2 } from 'lucide-react';

export default function TotemProducts({ 
  settings, 
  primaryColor,
  category,
  onSelectProduct,
  onBack,
  onCartClick 
}) {
  const { data: rawProducts, isLoading } = useQuery({
    queryKey: ['products', category?.id],
    queryFn: () => base44.entities.Product.filter({ 
      category_id: category?.id, 
      active: true,
      is_upsell: false 
    }),
    enabled: !!category?.id
  });
  
  const products = React.useMemo(() => {
    if (!rawProducts) return [];
    return [...rawProducts].sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [rawProducts]);

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <TotemHeader 
        title={category?.name || 'Produtos'}
        showBack
        onBack={onBack}
        showCart
        onCartClick={onCartClick}
        primaryColor={primaryColor}
      />
      
      <main className="max-w-xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 
              className="w-10 h-10 animate-spin" 
              style={{ color: primaryColor }} 
            />
          </div>
        ) : products?.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg">
              Nenhum produto disponível nesta categoria
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {products?.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <ProductCard 
                  product={product}
                  onClick={() => onSelectProduct(product)}
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