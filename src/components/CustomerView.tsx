import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, Plus, Pencil, Trash2, ShoppingBag, Star, Cake, Info, Package, 
  CreditCard, Search, ChevronRight, X, ChevronLeft, Eye, BarChart3, MessageCircle, Printer, Check, CheckCircle2, User,
  ArrowLeft, Phone, Calendar, MapPin, Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UniversalImageSelector } from './UniversalImageSelector';

// --- Types ---
import { generateUniqueId, getDeviceId } from '../lib/persistence';

export interface Customer {
  id: string;
  displayId: string;
  name: string;
  email?: string;
  whatsapp?: string;
  phone?: string;
  dob?: string;
  taxId?: string;
  image?: string;
  address?: {
    cep: string;
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
    complement?: string;
  };
  debt: number;
  updatedAt?: number;
  createdAt?: number;
  syncStatus?: 'local' | 'pending' | 'synced' | 'error';
  deviceId?: string;
  notes?: string;
}

export interface SaleItem {
  productId: string;
  quantity: number;
  price: number;
  cost: number;
  profit: number;
}

export interface Sale {
  id: string;
  sequentialId?: string;
  items: SaleItem[];
  originalItems?: SaleItem[];
  total: number;
  date: number;
  customerId?: string;
  paymentMethod: string;
  status?: 'pendente' | 'em_separacao' | 'separado' | 'embalado' | 'enviado' | 'entregue' | 'cancelado' | 'falta_confirmada';
  notes?: string;
}

export interface Product {
    id: string;
    name: string;
    price: number;
}

interface CustomerViewProps {
  customers: Customer[];
  setCustomers: any;
  addActivity: (type: any, action: string, details: string, extra?: any) => void;
  sales: Sale[];
  imprimirCupom: (sale: Sale | string, customTitle?: string) => Promise<any>;
  company: any;
  couponConfig: any;
  products: Product[];
  goldCustomerIds: Set<string>;
  canEdit: boolean;
  currentUser: any | null;
  paymentIcons: Record<string, string>;
  generateCustomerPDF: (customer: Customer, company: any) => Promise<void>;
  onBackToDashboard?: () => void;
  setSelectedLabelProduct: (product: Product | null) => void;
}

