import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import TotemHeader from '../TotemHeader';
import ProductCard from '../ProductCard';
import CartButton from '../CartButton';
import { Loader2 } from 'lucide-react';

export default function TotemCatalog({
  settings,
  primaryColor,
  onSelectProduct,
  onCartClick,
  onBack
}) {
  const [selectedCategory, setSelectedCategory] = useState(null);

  const { data: allCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => base44.entities.Category.filter({ active: true }, 'order')
  });

  const categories = useMemo(() => {
    return allCategories?.filter(cat => !cat.pdv_only) || [];
  }, [allCategories]);

  const { data: rawProducts, isLoading } = useQuery({
    queryKey: ['catalog-products', selectedCategory?.id],
    queryFn: async () => {
      const filter = { active: true, is_upsell: false, pdv_only: false };
      if (selectedCategory?.id) filter.category_id = selectedCategory.id;
      return base44.entities.Product.filter(filter);
    }
  });

  const products = useMemo(() => {
    if (!rawProducts) return [];
    return [...rawProducts].sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [rawProducts]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-28">
      <TotemHeader
        title={settings?.store_name || 'Cardápio'}
        logoUrl={settings?.logo_url}
        showCart
        onCartClick={onCartClick}
        primaryColor={primaryColor}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar de categorias */}
        <aside className="w-36 md:w-44 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col gap-1 p-2 overflow-y-auto">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`w-full text-left px-3 py-3 rounded-xl text-sm font-semibold transition-all ${
              !selectedCategory
                ? 'text-white shadow-md'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
            style={!selectedCategory ? { backgroundColor: primaryColor } : {}}
          >
            🏠 Todos
          </button>

          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat)}
              className={`w-full text-left px-3 py-3 rounded-xl text-sm font-semibold transition-all ${
                selectedCategory?.id === cat.id
                  ? 'text-white shadow-md'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              style={selectedCategory?.id === cat.id ? { backgroundColor: primaryColor } : {}}
            >
              {cat.image_url && (
                <img src={cat.image_url} alt={cat.name} className="w-8 h-8 object-cover rounded-lg mb-1 mx-auto" />
              )}
              <span className="block text-center leading-tight">{cat.name}</span>
            </button>
          ))}
        </aside>

        {/* Grid de produtos */}
        <main className="flex-1 overflow-y-auto p-4">
          {selectedCategory && (
            <h2 className="text-xl font-bold text-gray-800 mb-4">{selectedCategory.name}</h2>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-10 h-10 animate-spin" style={{ color: primaryColor }} />
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-500 text-lg">Nenhum produto disponível</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {products.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
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
      </div>

      <CartButton onClick={onCartClick} primaryColor={primaryColor} />
    </div>
  );
}