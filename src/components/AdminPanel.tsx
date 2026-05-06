import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { LogIn, LogOut, Check, X, Phone, Calendar as CalendarIcon, Clock, Trash2, ShoppingBag, LayoutDashboard, Scissors, Package, BookOpen, User as UserIcon, Lock, DollarSign, Wallet, Settings as SettingsIcon, ShoppingCart, CreditCard, Plus, Minus, Search, Loader2, Copy, RefreshCw, Edit, Handshake, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeCanvas } from 'qrcode.react';

export default function AdminPanel({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminConfig, setAdminConfig] = useState<any>(null);
  
  const [appointments, setAppointments] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [cashEntries, setCashEntries] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [siteSettings, setSiteSettings] = useState<any>({
    heroTitle: "Onde a barba para, o estilo começa.",
    heroSubtitle: "Tradição & Estilo",
    address: "Av. Central, 1234 - Centro, São Paulo, SP",
    phone: "(11) 98765-4321",
    email: "contato@barberpro.com",
    instagram: "barberpro_oficial",
    hoursWeekdays: "09:00 - 20:00",
    hoursSaturday: "08:00 - 18:00",
    hoursSunday: "Fechado",
    secondaryPassword: "",
    isBookingEnabled: true
  });
  
  const [isSecondaryVerified, setIsSecondaryVerified] = useState(false);
  const [secondaryInput, setSecondaryInput] = useState("");
  
  const [activeTab, setActiveTab] = useState<'appointments' | 'services' | 'products' | 'cash' | 'customers' | 'settings' | 'pos' | 'fiados'>('appointments');
  const [showMenu, setShowMenu] = useState(true);
  const [pendingFiadoId, setPendingFiadoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadTimeout, setLoadTimeout] = useState(false);
  
  // PDV States
  const [posCart, setPosCart] = useState<any[]>([]);
  const [posPaymentMethod, setPosPaymentMethod] = useState<'dinheiro' | 'cartão' | 'pix' | 'fiado'>('dinheiro');
  const [posAmountReceived, setPosAmountReceived] = useState<string>('');
  const [posCustomerPhone, setPosCustomerPhone] = useState<string>('');
  const [posCustomerName, setPosCustomerName] = useState<string>('');
  const [posSearchTerm, setPosSearchTerm] = useState('');
  const [posMobileStep, setPosMobileStep] = useState<'catalog' | 'checkout'>('catalog');
  const [isSimulatingPix, setIsSimulatingPix] = useState(false);
  const [pixKey, setPixKey] = useState<string>('');
  const [productImage, setProductImage] = useState<string>('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  const [editingService, setEditingService] = useState<any>(null);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [confirmPopup, setConfirmPopup] = useState<{ id: string, name: string, service: string, amount: number, apt: any } | null>(null);
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (alertMsg) {
      const timer = setTimeout(() => {
        setAlertMsg(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [alertMsg]);

  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoadTimeout(true);
    }, 4000);

    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsAdminLoggedIn(true);
        setAdminConfig({ username: session.user.email });
      }
    };
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setIsAdminLoggedIn(true);
        setAdminConfig({ username: session.user.email });
      } else {
        setIsAdminLoggedIn(false);
        setAdminConfig(null);
      }
    });

    setLoading(false);
    clearTimeout(timer);

    return () => {
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      setIsSecondaryVerified(false);
      setSecondaryInput("");
      setLoginUser("");
      setLoginPass("");
    } else {
      // Também limpar ao fechar por segurança
      setSecondaryInput("");
      setLoginUser("");
      setLoginPass("");
    }
  }, [isOpen]);

  useEffect(() => {
    if (isAdminLoggedIn && isOpen) {
      const fetchData = async () => {
        // Initial Fetch
        const { data: apts } = await supabase.from('appointments').select('*').order('created_at', { ascending: false });
        if (apts) setAppointments(apts);

        const { data: servs } = await supabase.from('services').select('*').order('order', { ascending: true });
        if (servs) setServices(servs);

        const { data: prods } = await supabase.from('products').select('*').order('order', { ascending: true });
        if (prods) setProducts(prods);

        const { data: cash } = await supabase.from('cash_book').select('*').order('date', { ascending: false });
        if (cash) setCashEntries(cash);

        const { data: cust } = await supabase.from('customers').select('*').order('name', { ascending: true });
        if (cust) setCustomers(cust);

        const { data: sSet } = await supabase.from('settings').select('*').eq('key', 'site_content').maybeSingle();
        if (sSet) {
          setSiteSettings(sSet.value);
          if (sSet.value.pixKey) setPixKey(sSet.value.pixKey);
        }
      };

      fetchData();

      // Realtime Subscriptions
      const appointmentsSub = supabase.channel('appointments-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, fetchData)
        .subscribe();
      const servicesSub = supabase.channel('services-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'services' }, fetchData)
        .subscribe();
      const productsSub = supabase.channel('products-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, fetchData)
        .subscribe();
      const cashSub = supabase.channel('cash-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'cash_book' }, fetchData)
        .subscribe();
      const customersSub = supabase.channel('customers-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, fetchData)
        .subscribe();
      const settingsSub = supabase.channel('settings-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, fetchData)
        .subscribe();

      return () => {
        supabase.removeChannel(appointmentsSub);
        supabase.removeChannel(servicesSub);
        supabase.removeChannel(productsSub);
        supabase.removeChannel(cashSub);
        supabase.removeChannel(customersSub);
        supabase.removeChannel(settingsSub);
      };
    }
  }, [isAdminLoggedIn, isOpen]);

  const handleCustomLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsProcessing("login");
    const email = loginUser.trim().toLowerCase();
    const password = loginPass.trim();

    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) throw loginError;
      
      setAlertMsg({ type: 'success', text: "Acesso liberado!" });
    } catch (err: any) {
      console.error("Falha no login:", err);
      let errorMsg = err.message;
      if (errorMsg === "Invalid login credentials") errorMsg = "E-mail ou senha incorretos.";
      setAlertMsg({ type: 'error', text: errorMsg });
    } finally {
      setIsProcessing(null);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setIsSecondaryVerified(false);
    setSecondaryInput("");
    setLoginUser("");
    setLoginPass("");
  };

  const extractPrice = (priceStr: any) => {
    if (typeof priceStr !== 'string') return 0;
    const num = parseFloat(priceStr.replace(/[^\d.,]/g, '').replace(',', '.'));
    return isNaN(num) ? 0 : num;
  };

  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const confirmAndArchive = async (apt: any) => {
    if (!isAdminLoggedIn) {
      setAlertMsg({ type: 'error', text: "Erro: Você não está autenticado." });
      return;
    }

    const serviceObj = services.find(s => s.name === apt.service);
    const servicePriceStr = serviceObj ? serviceObj.price : (apt.service_price || "R$ 0");
    let amount = extractPrice(servicePriceStr);
    if (apt.total_products_price) amount += Number(apt.total_products_price);

    setConfirmPopup({ id: apt.id, name: apt.name, service: apt.service, amount, apt });
  };

  const handleFinalConfirm = async () => {
    if (!confirmPopup) return;
    const { apt, amount } = confirmPopup;
    
    setIsProcessing(apt.id);
    setConfirmPopup(null);
    try {
      // 1. Lançar no caixa
      const { error: cashError } = await supabase.from('cash_book').insert([{
        client_name: apt.name,
        service: apt.service,
        products: apt.products || [],
        amount: amount,
        details: `Concluído em ${new Date().toLocaleDateString()} (Agendado para ${apt.date})`
      }]);
      if (cashError) throw cashError;

      // 2. Atualizar estatísticas do Cliente
      const { data: customerData } = await supabase
        .from('customers')
        .select('*')
        .eq('phone', apt.phone)
        .maybeSingle();

      if (customerData) {
        await supabase.from('customers').update({
          total_treatments: (customerData.total_treatments || 0) + 1,
          last_visit: new Date().toISOString(),
          last_service: apt.service
        }).eq('id', customerData.id);
      }

      // 3. Deletar agendamento
      await supabase.from('appointments').delete().eq('id', apt.id);

      setAlertMsg({ type: 'success', text: "Lançado no caixa com sucesso!" });
    } catch (err: any) {
      setAlertMsg({ type: 'error', text: `Erro: ${err.message}` });
    } finally {
      setIsProcessing(null);
    }
  };

  const deleteAppointment = async (id: string) => {
    if (confirm("Deseja realmente excluir este agendamento sem lançar no caixa?")) {
      await supabase.from('appointments').delete().eq('id', id);
    }
  };

  const saveService = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing("save_service");
    const data = new FormData(e.target as HTMLFormElement);
    const serviceData = {
      name: data.get('name') as string,
      price: data.get('price') as string,
      description: data.get('description') as string,
      order: Number(data.get('order')) || 0,
    };

    try {
      if (editingService?.id) {
        const { error } = await supabase.from('services').update(serviceData).eq('id', editingService.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('services').insert([serviceData]);
        if (error) throw error;
      }
      setAlertMsg({ type: 'success', text: "Serviço salvo com sucesso!" });
      setEditingService(null);
      (e.target as HTMLFormElement).reset();
    } catch (err: any) {
      console.error("Erro ao salvar serviço:", err);
      let errorMsg = err.message;
      if (errorMsg === "Failed to fetch") {
        errorMsg = "Erro de Conexão: Verifique se as Variáveis de Ambiente (URL/KEY) foram configuradas no painel da Vercel.";
      }
      setAlertMsg({ type: 'error', text: errorMsg });
    } finally {
      setIsProcessing(null);
    }
  };

  const deleteService = async (id: string) => {
    if (confirm("Excluir este serviço? Isso não afetará agendamentos já feitos.")) {
      try {
        const { error } = await supabase.from('services').delete().eq('id', id);
        if (error) throw error;
        setAlertMsg({ type: 'success', text: "Serviço excluído!" });
      } catch (err: any) {
        setAlertMsg({ type: 'error', text: `Erro ao excluir: ${err.message}` });
      }
    }
  };

  const saveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing("save_product");
    const data = new FormData(e.target as HTMLFormElement);
    const productData: any = {
      name: data.get('name') as string,
      price: data.get('price') as string,
      description: data.get('description') as string,
      image: productImage || data.get('image_url') as string,
      order: Number(data.get('order')) || 0,
    };

    try {
      const stockData = {
        stock_quantity: Number(data.get('stock_quantity')) || 0,
        min_quantity: Number(data.get('min_quantity')) || 0,
      };

      const performSave = async (payload: any) => {
        if (editingProduct?.id) {
          return await supabase.from('products').update(payload).eq('id', editingProduct.id);
        } else {
          return await supabase.from('products').insert([payload]);
        }
      };

      // Tenta salvar com estoque primeiro
      let result = await performSave({ ...productData, ...stockData });
      
      // Se falhar porque as colunas de estoque não existem, tenta salvar apenas com os dados básicos
      if (result.error && (
        result.error.message.includes("column \"stock_quantity\" does not exist") || 
        result.error.message.includes("column \"min_quantity\" does not exist") ||
        result.error.message.includes("schema cache")
      )) {
        console.warn("Colunas de estoque não encontradas no banco, salvando apenas dados básicos.");
        result = await performSave(productData);
      }

      if (result.error) throw result.error;

      setAlertMsg({ type: 'success', text: "Produto salvo com sucesso!" });
      setEditingProduct(null);
      setProductImage('');
      (e.target as HTMLFormElement).reset();
    } catch (err: any) {
      console.error("Erro ao salvar produto:", err);
      let errorMsg = err.message;
      if (errorMsg.includes("column \"stock_quantity\" does not exist")) {
        errorMsg = "Erro: Colunas de estoque não existem no banco. Se desejar usar estoque, adicione-as na tabela 'products'.";
      } else if (errorMsg === "Failed to fetch" || errorMsg.includes("Failed to fetch")) {
        errorMsg = "Erro de Conexão: Tente novamente.";
      }
      setAlertMsg({ type: 'error', text: errorMsg });
    } finally {
      setIsProcessing(null);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProductImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const deleteProduct = async (id: string) => {
    if (confirm("Excluir esta mercadoria?")) {
      try {
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) throw error;
        setAlertMsg({ type: 'success', text: "Produto excluído!" });
      } catch (err: any) {
        setAlertMsg({ type: 'error', text: `Erro ao excluir: ${err.message}` });
      }
    }
  };

  const finalizePixSale = async () => {
    setIsProcessing('pos_finalize');
    try {
      const total = posCart.reduce((sum, item) => sum + extractPrice(item.price), 0);
      const servicesInCart = posCart.filter(i => i.type === 'service').map(i => i.name).join(', ');
      const productsInCart = posCart.filter(i => i.type === 'product').map(i => i.name);
      
      const { error } = await supabase.from('cash_book').insert([{
        client_name: posCustomerName || 'Venda PDV (PIX)',
        service: servicesInCart || 'Venda Avulsa',
        products: productsInCart,
        amount: total,
        details: `Venda via PDV (PIX - QR Code)${pendingFiadoId ? ' - LIQUIDAÇÃO DE FIADO' : ''}`
      }]);
      if (error) throw error;

      if (pendingFiadoId) {
        await supabase.from('cash_book')
          .update({ details: `Dívida Liquidada em ${new Date().toLocaleDateString()} via PDV PIX` })
          .eq('id', pendingFiadoId);
        
        // Atualiza o estado local para remover da lista de pendentes e atualizar totais
        setCashEntries(prev => prev.map(entry => 
          entry.id === pendingFiadoId 
            ? { ...entry, details: `Dívida Liquidada em ${new Date().toLocaleDateString()} via PDV PIX` } 
            : entry
        ));
        
        setPendingFiadoId(null);
      }

      if (posCustomerPhone && posCustomerName) {
        const { data: customer } = await supabase.from('customers').select('*').eq('phone', posCustomerPhone).maybeSingle();
        if (customer) {
           await supabase.from('customers').update({
             total_treatments: (customer.total_treatments || 0) + (servicesInCart ? 1 : 0),
             last_visit: new Date().toISOString(),
             last_service: servicesInCart || customer.last_service
           }).eq('id', customer.id);
        } else {
           await supabase.from('customers').insert([{
             name: posCustomerName,
             phone: posCustomerPhone,
             total_treatments: servicesInCart ? 1 : 0,
             last_visit: new Date().toISOString(),
             last_service: servicesInCart
           }]);
        }
      }

      setAlertMsg({ type: 'success', text: "Pagamento PIX confirmado e venda finalizada!" });
      setPosCart([]);
      setPosAmountReceived('');
      setPosCustomerName('');
      setPosCustomerPhone('');
      setPosMobileStep('catalog');
      setPosPaymentMethod('dinheiro');
    } catch (err: any) {
      setAlertMsg({ type: 'error', text: err.message });
    } finally {
      setIsProcessing(null);
      setIsSimulatingPix(false);
    }
  };

  const getPixPayload = () => {
    const total = posCart.reduce((sum, item) => sum + extractPrice(item.price), 0).toFixed(2);
    const key = (pixKey || 'Sua Chave Aqui').trim();
    
    // Função auxiliar para formatar campos EMV (ID + Tamanho + Valor)
    const f = (id: string, val: string) => `${id}${val.length.toString().padStart(2, '0')}${val}`;
    
    // 26: Merchant Account Information
    const merchantInfo = f('00', 'br.gov.bcb.pix') + f('01', key);
    
    // Montando o payload base
    let payload = f('00', '01');                   // 00: Payload Format Indicator
    payload += f('26', merchantInfo);              // 26: Merchant Account Information
    payload += f('52', '0000');                    // 52: Merchant Category Code
    payload += f('53', '986');                     // 53: Transaction Currency (BRL)
    payload += f('54', total);                     // 54: Transaction Amount
    payload += f('58', 'BR');                      // 58: Country Code
    payload += f('59', 'BARBEARIA PRO');           // 59: Merchant Name
    payload += f('60', 'SAO PAULO');               // 60: Merchant City
    payload += f('62', f('05', '***'));            // 62: Additional Data Field (ID 05: Reference Label)
    
    // 63: CRC16 (ID 63 + Tamanho 04)
    payload += '6304';
    
    // Cálculo do CRC16 CCITT (Polinômio 0x1021, Valor Inicial 0xFFFF)
    let crc = 0xFFFF;
    for (let i = 0; i < payload.length; i++) {
        crc ^= (payload.charCodeAt(i) << 8);
        for (let j = 0; j < 8; j++) {
            if ((crc & 0x8000) !== 0) {
                crc = (crc << 1) ^ 0x1021;
            } else {
                crc <<= 1;
            }
        }
    }
    const finalCrc = (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
    
    return payload + finalCrc;
  };

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing("settings");
    const data = new FormData(e.target as HTMLFormElement);
    const newSettings = {
      heroTitle: data.get('heroTitle') as string,
      heroSubtitle: data.get('heroSubtitle') as string,
      pixKey: data.get('pixKey') as string,
      address: data.get('address') as string,
      phone: data.get('phone') as string,
      email: data.get('email') as string,
      instagram: data.get('instagram') as string,
      hoursWeekdays: data.get('hoursWeekdays') as string,
      hoursSaturday: data.get('hoursSaturday') as string,
      hoursSunday: data.get('hoursSunday') as string,
      secondaryPassword: data.get('secondaryPassword') as string,
      isBookingEnabled: data.get('isBookingEnabled') === 'true'
    };

    try {
      const { error } = await supabase.from('settings').upsert([{ key: 'site_content', value: newSettings }]);
      if (error) throw error;
      setSiteSettings(newSettings);
      setPixKey(newSettings.pixKey);
      setAlertMsg({ type: 'success', text: "Configurações salvas!" });
    } catch (err: any) {
      console.error("Erro ao salvar configurações:", err);
      let errorMsg = err.message;
      if (errorMsg === "Failed to fetch" || errorMsg.includes("Failed to fetch")) {
        errorMsg = "Erro de Conexão: Verifique se as Variáveis de Ambiente (URL/KEY) foram configuradas no painel da Vercel.";
      }
      setAlertMsg({ type: 'error', text: errorMsg });
    } finally {
      setIsProcessing(null);
    }
  };

  if (!isOpen) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 z-[600] bg-charcoal flex flex-col items-center justify-center p-6 text-center">
        <div className="text-gold animate-pulse font-display text-xl uppercase tracking-widest mb-4">Carregando Painel...</div>
        {loadTimeout && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4">
             <button 
              onClick={() => {
                setLoading(false);
              }}
              className="px-4 py-2 bg-gold/10 text-gold border border-gold/30 text-[10px] uppercase tracking-widest font-bold rounded-lg hover:bg-gold hover:text-charcoal transition-all"
             >
               Forçar Tela de Login
             </button>
             <p className="text-[9px] text-gray-500 mt-4 max-w-[200px] mx-auto italic">O banco de dados está demorando. Você pode clicar acima para entrar mesmo assim.</p>
          </motion.div>
        )}
        <button onClick={onClose} className="text-gray-600 text-[10px] uppercase tracking-widest mt-12 hover:text-white transition-colors">Voltar para o Site</button>
      </div>
    );
  }

  // Login Screens
  if (!isAdminLoggedIn) {
    return (
      <div className="fixed inset-0 z-[500] bg-charcoal/95 backdrop-blur-xl flex items-center justify-center p-6">
        <button onClick={onClose} className="absolute top-6 right-6 p-2 text-gray-500 hover:text-white transition-colors">
          <X className="w-8 h-8" />
        </button>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-clay border border-white/10 p-8 shadow-2xl"
        >
          <div className="text-center mb-8">
            <h2 className="font-display text-3xl font-bold text-white mb-2">Painel do Barbeiro</h2>
            <p className="text-gray-500 text-sm">
              Identifique-se para gerenciar sua barbearia
            </p>
          </div>

          <div className="space-y-6">
            <form onSubmit={handleCustomLogin} className="space-y-4" autoComplete="off">
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest text-gray-500 block ml-1">E-mail de Acesso</label>
                  <input 
                    name="email" 
                    type="email"
                    value={loginUser}
                    onChange={(e) => setLoginUser(e.target.value)}
                    placeholder="email@exemplo.com" 
                    required 
                    autoComplete="off"
                    className="w-full bg-charcoal border border-white/10 px-4 py-4 text-white outline-none focus:border-gold transition-all text-sm" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest text-gray-500 block ml-1">Senha Secreta</label>
                  <input 
                    name="password" 
                    type="password" 
                    value={loginPass}
                    onChange={(e) => setLoginPass(e.target.value)}
                    placeholder="******" 
                    required 
                    autoComplete="new-password"
                    className="w-full bg-charcoal border border-white/10 px-4 py-4 text-white outline-none focus:border-gold transition-all text-sm" 
                  />
                </div>
              </div>

              <div className="pt-2">
                <button 
                  type="submit" 
                  disabled={isProcessing === "login"}
                  className="w-full bg-gold text-charcoal font-black py-5 hover:bg-white transition-all uppercase tracking-[0.2em] text-xs gold-shadow flex items-center justify-center gap-2"
                >
                  {isProcessing === "login" ? "Autenticando..." : "Entrar no Painel"}
                </button>
              </div>
            </form>
          </div>
          
          <button onClick={onClose} className="w-full text-gray-600 text-[10px] uppercase tracking-widest mt-12 hover:text-white transition-colors">
            &larr; Voltar para o Site
          </button>
        </motion.div>
      </div>
    );
  }

  // Segunda Senha de Proteção (Lock Screen)
  if (isAdminLoggedIn && siteSettings.secondaryPassword && !isSecondaryVerified) {
    return (
      <div className="fixed inset-0 z-[700] bg-charcoal/98 backdrop-blur-2xl flex items-center justify-center p-6 text-white text-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm"
        >
          <div className="w-20 h-20 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-gold/20">
            <Lock className="w-10 h-10 text-gold" />
          </div>
          <h2 className="font-display text-3xl font-bold uppercase tracking-widest mb-2 italic">Acesso Restrito</h2>
          <p className="text-gray-500 text-sm mb-10 tracking-widest uppercase">Digite a senha de proteção para entrar</p>
          
          <div className="flex justify-center gap-4 mb-10">
            {[0, 1, 2, 3].map((i) => (
              <div 
                key={i} 
                className={`w-4 h-4 rounded-full border-2 transition-all ${secondaryInput.length > i ? 'bg-gold border-gold scale-125' : 'border-white/10'}`}
              ></div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-4 max-w-[280px] mx-auto">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, 'OK'].map((inputKey) => (
              <button
                key={inputKey}
                onClick={() => {
                  if (inputKey === 'C') {
                    setSecondaryInput("");
                  } else if (inputKey === 'OK') {
                    if (secondaryInput === siteSettings.secondaryPassword) {
                      setIsSecondaryVerified(true);
                      setAlertMsg({ type: 'success', text: 'Acesso Protegido Liberado!' });
                    } else {
                      setSecondaryInput("");
                      setAlertMsg({ type: 'error', text: 'Senha Incorreta!' });
                    }
                  } else if (secondaryInput.length < 8) {
                    const newValue = secondaryInput + inputKey;
                    setSecondaryInput(newValue);
                    if (newValue === siteSettings.secondaryPassword) {
                      setIsSecondaryVerified(true);
                      setAlertMsg({ type: 'success', text: 'Acesso Protegido Liberado!' });
                    }
                  }
                }}
                className={`h-16 flex items-center justify-center rounded-xl text-xl font-bold transition-all ${
                  inputKey === 'OK' ? 'bg-gold text-charcoal' : 
                  inputKey === 'C' ? 'bg-red-500/10 text-red-500' : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                {inputKey}
              </button>
            ))}
          </div>

          <button 
            onClick={onClose} 
            className="mt-12 text-gray-600 hover:text-white text-[10px] uppercase tracking-[0.2em] transition-all"
          >
            &larr; Voltar ao Início
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[400] bg-charcoal flex flex-col shadow-2xl overflow-hidden text-white">
      {/* Aviso de Configuração Faltante na Vercel */}
      {!import.meta.env.VITE_SUPABASE_URL && (
        <div className="absolute top-0 left-0 right-0 bg-red-600 text-white text-[10px] font-bold uppercase tracking-[0.2em] py-3 px-4 z-[1000] text-center shadow-2xl flex items-center justify-center gap-3">
          <Package className="w-3 h-3" />
          Atenção: Supabase não configurado. Adicione VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no painel da Vercel.
        </div>
      )}
      
      {/* POPUPS DE CONFIRMAÇÃO E ALERTA */}
      <AnimatePresence>
        {confirmPopup && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[500] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-clay border border-gold/30 p-8 max-w-sm w-full text-center gold-shadow rounded-2xl"
            >
              <div className="w-16 h-16 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Scissors className="text-gold w-8 h-8 rotate-45" />
              </div>
              <h3 className="text-2xl font-display font-bold text-white mb-2 uppercase italic text-gold">Concluir?</h3>
              <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                Lançar <span className="text-white font-bold">R$ {confirmPopup.amount.toFixed(2)}</span> no caixa de <span className="text-white font-bold uppercase">{confirmPopup.name}</span>?
              </p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleFinalConfirm} 
                  className="w-full py-4 bg-gold text-charcoal font-black uppercase text-xs tracking-[0.2em] hover:bg-white transition-all rounded-lg"
                >
                  Sim, Concluir
                </button>
                <button 
                  onClick={() => setConfirmPopup(null)} 
                  className="w-full py-4 border border-white/10 text-gray-500 font-bold uppercase text-[10px] tracking-widest hover:text-white transition-all"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {alertMsg && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-6 right-6 z-[510] flex justify-center"
          >
            <div className={`px-8 py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl flex items-center gap-3 border ${alertMsg.type === 'success' ? 'bg-gold text-charcoal border-gold' : 'bg-red-600 text-white border-white/20'}`}>
              {alertMsg.type === 'success' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
              {alertMsg.text}
              <button onClick={() => setAlertMsg(null)} className="ml-4 opacity-50"><X className="w-4 h-4" /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER / MENU SUPERIOR */}
      <header className={`w-full bg-[#1a1a1a] border-b border-white/5 flex flex-col z-[450] ${activeTab === 'pos' ? 'hidden md:flex' : 'flex'}`}>
        <div className="flex h-16 md:h-20 bg-[#1a1a1a] items-center justify-between px-6 border-b border-white/5">
          {!showMenu ? (
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setShowMenu(true)}
                  className="p-2 bg-gold/10 rounded-lg border border-gold/20 text-gold hover:bg-gold/20 transition-all"
                >
                  <Scissors className="w-5 h-5 rotate-45" />
                </button>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-gold font-bold">Visualizando</span>
                  <h2 className="font-display text-lg font-bold text-white uppercase tracking-widest italic">
                    {activeTab === 'appointments' ? 'Agenda' : 
                     activeTab === 'services' ? 'Serviços' :
                     activeTab === 'products' ? 'Vendas' :
                     activeTab === 'cash' ? 'Caixa' :
                     activeTab === 'fiados' ? 'Fiados' :
                     activeTab === 'customers' ? 'Clientes' :
                     activeTab === 'settings' ? 'Ajustes' : 'Painel'}
                  </h2>
                </div>
              </div>
              <button 
                onClick={() => setShowMenu(true)} 
                className="text-gray-400 hover:text-white p-2 bg-white/5 rounded-lg border border-white/5 flex items-center gap-2 transition-all hover:border-white/20"
              >
                <span className="text-[10px] font-bold uppercase tracking-widest hidden md:block">Menu</span>
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setShowMenu(false)}
                  className="p-2 rounded-lg bg-gold text-charcoal transition-all shadow-lg shadow-gold/20"
                  title="Fechar Menu"
                >
                  <Scissors className="w-5 h-5" />
                </button>
                <div className="flex flex-col">
                  <h2 className="font-display text-xl md:text-2xl font-bold text-white leading-tight">Barber <span className="text-gold">Pro</span></h2>
                  <p className="text-[9px] uppercase tracking-[0.2em] text-gray-500">Admin Dashboard</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                 {/* Sair Desk */}
                 <button onClick={logout} className="hidden md:flex items-center gap-2 px-4 py-2 text-gray-500 hover:text-red-400 transition-all text-xs font-bold uppercase tracking-widest bg-white/5 rounded-lg border border-white/5">
                    <LogOut className="w-3 h-3" /> Sair
                 </button>
                 <button onClick={onClose} className="text-gray-600 hover:text-white p-2 bg-white/5 rounded-lg border border-white/5 transition-all hover:border-white/20"><X className="w-5 h-5" /></button>
              </div>
            </>
          )}
        </div>

        <AnimatePresence>
          {showMenu && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-[#121212] border-b border-white/5 overflow-hidden"
            >
              <nav className="flex flex-wrap md:flex-row items-center justify-center gap-2 p-4 md:p-6 no-scrollbar">
                <button 
                  onClick={() => { setActiveTab('pos'); setShowMenu(false); }}
                  className={`flex-1 md:flex-none flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-4 px-4 py-3 md:py-4 transition-all ${activeTab === 'pos' ? 'text-gold md:bg-gold md:text-charcoal font-bold md:rounded-lg' : 'text-gray-500 hover:text-white md:hover:bg-white/5'}`}
                >
                  <ShoppingCart className="w-5 h-5" />
                  <span className="text-[10px] md:text-sm font-bold md:font-semibold uppercase md:capitalize tracking-widest md:tracking-normal">PDV / Vendas</span>
                </button>

                <button 
                  onClick={() => { setActiveTab('appointments'); setShowMenu(false); }}
                  className={`flex-1 md:flex-none flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-4 px-4 py-3 md:py-4 transition-all group ${activeTab === 'appointments' ? 'text-gold md:bg-gold md:text-charcoal font-bold md:rounded-lg' : 'text-gray-500 hover:text-white md:hover:bg-white/5'}`}
                >
                  <LayoutDashboard className="w-5 h-5" />
                  <span className="text-[10px] md:text-sm font-bold md:font-semibold uppercase md:capitalize tracking-widest md:tracking-normal">Agenda</span>
                  {appointments.length > 0 && activeTab !== 'appointments' && (
                    <span className="hidden md:block ml-auto bg-gold text-charcoal text-[10px] px-2 py-0.5 rounded-full font-bold">
                      {appointments.length}
                    </span>
                  )}
                </button>
                
                <button 
                  onClick={() => { setActiveTab('services'); setShowMenu(false); }}
                  className={`flex-1 md:flex-none flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-4 px-4 py-3 md:py-4 transition-all ${activeTab === 'services' ? 'text-gold md:bg-gold/10 md:text-gold font-bold md:border md:border-gold/20' : 'text-gray-500 hover:text-white md:hover:bg-white/5'}`}
                >
                  <Scissors className="w-5 h-5" />
                  <span className="text-[10px] md:text-sm font-bold md:font-semibold uppercase md:capitalize tracking-widest md:tracking-normal">Serviços</span>
                </button>

                <button 
                  onClick={() => { setActiveTab('products'); setShowMenu(false); }}
                  className={`flex-1 md:flex-none flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-4 px-4 py-3 md:py-4 transition-all ${activeTab === 'products' ? 'text-gold md:bg-gold/10 md:text-gold font-bold md:border md:border-gold/20' : 'text-gray-500 hover:text-white md:hover:bg-white/5'}`}
                >
                  <Package className="w-5 h-5" />
                  <span className="text-[10px] md:text-sm font-bold md:font-semibold uppercase md:capitalize tracking-widest md:tracking-normal">Vendas</span>
                </button>

                <button 
                  onClick={() => { setActiveTab('cash'); setShowMenu(false); }}
                  className={`flex-1 md:flex-none flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-4 px-4 py-3 md:py-4 transition-all ${activeTab === 'cash' ? 'text-gold md:bg-gold/10 md:text-gold font-bold md:border md:border-gold/20' : 'text-gray-500 hover:text-white md:hover:bg-white/5'}`}
                >
                  <BookOpen className="w-5 h-5" />
                  <span className="text-[10px] md:text-sm font-bold md:font-semibold uppercase md:capitalize tracking-widest md:tracking-normal">Caixa</span>
                </button>

                <button 
                  onClick={() => { setActiveTab('fiados'); setShowMenu(false); }}
                  className={`flex-1 md:flex-none flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-4 px-4 py-3 md:py-4 transition-all ${activeTab === 'fiados' ? 'text-gold md:bg-gold/10 md:text-gold font-bold md:border md:border-gold/20' : 'text-gray-500 hover:text-white md:hover:bg-white/5'}`}
                >
                  <Handshake className="w-5 h-5" />
                  <span className="text-[10px] md:text-sm font-bold md:font-semibold uppercase md:capitalize tracking-widest md:tracking-normal">Fiados</span>
                </button>

                <button 
                  onClick={() => { setActiveTab('customers'); setShowMenu(false); }}
                  className={`flex-1 md:flex-none flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-4 px-4 py-3 md:py-4 transition-all ${activeTab === 'customers' ? 'text-gold md:bg-gold/10 md:text-gold font-bold md:border md:border-gold/20' : 'text-gray-500 hover:text-white md:hover:bg-white/5'}`}
                >
                  <UserIcon className="w-5 h-5" />
                  <span className="text-[10px] md:text-sm font-bold md:font-semibold uppercase md:capitalize tracking-widest md:tracking-normal">Clientes</span>
                </button>

                <button 
                  onClick={() => { setActiveTab('settings'); setShowMenu(false); }}
                  className={`flex-1 md:flex-none flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-4 px-4 py-3 md:py-4 transition-all ${activeTab === 'settings' ? 'text-gold md:bg-gold/10 md:text-gold font-bold md:border md:border-gold/20' : 'text-gray-500 hover:text-white md:hover:bg-white/5'}`}
                >
                  <SettingsIcon className="w-5 h-5" />
                  <span className="text-[10px] md:text-sm font-bold md:font-semibold uppercase md:capitalize tracking-widest md:tracking-normal text-nowrap">Configurações</span>
                </button>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {activeTab === 'pos' && (
        <motion.div 
          initial={{ opacity: 0, x: 20 }} 
          animate={{ opacity: 1, x: 0 }} 
          exit={{ opacity: 0, x: -20 }}
          className="flex-grow flex flex-col h-screen md:h-auto overflow-hidden bg-charcoal"
        >
          <div className="flex flex-col md:flex-row h-full overflow-hidden">
            {/* Seletor de Itens (Esquerda) */}
            <div className={`w-full md:w-2/3 flex flex-col h-full border-r border-white/5 p-4 md:p-8 ${posMobileStep === 'catalog' ? 'flex' : 'hidden md:flex'}`}>
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setActiveTab('appointments')}
                    className="md:hidden p-2 text-gray-500 hover:text-white"
                  >
                    <X className="w-6 h-6" />
                  </button>
                  <div className="flex flex-col">
                    <h1 className="font-display text-2xl md:text-3xl font-bold text-white uppercase italic">PDV <span className="text-gold">Vendas</span></h1>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest md:hidden">Passo 1: Selecionar Itens</p>
                  </div>
                </div>
                <div className="relative w-40 md:w-64">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                   <input 
                    type="text" 
                    placeholder="Buscar..." 
                    className="w-full bg-clay border border-white/10 pl-10 pr-4 py-2 text-white outline-none focus:border-gold rounded-lg text-sm"
                    value={posSearchTerm}
                    onChange={(e) => setPosSearchTerm(e.target.value)}
                   />
                </div>
              </div>

              <div className="flex-grow overflow-y-auto custom-scrollbar pr-2 md:pb-0">
                {/* Serviços */}
                <div className="mb-8">
                  <h3 className="text-[10px] uppercase tracking-[0.2em] text-gold font-bold mb-4 flex items-center gap-2">
                    <Scissors className="w-3 h-3" /> Serviços
                  </h3>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                    {services.filter(s => s.name.toLowerCase().includes(posSearchTerm.toLowerCase())).map(service => (
                      <button 
                        key={service.id}
                        onClick={() => {
                          const item = { ...service, type: 'service', cartId: Math.random().toString(36).substr(2, 9) };
                          setPosCart([...posCart, item]);
                        }}
                        className="p-4 bg-clay border border-white/5 hover:border-gold/50 transition-all text-left group"
                      >
                         <div className="font-bold text-white text-sm group-hover:text-gold transition-colors">{service.name}</div>
                         <div className="text-gold font-display italic text-xs mt-1">{service.price}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Produtos */}
                <div>
                  <h3 className="text-[10px] uppercase tracking-[0.2em] text-gold font-bold mb-4 flex items-center gap-2">
                    <Package className="w-3 h-3" /> Mercadorias
                  </h3>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                    {products.filter(p => p.name.toLowerCase().includes(posSearchTerm.toLowerCase())).map(product => (
                      <button 
                        key={product.id}
                        onClick={() => {
                          const item = { ...product, type: 'product', cartId: Math.random().toString(36).substr(2, 9) };
                          setPosCart([...posCart, item]);
                        }}
                        className="p-4 bg-clay border border-white/5 hover:border-gold/50 transition-all text-left group flex items-center gap-3"
                      >
                         <div className="w-8 h-8 rounded bg-charcoal flex items-center justify-center shrink-0">
                           {product.image ? <img src={product.image} className="w-full h-full object-cover" /> : <Package className="w-4 h-4 text-white/10" />}
                         </div>
                         <div>
                            <div className="font-bold text-white text-sm group-hover:text-gold transition-colors line-clamp-1">{product.name}</div>
                            <div className="text-gold font-display italic text-xs">{product.price}</div>
                         </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Botão Flutuante Mobile para Ir ao Checkout */}
              <div className="md:hidden fixed bottom-6 left-4 right-4 z-20">
                <button 
                  disabled={posCart.length === 0}
                  onClick={() => setPosMobileStep('checkout')}
                  className="w-full bg-gold py-4 rounded-xl text-charcoal font-black uppercase text-xs tracking-[0.2em] flex items-center justify-between px-6 shadow-[0_10px_30px_-5px_rgba(212,175,55,0.4)] disabled:opacity-50 disabled:grayscale transition-transform active:scale-95"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-charcoal text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold">{posCart.length}</div>
                    <span className="font-display italic">Ver Pedido</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] opacity-70">Total:</span>
                    <span className="font-display font-bold text-base">
                      R$ {posCart.reduce((sum, item) => sum + extractPrice(item.price), 0).toFixed(2)}
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* Resumo do Pedido / Pagamento (Direita) */}
            <div className={`w-full md:w-1/3 flex flex-col h-full bg-[#151515] p-6 md:p-8 ${posMobileStep === 'checkout' ? 'flex' : 'hidden md:flex'}`}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-xl font-bold text-white flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-gold" /> Pagamento
                </h2>
                <button 
                  onClick={() => setPosMobileStep('catalog')}
                  className="md:hidden text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Adicionar Itens
                </button>
              </div>

              <div className="flex-grow overflow-y-auto mb-6 pr-2 custom-scrollbar">
                {posCart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-700 italic text-center p-8">
                    <ShoppingCart className="w-12 h-12 mb-4 opacity-5" />
                    <p>Carrinho vazio.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Lista de itens com opção de remover */}
                    <div className="space-y-2 mb-6">
                      <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-2">Itens Selecionados</p>
                      {posCart.map((item) => (
                        <div key={item.cartId} className="flex justify-between items-center bg-charcoal/30 p-3 rounded-lg border border-white/5">
                          <div className="flex-grow">
                            <div className="text-sm font-bold text-white">{item.name}</div>
                            <div className="text-[10px] text-gray-500 uppercase">{item.type === 'service' ? 'Serviço' : 'Produto'}</div>
                          </div>
                          <div className="flex items-center gap-4">
                             <div className="text-sm font-display text-gold italic">{item.price}</div>
                             <button 
                              onClick={() => setPosCart(posCart.filter(i => i.cartId !== item.cartId))}
                              className="text-red-900 border border-red-900/20 p-1.5 rounded hover:bg-red-500 transition-all group"
                             >
                               <Trash2 className="w-3 h-3 group-hover:text-white" />
                             </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Cliente */}
                    <div className="p-4 bg-charcoal/30 rounded-xl border border-white/5 space-y-3 mb-4">
                      <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Identificar Cliente</p>
                      <div className="relative">
                        <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input 
                          type="tel" 
                          placeholder="WhatsApp do Cliente" 
                          className="w-full bg-clay border border-white/10 pl-10 pr-4 py-3 text-white outline-none focus:border-gold rounded-lg text-xs"
                          value={posCustomerPhone}
                          onChange={(e) => {
                            setPosCustomerPhone(e.target.value);
                            const customer = customers.find(c => c.phone === e.target.value);
                            if (customer) setPosCustomerName(customer.name);
                          }}
                        />
                      </div>
                      <input 
                        type="text" 
                        placeholder="Nome do Cliente" 
                        className="w-full bg-clay border border-white/10 px-4 py-3 text-white outline-none focus:border-gold rounded-lg text-xs"
                        value={posCustomerName}
                        onChange={(e) => setPosCustomerName(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Pagamento */}
              <div className="border-t border-white/5 pt-6 space-y-4 md:pb-0">
                <div className="flex justify-between items-center text-gray-400">
                  <span className="text-xs uppercase tracking-widest font-bold">Total a Pagar</span>
                  <span className="text-2xl font-display font-bold text-white">
                    R$ {posCart.reduce((sum, item) => sum + extractPrice(item.price), 0).toFixed(2)}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <button 
                    onClick={() => setPosPaymentMethod('dinheiro')}
                    className={`py-4 rounded-xl flex flex-col items-center gap-1 border transition-all ${posPaymentMethod === 'dinheiro' ? 'bg-gold border-gold text-charcoal' : 'bg-charcoal border-white/5 text-gray-500 hover:text-white'}`}
                  >
                    <DollarSign className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase">Dinheiro</span>
                  </button>
                  <button 
                    onClick={() => setPosPaymentMethod('cartão')}
                    className={`py-4 rounded-xl flex flex-col items-center gap-1 border transition-all ${posPaymentMethod === 'cartão' ? 'bg-gold border-gold text-charcoal' : 'bg-charcoal border-white/5 text-gray-500 hover:text-white'}`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase">Cartão</span>
                  </button>
                  <button 
                    onClick={() => setPosPaymentMethod('pix')}
                    className={`py-4 rounded-xl flex flex-col items-center gap-1 border transition-all ${posPaymentMethod === 'pix' ? 'bg-gold border-gold text-charcoal' : 'bg-charcoal border-white/5 text-gray-500 hover:text-white'}`}
                  >
                    <Check className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase">PIX</span>
                  </button>
                  <button 
                    onClick={() => setPosPaymentMethod('fiado')}
                    disabled={!!pendingFiadoId}
                    className={`py-4 rounded-xl flex flex-col items-center gap-1 border transition-all ${posPaymentMethod === 'fiado' ? 'bg-gold border-gold text-charcoal' : 'bg-charcoal border-white/5 text-gray-500 hover:text-white'} ${pendingFiadoId ? 'opacity-20 cursor-not-allowed' : ''}`}
                  >
                    <Handshake className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase">Fiado</span>
                    {pendingFiadoId && <span className="text-[8px] text-red-500 absolute -top-2 bg-charcoal px-1">Indisponível</span>}
                  </button>
                </div>

                {posPaymentMethod === 'dinheiro' && (
                  <div className="bg-charcoal/50 p-4 rounded-xl border border-gold/10 animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] text-gray-500 uppercase font-bold">Valor Recebido</span>
                      <input 
                        type="number" 
                        placeholder="0.00"
                        value={posAmountReceived}
                        onChange={(e) => setPosAmountReceived(e.target.value)}
                        className="w-24 bg-transparent text-right text-gold font-display font-bold text-lg outline-none border-b border-gold/20 pb-1"
                      />
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-[10px] text-gray-500 uppercase font-bold">Troco</span>
                      <span className="text-lg font-display font-bold text-white">
                        R$ {Math.max(0, (Number(posAmountReceived) - posCart.reduce((sum, item) => sum + extractPrice(item.price), 0))).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}

                {posPaymentMethod === 'pix' && (
                  <div className="bg-charcoal/50 p-4 rounded-xl border border-gold/10 animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex flex-col items-center text-center">
                       <p className="text-[10px] text-gray-500 uppercase font-black mb-4 tracking-widest italic">Aproxime a Câmera para Pagar</p>
                       <div className="bg-white p-3 rounded-xl mb-4 shadow-xl border-4 border-gold">
                         <QRCodeCanvas 
                          value={getPixPayload()} 
                          size={180}
                          level="H"
                          includeMargin={false}
                         />
                       </div>
                       <p className="text-white font-bold text-sm mb-1">{pixKey || 'Configurar Chave em Ajustes'}</p>
                       <p className="text-gray-500 text-[10px] mb-4">Aguardando confirmação bancária...</p>
                       
                       <div className="flex gap-2 w-full">
                         <button 
                          onClick={() => {
                            navigator.clipboard.writeText(pixKey);
                            setAlertMsg({ type: 'success', text: 'Chave PIX copiada!' });
                          }}
                          className="flex-1 bg-white/5 py-2.5 rounded-lg text-xs font-bold text-white hover:bg-white/10 flex items-center justify-center gap-2"
                         >
                           <Copy className="w-3 h-3" /> Copiar Chave
                         </button>
                         <button 
                          onClick={() => {
                            setIsSimulatingPix(true);
                            setTimeout(() => {
                              finalizePixSale();
                            }, 2000);
                          }}
                          className="flex-1 bg-gold/10 py-2.5 rounded-lg text-xs font-bold text-gold hover:bg-gold hover:text-charcoal flex items-center justify-center gap-2"
                         >
                           {isSimulatingPix ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />} 
                           {isSimulatingPix ? 'Confirmando...' : 'Simular Baixa'}
                         </button>
                       </div>
                    </div>
                  </div>
                )}

                <button 
                  disabled={posCart.length === 0 || isProcessing === 'pos_finalize' || (posPaymentMethod === 'pix' && !isSimulatingPix)}
                  onClick={async () => {
                    if (posPaymentMethod === 'pix') return; // Já é tratado pelo botão de simulação/automático
                    setIsProcessing('pos_finalize');
                    try {
                      const total = posCart.reduce((sum, item) => sum + extractPrice(item.price), 0);
                      const servicesInCart = posCart.filter(i => i.type === 'service').map(i => i.name).join(', ');
                      const productsInCart = posCart.filter(i => i.type === 'product').map(i => i.name);
                      
                      const { error } = await supabase.from('cash_book').insert([{
                        client_name: posCustomerName || 'Venda PDV',
                        service: servicesInCart || 'Venda Avulsa',
                        products: productsInCart,
                        amount: total,
                        details: `Venda via PDV (${posPaymentMethod.toUpperCase()})${pendingFiadoId ? ' - LIQUIDAÇÃO DE FIADO' : ''}`
                      }]);
                      if (error) throw error;

                      if (pendingFiadoId) {
                        await supabase.from('cash_book')
                          .update({ details: `Dívida Liquidada em ${new Date().toLocaleDateString()} via PDV ${posPaymentMethod.toUpperCase()}` })
                          .eq('id', pendingFiadoId);

                        // Atualiza o estado local para remover da lista de pendentes e atualizar totais
                        setCashEntries(prev => prev.map(entry => 
                          entry.id === pendingFiadoId 
                            ? { ...entry, details: `Dívida Liquidada em ${new Date().toLocaleDateString()} via PDV ${posPaymentMethod.toUpperCase()}` } 
                            : entry
                        ));

                        setPendingFiadoId(null);
                      }

                      if (posCustomerPhone && posCustomerName) {
                        const { data: customer } = await supabase.from('customers').select('*').eq('phone', posCustomerPhone).maybeSingle();
                        if (customer) {
                           await supabase.from('customers').update({
                             total_treatments: (customer.total_treatments || 0) + (servicesInCart ? 1 : 0),
                             last_visit: new Date().toISOString(),
                             last_service: servicesInCart || customer.last_service
                           }).eq('id', customer.id);
                        } else {
                           await supabase.from('customers').insert([{
                             name: posCustomerName,
                             phone: posCustomerPhone,
                             total_treatments: servicesInCart ? 1 : 0,
                             last_visit: new Date().toISOString(),
                             last_service: servicesInCart
                           }]);
                        }
                      }

                      setAlertMsg({ type: 'success', text: "Venda finalizada com sucesso!" });
                      setPosCart([]);
                      setPosAmountReceived('');
                      setPosCustomerName('');
                      setPosCustomerPhone('');
                      setPosMobileStep('catalog');
                    } catch (err: any) {
                      setAlertMsg({ type: 'error', text: err.message });
                    } finally {
                      setIsProcessing(null);
                    }
                  }}
                  className="w-full bg-gold py-5 rounded-xl text-charcoal font-black uppercase text-sm tracking-[0.2em] hover:bg-white transition-all gold-shadow flex items-center justify-center gap-3"
                >
                  {isProcessing === 'pos_finalize' ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <> <DollarSign className="w-5 h-5" /> FINALIZAR VENDA </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ÁREA PRINCIPAL CONTENT */}
      {activeTab !== 'pos' && (
        <main className="flex-grow overflow-y-auto bg-charcoal p-4 md:p-12">

        <AnimatePresence mode="wait">
          {activeTab === 'appointments' && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
              {/* Agenda Toggle Control */}
              <div className="bg-clay border border-white/10 p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 gold-shadow mb-8">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${siteSettings.isBookingEnabled ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                    <CalendarIcon className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-display text-xl font-bold text-white uppercase italic tracking-widest">
                      Status do Agendamento
                    </h3>
                    <p className="text-gray-500 text-[10px] uppercase tracking-[0.2em] font-bold">
                      {siteSettings.isBookingEnabled ? 'Sistema Ativado - Recebendo reservas' : 'Sistema Desativado - Agenda bloqueada'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${!siteSettings.isBookingEnabled ? 'text-red-500' : 'text-gray-500'}`}>Desativado</span>
                  <button 
                    onClick={async () => {
                      const newStatus = !siteSettings.isBookingEnabled;
                      const newSettings = { ...siteSettings, isBookingEnabled: newStatus };
                      try {
                        const { error } = await supabase.from('settings').upsert([{ key: 'site_content', value: newSettings }]);
                        if (error) throw error;
                        setSiteSettings(newSettings);
                        setAlertMsg({ type: 'success', text: newStatus ? "Agendamento Ativado!" : "Agendamento Desativado!" });
                      } catch (err) {
                        setAlertMsg({ type: 'error', text: "Erro ao atualizar status" });
                      }
                    }}
                    className={`relative w-16 h-8 rounded-full transition-all duration-300 ${siteSettings.isBookingEnabled ? 'bg-gold' : 'bg-white/10'}`}
                  >
                    <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-lg transition-all duration-300 ${siteSettings.isBookingEnabled ? 'left-9' : 'left-1'}`} />
                  </button>
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${siteSettings.isBookingEnabled ? 'text-gold' : 'text-gray-500'}`}>Ativado</span>
                </div>
              </div>

              <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 md:mb-12 gap-4">
                <div>
                  <h1 className="font-display text-3xl md:text-5xl font-bold text-white mb-1 md:mb-2">Agenda</h1>
                  <p className="text-gray-500 text-sm">Reservas pendentes para hoje</p>
                </div>
                <div className="w-full md:w-auto bg-clay/50 md:bg-transparent p-3 md:p-0 rounded-lg md:text-right border border-white/5 md:border-0 border-l-2 border-l-gold md:border-l-0">
                  <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-0.5">Status Ativo</p>
                  <p className="text-gold font-display text-xl md:text-2xl font-bold">{appointments.length} pendentes</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {appointments.map((apt) => (
                  <motion.div 
                    key={apt.id}
                    layout
                    className="p-5 md:p-8 border border-white/5 bg-clay relative overflow-hidden group hover:border-gold/30 transition-all rounded-xl shadow-lg"
                  >
                    <div className="flex justify-between items-start mb-4 md:mb-6">
                      <div className="bg-gold text-charcoal text-[9px] font-bold px-3 py-1 uppercase tracking-widest rounded-sm">
                        {apt.service}
                      </div>
                      <button onClick={() => deleteAppointment(apt.id)} className="text-gray-700 hover:text-red-500 transition-colors p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <h3 className="text-xl md:text-2xl font-bold text-white mb-4 md:mb-6 uppercase tracking-tight truncate">{apt.name}</h3>

                    <div className="space-y-3 md:space-y-4 mb-6 md:mb-8 text-gray-400 text-sm">
                      <div className="flex items-center gap-3">
                        <CalendarIcon className="w-4 h-4 text-gold/50" />
                        <span className="text-gray-300 font-medium">{apt.date}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Clock className="w-4 h-4 text-gold/50" />
                        <span className="text-gray-300 font-medium">{apt.time}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Phone className="w-4 h-4 text-gold/50" />
                        <span className="text-gray-300">{apt.phone}</span>
                      </div>
                      {apt.products && apt.products.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-2">
                          <Package className="w-4 h-4 text-gold/50" />
                          <div className="flex flex-wrap gap-1">
                            {apt.products.map((p: any) => (
                              <span key={p} className="text-[9px] bg-[#1a1a1a] px-2 py-0.5 rounded border border-white/5 text-gold/80">{p}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <button 
                      onClick={() => confirmAndArchive(apt)}
                      disabled={isProcessing === apt.id}
                      className={`w-full ${isProcessing === apt.id ? 'bg-gray-700 text-gray-500' : 'bg-gold/10 text-gold border-gold/50 hover:bg-gold hover:text-charcoal'} border py-4 font-bold uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2`}
                    >
                      {isProcessing === apt.id ? (
                        <>
                          <div className="w-3 h-3 border-2 border-t-transparent border-gold animate-spin rounded-full"></div>
                          Concluindo...
                        </>
                      ) : 'Concluir & Lançar no Caixa'}
                    </button>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'fiados' && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 md:mb-12 gap-4">
                <div>
                  <h1 className="font-display text-3xl md:text-5xl font-bold text-white mb-1 md:mb-2 italic">Controle de Fiados</h1>
                  <p className="text-gray-500 text-xs md:text-sm">Clientes que possuem pendências de pagamento</p>
                </div>
                <div className="w-full md:w-auto bg-red-500/10 p-5 border border-red-500/20 rounded-xl">
                  <p className="text-[10px] uppercase tracking-widest text-red-500 mb-1 font-bold">Total a Receber</p>
                  <p className="font-display text-2xl md:text-3xl font-bold text-white leading-none">
                    R$ {cashEntries.filter(e => e.details?.toLowerCase().includes('fiado') && !e.details?.toLowerCase().includes('liquidada')).reduce((sum, entry) => sum + (entry.amount || 0), 0).toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {cashEntries.filter(e => e.details?.toLowerCase().includes('fiado') && !e.details?.toLowerCase().includes('liquidada')).map((entry) => (
                  <div key={entry.id} className="bg-clay border border-red-500/10 p-5 md:p-6 rounded-2xl hover:border-red-500/30 transition-all shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-red-500 text-white text-[8px] font-black uppercase px-2 py-1 rotate-45 translate-x-3 -translate-y-1">PENDENTE</div>
                    <div className="flex justify-between items-start mb-4 pb-4 border-b border-white/5">
                      <div>
                        <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-1 font-bold">
                          {entry.date ? new Date(entry.date).toLocaleDateString() : 'Recente'}
                        </div>
                        <div className="text-xl font-bold text-white uppercase tracking-tight">{entry.client_name}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] uppercase tracking-widest text-red-500 mb-0.5">Dívida</div>
                        <div className="text-2xl font-display font-bold text-white leading-tight">R$ {entry.amount?.toFixed(2)}</div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div className="text-sm text-gray-400">
                         <span className="text-gold text-[10px] uppercase font-bold block">Serviço</span>
                         {entry.service}
                      </div>
                      <button 
                        onClick={() => {
                          setPosCart([{
                            id: 'fiado-payment',
                            cartId: 'fiado-' + entry.id,
                            name: `Pagamento: ${entry.service}`,
                            price: `R$ ${entry.amount.toFixed(2)}`,
                            quantity: 1,
                            type: 'service'
                          }]);
                          setPosCustomerName(entry.client_name);
                          setPendingFiadoId(entry.id);
                          setPosMobileStep('checkout'); // Go directly to checkout
                          setActiveTab('pos');
                          setAlertMsg({ type: 'info', text: `Recebendo fiado de ${entry.client_name}` });
                        }}
                        className="bg-green-500/10 hover:bg-green-500 text-green-500 hover:text-white border border-green-500/20 px-4 py-2 rounded-lg text-[10px] font-bold uppercase transition-all"
                      >
                        Receber Fiado (PDV)
                      </button>
                    </div>
                  </div>
                ))}
                {cashEntries.filter(e => e.details?.toLowerCase().includes('fiado')).length === 0 && (
                   <div className="text-center py-20 text-gray-700 italic border border-dashed border-white/5 rounded-2xl">
                     Nenhum fiado pendente. Tudo em dia!
                   </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'cash' && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 md:mb-12 gap-4">
                <div className="flex-grow">
                  <h1 className="font-display text-3xl md:text-5xl font-bold text-white mb-1 md:mb-2 italic">Livro Caixa</h1>
                  <p className="text-gray-500 text-xs md:text-sm">Histórico detalhado de faturamento</p>
                  
                  <div className="flex gap-2 mt-4">
                    <button 
                      onClick={() => {
                        const total = cashEntries.reduce((sum, entry) => sum + (entry.amount || 0), 0);
                        const byMethod = {
                          dinheiro: cashEntries.filter(e => e.details?.toLowerCase().includes('dinheiro')).reduce((s, e) => s + e.amount, 0),
                          cartao: cashEntries.filter(e => e.details?.toLowerCase().includes('cartão')).reduce((s, e) => s + e.amount, 0),
                          pix: cashEntries.filter(e => e.details?.toLowerCase().includes('pix')).reduce((s, e) => s + e.amount, 0),
                          fiado: cashEntries.filter(e => e.details?.toLowerCase().includes('fiado')).reduce((s, e) => s + e.amount, 0),
                        };

                        const report = `RELATÓRIO DE CAIXA COMPLETO\n` +
                                     `Data de Emissão: ${new Date().toLocaleString()}\n` +
                                     `==================================\n\n` +
                                     `RESUMO POR PAGAMENTO:\n` +
                                     `----------------------------------\n` +
                                     `Dinheiro: R$ ${byMethod.dinheiro.toFixed(2)}\n` +
                                     `Cartão:   R$ ${byMethod.cartao.toFixed(2)}\n` +
                                     `PIX:      R$ ${byMethod.pix.toFixed(2)}\n` +
                                     `FIADO:    R$ ${byMethod.fiado.toFixed(2)}\n` +
                                     `----------------------------------\n` +
                                     `TOTAL:    R$ ${total.toFixed(2)}\n\n` +
                                     `DETALHAMENTO:\n` +
                                     `----------------------------------\n` +
                                     cashEntries.map(e => `${new Date(e.date).toLocaleDateString()} | ${e.client_name.padEnd(20)} | R$ ${e.amount.toFixed(2).padStart(8)} | ${e.service}`).join('\n') +
                                     `\n==================================\n` +
                                     `Fim do Relatório.`;
                        
                        const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `relatorio_caixa_${new Date().toISOString().split('T')[0]}.txt`;
                        a.click();
                        setAlertMsg({ type: 'success', text: "Relatório detalhado gerado com sucesso!" });
                      }}
                      className="bg-white/5 border border-white/10 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-white/10 transition-all rounded"
                    >
                      Gerar Relatório
                    </button>
                    <button 
                      onClick={async () => {
                        if (confirm("Deseja realmente LIMPAR TODO o livro caixa? Esta ação não pode ser desfeita.")) {
                          setIsProcessing('clear_cash');
                          try {
                            const { error } = await supabase.from('cash_book').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all filter
                            if (error) throw error;
                            setCashEntries([]);
                            setAlertMsg({ type: 'success', text: "Livro caixa limpo com sucesso!" });
                          } catch (err: any) {
                            setAlertMsg({ type: 'error', text: "Erro ao limpar caixa: " + err.message });
                          } finally {
                            setIsProcessing(null);
                          }
                        }
                      }}
                      className="bg-red-500/10 border border-red-500/20 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-red-500 hover:bg-red-500/20 transition-all rounded"
                    >
                      {isProcessing === 'clear_cash' ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Limpar Tudo'}
                    </button>
                  </div>
                </div>
                <div className="w-full md:w-auto bg-gold/10 p-5 border border-gold/20 rounded-xl">
                  <p className="text-[10px] uppercase tracking-widest text-gold mb-1 font-bold">Total Acumulado</p>
                  <p className="font-display text-2xl md:text-3xl font-bold text-white leading-none">
                    R$ {cashEntries.reduce((sum, entry) => sum + (entry.amount || 0), 0).toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {cashEntries.map((entry) => (
                  <div key={entry.id} className="bg-clay border border-white/5 p-5 md:p-6 rounded-2xl hover:border-gold/30 transition-all shadow-xl">
                    <div className="flex justify-between items-start mb-4 pb-4 border-b border-white/5">
                      <div>
                        <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-1 font-bold">
                          {entry.date ? new Date(entry.date).toLocaleDateString() : 'Recente'}
                        </div>
                        <div className="text-xl font-bold text-white uppercase tracking-tight">{entry.client_name}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] uppercase tracking-widest text-gold mb-0.5">Valor Total</div>
                        <div className="text-2xl font-display font-bold text-white leading-tight">R$ {entry.amount?.toFixed(2)}</div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <span className="text-gold text-[10px] uppercase tracking-widest font-bold block mb-1">Serviço Realizado</span>
                        <div className="text-gray-300 font-medium italic">{entry.service}</div>
                      </div>
                      <div>
                        <span className="text-gray-600 text-[10px] uppercase tracking-widest font-bold block mb-1">Notas / Observações</span>
                        <p className="text-gray-500 text-xs md:text-sm leading-relaxed">{entry.details}</p>
                      </div>
                      {entry.products && entry.products.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-2">
                          {entry.products.map((p: any) => (
                            <span key={p} className="text-[9px] bg-[#1a1a1a] px-2 py-1 rounded-sm border border-white/5 text-gold/60 font-bold">
                              {p}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {cashEntries.length === 0 && (
                   <div className="text-center py-20 text-gray-700 italic border border-dashed border-white/5 rounded-2xl">
                     Nenhum lançamento no caixa ainda.
                   </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'services' && (
             <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
                <h1 className="font-display text-3xl md:text-5xl font-bold text-white mb-8 md:mb-12 italic">Gestão de Serviços</h1>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
                   <form onSubmit={saveService} className="bg-clay p-8 border border-white/10 space-y-4">
                      <h3 className="text-xl font-bold text-white mb-6 uppercase tracking-widest">
                        {editingService ? 'Editar' : 'Novo'} Serviço
                      </h3>
                      <input name="name" defaultValue={editingService?.name || ''} required placeholder="Nome do Serviço" className="w-full bg-charcoal border border-white/5 p-4 text-white focus:border-gold outline-none" />
                      <input name="price" defaultValue={editingService?.price || ''} required placeholder="Preço (Ex: R$ 50)" className="w-full bg-charcoal border border-white/5 p-4 text-white focus:border-gold outline-none" />
                      <textarea name="description" defaultValue={editingService?.description || ''} required placeholder="Breve descrição" className="w-full bg-charcoal border border-white/5 p-4 text-white focus:border-gold outline-none h-32" />
                      <input name="order" type="number" defaultValue={editingService?.order || 0} placeholder="Ordem" className="w-full bg-charcoal border border-white/5 p-4 text-white focus:border-gold outline-none" />
                      <div className="flex gap-4 pt-4">
                        <button 
                          type="submit" 
                          disabled={isProcessing === "save_service"}
                          className="flex-grow bg-gold text-charcoal font-bold py-4 hover:bg-white transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                        >
                          {isProcessing === "save_service" ? (
                            <>
                              <div className="w-3 h-3 border-2 border-t-transparent border-charcoal animate-spin rounded-full"></div>
                              Salvando...
                            </>
                          ) : (editingService ? 'Atualizar' : 'Salvar')}
                        </button>
                        {editingService && <button type="button" onClick={() => setEditingService(null)} className="px-6 border border-white/10 text-white hover:bg-white/5 uppercase text-xs">Cancelar</button>}
                      </div>
                   </form>
                   <div className="space-y-4">
                      {services.map(s => (
                        <div key={s.id} className="p-6 bg-clay border border-white/5 flex justify-between items-center group">
                          <div>
                            <h4 className="font-bold text-white">{s.name}</h4>
                            <p className="text-gold text-sm italic">{s.price}</p>
                          </div>
                          <div className="flex gap-2">
                             <button 
                               onClick={() => {
                                 setEditingService(s);
                                 window.scrollTo({ top: 0, behavior: 'smooth' });
                               }} 
                               className="p-2 text-gray-500 hover:text-gold hover:bg-gold/10 rounded-lg transition-all"
                               title="Editar"
                             >
                               <Edit className="w-4 h-4"/>
                             </button>
                             <button 
                               onClick={() => deleteService(s.id)} 
                               className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                               title="Excluir"
                             >
                               <Trash2 className="w-4 h-4"/>
                             </button>
                          </div>
                        </div>
                      ))}
                   </div>
                </div>
             </motion.div>
          )}

          {activeTab === 'products' && (
            // ... (keep products motion.div)
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
               {/* ... (existing content) */}
               <h1 className="font-display text-5xl font-bold text-white mb-12">Mercadorias</h1>
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  <form onSubmit={saveProduct} className="bg-clay p-8 border border-white/10 space-y-4">
                     <h3 className="text-xl font-bold text-white mb-6 uppercase tracking-widest">
                       {editingProduct ? 'Editar' : 'Nova'} Mercadoria
                     </h3>
                     <input name="name" defaultValue={editingProduct?.name || ''} required placeholder="Nome do Produto" className="w-full bg-charcoal border border-white/5 p-4 text-white focus:border-gold outline-none" />
                     <input name="price" defaultValue={editingProduct?.price || ''} required placeholder="Preço (Ex: R$ 45)" className="w-full bg-charcoal border border-white/5 p-4 text-white focus:border-gold outline-none" />
                     <input name="description" defaultValue={editingProduct?.description || ''} required placeholder="Descrição Curta" className="w-full bg-charcoal border border-white/5 p-4 text-white focus:border-gold outline-none" />
                     
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[9px] uppercase text-gray-500 tracking-widest">Qtd em Estoque</label>
                          <input type="number" name="stock_quantity" defaultValue={editingProduct?.stock_quantity || 0} placeholder="0" className="w-full bg-charcoal border border-white/5 p-4 text-white focus:border-gold outline-none" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] uppercase text-gray-500 tracking-widest">Estoque Mínimo</label>
                          <input type="number" name="min_quantity" defaultValue={editingProduct?.min_quantity || 0} placeholder="0" className="w-full bg-charcoal border border-white/5 p-4 text-white focus:border-gold outline-none" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[9px] uppercase text-gray-500 tracking-widest block">Imagem do Produto</label>
                        <div className="flex gap-4 items-center">
                          <div className="w-20 h-20 bg-charcoal border border-white/5 flex items-center justify-center overflow-hidden shrink-0">
                            {(productImage || editingProduct?.image) ? (
                              <img src={productImage || editingProduct?.image} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                              <Package className="w-8 h-8 text-white/10" />
                            )}
                          </div>
                          <div className="flex-grow space-y-2">
                            <button 
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="w-full bg-white/5 border border-white/10 py-3 text-[10px] uppercase font-bold text-white hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                            >
                              <Search className="w-3 h-3" /> Buscar Imagem
                            </button>
                            <input 
                              type="file" 
                              ref={fileInputRef}
                              onChange={handleImageChange}
                              accept="image/*"
                              className="hidden"
                            />
                            <input 
                              name="image_url" 
                              defaultValue={editingProduct?.image || ''} 
                              placeholder="Ou cole a URL aqui" 
                              className="w-full bg-charcoal/30 border border-white/5 p-2 text-[10px] text-white/50 focus:border-gold outline-none" 
                            />
                          </div>
                        </div>
                      </div>

                     <input name="order" type="number" defaultValue={editingProduct?.order || 0} placeholder="Ordem de exibição" className="w-full bg-charcoal border border-white/5 p-4 text-white focus:border-gold outline-none" />
                     <div className="flex gap-4 pt-4">
                       <button 
                         type="submit" 
                         disabled={isProcessing === "save_product"}
                         className="flex-grow bg-gold text-charcoal font-bold py-4 hover:bg-white transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                       >
                         {isProcessing === "save_product" ? (
                           <>
                             <div className="w-3 h-3 border-2 border-t-transparent border-charcoal animate-spin rounded-full"></div>
                             Salvando...
                           </>
                         ) : (editingProduct ? 'Atualizar' : 'Salvar')}
                       </button>
                       {editingProduct && <button type="button" onClick={() => { setEditingProduct(null); setProductImage(''); }} className="px-6 border border-white/10 text-white hover:bg-white/5 uppercase text-xs">Cancelar</button>}
                     </div>
                  </form>
                  <div className="space-y-4">
                     {products.map(p => (
                       <div key={p.id} className="p-6 bg-clay border border-white/5 flex justify-between items-center group">
                         <div className="flex items-center gap-4">
                           <div className="w-10 h-10 bg-charcoal border border-white/5 flex items-center justify-center">
                             {p.image ? <img src={p.image} className="w-full h-full object-cover" /> : <Package className="w-4 h-4 text-gold/20" />}
                           </div>
                           <div>
                             <h4 className="font-bold text-white">{p.name}</h4>
                             <p className="text-gold text-sm italic">{p.price}</p>
                           </div>
                         </div>
                         <div className="flex gap-2">
                                                         <button 
                               onClick={() => {
                                 setEditingProduct(p);
                                 window.scrollTo({ top: 0, behavior: 'smooth' });
                               }} 
                               className="p-2 text-gray-500 hover:text-gold hover:bg-gold/10 rounded-lg transition-all"
                               title="Editar"
                             >
                               <Edit className="w-4 h-4"/>
                             </button>
                                                         <button 
                               onClick={() => deleteProduct(p.id)} 
                               className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                               title="Excluir"
                             >
                               <Trash2 className="w-4 h-4"/>
                             </button>
                         </div>
                       </div>
                     ))}
                  </div>
               </div>
            </motion.div>
          )}

          {activeTab === 'customers' && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="mb-12">
                <h1 className="font-display text-5xl font-bold text-white mb-2 italic">Clientes</h1>
                <p className="text-gray-500 text-sm">Base de dados e histórico de fidelidade</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {customers.map((customer) => (
                  <div key={customer.id} className="bg-clay border border-white/5 p-8 rounded-2xl relative overflow-hidden group hover:border-gold/30 transition-all shadow-xl">
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                      <UserIcon className="w-20 h-20 text-white" />
                    </div>
                    <h4 className="text-2xl font-bold text-white mb-1 uppercase tracking-tight truncate">{customer.name}</h4>
                    <p className="text-gold text-sm font-black mb-8 flex items-center gap-2">
                       <Phone className="w-4 h-4" /> {customer.phone}
                    </p>
                    
                    <div className="space-y-4 pt-6 border-t border-white/5">
                      <div className="flex justify-between items-center bg-charcoal/50 p-4 rounded-xl border border-white/5">
                        <span className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-bold">Fidelidade</span>
                        <span className="text-sm font-black text-gold">{customer.total_treatments || 0} cortes</span>
                      </div>
                      <div className="flex justify-between items-center bg-charcoal/50 p-4 rounded-xl border border-white/5">
                        <span className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-bold">Última Visita</span>
                        <span className="text-xs text-gray-300 font-bold">
                          {customer.last_visit ? new Date(customer.last_visit).toLocaleDateString() : 'Nenhum registro'}
                        </span>
                      </div>
                      {customer.last_service && (
                         <div className="pt-2">
                           <p className="text-[9px] uppercase tracking-widest text-gray-600 font-bold mb-1">Último Serviço</p>
                           <p className="text-xs text-gray-400 italic">"{customer.last_service}"</p>
                         </div>
                      )}
                    </div>
                  </div>
                ))}
                {customers.length === 0 && (
                  <div className="col-span-full py-24 text-center border-2 border-dashed border-white/5 bg-white/[0.01] rounded-[2rem]">
                    <UserIcon className="w-16 h-16 text-gray-800 mx-auto mb-6 opacity-30" />
                    <p className="text-gray-500 font-display text-2xl uppercase tracking-widest opacity-50">Sua lista de clientes está vazia.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="mb-12">
                <h1 className="font-display text-5xl font-bold text-white mb-2 italic">Configurações</h1>
                <p className="text-gray-500 text-sm">Personalize os textos do seu site</p>
              </div>

              <div className="max-w-2xl">
                <form onSubmit={saveSettings} className="bg-clay p-8 border border-white/10 space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-gold uppercase tracking-widest flex items-center gap-2">
                       <LayoutDashboard className="w-5 h-5" /> Banner Principal (Hero)
                    </h3>
                    
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-gray-500">Subtítulo (Dourado pequeno)</label>
                      <input 
                        name="heroSubtitle" 
                        defaultValue={siteSettings.heroSubtitle} 
                        className="w-full bg-charcoal border border-white/5 p-4 text-white focus:border-gold outline-none" 
                        placeholder="Ex: Tradição & Estilo"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-gray-500">Título Principal (Grande)</label>
                      <textarea 
                        name="heroTitle" 
                        defaultValue={siteSettings.heroTitle} 
                        className="w-full bg-charcoal border border-white/5 p-4 text-white focus:border-gold outline-none h-32" 
                        placeholder="Ex: Onde a barba para, o estilo começa."
                      />
                      <p className="text-[9px] text-gray-600 italic">Dica: O texto será exibido em destaque no topo do site.</p>
                    </div>
                  </div>

                    <div className="space-y-4 pt-6 border-t border-white/10">
                      <h3 className="text-xl font-bold text-gold uppercase tracking-widest flex items-center gap-2">
                         <MapPin className="w-5 h-5" /> Contato e Endereço
                      </h3>
                      
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest text-gray-500">Endereço Completo</label>
                        <textarea 
                          name="address" 
                          defaultValue={siteSettings.address} 
                          className="w-full bg-charcoal border border-white/5 p-4 text-white focus:border-gold outline-none h-24" 
                          placeholder="Ex: Av. Central, 1234 - Centro&#10;São Paulo, SP"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase tracking-widest text-gray-500">Telefone / WhatsApp</label>
                          <input 
                            name="phone" 
                            defaultValue={siteSettings.phone} 
                            className="w-full bg-charcoal border border-white/5 p-4 text-white focus:border-gold outline-none" 
                            placeholder="(00) 00000-0000"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase tracking-widest text-gray-500">E-mail</label>
                          <input 
                            name="email" 
                            type="email"
                            defaultValue={siteSettings.email} 
                            className="w-full bg-charcoal border border-white/5 p-4 text-white focus:border-gold outline-none" 
                            placeholder="contato@barbearia.com"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase tracking-widest text-gray-500">Instagram (apenas o @user)</label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gold font-bold">@</span>
                            <input 
                              name="instagram" 
                              defaultValue={siteSettings.instagram} 
                              className="w-full bg-charcoal border border-white/5 p-4 pl-8 text-white focus:border-gold outline-none" 
                              placeholder="sua_barbearia"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 pt-6 border-t border-white/10">
                      <h3 className="text-xl font-bold text-gold uppercase tracking-widest flex items-center gap-2">
                         <Clock className="w-5 h-5" /> Horário de Funcionamento
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase tracking-widest text-gray-500">Seg - Sex</label>
                          <input 
                            name="hoursWeekdays" 
                            defaultValue={siteSettings.hoursWeekdays} 
                            className="w-full bg-charcoal border border-white/5 p-4 text-white focus:border-gold outline-none" 
                            placeholder="09:00 - 20:00"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase tracking-widest text-gray-500">Sábado</label>
                          <input 
                            name="hoursSaturday" 
                            defaultValue={siteSettings.hoursSaturday} 
                            className="w-full bg-charcoal border border-white/5 p-4 text-white focus:border-gold outline-none" 
                            placeholder="09:00 - 18:00"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase tracking-widest text-gray-500">Domingo</label>
                          <input 
                            name="hoursSunday" 
                            defaultValue={siteSettings.hoursSunday} 
                            className="w-full bg-charcoal border border-white/5 p-4 text-white focus:border-gold outline-none" 
                            placeholder="Fechado"
                          />
                        </div>
                      </div>
                    </div>

                  <div className="space-y-4 pt-6 border-t border-white/10">
                    <h3 className="text-xl font-bold text-gold uppercase tracking-widest flex items-center gap-2">
                       <Lock className="w-5 h-5" /> Proteção Adicional
                    </h3>
                    <div className="space-y-2">
                       <label className="text-[10px] uppercase tracking-widest text-gray-500">Segunda Senha de Acesso</label>
                       <input 
                         name="secondaryPassword" 
                         type="password"
                         defaultValue={siteSettings.secondaryPassword} 
                         autoComplete="new-password"
                         className="w-full bg-charcoal border border-white/5 p-4 text-white focus:border-gold outline-none" 
                         placeholder="Defina uma senha numérica ou texto"
                       />
                       <p className="text-[9px] text-gray-600 italic">Esta senha será solicitada TODA VEZ que você tentar entrar no painel, mesmo já logado.</p>
                    </div>
                  </div>

                  <div className="space-y-4 pt-6 border-t border-white/10">
                    <h3 className="text-xl font-bold text-gold uppercase tracking-widest flex items-center gap-2">
                       <DollarSign className="w-5 h-5" /> Pagamentos
                    </h3>
                    <div className="space-y-2">
                       <label className="text-[10px] uppercase tracking-widest text-gray-500">Chave PIX para o PDV</label>
                       <input 
                         name="pixKey" 
                         defaultValue={siteSettings.pixKey} 
                         className="w-full bg-charcoal border border-white/5 p-4 text-white focus:border-gold outline-none" 
                         placeholder="E-mail, CPF, Celular ou Chave Aleatória"
                       />
                       <p className="text-[9px] text-gray-600 italic">Esta chave será usada para gerar o QR Code no momento da venda.</p>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-white/5">
                    <button 
                      type="submit" 
                      disabled={isProcessing === "settings"}
                      className="w-full bg-gold text-charcoal font-black py-5 hover:bg-white transition-all uppercase tracking-[0.2em] text-xs gold-shadow flex items-center justify-center gap-2"
                    >
                      {isProcessing === "settings" ? (
                        <>
                          <div className="w-3 h-3 border-2 border-t-transparent border-charcoal animate-spin rounded-full"></div>
                          Salvando...
                        </>
                      ) : 'Salvar Alterações'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>
      )}
    </div>
  );
}
