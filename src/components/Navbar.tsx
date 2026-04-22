import { Scissors, Calendar, MapPin, Phone, Instagram, Facebook } from 'lucide-react';
import { motion } from 'motion/react';

export default function Navbar({ onOpenBooking, onOpenAdmin }: { onOpenBooking: () => void, onOpenAdmin: () => void }) {
  return (
    <nav className="fixed top-0 w-full z-50 glass-nav h-20 flex items-center">
      <div className="max-w-7xl mx-auto w-full px-6 flex justify-between items-center">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2 cursor-pointer"
          onClick={onOpenAdmin}
        >
          <Scissors className="text-gold w-8 h-8 rotate-45" />
          <span className="font-display text-2xl font-bold tracking-tight text-white uppercase italic">BARBER<span className="text-gold">PRO</span></span>
        </motion.div>
        
        <div className="hidden md:flex items-center gap-8 text-sm font-medium uppercase tracking-widest text-gray-400">
          <a href="#services" className="hover:text-gold transition-colors">Serviços</a>
          <a href="#about" className="hover:text-gold transition-colors">Sobre</a>
          <a href="#contact" className="hover:text-gold transition-colors">Contato</a>
          <button 
            onClick={onOpenBooking}
            className="bg-gold text-charcoal px-6 py-2.5 rounded-none font-bold hover:bg-white transition-all gold-shadow"
          >
            AGENDAR
          </button>
        </div>
      </div>
    </nav>
  );
}

