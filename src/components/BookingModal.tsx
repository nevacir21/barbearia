import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function BookingModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [step, setStep] = useState(0); // Começa no 0 para digitar o telefone
  const [existingAppointment, setExistingAppointment] = useState<any>(null);
  const [isCheckingPhone, setIsCheckingPhone] = useState(false);
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

  const resetModal = () => {
    setStep(0);
    setExistingAppointment(null);
    setFormData({ service: '', date: '', time: '', name: '', phone: '', products: [] });
    setSelectedProducts([]);
    setError(null);
  };

  useEffect(() => {
    if (isOpen) {
      resetModal();
      const fetchData = async () => {
        const { data: sData } = await supabase.from('services').select('*').order('order', { ascending: true });
        if (sData) setServices(sData);
        const { data: pData } = await supabase.from('products').select('*').order('order', { ascending: true });
        if (pData) setProductsList(pData);
      };
      fetchData();
    }
  }, [isOpen]);

  const checkPhoneAndProceed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.phone || formData.phone.length < 8) {
      setError("Por favor, digite um telefone válido.");
      return;
    }
    setIsCheckingPhone(true);
    setError(null);

    try {
      // Buscar se tem agendamento pendente/confirmado para hoje ou futuro
      const today = new Date().toISOString().split('T')[0];
      const { data, error: fetchErr } = await supabase
        .from('appointments')
        .select('*')
        .eq('phone', formData.phone)
        .gte('date', today)
        .order('date', { ascending: true })
        .limit(1);

      if (fetchErr) throw fetchErr;

      if (data && data.length > 0) {
        setExistingAppointment(data[0]);
        // Se já tem cadastro, pré-preeche o nome se disponível na tabela de customers
        const { data: cust } = await supabase.from('customers').select('name').eq('phone', formData.phone).maybeSingle();
        if (cust) setFormData(prev => ({ ...prev, name: cust.name }));
      } else {
        setStep(1); // Vai para serviços
      }
    } catch (err: any) {
      setError("Erro ao consultar agendamentos.");
    } finally {
      setIsCheckingPhone(false);
    }
  };

  const toggleProduct = (product: any) => {
    setSelectedProducts(prev => {
      const exists = prev.find(p => p.id === product.id);
      if (exists) return prev.filter(p => p.id !== product.id);
      return [...prev, product];
    });
  };

  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);

  const generateTimeSlots = () => {
    const slots = [];
    let current = 9 * 60; // 09:00 em minutos
    const last = 20 * 60; // 20:00 em minutos
    
    while (current < last) {
      const hours = Math.floor(current / 60);
      const minutes = current % 60;
      slots.push(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
      current += 30;
    }
    return slots;
  };

  useEffect(() => {
    if (formData.date) {
      const fetchBookedSlots = async () => {
        const { data } = await supabase
          .from('appointments')
          .select('time')
          .eq('date', formData.date);
        
        if (data) {
          const booked = data.map(d => d.time);
          setBookedSlots(booked);
          
          const allSlots = generateTimeSlots();
          setAvailableSlots(allSlots);
        }
      };
      fetchBookedSlots();
    }
  }, [formData.date]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.time) {
      setError("Por favor, selecione um horário disponível.");
      return;
    }
    setIsSubmitting(true);
    setError(null);

    try {
      // 1. Verificação de Segurança de Último Segundo
      console.log(`Buscando no banco: ${formData.date} - ${formData.time}`);
      const { data: doubleCheck, error: doubleCheckError } = await supabase
        .from('appointments')
        .select('id, name')
        .eq('date', formData.date)
        .eq('time', formData.time)
        .maybeSingle();

      if (doubleCheckError) {
        console.error("Erro na busca de segurança:", doubleCheckError);
      }

      if (doubleCheck) {
        console.log("Conflito real encontrado no banco:", doubleCheck);
        throw new Error(`Este horário já foi preenchido por ${doubleCheck.name}. Por favor, escolha outro.`);
      }

      console.log("Caminho livre! Gravando agendamento...");
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
                <div className={`w-3 h-3 rounded-full ${step >= 0 ? 'bg-gold' : 'bg-white/10'}`} />
                <div className="w-8 h-[1px] bg-white/10" />
                <div className={`w-3 h-3 rounded-full ${step >= 1 ? 'bg-gold' : 'bg-white/10'}`} />
                <div className="w-8 h-[1px] bg-white/10" />
                <div className={`w-3 h-3 rounded-full ${step >= 2 ? 'bg-gold' : 'bg-white/10'}`} />
                <div className="w-8 h-[1px] bg-white/10" />
                <div className={`w-3 h-3 rounded-full ${step >= 3 ? 'bg-gold' : 'bg-white/10'}`} />
              </div>
            </div>
          )}

          <AnimatePresence mode="wait">
            {step === 0 && !existingAppointment && (
              <motion.form 
                key="step0"
                onSubmit={checkPhoneAndProceed}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <h3 className="text-2xl font-display font-bold text-white mb-2">Bem-vindo(a)!</h3>
                <p className="text-gray-500 text-xs mb-6 italic">Digite seu WhatsApp para começar</p>
                <input 
                  type="tel" 
                  placeholder="WhatsApp (ex: 11987654321)" 
                  required
                  autoFocus
                  className="w-full bg-charcoal border border-white/5 p-4 text-white focus:border-gold outline-none mb-4 text-lg"
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
                {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}
                <button 
                  type="submit"
                  disabled={isCheckingPhone}
                  className="w-full bg-gold py-4 font-bold text-charcoal hover:bg-white transition-all gold-shadow flex items-center justify-center gap-2"
                >
                  {isCheckingPhone ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Continuar'}
                </button>
              </motion.form>
            )}

            {step === 0 && existingAppointment && (
              <motion.div 
                key="existing"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center"
              >
                <div className="bg-gold/10 p-6 border border-gold/30 mb-6">
                  <h3 className="text-xl font-display font-bold text-gold mb-2">Você já tem um agendamento!</h3>
                  <div className="text-white space-y-1 py-2">
                    <p className="text-lg"><strong>{existingAppointment.service}</strong></p>
                    <p className="opacity-80">Data: {new Date(existingAppointment.date).toLocaleDateString('pt-BR')}</p>
                    <p className="opacity-80">Hora: {existingAppointment.time}</p>
                  </div>
                </div>
                <p className="text-gray-400 mb-6 italic">Deseja prosseguir e agendar um novo horário?</p>
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => setStep(1)}
                    className="w-full bg-gold py-4 font-bold text-charcoal hover:bg-white transition-all"
                  >
                    Sim, agendar outro
                  </button>
                  <button 
                    onClick={onClose}
                    className="w-full bg-white/5 py-4 font-bold text-white hover:bg-white/10"
                  >
                    Não, apenas verifiquei
                  </button>
                </div>
              </motion.div>
            )}

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
                
                <div className="space-y-4">
                  <div className="relative">
                    <label className="text-xs text-gray-500 uppercase tracking-widest block mb-2">Data do Corte</label>
                    <input 
                      type="date" 
                      required
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full bg-charcoal border border-white/5 p-3 text-white focus:border-gold outline-none"
                      onChange={(e) => setFormData({...formData, date: e.target.value, time: ''})}
                    />
                  </div>

                  {formData.date && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                      <label className="text-xs text-gray-500 uppercase tracking-widest block mb-3">Horário Disponível</label>
                      <div className="grid grid-cols-4 gap-2 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                        {availableSlots.map((slot) => {
                          const isBooked = bookedSlots.includes(slot);
                          const isSelected = formData.time === slot;
                          
                          return (
                            <button
                              key={slot}
                              type="button"
                              disabled={isBooked}
                              onClick={() => setFormData({...formData, time: slot})}
                              className={`py-2 text-center text-sm border font-medium transition-all
                                ${isBooked ? 'border-white/5 text-gray-700 cursor-not-allowed opacity-30 strike-through' : 
                                  isSelected ? 'border-gold bg-gold text-charcoal' : 'border-white/10 text-gray-300 hover:border-gold/50'}`}
                            >
                              {slot}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <input 
                    type="text" 
                    placeholder="Seu Nome completo" 
                    required
                    value={formData.name}
                    className="w-full bg-charcoal border border-white/5 p-3 text-white focus:border-gold outline-none"
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                
                {error && <p className="text-red-500 text-xs italic bg-red-500/10 p-2 border-l-2 border-red-500">{error}</p>}
                
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
                    disabled={isSubmitting || !formData.time || !formData.date}
                    className="flex-1 bg-gold py-4 font-bold text-charcoal hover:bg-white transition-all gold-shadow flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Reservando...
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
