import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function BookingModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [services, setServices] = useState<any[]>([]);
  const [productsList, setProductsList] = useState<any[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    service: '',
    date: '',
    time: '',
    name: '',
    phone: '',
    products: [] as string[]
  });

  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        // Fetch Services
        const { data: sData } = await supabase.from('services').select('*').order('order', { ascending: true });
        if (sData) setServices(sData);

        // Fetch Products
        const { data: pData } = await supabase.from('products').select('*').order('order', { ascending: true });
        if (pData) setProductsList(pData);
      };
      fetchData();
    }
  }, [isOpen]);

  const toggleProduct = (product: any) => {
    setSelectedProducts(prev => {
      const exists = prev.find(p => p.id === product.id);
      if (exists) return prev.filter(p => p.id !== product.id);
      return [...prev, product];
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      console.log("Iniciando verificação de disponibilidade no Supabase...");
      // 1. Verificar se o horário já está ocupado
      const { data: existingAppts, error: checkError } = await supabase
        .from('appointments')
        .select('id')
        .eq('date', formData.date)
        .eq('time', formData.time);
      
      if (checkError) throw checkError;
      
      if (existingAppts && existingAppts.length > 0) {
        throw new Error("Este horário já está reservado. Por favor, escolha outro.");
      }

      console.log("Verificando cadastro de cliente no Supabase...");
      // 2. Verificar/Salvar Cliente
      const { data: customerData, error: custError } = await supabase
        .from('customers')
        .select('*')
        .eq('phone', formData.phone)
        .maybeSingle();

      if (custError) throw custError;

      if (!customerData) {
        console.log("Cadastrando novo cliente no Supabase...");
        const { error: insertCustError } = await supabase.from('customers').insert([{
          name: formData.name,
          phone: formData.phone,
          total_treatments: 0
        }]);
        if (insertCustError) throw insertCustError;
      }

      console.log("Criando agendamento no Supabase...");
      const selectedService = services.find(s => s.name === formData.service);
      const totalProdsPrice = selectedProducts.reduce((sum, p) => {
        const price = parseFloat(p.price.replace(/[^\d.,]/g, '').replace(',', '.'));
        return sum + (isNaN(price) ? 0 : price);
      }, 0);

      const { error: appointmentError } = await supabase.from('appointments').insert([{
        name: formData.name,
        phone: formData.phone,
        date: formData.date,
        time: formData.time,
        service: formData.service,
        service_price: selectedService?.price || "R$ 0",
        products: selectedProducts.map(p => p.name),
        total_products_price: totalProdsPrice,
        status: 'pending'
      }]);

      if (appointmentError) throw appointmentError;

      setStep(4);
    } catch (err: any) {
      console.error("Erro ao salvar agendamento:", err);
      setError(err.message || "Ocorreu um erro ao salvar seu agendamento. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-charcoal/95 backdrop-blur-sm"
      />
      
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative bg-clay border border-white/10 w-full max-w-lg overflow-hidden gold-shadow"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
          <X className="w-6 h-6" />
        </button>

        <div className="p-8">
          {step < 4 && (
            <div className="flex justify-center mb-8">
              <div className="flex items-center gap-4">
                <div className={`w-3 h-3 rounded-full ${step >= 1 ? 'bg-gold' : 'bg-white/10'}`} />
                <div className="w-8 h-[1px] bg-white/10" />
                <div className={`w-3 h-3 rounded-full ${step >= 2 ? 'bg-gold' : 'bg-white/10'}`} />
                <div className="w-8 h-[1px] bg-white/10" />
                <div className={`w-3 h-3 rounded-full ${step >= 3 ? 'bg-gold' : 'bg-white/10'}`} />
              </div>
            </div>
          )}

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <h3 className="text-2xl font-display font-bold text-white mb-2">Escolha o Serviço</h3>
                <p className="text-gray-500 text-xs mb-6 italic">Clique no serviço para avançar</p>
                <div className="grid grid-cols-1 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {services.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => { setFormData({...formData, service: s.name}); setStep(2); }}
                      className={`p-4 text-left border ${formData.service === s.name ? 'border-gold bg-gold/5 text-gold' : 'border-white/5 text-gray-400'} hover:border-gold/50 transition-all`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold">{s.name}</span>
                        <span className="text-gold font-display italic">{s.price}</span>
                      </div>
                      <p className="text-xs opacity-60 mt-1">{s.description}</p>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <h3 className="text-2xl font-display font-bold text-white mb-2">Adicionar Produtos?</h3>
                <p className="text-gray-500 text-xs mb-6 italic">Opcional: Melhore seu cuidado em casa</p>
                <div className="grid grid-cols-1 gap-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar mb-6">
                  {productsList.map((p) => {
                    const isSelected = selectedProducts.find(item => item.id === p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => toggleProduct(p)}
                        className={`p-4 text-left border ${isSelected ? 'border-gold bg-gold/5 text-gold' : 'border-white/5 text-gray-400'} hover:border-gold/50 transition-all`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-bold">{p.name}</span>
                          <span className="text-gold font-display italic">{p.price}</span>
                        </div>
                      </button>
                    );
                  })}
                  {productsList.length === 0 && (
                    <p className="text-gray-600 text-center py-4 italic">Nenhum produto disponível no momento.</p>
                  )}
                </div>
                <button 
                  onClick={() => setStep(3)}
                  className="w-full bg-gold py-4 font-bold text-charcoal hover:bg-white transition-all gold-shadow"
                >
                  Continuar para Agendamento
                </button>
                <button 
                  onClick={() => setStep(1)}
                  className="w-full text-gray-500 mt-4 text-xs hover:text-white transition-colors"
                >
                  Voltar para Serviços
                </button>
              </motion.div>
            )}

            {step === 3 && (
              <motion.form 
                key="step3"
                onSubmit={handleSubmit}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <h3 className="text-2xl font-display font-bold text-white mb-2">Seus Dados</h3>
                <p className="text-gray-500 text-xs mb-6 italic">Você escolheu: <strong>{formData.service}</strong> {selectedProducts.length > 0 && `+ ${selectedProducts.length} produto(s)`}</p>
                
                <div className="grid grid-cols-2 gap-4">
                  <input 
                    type="date" 
                    required
                    className="bg-charcoal border border-white/5 p-3 text-white focus:border-gold outline-none"
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                  />
                  <input 
                    type="time" 
                    required
                    className="bg-charcoal border border-white/5 p-3 text-white focus:border-gold outline-none"
                    onChange={(e) => setFormData({...formData, time: e.target.value})}
                  />
                </div>
                <input 
                  type="text" 
                  placeholder="Seu Nome" 
                  required
                  className="w-full bg-charcoal border border-white/5 p-3 text-white focus:border-gold outline-none"
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
                <input 
                  type="tel" 
                  placeholder="WhatsApp" 
                  required
                  className="w-full bg-charcoal border border-white/5 p-3 text-white focus:border-gold outline-none"
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
                
                {error && <p className="text-red-500 text-xs italic">{error}</p>}
                
                <div className="pt-4 flex gap-3">
                  <button 
                    type="button" 
                    disabled={isSubmitting}
                    onClick={() => setStep(2)}
                    className="flex-1 bg-white/5 py-4 font-bold text-white hover:bg-white/10 disabled:opacity-50"
                  >
                    Voltar
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="flex-1 bg-gold py-4 font-bold text-charcoal hover:bg-white transition-all gold-shadow flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Salvando...
                      </>
                    ) : 'Confirmar'}
                  </button>
                </div>
              </motion.form>
            )}

            {step === 4 && (
              <motion.div 
                key="step3"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center py-10"
              >
                <CheckCircle2 className="w-20 h-20 text-gold mx-auto mb-6" />
                <h3 className="text-3xl font-display font-bold text-white mb-4">Agendado!</h3>
                <p className="text-gray-400 mb-8 px-6">
                  Tudo certo, <strong>{formData.name}</strong>! Recebemos seu pedido para <strong>{formData.service}</strong> em <strong>{formData.date} às {formData.time}</strong>.
                </p>
                <button 
                  onClick={() => {
                    onClose();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="bg-gold px-10 py-4 font-bold text-charcoal hover:bg-white transition-all"
                >
                  Fechar
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
