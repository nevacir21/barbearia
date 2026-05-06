import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Services from './components/Services';
import Products from './components/Products';
import Footer from './components/Footer';
import BookingModal from './components/BookingModal';
import AdminPanel from './components/AdminPanel';

export default function App() {
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [satisfiedCount, setSatisfiedCount] = useState(500);
  const [isBookingEnabled, setIsBookingEnabled] = useState(true);

  const yearsOfExperience = new Date().getFullYear() - 2025;

  useEffect(() => {
    async function fetchSatisfiedCount() {
      try {
        const { count, error } = await supabase
          .from('cash_book')
          .select('*', { count: 'exact', head: true });
        
        if (!error && count !== null) {
          setSatisfiedCount(500 + count);
        }
      } catch (err) {
        console.error("Error fetching satisfied count:", err);
      }
    }

    fetchSatisfiedCount();

    const fetchBookingStatus = async () => {
      const { data } = await supabase.from('settings').select('value').eq('key', 'site_content').maybeSingle();
      if (data?.value) {
        setIsBookingEnabled(data.value.isBookingEnabled !== false);
      }
    };
    fetchBookingStatus();

    // Opcional: Escutar mudanças no table para atualizar em tempo real
    const channel = supabase
      .channel('site_settings_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, () => {
        fetchSatisfiedCount();
        fetchBookingStatus();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="min-h-screen bg-charcoal selection:bg-gold selection:text-charcoal relative">
      <Navbar 
        onOpenBooking={() => setIsBookingOpen(true)} 
        onOpenAdmin={() => setIsAdminOpen(true)}
        isBookingEnabled={isBookingEnabled}
      />
      <main>
        <Hero 
          onOpenBooking={() => setIsBookingOpen(true)} 
          isBookingEnabled={isBookingEnabled}
        />
        <Services />
        <Products />
        <section id="about" className="py-24 max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div className="relative group" onDoubleClick={() => setIsAdminOpen(true)}>
            <div className="absolute -inset-4 border-2 border-gold/20 translate-x-4 translate-y-4 group-hover:translate-x-2 group-hover:translate-y-2 transition-transform duration-500" />
            <img 
              src="https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=1000" 
              alt="Barbeiro trabalhando" 
              className="relative w-full aspect-square object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-6">A Arte da Excelência</h2>
            <p className="text-gray-400 text-lg leading-relaxed mb-8">
              Fundada em 2025, a Barber Pro nasceu do desejo de resgatar a tradição das barbearias clássicas, unindo técnica artesanal ao que há de mais moderno em produtos e estilo.
            </p>
            <p className="text-gray-400 text-lg leading-relaxed mb-10">
              Nossa equipe é formada por mestres barbeiros apaixonados pelo que fazem. Aqui, você não apenas corta o cabelo; você relaxa, toma uma boa cerveja e sai renovado.
            </p>
            <div className="grid grid-cols-2 gap-8">
              <div>
                <div className="text-3xl font-bold text-gold font-display mb-1">{yearsOfExperience}+</div>
                <div className="text-sm text-gray-500 uppercase tracking-widest">{yearsOfExperience === 1 ? 'Ano' : 'Anos'} de Experiência</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-gold font-display mb-1">{satisfiedCount}+</div>
                <div className="text-sm text-gray-500 uppercase tracking-widest">Clientes Satisfeitos</div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer onOpenAdmin={() => setIsAdminOpen(true)} />
      <BookingModal isOpen={isBookingOpen} onClose={() => setIsBookingOpen(false)} />
      <AdminPanel isOpen={isAdminOpen} onClose={() => setIsAdminOpen(false)} />
    </div>
  );
}

