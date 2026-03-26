import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings } from 'lucide-react';

export default function TotemWelcome({ settings, primaryColor, onStart, onOpenAdmin }) {
  const banners = settings?.welcome_banners?.filter(Boolean) || [];
  const hasBanners = banners.length > 0;
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!hasBanners || banners.length < 2) return;
    const interval = setInterval(() => {
      setCurrent(prev => (prev + 1) % banners.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [banners.length, hasBanners]);

  const bgStyle = hasBanners
    ? {}
    : settings?.background_url
    ? { backgroundImage: `url(${settings.background_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: `linear-gradient(135deg, ${primaryColor} 0%, ${settings?.secondary_color || '#EC4899'} 100%)` };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-8 cursor-pointer relative overflow-hidden"
      style={bgStyle}
      onClick={onStart}
    >
      {/* Banner carousel background */}
      {hasBanners && (
        <>
          <AnimatePresence>
            <motion.div
              key={current}
              className="absolute inset-0"
              initial={{ opacity: 0, x: 80 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -80 }}
              transition={{ duration: 0.7 }}
              style={{
                backgroundImage: `url(${banners[current]})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            />
          </AnimatePresence>
          {banners.length > 1 && (
            <div className="absolute bottom-36 left-1/2 -translate-x-1/2 z-20 flex gap-2">
              {banners.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setCurrent(i); }}
                  className={`w-3 h-3 rounded-full transition-all ${
                    i === current ? 'bg-white scale-125' : 'bg-white/50'
                  }`}
                />
              ))}
            </div>
          )}
        </>
      )}

      <div className="absolute inset-0 bg-black/40 z-10" />

      {/* Admin Button */}
      <button
        onClick={(e) => { e.stopPropagation(); onOpenAdmin(); }}
        className="hidden lg:block absolute top-6 right-6 z-20 p-2 bg-white/10 backdrop-blur-sm rounded-lg hover:bg-white/20 transition-all"
      >
        <Settings className="w-5 h-5 text-white" />
      </button>

      {/* CTA Button */}
      <motion.button
        onClick={onStart}
        className="relative z-20 px-8 py-4 rounded-2xl text-white font-extrabold text-xl md:text-2xl uppercase tracking-wide border-4 border-black"
        style={{
          backgroundColor: primaryColor,
          boxShadow: '6px 6px 0px 0px #000000'
        }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        whileHover={{ scale: 1.05, boxShadow: '8px 8px 0px 0px #000000' }}
        whileTap={{ scale: 0.97, boxShadow: '3px 3px 0px 0px #000000', x: 3, y: 3 }}
      >
        👆 Clique aqui para iniciar seu pedido
      </motion.button>
    </div>
  );
}