export function CustomerView({ 
  customers, 
  setCustomers, 
  addActivity, 
  sales, 
  imprimirCupom, 
  company, 
  couponConfig,
  products,
  goldCustomerIds,
  canEdit,
  paymentIcons,
  generateCustomerPDF,
  onBackToDashboard,
  setSelectedLabelProduct
}: CustomerViewProps) {
  const [showForm, setShowForm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingSale, setViewingSale] = useState<Sale | null>(null);
  const [activeLetter, setActiveLetter] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const INITIAL_CUSTOMER_STATE = { 
    name: '', 
    email: '', 
    whatsapp: '', 
    dob: '', 
    taxId: '',
    image: '',
    address: {
      cep: '',
      street: '',
      number: '',
      neighborhood: '',
      city: '',
      state: '',
      complement: ''
    }
  };
  const [newCustomer, setNewCustomer] = useState(INITIAL_CUSTOMER_STATE);
  const [isDeleting, setIsDeleting] = useState(false);

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  // Stats
  const stats = useMemo(() => {
    const withWhatsApp = customers.filter(c => c.whatsapp || c.phone).length;
    const active = customers.filter(c => sales.some(s => s.customerId === c.id)).length;
    const vips = goldCustomerIds.size;
    
    return {
      total: customers.length,
      withWhatsApp,
      withWhatsAppPct: customers.length > 0 ? (withWhatsApp / customers.length * 100).toFixed(1) : '0',
      active,
      activePct: customers.length > 0 ? (active / customers.length * 100).toFixed(1) : '0',
      vips,
      vipsPct: customers.length > 0 ? (vips / customers.length * 100).toFixed(1) : '0',
    };
  }, [customers, sales, goldCustomerIds]);

  const checkBirthday = (dob: string) => {
    if (!dob) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const parts = dob.split('/');
    if (parts.length < 2) return false;
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    if (isNaN(day) || isNaN(month)) return false;
    let bday = new Date(today.getFullYear(), month - 1, day);
    const diffTime = bday.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      const bdayNext = new Date(today.getFullYear() + 1, month - 1, day);
      return Math.ceil((bdayNext.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) <= 7;
    }
    return diffDays >= 0 && diffDays <= 7;
  };

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (c.whatsapp && c.whatsapp.includes(searchTerm)) || 
        (c.phone && c.phone.includes(searchTerm)) || 
        (c.taxId && c.taxId.includes(searchTerm));
      const matchesLetter = activeLetter ? c.name.toUpperCase().startsWith(activeLetter) : true;
      return matchesSearch && matchesLetter;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [customers, searchTerm, activeLetter]);

  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredCustomers.slice(start, start + itemsPerPage);
  }, [filteredCustomers, currentPage]);

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);

  const addCustomer = async (customerData: any) => {
    if (isSubmitting) return;
    if (!customerData.name) return alert('O nome do cliente é obrigatório.');
    
    setIsSubmitting(true);
    try {
      // Delay artificial para feedback
      await new Promise(resolve => setTimeout(resolve, 600));

      let clientToSelect: Customer | null = null;
      let finalClient: Customer | null = null;

      if (editingId) {
        setCustomers((prev: Customer[]) => prev.map(c => {
          if (c.id === editingId) {
            const updated = { ...c, ...customerData, updatedAt: Date.now() };
            clientToSelect = updated;
            finalClient = updated;
            addActivity('customer', 'Cliente Editado', `Dados de ${updated.name} atualizados.`);
            return updated;
          }
          return c;
        }));
        setEditingId(null);
      } else {
        const uuid = generateUniqueId('cust');
        const client: Customer = {
          id: uuid,
          displayId: `CUST-${generateUniqueId('disp').substring(0, 5).toUpperCase()}`,
          ...customerData,
          debt: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          syncStatus: 'pending',
          deviceId: getDeviceId()
        };
        finalClient = client;
        setCustomers((prev: Customer[]) => [...prev, client]);
        addActivity('customer', 'Novo Cliente', `Cliente ${client.name} cadastrado com ID ${client.displayId}.`);
      }

      if (finalClient) {
        console.log("DEBUG: Cadastro de cliente realizado com sucesso. Download automático de PDF desativado.");
      }

      setNewCustomer(INITIAL_CUSTOMER_STATE);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setShowForm(false);
        setSelectedCustomer(clientToSelect);
      }, 1500);
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar cliente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (customer: Customer) => {
    setNewCustomer({
      name: customer.name || '',
      email: customer.email || '',
      whatsapp: customer.whatsapp || customer.phone || '',
      dob: customer.dob || '',
      taxId: customer.taxId || '',
      image: customer.image || '',
      address: {
        cep: customer.address?.cep || '',
        street: customer.address?.street || '',
        number: customer.address?.number || '',
        neighborhood: customer.address?.neighborhood || '',
        city: customer.address?.city || '',
        state: customer.address?.state || '',
        complement: customer.address?.complement || ''
      }
    });
    setEditingId(customer.id);
    setShowForm(true);
    setSelectedCustomer(null);
  };

  const confirmDelete = () => {
    if (selectedCustomer) {
      addActivity('customer', 'Cliente Excluído', `Cliente ${selectedCustomer.name} (${selectedCustomer.displayId}) removido.`);
      setCustomers((prev: Customer[]) => prev.filter(c => c.id !== selectedCustomer.id));
      setSelectedCustomer(null);
      setIsDeleting(false);
    }
  };

  if (selectedCustomer) {
     return (
       <div className="min-h-screen bg-[#0d1525] text-white p-6 space-y-6">
          <button 
            onClick={() => setSelectedCustomer(null)}
            className="w-10 h-10 rounded-lg bg-[#1a2332] flex items-center justify-center mb-6 hover:bg-zinc-800 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-400" />
          </button>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#1a2332] rounded-3xl overflow-hidden shadow-2xl"
          >
            <div className="p-8">
              <div className="flex flex-col md:flex-row gap-8">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="relative group">
                    {selectedCustomer.image ? (
                      <img 
                        src={selectedCustomer.image} 
                        className="w-32 h-32 rounded-3xl object-cover border-4 border-[#0d1525] shadow-xl"
                        alt={selectedCustomer.name}
                      />
                    ) : (
                      <div className="w-32 h-32 rounded-3xl bg-blue-600/10 text-blue-400 flex items-center justify-center font-black text-3xl uppercase border-4 border-[#0d1525] shadow-xl">
                        {selectedCustomer.name.substring(0, 2)}
                      </div>
                    )}
                    <div className="absolute -bottom-2 right-0 bg-blue-600 text-white px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest shadow-lg">
                      {selectedCustomer.displayId}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-2">
                      <h4 className="font-bold text-2xl text-white">{selectedCustomer.name}</h4>
                      {goldCustomerIds.has(selectedCustomer.id) && (
                        <div className="flex items-center gap-1 bg-orange-500 text-white px-2 py-0.5 rounded text-[8px] font-bold">
                          <Star size={10} fill="currentColor" /> VIP
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">ID: {selectedCustomer.id.substring(0, 8)}</p>
                  </div>
                  
                  <div className="w-full pt-4 border-t border-gray-700/50">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Dívida Atual</p>
                    <p className={`text-2xl font-black ${selectedCustomer.debt > 0 ? 'text-red-500' : 'text-green-500'}`}>
                      R$ {selectedCustomer.debt.toFixed(2)}
                    </p>
                  </div>

                  {canEdit && (
                    <div className="flex gap-2 w-full">
                        <button 
                            onClick={() => handleEdit(selectedCustomer)}
                            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                        >
                            <Pencil size={14} /> Editar
                        </button>
                        <button 
                            onClick={() => setIsDeleting(true)}
                            className="flex-1 px-4 py-3 bg-red-600/10 text-red-500 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all flex items-center justify-center gap-2"
                        >
                            <Trash2 size={14} /> Excluir
                        </button>
                    </div>
                  )}
                </div>

                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-700/50 pb-2">Informações de Contato</h5>
                    <div className="space-y-4">
                      <div>
                        <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">E-mail</p>
                        <p className="text-sm font-medium text-white">{selectedCustomer.email || 'Nenhum e-mail cadastrado'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">WhatsApp / Telefone</p>
                        <p className="text-sm font-medium text-white">{selectedCustomer.whatsapp || selectedCustomer.phone || 'Nenhum contato cadastrado'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">CPF / CNPJ</p>
                        <p className="text-sm font-medium text-white">{selectedCustomer.taxId || 'Não informado'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-700/50 pb-2">Localização</h5>
                    <div className="space-y-2">
                       {selectedCustomer.address ? (
                         <div className="text-sm font-medium text-white space-y-1">
                            <p>{selectedCustomer.address.street}, {selectedCustomer.address.number}</p>
                            <p>{selectedCustomer.address.neighborhood}</p>
                            <p>{selectedCustomer.address.city} - {selectedCustomer.address.state}</p>
                            <p className="text-gray-500 text-[10px] font-bold">CEP: {selectedCustomer.address.cep}</p>
                         </div>
                       ) : (
                         <p className="text-xs text-gray-500 italic">Endereço não cadastrado</p>
                       )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <AnimatePresence>
            {isDeleting && (
              <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-[#1a2332] p-10 rounded-[3rem] border border-gray-800 max-w-sm w-full text-center space-y-6 shadow-2xl"
                >
                  <div className="w-20 h-20 bg-red-600/20 text-red-600 rounded-[2rem] flex items-center justify-center mx-auto">
                    <Trash2 size={40} />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-xl font-bold text-white uppercase tracking-tighter">Excluir Cliente?</h4>
                    <p className="text-xs text-gray-500 font-medium">Esta ação removerá permanentemente os dados do cliente e não poderá ser desfeita.</p>
                  </div>
                  <div className="flex flex-col gap-3">
                    <button onClick={confirmDelete} className="w-full py-5 bg-red-600 text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-600/30">Confirmar Exclusão</button>
                    <button onClick={() => setIsDeleting(false)} className="w-full py-5 bg-[#0d1525] text-gray-400 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-zinc-800 hover:text-white transition-all">Cancelar</button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
       </div>
     );
  }

  if (showForm) {
    return (
      <CustomerForm 
        initialData={newCustomer}
        onSubmit={addCustomer}
        onCancel={() => { setShowForm(false); setEditingId(null); }}
        isEditing={!!editingId}
        showSuccess={showSuccess}
        isSubmitting={isSubmitting}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-[200] bg-[#0a1628] text-white p-2 md:p-4 font-sans flex flex-col overflow-hidden">
      {viewingSale && (
        <OrderDetailsModal 
          sale={viewingSale} 
          onClose={() => setViewingSale(null)} 
          company={company} 
          couponConfig={couponConfig} 
          imprimirCupom={imprimirCupom as any} 
          products={products}
          customers={customers}
          paymentIcons={paymentIcons}
          setSelectedLabelProduct={setSelectedLabelProduct}
        />
      )}

      {/* Header Padrao */}
      <div className="flex items-center justify-between mb-2 shrink-0 px-2 md:px-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBackToDashboard}
            className="w-10 h-10 rounded-xl bg-[#1a2744] flex items-center justify-center border border-white/5 hover:bg-[#1a2744]/80 transition-all cursor-pointer group"
          >
            <ChevronLeft className="w-5 h-5 text-[#64748b] group-hover:text-white" />
          </button>
          <div>
            <h2 className="text-lg md:text-xl font-black text-white uppercase italic leading-none">Clientes</h2>
            <p className="text-[9px] font-black text-pink-500 uppercase tracking-widest mt-1">Gestão de Base & CRM</p>
          </div>
        </div>
        <button 
          onClick={() => setShowForm(true)}
          className="h-10 flex items-center gap-2 bg-pink-600 hover:bg-pink-500 text-white px-6 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all shadow-lg shadow-pink-600/20 active:scale-95 shrink-0"
        >
          <Plus size={14} />
          Novo Cliente
        </button>
      </div>

      {/* Seção Fixa: Stats, Filtros e Busca */}
      <div className="shrink-0 space-y-3 mb-2 px-2 md:px-0">
        {/* Resumo Cards Compacto */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { label: 'Total', value: stats.total, icon: Users, color: 'text-blue-400', bg: 'bg-blue-400/10' },
            { label: 'WhatsApp', value: stats.withWhatsApp, icon: MessageCircle, color: 'text-green-400', bg: 'bg-green-400/10' },
            { label: 'Ativos', value: stats.active, icon: BarChart3, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
            { label: 'VIP', value: stats.vips, icon: Star, color: 'text-orange-400', bg: 'bg-orange-400/10' }
          ].map((stat, idx) => (
            <div key={idx} className="bg-[#1a2744] p-3 rounded-xl border border-white/5 flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg ${stat.bg} ${stat.color} flex items-center justify-center shrink-0`}>
                <stat.icon size={14} />
              </div>
              <div className="truncate">
                <p className="text-[7px] font-black text-[#64748b] uppercase tracking-widest">{stat.label}</p>
                <p className="text-sm font-black text-white italic leading-none">{stat.value.toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Campo de Busca */}
        <form onSubmit={e => e.preventDefault()} className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#334155]" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, telefone, whatsapp ou cpf..."
            className="w-full bg-[#0d1c30] border border-white/5 rounded-xl py-3 pl-12 pr-12 text-[10px] font-black text-white uppercase placeholder:text-[#334155] focus:ring-1 focus:ring-pink-500/30 transition-all outline-none"
          />
        </form>

        {/* Filtro Alfabético */}
        <div className="flex overflow-x-auto no-scrollbar gap-1.5 pb-1">
          <button 
            onClick={() => setActiveLetter(null)}
            className={`px-4 h-8 text-[9px] font-black rounded-lg transition-all flex items-center uppercase tracking-widest shrink-0 ${
              !activeLetter ? 'bg-pink-600 text-white shadow-lg' : 'bg-[#0d1c30] text-[#64748b] hover:text-white border border-white/5'
            }`}
          >
            TUDO
          </button>
          {alphabet.map((letter) => (
            <button 
              key={letter} 
              onClick={() => setActiveLetter(letter)}
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-[9px] font-black transition-all shrink-0 uppercase ${
                activeLetter === letter ? 'bg-pink-600 text-white shadow-lg' : 'text-[#64748b] hover:text-white bg-[#0d1c30] border border-white/5'
              }`}
            >
              {letter}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela de Clientes com Scroll Interno */}
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar bg-[#0d1c30] rounded-2xl border border-white/5 shadow-inner">
        <div className="hidden lg:grid grid-cols-[2fr_1.5fr_1fr_1fr_0.8fr] gap-4 px-6 py-4 border-b border-white/5 bg-black/20 sticky top-0 z-10">
          <span className="text-[9px] font-black text-[#64748b] uppercase tracking-widest">Cliente</span>
          <span className="text-[9px] font-black text-[#64748b] uppercase tracking-widest">WhatsApp / Telefone</span>
          <span className="text-[9px] font-black text-[#64748b] uppercase tracking-widest">CPF / CNPJ</span>
          <span className="text-[9px] font-black text-[#64748b] uppercase tracking-widest">Cadastro</span>
          <span className="text-[9px] font-black text-[#64748b] uppercase tracking-widest text-right">Ações</span>
        </div>

        <div className="divide-y divide-white/5">
          {paginatedCustomers.length > 0 ? paginatedCustomers.map((customer) => (
            <div 
              key={customer.id}
              className="grid grid-cols-1 lg:grid-cols-[2fr_1.5fr_1fr_1fr_0.8fr] gap-4 px-6 py-4 items-center hover:bg-[#1a2744]/20 transition-all cursor-pointer group"
              onClick={() => setSelectedCustomer(customer)}
            >
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  {customer.image ? (
                    <img src={customer.image} className="w-10 h-10 rounded-xl object-cover border border-white/10" alt={customer.name} />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-pink-600/10 text-pink-400 flex items-center justify-center text-[10px] font-black uppercase border border-pink-500/20">
                      {customer.name.substring(0, 2)}
                    </div>
                  )}
                  {checkBirthday(customer.dob || '') && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-pink-500 rounded-full flex items-center justify-center text-[8px] animate-bounce shadow-lg">
                      🎂
                    </div>
                  )}
                </div>
                <div className="truncate">
                  <p className="text-[11px] font-black text-white group-hover:text-pink-400 transition-colors uppercase italic truncate">{customer.name}</p>
                  <p className="text-[9px] font-black text-[#64748b] truncate">{customer.email || 'SEM E-MAIL'}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-white text-[10px] font-black uppercase whitespace-nowrap">{customer.whatsapp || customer.phone || '--'}</span>
              </div>
              
              <span className="text-[#64748b] text-[10px] font-black uppercase lg:block hidden">{customer.taxId || '--'}</span>
              <span className="text-[#64748b] text-[10px] font-black lg:block hidden">
                {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : '--'}
              </span>
              
              <div className="flex items-center lg:justify-end gap-2">
                <button 
                  onClick={(e) => { e.stopPropagation(); setSelectedCustomer(customer); }}
                  className="w-8 h-8 rounded-lg bg-[#1a2744] flex items-center justify-center hover:bg-[#334155] transition-all"
                >
                  <Eye className="w-4 h-4 text-[#64748b]" />
                </button>
                {goldCustomerIds.has(customer.id) && (
                  <div className="w-8 h-8 rounded-lg bg-orange-400/10 flex items-center justify-center border border-orange-400/20">
                    <Star className="w-4 h-4 text-orange-400 fill-orange-400" />
                  </div>
                )}
              </div>
            </div>
          )) : (
            <div className="py-20 text-center opacity-20">
              <Users size={64} className="mx-auto" strokeWidth={1} />
              <p className="mt-4 text-[9px] font-black uppercase tracking-[0.3em]">Nenhum cliente encontrado</p>
            </div>
          )}
        </div>
      </div>

      {/* Paginação Fixa no Rodapé */}
      <div className="flex flex-col sm:flex-row items-center justify-between mt-3 shrink-0 gap-3 px-2">
        <span className="text-[9px] font-black text-[#64748b] uppercase tracking-widest">
          {filteredCustomers.length.toLocaleString()} CLIENTES LOCALIZADOS
        </span>
        <div className="flex items-center gap-1.5 pb-2 sm:pb-0">
          <button 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => p - 1)}
            className="w-8 h-8 rounded-lg bg-[#0d1c30] flex items-center justify-center disabled:opacity-20 hover:bg-[#1a2744] transition-all border border-white/5"
          >
            <ChevronLeft className="w-4 h-4 text-[#64748b]" />
          </button>
          
          {[...Array(Math.min(3, totalPages))].map((_, i) => {
            const pageNum = i + 1;
             return (
               <button 
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-[9px] font-black transition-all ${currentPage === pageNum ? 'bg-pink-600 text-white shadow-lg' : 'bg-[#0d1c30] text-[#64748b] border border-white/5'}`}
               >
                 {pageNum}
               </button>
             );
          })}
          
          {totalPages > 3 && <span className="text-[#64748b] px-1 font-black text-[9px]">...</span>}
          
          <button 
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(p => p + 1)}
            className="w-8 h-8 rounded-lg bg-[#0d1c30] flex items-center justify-center disabled:opacity-20 hover:bg-[#1a2744] transition-all border border-white/5"
          >
            <ChevronRight className="w-4 h-4 text-[#64748b]" />
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, subValue, iconBg }: { icon: React.ReactNode, label: string, value: string, subValue: string, iconBg: string }) {
  return (
    <div className="bg-[#1a2332] rounded-xl p-3 flex items-center gap-3 shadow-md border border-gray-800/20">
      <div className={`w-9 h-9 rounded-full ${iconBg} flex items-center justify-center shadow-sm`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">{label}</p>
        <p className="text-xl font-black text-white leading-tight">{value}</p>
        <p className="text-[10px] text-gray-500 font-medium">{subValue}</p>
      </div>
    </div>
  );
}

function OrderDetailsModal({ 
  sale, 
  onClose, 
  imprimirCupom, 
  products,
  customers,
  setSelectedLabelProduct
}: { 
  sale: Sale, 
  onClose: () => void, 
  company: any, 
  couponConfig: any, 
  imprimirCupom: (sale: Sale | string) => Promise<boolean>,
  products: Product[],
  customers: Customer[],
  paymentIcons: Record<string, string>,
  setSelectedLabelProduct: (p: Product | null) => void
}) {
  const customer = customers.find(c => c.id === sale.customerId);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-[#1a2332] w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden relative border border-gray-800 flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-gray-800 shrink-0 flex justify-between items-center">
            <h1 className="text-lg font-bold tracking-tight">Detalhes do Pedido #{sale.sequentialId || sale.id.substring(0,8)}</h1>
            <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-500"><X size={20} /></button>
        </div>
        <div className="p-6 overflow-y-auto space-y-6">
            <div className="bg-[#0d1525] p-4 rounded-xl border border-gray-800 space-y-4">
               <div>
                  <label className="text-[10px] text-gray-500 uppercase font-black">Cliente</label>
                  <p className="font-bold text-white">{customer?.name || 'Venda Avulsa'}</p>
               </div>
               <div className="flex justify-between border-t border-gray-800 pt-3">
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase font-black">Total</label>
                    <p className="text-xl font-black text-blue-500">R$ {sale.total.toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <label className="text-[10px] text-gray-500 uppercase font-black">Data</label>
                    <p className="text-xs text-white">{new Date(sale.date).toLocaleDateString()}</p>
                  </div>
               </div>
            </div>
            
            <div className="space-y-2">
                 <label className="text-xs text-gray-500 font-bold uppercase">Itens</label>
                 <div className="space-y-1">
                    {sale.items.map((it, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-[#0d1525] p-3 rounded-lg border border-gray-800">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium">{products.find(p => p.id === it.productId)?.name || 'Prod. Removido'}</span>
                            <button 
                              onClick={() => {
                                const p = products.find(prod => prod.id === it.productId);
                                if (p) setSelectedLabelProduct(p);
                              }}
                              className="p-1 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-blue-400 transition-all"
                            >
                              <Printer size={12} />
                            </button>
                          </div>
                          <span className="text-xs font-bold">{it.quantity}x R$ {it.price.toFixed(2)}</span>
                      </div>
                    ))}
                 </div>
            </div>
        </div>
        <div className="p-6 bg-[#0d1525] border-t border-gray-800 space-y-2">
            <button onClick={() => imprimirCupom(sale)} className="w-full py-4 bg-white text-black rounded-xl font-bold uppercase text-xs hover:bg-zinc-200 flex items-center justify-center gap-2">
                <Printer size={16} /> Imprimir Comprovante
            </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function CustomerForm({ 
  initialData, 
  onSubmit, 
  onCancel, 
  isEditing = false,
  showSuccess,
  isSubmitting = false
}: { 
  initialData: any, 
  onSubmit: (data: any) => void, 
  onCancel: () => void, 
  isEditing?: boolean,
  showSuccess?: boolean,
  dark?: boolean,
  isSubmitting?: boolean
}) {
  const [data, setData] = useState(initialData);
  useEffect(() => setData(initialData), [initialData]);

  const handleDobChange = (v: string) => {
    const digits = v.replace(/\D/g, '');
    let formatted = '';
    if (digits.length <= 2) formatted = digits;
    else if (digits.length <= 4) formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    else formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
    setData({ ...data, dob: formatted });
  };

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white p-6 custom-scrollbar overflow-y-auto">
      {/* Back Button */}
      <button 
        onClick={onCancel}
        className="w-10 h-10 rounded-lg border border-[#1e1e3a] flex items-center justify-center mb-6 hover:bg-[#1e1e3a] transition-colors"
      >
        <ArrowLeft className="w-5 h-5 text-gray-400" />
      </button>

      {/* Header */}
      <div className="flex justify-between items-start mb-8 gap-4 flex-col md:flex-row">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-purple-500" />
            <span className="text-purple-500 text-sm font-medium uppercase tracking-widest">CLIENTES</span>
          </div>
          <h1 className="text-3xl font-bold mb-1 uppercase tracking-tight">
            {isEditing ? 'EDITAR CLIENTE' : 'NOVO CLIENTE'}
          </h1>
          <p className="text-gray-500 text-sm">
            {isEditing ? 'Atualize as informações do seu cliente para manter seu relacionamento sempre em dia.' : 'Cadastre um novo cliente e comece a construir um relacionamento de sucesso.'}
          </p>
        </div>

        {/* Decorative Icons */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          <User className="w-6 h-6 text-purple-400 opacity-50" />
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center border-2 border-purple-500 shadow-xl shadow-purple-500/20">
            <User className="w-10 h-10 text-purple-300" />
          </div>
          <User className="w-6 h-6 text-purple-400 opacity-50" />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Profile Photo Card */}
        <div className="w-full lg:w-56 shrink-0">
          <div className="bg-[#12122a] rounded-xl p-6 border border-[#1e1e3a]">
            <p className="text-xs text-gray-400 font-medium mb-4 uppercase tracking-widest">FOTO DO PERFIL</p>
            
            <div className="mb-4">
              <UniversalImageSelector 
                label=""
                value={data.image}
                onChange={(url) => setData({ ...data, image: url })}
                category="customer"
                aspectRatio="aspect-square"
              />
            </div>
            
            <p className="text-xs text-gray-500 text-center mt-3">JPG, PNG até 5MB</p>
          </div>
          
          <AnimatePresence>
            {showSuccess && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/50 rounded-xl flex items-center gap-3 text-emerald-500"
              >
                <CheckCircle2 size={18} />
                <span className="text-[10px] font-black uppercase tracking-widest">
                  {isEditing ? 'Dados Atualizados!' : 'Cadastro Realizado!'}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Form */}
        <form 
          className="flex-1 space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(data);
          }}
        >
          {/* Dados Pessoais */}
          <div className="bg-[#12122a] rounded-xl p-6 border border-[#1e1e3a]">
            <div className="flex items-center gap-2 mb-6">
              <User className="w-5 h-5 text-purple-500" />
              <span className="text-purple-500 font-medium text-sm uppercase tracking-widest">DADOS PESSOAIS</span>
            </div>

            <div className="space-y-4">
              {/* Nome Completo */}
              <div>
                <label className="text-xs text-gray-400 font-medium mb-2 block tracking-widest">
                  NOME COMPLETO <span className="text-purple-500">*</span>
                </label>
                <input
                  type="text"
                  value={data.name || ''}
                  onChange={e => setData({...data, name: e.target.value})}
                  placeholder="Ex: Maria Silva"
                  required
                  className="w-full bg-[#0a0a1a] border border-[#1e1e3a] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              {/* Email and WhatsApp */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-400 font-medium mb-2 block tracking-widest">E-MAIL</label>
                  <input
                    type="email"
                    value={data.email || ''}
                    onChange={e => setData({...data, email: e.target.value})}
                    placeholder="maria@email.com"
                    className="w-full bg-[#0a0a1a] border border-[#1e1e3a] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 font-medium mb-2 block tracking-widest">WHATSAPP</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={data.whatsapp || ''}
                      onChange={e => setData({...data, whatsapp: e.target.value})}
                      placeholder="(11) 99999-9999"
                      className="w-full bg-[#0a0a1a] border border-[#1e1e3a] rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Data de Nasc and CPF/CNPJ */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-400 font-medium mb-2 block tracking-widest">DATA DE NASC.</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={data.dob || ''}
                      onChange={e => handleDobChange(e.target.value)}
                      placeholder="DD/MM/AAAA"
                      className="w-full bg-[#0a0a1a] border border-[#1e1e3a] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                      <Calendar className="w-4 h-4" />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-400 font-medium mb-2 block tracking-widest">
                    CPF / CNPJ
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={data.taxId || ''}
                      onChange={e => setData({...data, taxId: e.target.value})}
                      placeholder="000.000.000-00 (Opcional)"
                      className="w-full bg-[#0a0a1a] border border-[#1e1e3a] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                      <CreditCard className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Endereço */}
          <div className="bg-[#12122a] rounded-xl p-6 border border-[#1e1e3a]">
            <div className="flex items-center gap-2 mb-6">
              <MapPin className="w-5 h-5 text-purple-500" />
              <span className="text-purple-500 font-medium text-sm uppercase tracking-widest">ENDEREÇO</span>
            </div>

            <div className="space-y-4">
              {/* CEP and Logradouro */}
              <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-4">
                <div>
                  <label className="text-xs text-gray-400 font-medium mb-2 block tracking-widest">CEP</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={data.address.cep || ''}
                      onChange={e => setData({...data, address: {...data.address, cep: e.target.value}})}
                      placeholder="00000-000"
                      className="w-full bg-[#0a0a1a] border border-[#1e1e3a] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                      <Search className="w-4 h-4" />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-400 font-medium mb-2 block tracking-widest">LOGRADOURO</label>
                  <input
                    type="text"
                    value={data.address.street || ''}
                    onChange={e => setData({...data, address: {...data.address, street: e.target.value}})}
                    placeholder="Rua, Avenida..."
                    className="w-full bg-[#0a0a1a] border border-[#1e1e3a] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>
              </div>

              {/* Número, Bairro, Cidade, Estado */}
              <div className="grid grid-cols-2 md:grid-cols-[120px_1fr_1fr_100px] gap-4">
                <div className="col-span-1">
                  <label className="text-xs text-gray-400 font-medium mb-2 block tracking-widest">NÚMERO</label>
                  <input
                    type="text"
                    value={data.address.number || ''}
                    onChange={e => setData({...data, address: {...data.address, number: e.target.value}})}
                    placeholder="123"
                    className="w-full bg-[#0a0a1a] border border-[#1e1e3a] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>
                <div className="col-span-1">
                  <label className="text-xs text-gray-400 font-medium mb-2 block tracking-widest">BAIRRO</label>
                  <input
                    type="text"
                    value={data.address.neighborhood || ''}
                    onChange={e => setData({...data, address: {...data.address, neighborhood: e.target.value}})}
                    placeholder="Centro"
                    className="w-full bg-[#0a0a1a] border border-[#1e1e3a] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>
                <div className="col-span-1">
                  <label className="text-xs text-gray-400 font-medium mb-2 block tracking-widest">CIDADE</label>
                  <input
                    type="text"
                    value={data.address.city || ''}
                    onChange={e => setData({...data, address: {...data.address, city: e.target.value}})}
                    placeholder="Uberlândia"
                    className="w-full bg-[#0a0a1a] border border-[#1e1e3a] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>
                <div className="col-span-1">
                  <label className="text-xs text-gray-400 font-medium mb-2 block tracking-widest">ESTADO</label>
                  <div className="relative">
                    <select 
                      value={data.address.state || ''}
                      onChange={e => setData({...data, address: {...data.address, state: e.target.value}})}
                      className="w-full bg-[#0a0a1a] border border-[#1e1e3a] rounded-lg px-4 py-3 text-white appearance-none focus:outline-none focus:border-purple-500 transition-colors"
                    >
                      <option value="">UF</option>
                      {['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'].map(uf => (
                        <option key={uf} value={uf}>{uf}</option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            <button 
              type="button"
              onClick={onCancel}
              className="flex-1 py-4 rounded-xl bg-[#12122a] border border-[#1e1e3a] text-gray-400 font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-[#1a1a3a] hover:text-white transition-all order-2 sm:order-1"
            >
              <X className="w-4 h-4" />
              CANCELAR
            </button>
            <button 
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-4 rounded-xl bg-gradient-to-r from-purple-600 to-blue-500 text-white font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:opacity-90 hover:scale-[1.02] active:scale-100 transition-all shadow-lg shadow-purple-500/20 order-1 sm:order-2 disabled:opacity-50 disabled:cursor-wait"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>PROCESSANDO...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  {isEditing ? 'SALVAR ALTERAÇÕES' : 'FINALIZAR CADASTRO'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
