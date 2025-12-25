import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, CreditCard, Heart } from 'lucide-react';

export default function PromoBanner({ settings }) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      icon: Gift,
      text: `A cada ${settings?.loyalty_target || 10} pedidos ganhe ${settings?.loyalty_reward_description || 'um brinde'}!`,
      bgGradient: 'from-purple-600 to-pink-600',
      iconColor: 'text-yellow-300'
    },
    {
      icon: CreditCard,
      text: settings?.payment_adjustments?.pix < 0 
        ? `${Math.abs(settings.payment_adjustments.pix)}% de desconto pagando no PIX` 
        : 'Pague com PIX e tenha mais vantagens',
      bgGradient: 'from-blue-600 to-cyan-600',
      iconColor: 'text-green-300'
    },
    {
      icon: Heart,
      text: 'Peça agora e acumule pontos de fidelidade!',
      bgGradient: 'from-pink-600 to-rose-600',
      iconColor: 'text-white'
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [slides.length]);

  return (
    <div className="relative h-24 w-full overflow-hidden rounded-2xl mb-6 shadow-lg">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide}
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
          transition={{ duration: 0.5 }}
          className={`absolute inset-0 bg-gradient-to-r ${slides[currentSlide].bgGradient} flex items-center justify-center px-8 gap-4`}
        >
          {React.createElement(slides[currentSlide].icon, {
            className: `w-12 h-12 ${slides[currentSlide].iconColor} flex-shrink-0`
          })}
          <p className="text-white text-xl md:text-2xl font-bold text-center">
            {slides[currentSlide].text}
          </p>
        </motion.div>
      </AnimatePresence>

      {/* Indicadores */}
      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-2">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`w-2 h-2 rounded-full transition-all ${
              index === currentSlide ? 'bg-white w-6' : 'bg-white/50'
            }`}
          />
        ))}
      </div>
    </div>
  );
}