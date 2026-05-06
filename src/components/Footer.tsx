import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { MapPin, Phone, Mail, Instagram, Clock, Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Footer({ onOpenAdmin }: { onOpenAdmin: () => void }) {
  const [settings, setSettings] = useState({
    address: "Av. Central, 1234 - Centro, São Paulo, SP",
    phone: "(11) 98765-4321",
    email: "contato@barberpro.com",
    instagram: "barberpro_oficial",
    hoursWeekdays: "09:00 - 20:00",
    hoursSaturday: "08:00 - 18:00",
    hoursSunday: "Fechado"
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

    const sub = supabase.channel('footer-settings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, fetchSettings)
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, []);

  return (
    <footer id="contact" className="bg-charcoal border-t border-white/5 pt-20 pb-10 px-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 mb-20">
        <div>
          <div className="flex items-center gap-2 mb-6">
            <span className="font-display text-2xl font-bold tracking-tight text-white">BARBER<span className="text-gold">PRO</span></span>
          </div>
          <p className="text-gray-400 leading-relaxed mb-6 italic">
            "Mais que um corte, uma experiência de autocuidado e confiança."
          </p>
          <div className="flex gap-4">
            <a 
              href={`https://instagram.com/${settings.instagram.replace('@', '')}`} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="w-10 h-10 flex items-center justify-center border border-white/10 hover:border-gold hover:text-gold transition-all"
            >
              <Instagram className="w-5 h-5" />
            </a>
            <a href={`tel:${settings.phone.replace(/\D/g, '')}`} className="w-10 h-10 flex items-center justify-center border border-white/10 hover:border-gold hover:text-gold transition-all">
              <Phone className="w-5 h-5" />
            </a>
          </div>
        </div>

        <div>
          <h4 className="text-white font-bold mb-6 uppercase tracking-widest text-sm">Onde Estamos</h4>
          <ul className="space-y-4 text-gray-400">
            <li className="flex gap-3">
              <MapPin className="w-5 h-5 text-gold shrink-0" />
              <span className="whitespace-pre-line">{settings.address}</span>
            </li>
            <li className="flex gap-3">
              <Phone className="w-5 h-5 text-gold shrink-0" />
              <span>{settings.phone}</span>
            </li>
            <li className="flex gap-3">
              <Mail className="w-5 h-5 text-gold shrink-0" />
              <span>{settings.email}</span>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-bold mb-6 uppercase tracking-widest text-sm">Horários</h4>
          <ul className="space-y-4 text-gray-400">
            <li className="flex justify-between items-center bg-clay p-3 border-l-2 border-gold">
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4" /> Seg - Sex
              </span>
              <span className="text-white">{settings.hoursWeekdays}</span>
            </li>
            <li className="flex justify-between items-center p-3">
              <span>Sábado</span>
              <span className="text-white">{settings.hoursSaturday}</span>
            </li>
            <li className={`flex justify-between items-center p-3 ${settings.hoursSunday.toLowerCase() === 'fechado' ? 'opacity-50' : ''}`}>
              <span>Domingo</span>
              <span className="text-white">{settings.hoursSunday}</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto border-t border-white/5 pt-10 text-center text-gray-500 text-sm">
        <p>&copy; 2026 Barber Pro & Style. Todos os direitos reservados.</p>
      </div>
    </footer>
  );
}
