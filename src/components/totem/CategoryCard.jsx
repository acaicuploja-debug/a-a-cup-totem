import React from 'react';
import { motion } from 'framer-motion';

export default function CategoryCard({ category, onClick, primaryColor }) {
  return (
    <motion.button
      onClick={onClick}
      className="relative w-full aspect-square rounded-3xl overflow-hidden shadow-xl group"
      whileTap={{ scale: 0.95 }}
      whileHover={{ scale: 1.02 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {category.image_url ? (
        <img 
          src={category.image_url} 
          alt={category.name}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div 
          className="absolute inset-0 w-full h-full"
          style={{ backgroundColor: primaryColor || '#6B21A8' }}
        />
      )}
      
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      
      <div className="absolute inset-0 flex items-end p-6">
        <h3 className="text-2xl md:text-3xl font-bold text-white drop-shadow-lg">
          {category.name}
        </h3>
      </div>
      
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity"
        style={{ backgroundColor: primaryColor || '#6B21A8' }}
      />
    </motion.button>
  );
}