import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Scissors } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Services() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchServices = async () => {
      const { data } = await supabase
        .from('services')
        .select('*')
        .order('order', { ascending: true });
      
      if (data) setServices(data);
      setLoading(false);
    };
    fetchServices();

    // Opcional: Escutar mudanças em tempo real
    const sub = supabase.channel('services-public')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'services' }, fetchServices)
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, []);

  if (loading) return null;

  return (
    <section id="services" className="py-24 bg-clay">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-4">Nossos Serviços</h2>
          <div className="w-20 h-1 bg-gold mx-auto" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
          {services.map((service, index) => (
            <motion.div 
              key={service.id}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="p-6 md:p-8 bg-charcoal border border-white/5 group hover:border-gold/50 transition-all rounded-xl"
            >
              <div className="text-gold mb-4 md:mb-6 group-hover:scale-110 transition-transform duration-300">
                <Scissors className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <h3 className="text-lg md:text-xl font-bold text-white mb-2">{service.name}</h3>
              <p className="text-gray-400 text-xs md:text-sm mb-4 md:mb-6 leading-relaxed">
                {service.description}
              </p>
              <div className="text-xl md:text-2xl font-bold text-gold font-display italic">
                {service.price}
              </div>
            </motion.div>
          ))}
          
          {services.length === 0 && (
            <p className="text-gray-500 col-span-full text-center py-10">Configure seus serviços no painel administrativo.</p>
          )}
        </div>
      </div>
    </section>
  );
}
