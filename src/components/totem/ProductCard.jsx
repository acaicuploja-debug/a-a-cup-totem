import React from 'react';
import { motion } from 'framer-motion';
import ProductBadge from './ProductBadge';

export default function ProductCard({ product, onClick, primaryColor }) {
  const hasPromo = product.promo_price && product.promo_price < product.price;
  
  return (
    <motion.button
      onClick={onClick}
      className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow text-left w-full"
      whileTap={{ scale: 0.97 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="relative aspect-square">
        {product.image_url ? (
          <img 
            src={product.image_url} 
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div 
            className="w-full h-full flex items-center justify-center"
            style={{ backgroundColor: `${primaryColor}20` || '#6B21A820' }}
          >
            <span className="text-4xl">🍨</span>
          </div>
        )}
        
        {product.badges && product.badges.length > 0 && (
          <div className="absolute top-2 left-2 flex flex-wrap gap-1">
            {product.badges.map(badge => (
              <ProductBadge key={badge} type={badge} />
            ))}
          </div>
        )}
      </div>
      
      <div className="p-4">
        <h3 className="font-bold text-lg text-gray-900 mb-1 line-clamp-2">
          {product.name}
        </h3>
        
        {product.description && (
          <p className="text-gray-500 text-sm mb-3 line-clamp-2">
            {product.description}
          </p>
        )}
        
        <div className="flex items-baseline gap-2">
          {hasPromo ? (
            <>
              <span 
                className="text-xl font-bold"
                style={{ color: primaryColor || '#6B21A8' }}
              >
                R$ {product.promo_price.toFixed(2)}
              </span>
              <span className="text-sm text-gray-400 line-through">
                R$ {product.price.toFixed(2)}
              </span>
            </>
          ) : (
            <span 
              className="text-xl font-bold"
              style={{ color: primaryColor || '#6B21A8' }}
            >
              R$ {product.price.toFixed(2)}
            </span>
          )}
        </div>
      </div>
    </motion.button>
  );
}