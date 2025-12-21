import React from 'react';
import { Sparkles, Star, TrendingUp, Tag } from 'lucide-react';

const badgeConfig = {
  promocao: { label: 'Promoção', icon: Tag, bg: 'bg-red-500', text: 'text-white' },
  novo: { label: 'Novo', icon: Sparkles, bg: 'bg-emerald-500', text: 'text-white' },
  mais_vendido: { label: 'Mais Vendido', icon: TrendingUp, bg: 'bg-amber-500', text: 'text-white' },
  oferta: { label: 'Oferta', icon: Star, bg: 'bg-purple-600', text: 'text-white' }
};

export default function ProductBadge({ type }) {
  const config = badgeConfig[type];
  if (!config) return null;
  
  const Icon = config.icon;
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}