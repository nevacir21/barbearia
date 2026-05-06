import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';

export default function Hero({ onOpenBooking, isBookingEnabled = true }: { onOpenBooking: () => void, isBookingEnabled?: boolean }) {
  const [settings, setSettings] = useState({
    heroTitle: "Onde a barba para, o estilo começa.",
    heroSubtitle: "Tradição & Estilo",
    isBookingEnabled: true
  });

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'site_content')
        .maybeSingle();
      
      if (data && data.value) {
        setSettings({
          ...settings,
          ...data.value
        });
      }
    };
    fetchSettings();

    const sub = supabase.channel('hero-settings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, fetchSettings)
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, []);

  return (
    <section className="relative h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&q=80&w=2074" 
          alt="Barbershop interior" 
          className="w-full h-full object-cover opacity-40"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-linear-to-t from-charcoal via-transparent to-charcoal/40" />
      </div>

      <div className="relative z-10 text-center px-6">
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-gold uppercase tracking-[0.3em] font-medium mb-4"
        >
          {settings.heroSubtitle}
        </motion.p>
        
        <motion.h1 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="font-display text-5xl md:text-8xl font-bold text-white mb-8 leading-tight whitespace-pre-line"
        >
          {settings.heroTitle}
        </motion.h1>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col md:flex-row gap-4 justify-center items-center"
        >
          {isBookingEnabled && (
            <button 
              onClick={onOpenBooking}
              className="bg-gold text-charcoal px-10 py-4 text-lg font-bold hover:bg-white transition-all min-w-[200px] gold-shadow"
            >
              Agende Seu Horário
            </button>
          )}
          <a 
            href="#services"
            className="border border-white/20 px-10 py-4 text-lg font-bold hover:bg-white/10 transition-all min-w-[200px] text-white flex items-center justify-center"
          >
            Ver Catálogo
          </a>
        </motion.div>
      </div>

      {/* Decorative vertical line */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[1px] h-20 bg-linear-to-b from-gold to-transparent opacity-50 hidden md:block" />
    </section>
  );
}

