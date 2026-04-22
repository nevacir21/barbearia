import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, updateDoc, doc, deleteDoc, addDoc, getDoc, setDoc, serverTimestamp, writeBatch, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { LogIn, LogOut, Check, X, Phone, Calendar as CalendarIcon, Clock, Trash2, ShoppingBag, LayoutDashboard, Scissors, Package, BookOpen, User as UserIcon, Lock, DollarSign, Wallet } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function AdminPanel({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [user, setUser] = useState<any>(null);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminConfig, setAdminConfig] = useState<any>(null);
  const [adminExists, setAdminExists] = useState<boolean | null>(null);
  
  const [appointments, setAppointments] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [cashEntries, setCashEntries] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  
  const [activeTab, setActiveTab] = useState<'appointments' | 'services' | 'products' | 'cash' | 'customers'>('appointments');
  const [loading, setLoading] = useState(true);
  const [loadTimeout, setLoadTimeout] = useState(false);
  
  const [editingService, setEditingService] = useState<any>(null);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [confirmPopup, setConfirmPopup] = useState<{ id: string, name: string, service: string, amount: number, apt: any } | null>(null);
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [loginUser, setLoginUser] = useState("eletricistaarthur@gmail.com");
  const [loginPass, setLoginPass] = useState("210779");

  useEffect(() => {
    // Safety timer: if loading takes too long, show "Force" option
    const timer = setTimeout(() => {
      setLoadTimeout(true);
    }, 4000);

    // Check if session exists in memory to avoid login on every modal toggle
    const checkSession = async () => {
      const sessionToken = sessionStorage.getItem('barber_admin_session');
      if (sessionToken === 'active') {
        setIsAdminLoggedIn(true);
        // Garantir que temos um currentUser para as regras do Firestore
        if (!auth.currentUser) {
          try {
            await signInAnonymously(auth);
          } catch (e) {
            console.error("Falha ao reautenticar anonimamente:", e);
          }
        }
      }
    };
    checkSession();

    // Check if admin is already configured
    const checkAdmin = async () => {
      try {
        const docRef = doc(db, 'settings', 'admin');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setAdminConfig(docSnap.data());
          setAdminExists(true);
        } else {
          // Auto-configurar com os dados solicitados pelo usuário se for o primeiro acesso
          const initialAdmin = { 
            username: "eletricistaarthur@gmail.com", 
            password: "210779" 
          };
          await setDoc(docRef, initialAdmin);
          setAdminConfig(initialAdmin);
          setAdminExists(true);
        }
      } catch (err) {
        console.error("Erro ao verificar admin:", err);
        setAdminExists(false);
      } finally {
        setLoading(false);
        clearTimeout(timer);
      }
    };
    checkAdmin();

    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u && u.email && u.email.toLowerCase() === "eletricistaarthur@gmail.com") {
        setIsAdminLoggedIn(true);
      }
    });

    return () => {
      clearTimeout(timer);
      unsubAuth();
    };
  }, []);

  useEffect(() => {
    if (isAdminLoggedIn) {
      // Listen to Appointments
      const qApts = query(collection(db, 'appointments'), orderBy('createdAt', 'desc'));
      const unsubApts = onSnapshot(qApts, (snapshot) => {
        setAppointments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });

      // Listen to Services
      const qServs = query(collection(db, 'services'), orderBy('order', 'asc'));
      const unsubServs = onSnapshot(qServs, (snapshot) => {
        setServices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });

      // Listen to Products
      const qProds = query(collection(db, 'products'), orderBy('order', 'asc'));
      const unsubProds = onSnapshot(qProds, (snapshot) => {
        setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });

      // Listen to Cash Book
      const qCash = query(collection(db, 'cash_book'), orderBy('date', 'desc'));
      const unsubCash = onSnapshot(qCash, (snapshot) => {
        setCashEntries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });

      // Listen to Customers
      const qCust = query(collection(db, 'customers'), orderBy('name', 'asc'));
      const unsubCust = onSnapshot(qCust, (snapshot) => {
        setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });

      return () => {
        unsubApts();
        unsubServs();
        unsubProds();
        unsubCash();
        unsubCust();
      };
    }
  }, [isAdminLoggedIn]);

  const handleCustomLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsProcessing("login");
    const username = loginUser.trim().toLowerCase();
    const password = loginPass.trim();

    try {
      // Atalho de segurança prioritário para o Arthur
      if (username === "eletricistaarthur@gmail.com" && password === "210779") {
        if (!auth.currentUser) {
          try { 
            await signInAnonymously(auth); 
          } catch(e) { 
            console.error("Auth falhou:", e); 
          }
        }
        sessionStorage.setItem('barber_admin_session', 'active');
        setIsAdminLoggedIn(true);
        setAlertMsg({ type: 'success', text: "Bem-vindo de volta, Arthur!" });
        setIsProcessing(null); // Clear processing state
        return;
      }

      if (!adminConfig) {
        const docSnap = await getDoc(doc(db, 'settings', 'admin'));
        if (docSnap.exists()) setAdminConfig(docSnap.data());
      }

      const targetUser = adminConfig?.username?.trim().toLowerCase();
      const targetPass = adminConfig?.password?.trim();

      if (targetUser === username && targetPass === password) {
        if (!auth.currentUser) await signInAnonymously(auth);
        sessionStorage.setItem('barber_admin_session', 'active');
        setIsAdminLoggedIn(true);
        setAlertMsg({ type: 'success', text: "Acesso liberado!" });
      } else {
        throw new Error("Usuário ou senha incorretos.");
      }
    } catch (err: any) {
      console.error("Falha no login:", err);
      setAlertMsg({ type: 'error', text: err.message });
    } finally {
      setIsProcessing(null);
    }
  };

  const createFirstAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing("register");
    const data = new FormData(e.target as HTMLFormElement);
    const username = (data.get('username') as string).trim();
    const password = (data.get('password') as string).trim();

    try {
      if (password.length < 4) throw new Error("A senha deve ter pelo menos 4 caracteres.");
      
      await setDoc(doc(db, 'settings', 'admin'), { username, password });
      
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }
      
      setAdminConfig({ username, password });
      setAdminExists(true);
      sessionStorage.setItem('barber_admin_session', 'active');
      setIsAdminLoggedIn(true);
      setAlertMsg({ type: 'success', text: "Acesso criado com sucesso!" });
    } catch (err: any) {
      setAlertMsg({ type: 'error', text: `Erro ao criar: ${err.message}` });
    } finally {
      setIsProcessing(null);
    }
  };

  const googleLogin = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logout = () => {
    signOut(auth).then(() => {
      sessionStorage.removeItem('barber_admin_session');
      setIsAdminLoggedIn(false);
    });
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
    const servicePriceStr = serviceObj ? serviceObj.price : (apt.servicePrice || "R$ 0");
    let amount = extractPrice(servicePriceStr);
    if (apt.totalProductsPrice) amount += Number(apt.totalProductsPrice);

    setConfirmPopup({ id: apt.id, name: apt.name, service: apt.service, amount, apt });
  };

  const handleFinalConfirm = async () => {
    if (!confirmPopup) return;
    const { apt, amount } = confirmPopup;
    
    setIsProcessing(apt.id);
    setConfirmPopup(null);
    try {
      if (!auth.currentUser) {
        console.log("Tentando reauth de emergência...");
        await signInAnonymously(auth);
      }
      
      if (!auth.currentUser) throw new Error("Não foi possível validar sua sessão. Tente recarregar a página.");

      const batch = writeBatch(db);
      const cashRef = doc(collection(db, 'cash_book'));
      batch.set(cashRef, {
        clientName: apt.name,
        service: apt.service,
        products: apt.products || [],
        amount: amount,
        date: serverTimestamp(),
        details: `Concluído em ${new Date().toLocaleDateString()} (Agendado para ${apt.date})`
      });

      // Atualizar estatísticas do Cliente
      const customerQuery = query(collection(db, 'customers'), where('phone', '==', apt.phone));
      const customerSnap = await getDocs(customerQuery);
      if (!customerSnap.empty) {
        const customerDoc = customerSnap.docs[0];
        batch.update(customerDoc.ref, {
          totalTreatments: (customerDoc.data().totalTreatments || 0) + 1,
          lastVisit: serverTimestamp(),
          lastService: apt.service
        });
      }

      const aptRef = doc(db, 'appointments', apt.id);
      batch.delete(aptRef);

      await batch.commit();
      setAlertMsg({ type: 'success', text: "Lançado no caixa com sucesso!" });
    } catch (err: any) {
      setAlertMsg({ type: 'error', text: `Erro: ${err.message}` });
    } finally {
      setIsProcessing(null);
    }
  };

  const deleteAppointment = async (id: string) => {
    if (confirm("Deseja realmente excluir este agendamento sem lançar no caixa?")) {
      await deleteDoc(doc(db, 'appointments', id));
    }
  };

  const saveService = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = new FormData(e.target as HTMLFormElement);
    const serviceData = {
      name: data.get('name') as string,
      price: data.get('price') as string,
      description: data.get('description') as string,
      order: Number(data.get('order')) || 0,
    };

    if (editingService?.id) {
      await updateDoc(doc(db, 'services', editingService.id), serviceData);
    } else {
      await addDoc(collection(db, 'services'), serviceData);
    }
    setEditingService(null);
  };

  const deleteService = async (id: string) => {
    if (confirm("Excluir este serviço? Isso não afetará agendamentos já feitos.")) {
      await deleteDoc(doc(db, 'services', id));
    }
  };

  const saveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = new FormData(e.target as HTMLFormElement);
    const productData = {
      name: data.get('name') as string,
      price: data.get('price') as string,
      description: data.get('description') as string,
      image: data.get('image') as string,
      order: Number(data.get('order')) || 0,
    };

    if (editingProduct?.id) {
      await updateDoc(doc(db, 'products', editingProduct.id), productData);
    } else {
      await addDoc(collection(db, 'products'), productData);
    }
    setEditingProduct(null);
  };

  const deleteProduct = async (id: string) => {
    if (confirm("Excluir esta mercadoria?")) {
      await deleteDoc(doc(db, 'products', id));
    }
  };

  if (!isOpen) return null;

  if (loading || adminExists === null) {
    return (
      <div className="fixed inset-0 z-[600] bg-charcoal flex flex-col items-center justify-center p-6 text-center">
        <div className="text-gold animate-pulse font-display text-xl uppercase tracking-widest mb-4">Carregando Painel...</div>
        {loadTimeout && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4">
             <button 
              onClick={() => {
                setLoading(false);
                setAdminExists(true);
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
              {adminExists === false ? 'Bem-vindo! Configure seu primeiro acesso' : 'Identifique-se para gerenciar sua barbearia'}
            </p>
          </div>

          {adminExists === false ? (
            <form onSubmit={createFirstAdmin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-gray-500 block">Escolha um Usuário</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gold" />
                  <input name="username" placeholder="Nome de usuário" required className="w-full bg-charcoal border border-white/5 pl-10 pr-4 py-4 text-white outline-none focus:border-gold transition-all" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-gray-500 block">Crie uma Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gold" />
                  <input name="password" type="password" placeholder="Sua senha" required className="w-full bg-charcoal border border-white/5 pl-10 pr-4 py-4 text-white outline-none focus:border-gold transition-all" />
                </div>
              </div>
              <button 
                type="submit" 
                disabled={isProcessing === "register"}
                className="w-full bg-gold text-charcoal font-bold py-5 hover:bg-white transition-all mt-4 uppercase tracking-widest text-sm gold-shadow flex items-center justify-center gap-2"
              >
                {isProcessing === "register" ? "Criando..." : "Criar Acesso e Entrar"}
              </button>
            </form>
          ) : (
            <div className="space-y-6">
              <form onSubmit={handleCustomLogin} className="space-y-4">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-widest text-gray-500 block ml-1">Usuário de Acesso</label>
                    <input 
                      name="username" 
                      value={loginUser}
                      onChange={(e) => setLoginUser(e.target.value)}
                      placeholder="eletricistaarthur@gmail.com" 
                      required 
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
                  
                  <p className="text-[9px] text-gray-600 text-center mt-6 leading-relaxed">
                    Seus dados já estão preenchidos acima.<br />Basta clicar em <b>Entrar no Painel</b> para acessar.
                  </p>
                </div>
              </form>
            </div>
          )}
          
          <button onClick={onClose} className="w-full text-gray-600 text-[10px] uppercase tracking-widest mt-12 hover:text-white transition-colors">
            &larr; Voltar para o Site
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[400] bg-charcoal flex flex-col md:flex-row shadow-2xl overflow-hidden text-white">
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

      {/* MENU LATERAL (DESKTOP) / MENU INFERIOR (MOBILE) */}
      <aside className="w-full md:w-64 bg-[#1a1a1a] border-b md:border-b-0 md:border-r border-white/5 flex flex-col order-2 md:order-1">
        <div className="flex md:hidden h-16 bg-[#1a1a1a] items-center justify-between px-6 border-b border-white/5 order-first">
          <div className="flex items-center gap-2">
             <Scissors className="text-gold w-5 h-5 rotate-45" />
             <span className="font-display text-lg font-bold text-white tracking-widest uppercase italic italic">ADMIN<span className="text-gold">PRO</span></span>
          </div>
          <button onClick={onClose} className="text-gray-500"><X className="w-6 h-6" /></button>
        </div>

        <div className="hidden md:flex p-8 border-b border-white/5 items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold text-white leading-tight">Barber <span className="text-gold">Pro</span></h2>
            <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500 mt-1">Admin Dashboard</p>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <nav className="flex md:flex-col overflow-x-auto md:overflow-x-visible md:flex-grow md:p-6 no-scrollbar">
          <button 
            onClick={() => setActiveTab('appointments')}
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
            onClick={() => setActiveTab('services')}
            className={`flex-1 md:flex-none flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-4 px-4 py-3 md:py-4 transition-all ${activeTab === 'services' ? 'text-gold md:bg-gold/10 md:text-gold font-bold md:border md:border-gold/20' : 'text-gray-500 hover:text-white md:hover:bg-white/5'}`}
          >
            <Scissors className="w-5 h-5" />
            <span className="text-[10px] md:text-sm font-bold md:font-semibold uppercase md:capitalize tracking-widest md:tracking-normal">Serviços</span>
          </button>

          <button 
            onClick={() => setActiveTab('products')}
            className={`flex-1 md:flex-none flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-4 px-4 py-3 md:py-4 transition-all ${activeTab === 'products' ? 'text-gold md:bg-gold/10 md:text-gold font-bold md:border md:border-gold/20' : 'text-gray-500 hover:text-white md:hover:bg-white/5'}`}
          >
            <Package className="w-5 h-5" />
            <span className="text-[10px] md:text-sm font-bold md:font-semibold uppercase md:capitalize tracking-widest md:tracking-normal">Vendas</span>
          </button>

          <button 
            onClick={() => setActiveTab('cash')}
            className={`flex-1 md:flex-none flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-4 px-4 py-3 md:py-4 transition-all ${activeTab === 'cash' ? 'text-gold md:bg-gold/10 md:text-gold font-bold md:border md:border-gold/20' : 'text-gray-500 hover:text-white md:hover:bg-white/5'}`}
          >
            <BookOpen className="w-5 h-5" />
            <span className="text-[10px] md:text-sm font-bold md:font-semibold uppercase md:capitalize tracking-widest md:tracking-normal">Caixa</span>
          </button>

          <button 
            onClick={() => setActiveTab('customers')}
            className={`flex-1 md:flex-none flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-4 px-4 py-3 md:py-4 transition-all ${activeTab === 'customers' ? 'text-gold md:bg-gold/10 md:text-gold font-bold md:border md:border-gold/20' : 'text-gray-500 hover:text-white md:hover:bg-white/5'}`}
          >
            <UserIcon className="w-5 h-5" />
            <span className="text-[10px] md:text-sm font-bold md:font-semibold uppercase md:capitalize tracking-widest md:tracking-normal">Clientes</span>
          </button>
        </nav>

        <div className="hidden md:block p-6 border-t border-white/5 space-y-4">
          <button onClick={logout} className="w-full flex items-center gap-4 px-4 py-3 text-gray-500 hover:text-red-400 transition-all text-sm">
            <LogOut className="w-4 h-4" /> Sair do Painel
          </button>
        </div>
      </aside>

      {/* ÁREA PRINCIPAL CONTENT */}
      <main className="flex-grow overflow-y-auto bg-charcoal p-4 md:p-12 order-1 md:order-2">
        {/* HEADER MOBILE */}
        <div className="md:hidden flex justify-between items-center mb-6 pt-2">
          <h2 className="font-display text-xl font-bold text-white">Barber <span className="text-gold">Pro</span></h2>
          <button onClick={onClose} className="text-gray-500 text-[10px] uppercase tracking-widest font-bold">Fechar</button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'appointments' && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 md:mb-12 gap-4">
                <div>
                  <h1 className="font-display text-3xl md:text-5xl font-bold text-white mb-1 md:mb-2">Agendamentos</h1>
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

          {activeTab === 'cash' && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 md:mb-12 gap-4">
                <div>
                  <h1 className="font-display text-3xl md:text-5xl font-bold text-white mb-1 md:mb-2 italic">Livro Caixa</h1>
                  <p className="text-gray-500 text-xs md:text-sm">Histórico detalhado de faturamento</p>
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
                          {entry.date?.seconds ? new Date(entry.date.seconds * 1000).toLocaleDateString() : 'Recente'}
                        </div>
                        <div className="text-xl font-bold text-white uppercase tracking-tight">{entry.clientName}</div>
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
                        <button type="submit" className="flex-grow bg-gold text-charcoal font-bold py-4 hover:bg-white transition-all uppercase tracking-widest text-xs">
                          {editingService ? 'Atualizar' : 'Salvar'}
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
                          <div className="flex gap-4 opacity-0 group-hover:opacity-100 transition-all">
                             <button onClick={() => setEditingService(s)} className="text-gray-500 hover:text-white"><Check className="w-4 h-4"/></button>
                             <button onClick={() => deleteService(s.id)} className="text-gray-700 hover:text-red-500"><X className="w-4 h-4"/></button>
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
                     <input name="image" defaultValue={editingProduct?.image || ''} placeholder="Link da Imagem" className="w-full bg-charcoal border border-white/5 p-4 text-white focus:border-gold outline-none" />
                     <input name="order" type="number" defaultValue={editingProduct?.order || 0} placeholder="Ordem" className="w-full bg-charcoal border border-white/5 p-4 text-white focus:border-gold outline-none" />
                     <div className="flex gap-4 pt-4">
                       <button type="submit" className="flex-grow bg-gold text-charcoal font-bold py-4 hover:bg-white transition-all uppercase tracking-widest text-xs">
                         {editingProduct ? 'Atualizar' : 'Salvar'}
                       </button>
                       {editingProduct && <button type="button" onClick={() => setEditingProduct(null)} className="px-6 border border-white/10 text-white hover:bg-white/5 uppercase text-xs">Cancelar</button>}
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
                         <div className="flex gap-4 opacity-0 group-hover:opacity-100 transition-all">
                            <button onClick={() => setEditingProduct(p)} className="text-gray-500 hover:text-white"><Check className="w-4 h-4"/></button>
                            <button onClick={() => deleteProduct(p.id)} className="text-gray-700 hover:text-red-500"><X className="w-4 h-4"/></button>
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
                        <span className="text-sm font-black text-gold">{customer.totalTreatments || 0} cortes</span>
                      </div>
                      <div className="flex justify-between items-center bg-charcoal/50 p-4 rounded-xl border border-white/5">
                        <span className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-bold">Última Visita</span>
                        <span className="text-xs text-gray-300 font-bold">
                          {customer.lastVisit?.seconds ? new Date(customer.lastVisit.seconds * 1000).toLocaleDateString() : 'Nenhum registro'}
                        </span>
                      </div>
                      {customer.lastService && (
                         <div className="pt-2">
                           <p className="text-[9px] uppercase tracking-widest text-gray-600 font-bold mb-1">Último Serviço</p>
                           <p className="text-xs text-gray-400 italic">"{customer.lastService}"</p>
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

        </AnimatePresence>
      </main>

      {/* Menu Inferior Mobile (Sempre visível se logado) */}
      {isAdminLoggedIn && (
        <nav className="fixed bottom-0 left-0 right-0 bg-clay border-t border-white/5 z-50 shrink-0">
          <div className="flex h-20 items-stretch">
            <button 
              onClick={() => setActiveTab('appointments')}
              className={`flex-1 flex flex-col items-center justify-center gap-1.5 transition-all ${activeTab === 'appointments' ? 'bg-gold/5 text-gold border-t-2 border-gold shadow-[0_-10px_20px_-10px_rgba(212,175,55,0.2)]' : 'text-gray-600'}`}
            >
              <CalendarIcon className="w-5 h-5" />
              <span className="text-[10px] font-black uppercase tracking-tight">Agenda</span>
            </button>
            <button 
              onClick={() => setActiveTab('services')}
              className={`flex-1 flex flex-col items-center justify-center gap-1.5 transition-all ${activeTab === 'services' ? 'bg-gold/5 text-gold border-t-2 border-gold shadow-[0_-10px_20px_-10px_rgba(212,175,55,0.2)]' : 'text-gray-600'}`}
            >
              <Scissors className="w-5 h-5" />
              <span className="text-[10px] font-black uppercase tracking-tight">Serviços</span>
            </button>
            <button 
              onClick={() => setActiveTab('products')}
              className={`flex-1 flex flex-col items-center justify-center gap-1.5 transition-all ${activeTab === 'products' ? 'bg-gold/5 text-gold border-t-2 border-gold shadow-[0_-10px_20px_-10px_rgba(212,175,55,0.2)]' : 'text-gray-600'}`}
            >
              <Package className="w-5 h-5" />
              <span className="text-[10px] font-black uppercase tracking-tight">Vendas</span>
            </button>
            <button 
              onClick={() => setActiveTab('cash')}
              className={`flex-1 flex flex-col items-center justify-center gap-1.5 transition-all ${activeTab === 'cash' ? 'bg-gold/5 text-gold border-t-2 border-gold shadow-[0_-10px_20px_-10px_rgba(212,175,55,0.2)]' : 'text-gray-600'}`}
            >
              <DollarSign className="w-5 h-5" />
              <span className="text-[10px] font-black uppercase tracking-tight">Caixa</span>
            </button>
            <button 
              onClick={() => setActiveTab('customers')}
              className={`flex-1 flex flex-col items-center justify-center gap-1.5 transition-all ${activeTab === 'customers' ? 'bg-gold/5 text-gold border-t-2 border-gold shadow-[0_-10px_20px_-10px_rgba(212,175,55,0.2)]' : 'text-gray-600'}`}
            >
              <UserIcon className="w-5 h-5" />
              <span className="text-[10px] font-black uppercase tracking-tight">Clientes</span>
            </button>
            <button onClick={logout} className="flex-1 flex flex-col items-center justify-center gap-1.5 text-gray-600 hover:text-red-500 border-l border-white/5">
              <LogOut className="w-5 h-5" />
              <span className="text-[10px] font-black uppercase tracking-tight text-red-500/80">Sair</span>
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}
