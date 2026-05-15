/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from 'react';
import { generateUniqueId } from '../lib/persistence';
import { 
  Plus, 
  Search, 
  Filter, 
  Trash2, 
  Edit, 
  Eye, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  MoreVertical,
  ClipboardList,
  User,
  Phone,
  Package,
  DollarSign,
  MessageSquare,
  Check,
  X,
  Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PreOrder, Input, maskPhone, Sale, Product, Customer } from '../App';

interface PreOrderViewProps {
  preOrders: PreOrder[];
  setPreOrders: (orders: PreOrder[] | ((prev: PreOrder[]) => PreOrder[])) => void;
  addActivity: (type: any, action: string, details: string) => void;
  sales: Sale[];
  setSales: (sales: Sale[] | ((prev: Sale[]) => Sale[])) => void;
  products: Product[];
  customers: Customer[];
}

export function PreOrderView({ 
  preOrders, 
  setPreOrders, 
  addActivity,
  sales,
  setSales,
  products,
  customers
}: PreOrderViewProps) {
  const [activeTab, setActiveTab] = useState<'new' | 'ongoing' | 'history'>('ongoing');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedDetailOrder, setSelectedDetailOrder] = useState<PreOrder | null>(null);
  const [formData, setFormData] = useState<Omit<PreOrder, 'id' | 'createdAt' | 'code'>>({
    customerName: '',
    phone: '',
    product: '',
    quantity: 1,
    combinedValue: 0,
    finalValue: 0,
    downPayment: 0,
    expectedDate: new Date().toISOString().split('T')[0],
    observation: '',
    internalObservation: '',
    origin: 'WhatsApp',
    status: 'Aguardando',
    priority: 'Normal',
    images: []
  });

  const generateOrderCode = () => {
    const lastOrder = preOrders.reduce((max, order) => {
      const num = parseInt(order.code.split('-')[1]) || 0;
      return num > max ? num : max;
    }, 0);
    return `PRE-${(lastOrder + 1).toString().padStart(4, '0')}`;
  };

  const resetForm = () => {
    setFormData({
      customerName: '',
      phone: '',
      product: '',
      quantity: 1,
      combinedValue: 0,
      finalValue: 0,
      downPayment: 0,
      expectedDate: new Date().toISOString().split('T')[0],
      observation: '',
      internalObservation: '',
      origin: 'WhatsApp',
      status: 'Aguardando',
      priority: 'Normal',
      images: []
    });
    setEditingId(null);
  };

  const handleMoveToProduction = (order: PreOrder) => {
    if (order.status === 'Em produção') {
        alert('Este pedido já está em produção.');
        return;
    }

    const maxSeq = sales.reduce((max, s) => {
      const seqNum = parseInt(s.sequentialId?.split('-')[0] || '0');
      return seqNum > max ? seqNum : max;
    }, 0);
    const nextSeq = `${(maxSeq + 1).toString().padStart(6, '0')}-ENC`;

    // Try to find a matching product by name
    const foundProduct = products.find(p => p.name.toLowerCase() === order.product.toLowerCase());

    const newSale: Sale = {
        id: generateUniqueId('sale'),
        sequentialId: nextSeq,
        date: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        syncStatus: 'pending',
        deviceId: 'PREORDER_CONVERT',
        total: order.combinedValue,
        totalCost: foundProduct ? (foundProduct.costPrice || 0) * order.quantity : 0,
        totalProfit: foundProduct ? (order.combinedValue - (foundProduct.costPrice || 0) * order.quantity) : order.combinedValue,
        paymentMethod: 'Encomenda',
        payments: [{ method: 'Sinal/Entrada', amount: order.downPayment, date: Date.now() }],
        receivedAmount: order.downPayment,
        change: 0,
        status: 'aguardando_producao',
        notes: `ENCOMENDA: ${order.code} | PRODUTO: ${order.product} | ${order.observation}`,
        items: [{
            productId: foundProduct?.id || 'encomenda_manual',
            quantity: order.quantity,
            price: order.combinedValue / order.quantity,
            cost: foundProduct ? (foundProduct.costPrice || 0) : 0,
            profit: foundProduct ? (order.combinedValue / order.quantity) - (foundProduct.costPrice || 0) : order.combinedValue / order.quantity
        }],
        customerId: customers.find(c => c.name.toLowerCase() === order.customerName.toLowerCase())?.id
    };

    setSales(prev => [...prev, newSale]);
    setPreOrders(prev => prev.map(p => p.id === order.id ? { ...p, status: 'Em produção' } : p));
    
    addActivity('sale', 'Conversão Encomenda', `Encomenda #${order.code} enviada para Central de Produção.`);
    alert(`Pedido #${order.code} enviado para a Central de Produção com sucesso!`);
  };

  const handleSave = () => {
    if (!formData.customerName || !formData.product) {
      alert('Nome do cliente e produto são obrigatórios.');
      return;
    }

    if (editingId) {
      setPreOrders(prev => prev.map(o => o.id === editingId ? { ...o, ...formData } : o));
      addActivity('system', 'Pré-Encomenda Atualizada', `Pré-encomenda de ${formData.customerName} atualizada.`);
    } else {
      const newOrder: PreOrder = {
        ...formData,
        id: generateUniqueId(),
        code: generateOrderCode(),
        createdAt: Date.now()
      };
      setPreOrders(prev => [newOrder, ...prev]);
      addActivity('system', 'Nova Pré-Encomenda', `Nova pré-encomenda cadastrada para ${formData.customerName}.`);
    }

    alert('Pré-encomenda salva com sucesso!');
    resetForm();
    if (!editingId) setActiveTab('ongoing');
  };

  const filteredOrders = useMemo(() => {
    return preOrders.filter(o => {
      const matchesSearch = 
        o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.code.toLowerCase().includes(searchTerm.toLowerCase());
      
      const isHistory = o.status === 'Finalizado' || o.status === 'Cancelado';
      const isOngoing = !isHistory;

      if (activeTab === 'ongoing' && isHistory) return false;
      if (activeTab === 'history' && isOngoing) return false;

      const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || o.priority === priorityFilter;
      
      const orderDate = o.expectedDate;
      const matchesDate = (!startDate || orderDate >= startDate) && (!endDate || orderDate <= endDate);

      return matchesSearch && matchesStatus && matchesPriority && matchesDate;
    });
  }, [preOrders, searchTerm, statusFilter, priorityFilter, activeTab, startDate, endDate]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Aguardando': return 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20';
      case 'Confirmado': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      case 'Em análise': return 'text-purple-400 bg-purple-400/10 border-purple-400/20';
      case 'Em produção': return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
      case 'Finalizado': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
      case 'Cancelado': return 'text-red-400 bg-red-400/10 border-red-400/20';
      default: return 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Normal': return 'text-blue-400';
      case 'Alta': return 'text-orange-400';
      case 'Urgente': return 'text-red-400';
      default: return 'text-blue-400';
    }
  };

  const getDetailsStatusColor = (status: string) => {
    switch (status) {
      case 'Aguardando': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'Confirmado': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      case 'Em análise': return 'text-purple-400 bg-purple-400/10 border-purple-400/20';
      case 'Em produção': return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
      case 'Finalizado': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
      case 'Cancelado': return 'text-red-400 bg-red-400/10 border-red-400/20';
      default: return 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20';
    }
  };

  const statusSteps: PreOrder['status'][] = ['Aguardando', 'Confirmado', 'Em análise', 'Em produção', 'Finalizado'];

  const StatusTimeline = ({ currentStatus }: { currentStatus: PreOrder['status'] }) => {
    const currentStepIndex = statusSteps.indexOf(currentStatus);
    const isCancelled = currentStatus === 'Cancelado';

    return (
      <div className="py-8 px-4 flex flex-col items-center">
        <div className="w-full max-w-2xl relative flex justify-between items-center">
          {/* Animated Progress Line */}
          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-white/5 -translate-y-1/2 z-0" />
          {!isCancelled && (
             <motion.div 
               className="absolute top-1/2 left-0 h-0.5 bg-blue-500 -translate-y-1/2 z-0 origin-left"
               initial={{ scaleX: 0 }}
               animate={{ scaleX: Math.max(0, currentStepIndex) / (statusSteps.length - 1) }}
               transition={{ duration: 0.8, ease: "easeOut" }}
             />
          )}

          {statusSteps.map((step, idx) => {
            const isActive = !isCancelled && idx <= currentStepIndex;
            const isCurrent = !isCancelled && idx === currentStepIndex;

            return (
              <div key={step} className="relative z-10 flex flex-col items-center">
                <motion.div 
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                    isCancelled ? 'bg-zinc-800 border-zinc-700 text-zinc-600' :
                    isActive ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 
                    'bg-[#1a1625] border-white/5 text-white/20'
                  }`}
                  animate={isCurrent ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  {isActive ? <Check size={18} /> : (idx + 1)}
                </motion.div>
                <div className="absolute -bottom-6 w-max text-center">
                  <p className={`text-[8px] font-black uppercase tracking-widest ${
                    isCurrent ? 'text-blue-400 opacity-100' : 'text-white/20 opacity-50'
                  }`}>
                    {step}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        {isCancelled && (
           <div className="mt-12 flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl">
              <XCircle size={14} className="text-red-500" />
              <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">Pedido Cancelado</p>
           </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#0d0a1a]">
      {/* Header / Tabs */}
      <div className="shrink-0 bg-[#12122b]/50 backdrop-blur-xl border-b border-white/5 p-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 border border-blue-500/20 shadow-lg shadow-blue-500/10">
                <ClipboardList size={20} />
             </div>
             <div>
                <h1 className="text-sm font-black text-white uppercase tracking-[0.2em]">Pré-Encomendas</h1>
                <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest mt-0.5">Gestão de pedidos antecipados</p>
             </div>
          </div>
          
          <button 
            onClick={() => { setActiveTab('new'); resetForm(); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20 active:scale-95"
          >
            <Plus size={14} />
            Nova
          </button>
        </div>

        <div className="flex gap-1 p-1 bg-black/20 rounded-xl border border-white/5">
          <button 
            onClick={() => setActiveTab('new')}
            className={`flex-1 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'new' ? 'bg-white/10 text-white shadow-lg' : 'text-white/40 hover:text-white/60 hover:bg-white/5'}`}
          >
            Nova {editingId ? ' (Editando)' : ''}
          </button>
          <button 
            onClick={() => setActiveTab('ongoing')}
            className={`flex-1 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'ongoing' ? 'bg-white/10 text-white shadow-lg' : 'text-white/40 hover:text-white/60 hover:bg-white/5'}`}
          >
            Em Andamento
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-white/10 text-white shadow-lg' : 'text-white/40 hover:text-white/60 hover:bg-white/5'}`}
          >
            Histórico
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 no-scrollbar pb-32 md:pb-6">
        <AnimatePresence mode="wait">
          {activeTab === 'new' ? (
            <motion.div 
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-4xl mx-auto space-y-6"
            >
              <div className="glass-panel p-6 md:p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Customer Info */}
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] flex items-center gap-2">
                       <User size={12} /> Dados do Cliente
                    </h3>
                    <Input 
                      label="NOME DO CLIENTE" 
                      value={formData.customerName} 
                      onChange={v => setFormData({...formData, customerName: v})} 
                      placeholder="NOME COMPLETO" 
                    />
                    <Input 
                      label="TELEFONE / WHATSAPP" 
                      value={formData.phone} 
                      onChange={v => setFormData({...formData, phone: maskPhone(v)})} 
                      placeholder="(00) 00000-0000" 
                    />
                  </div>

                  {/* Product Info */}
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-purple-400 uppercase tracking-[0.2em] flex items-center gap-2">
                       <Package size={12} /> Detalhes do Produto
                    </h3>
                    <Input 
                      label="PRODUTO DESEJADO" 
                      value={formData.product} 
                      onChange={v => setFormData({...formData, product: v})} 
                      placeholder="EX: CAMISETA OVERSIZED G" 
                    />
                    <Input 
                      label="QUANTIDADE" 
                      value={formData.quantity} 
                      onChange={v => setFormData({...formData, quantity: parseInt(v) || 0})} 
                      placeholder="1" 
                      type="number"
                    />
                  </div>

                  {/* Financial Info */}
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] flex items-center gap-2">
                       <DollarSign size={12} /> Valores e Prazos
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <Input 
                        label="VALOR ESTIMADO" 
                        value={formData.combinedValue} 
                        onChange={v => setFormData({...formData, combinedValue: parseFloat(v) || 0})} 
                        placeholder="0.00" 
                        type="number"
                      />
                      <Input 
                        label="VALOR FINAL" 
                        value={formData.finalValue} 
                        onChange={v => setFormData({...formData, finalValue: parseFloat(v) || 0})} 
                        placeholder="0.00" 
                        type="number"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Input 
                        label="VALOR DE ENTRADA" 
                        value={formData.downPayment} 
                        onChange={v => setFormData({...formData, downPayment: parseFloat(v) || 0})} 
                        placeholder="0.00" 
                        type="number"
                      />
                      <Input 
                        label="DATA PREVISTA" 
                        value={formData.expectedDate} 
                        onChange={v => setFormData({...formData, expectedDate: v})} 
                        type="date"
                      />
                    </div>
                  </div>

                  {/* Status and Priority */}
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-orange-400 uppercase tracking-[0.2em] flex items-center gap-2">
                       <AlertCircle size={12} /> Classificação
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-white/40 uppercase tracking-widest px-1">Status</label>
                        <select 
                          value={formData.status}
                          onChange={e => setFormData({...formData, status: e.target.value as any})}
                          className="w-full bg-[#1a1625] border border-white/10 rounded-xl px-4 py-3.5 text-xs font-bold text-white outline-none focus:border-blue-500 transition-all uppercase"
                        >
                          <option value="Aguardando">Aguardando</option>
                          <option value="Confirmado">Confirmado</option>
                          <option value="Em análise">Em análise</option>
                          <option value="Em produção">Em produção</option>
                          <option value="Finalizado">Finalizado</option>
                          <option value="Cancelado">Cancelado</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-white/40 uppercase tracking-widest px-1">Origem</label>
                        <select 
                          value={formData.origin}
                          onChange={e => setFormData({...formData, origin: e.target.value as any})}
                          className="w-full bg-[#1a1625] border border-white/10 rounded-xl px-4 py-3.5 text-xs font-bold text-white outline-none focus:border-blue-500 transition-all uppercase"
                        >
                          <option value="WhatsApp">WhatsApp</option>
                          <option value="Instagram">Instagram</option>
                          <option value="Loja">Loja</option>
                          <option value="Evento">Evento</option>
                          <option value="Cliente Fixo">Cliente Fixo</option>
                          <option value="Site">Site</option>
                          <option value="Outro">Outro</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-white/40 uppercase tracking-widest px-1">Prioridade</label>
                        <select 
                          value={formData.priority}
                          onChange={e => setFormData({...formData, priority: e.target.value as any})}
                          className="w-full bg-[#1a1625] border border-white/10 rounded-xl px-4 py-3.5 text-xs font-bold text-white outline-none focus:border-blue-500 transition-all uppercase"
                        >
                          <option value="Normal">Normal</option>
                          <option value="Alta">Alta</option>
                          <option value="Urgente">Urgente</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-white/40 uppercase tracking-widest px-1">Observação do Cliente</label>
                        <textarea 
                          value={formData.observation}
                          onChange={e => setFormData({...formData, observation: e.target.value})}
                          placeholder="DETALHES DO CLIENTE..."
                          className="w-full bg-[#1a1625] border border-white/10 rounded-xl px-4 py-3.5 text-xs font-bold text-white outline-none focus:border-blue-500 transition-all uppercase min-h-[80px]"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-white/40 uppercase tracking-widest px-1">Observação Interna</label>
                        <textarea 
                          value={formData.internalObservation}
                          onChange={e => setFormData({...formData, internalObservation: e.target.value})}
                          placeholder="NOTAS PARA A EQUIPE..."
                          className="w-full bg-[#1a1625] border border-white/10 rounded-xl px-4 py-3.5 text-xs font-bold text-white outline-none focus:border-blue-500 transition-all uppercase min-h-[80px]"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-4 border-t border-white/5">
                   <button 
                     onClick={resetForm}
                     className="px-6 py-4 bg-white/5 border border-white/10 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all active:scale-95"
                   >
                     Limpar / Cancelar
                   </button>
                   <button 
                     onClick={handleSave}
                     className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 shadow-xl shadow-emerald-600/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                   >
                     <Check size={16} /> {editingId ? 'Salvar Alterações' : 'Salvar Pré-Encomenda'}
                   </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Filters / Search */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                  <input 
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="BUSCAR CLIENTE OU PRODUTO..."
                    className="w-full bg-[#12122b]/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-[10px] font-black uppercase tracking-widest text-white placeholder:text-white/20 outline-none focus:border-blue-500/50 transition-all"
                  />
                </div>
                <div className="flex gap-2">
                   <select 
                     value={statusFilter}
                     onChange={e => setStatusFilter(e.target.value)}
                     className="flex-1 bg-[#12122b]/50 border border-white/5 rounded-2xl px-4 py-4 text-[10px] font-black uppercase tracking-widest text-white outline-none"
                   >
                     <option value="all">TODOS STATUS</option>
                     <option value="Aguardando">Aguardando</option>
                     <option value="Confirmado">Confirmado</option>
                     <option value="Em análise">Em análise</option>
                     <option value="Em produção">Em produção</option>
                     <option value="Finalizado">Finalizado</option>
                     <option value="Cancelado">Cancelado</option>
                   </select>
                   <select 
                     value={priorityFilter}
                     onChange={e => setPriorityFilter(e.target.value)}
                     className="flex-1 bg-[#12122b]/50 border border-white/5 rounded-2xl px-4 py-4 text-[10px] font-black uppercase tracking-widest text-white outline-none"
                   >
                     <option value="all">TODAS PRIORIDADES</option>
                     <option value="Normal">Normal</option>
                     <option value="Alta">Alta</option>
                     <option value="Urgente">Urgente</option>
                   </select>
                </div>
                {activeTab === 'history' && (
                  <div className="flex gap-2">
                    <input 
                      type="date"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      className="flex-1 bg-[#12122b]/50 border border-white/5 rounded-2xl px-4 py-4 text-[10px] font-black uppercase tracking-widest text-white outline-none"
                      title="Data Inicial"
                    />
                    <input 
                      type="date"
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                      className="flex-1 bg-[#12122b]/50 border border-white/5 rounded-2xl px-4 py-4 text-[10px] font-black uppercase tracking-widest text-white outline-none"
                      title="Data Final"
                    />
                  </div>
                )}
              </div>

              {/* List */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredOrders.length > 0 ? (
                  filteredOrders.map(order => (
                    <motion.div 
                      layout
                      key={order.id}
                      className="glass-panel group overflow-hidden relative"
                    >
                      {/* Priority Tag at Top */}
                      <div className={`absolute top-0 left-0 right-0 h-1 ${
                        order.priority === 'Urgente' ? 'bg-red-500' :
                        order.priority === 'Alta' ? 'bg-orange-500' : 'bg-blue-500'
                      }`} />

                      <div className="p-5 flex flex-col gap-4">
                        <div className="flex items-start justify-between">
                          <div className="cursor-pointer" onClick={() => setSelectedDetailOrder(order)}>
                            <p className="text-[8px] font-black text-white/40 uppercase tracking-widest mb-1">{order.code}</p>
                            <h3 className="text-xs font-black text-white uppercase truncate max-w-[180px]">{order.customerName}</h3>
                          </div>
                          <div className={`px-2 py-1 rounded-lg border text-[8px] font-black uppercase tracking-widest ${getDetailsStatusColor(order.status)}`}>
                             {order.status}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 bg-white/5 rounded-xl p-3 border border-white/5">
                           <div className="w-8 h-8 rounded-lg bg-black/20 flex items-center justify-center text-white/40">
                              <Package size={16} />
                           </div>
                           <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-black text-white uppercase truncate">{order.product}</p>
                              <p className="text-[8px] font-bold text-white/30 uppercase">{order.quantity} UN • R$ {order.combinedValue.toFixed(2)}</p>
                           </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                           <div className="space-y-1">
                              <p className="text-[7px] font-black text-white/20 uppercase tracking-[0.2em]">Prioridade</p>
                              <div className="flex items-center gap-1.5">
                                 <div className={`w-1.5 h-1.5 rounded-full ${order.priority === 'Urgente' ? 'bg-red-500' : order.priority === 'Alta' ? 'bg-orange-500' : 'bg-blue-500'}`} />
                                 <span className={`text-[9px] font-black uppercase ${getPriorityColor(order.priority)}`}>{order.priority}</span>
                              </div>
                           </div>
                           <div className="space-y-1">
                              <p className="text-[7px] font-black text-white/20 uppercase tracking-[0.2em]">Previsão</p>
                              <div className="flex items-center gap-1.5 text-white/60">
                                 <Calendar size={10} />
                                 <span className="text-[9px] font-black uppercase">{new Date(order.expectedDate + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                              </div>
                           </div>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-white/5 gap-2">
                          {order.status !== 'Em produção' && order.status !== 'Finalizado' && order.status !== 'Cancelado' ? (
                            <button 
                              onClick={() => handleMoveToProduction(order)}
                              className="px-3 py-2 bg-purple-600 hover:bg-purple-500 rounded-xl text-[8px] font-black uppercase tracking-widest text-white transition-all shadow-lg shadow-purple-600/20 flex items-center justify-center gap-1.5"
                            >
                               <Send size={10} /> Enviar Produção
                            </button>
                          ) : (
                            <div className="flex items-center gap-2">
                               <div className="p-1 px-2 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[8px] font-black text-emerald-400 uppercase">
                                  Pago: R$ {order.downPayment.toFixed(2)}
                               </div>
                               <div className="p-1 px-2 rounded-md bg-blue-500/10 border border-blue-500/20 text-[8px] font-black text-blue-400 uppercase">
                                  Faltam: R$ {(order.combinedValue - order.downPayment).toFixed(2)}
                               </div>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                             <button 
                               onClick={() => {
                                 setEditingId(order.id);
                                 setFormData({
                                   customerName: order.customerName,
                                   phone: order.phone,
                                   product: order.product,
                                   quantity: order.quantity,
                                   combinedValue: order.combinedValue,
                                   finalValue: order.finalValue || 0,
                                   downPayment: order.downPayment,
                                   expectedDate: order.expectedDate,
                                   observation: order.observation,
                                   internalObservation: order.internalObservation || '',
                                   origin: order.origin,
                                   status: order.status,
                                   priority: order.priority,
                                   images: order.images || []
                                 });
                                 setActiveTab('new');
                               }}
                               className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                               title="Editar"
                             >
                                <Edit size={14} />
                             </button>
                             <button 
                               onClick={() => {
                                 if (confirm('Deseja excluir esta pré-encomenda?')) {
                                   setPreOrders(prev => prev.filter(o => o.id !== order.id));
                                   addActivity('system', 'Pré-Encomenda Excluída', `Pré-encomenda de ${order.customerName} excluída.`);
                                 }
                               }}
                               className="p-2 text-white/20 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                               title="Excluir"
                             >
                                <Trash2 size={14} />
                             </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="col-span-full py-20 flex flex-col items-center justify-center text-white/20 gap-4 border-2 border-dashed border-white/5 rounded-[2.5rem]">
                     <ClipboardList size={48} className="opacity-10" />
                     <p className="text-[10px] font-black uppercase tracking-[0.4em]">Nenhuma encomenda encontrada</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedDetailOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6">
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setSelectedDetailOrder(null)}
               className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
            />
            
            <motion.div 
               initial={{ opacity: 0, scale: 0.9, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.9, y: 20 }}
               className="relative w-full max-w-3xl max-h-[90vh] bg-[#12122b] rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="shrink-0 p-6 border-b border-white/5 flex items-center justify-between">
                <div>
                   <p className="text-[9px] font-black text-blue-400 uppercase tracking-[0.3em] mb-1">{selectedDetailOrder.code}</p>
                   <h2 className="text-lg font-black text-white uppercase tracking-tighter">Detalhes da Pré-Encomenda</h2>
                </div>
                <button 
                  onClick={() => setSelectedDetailOrder(null)}
                  className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:bg-white/10 hover:text-white transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
                {/* Timeline */}
                <StatusTimeline currentStatus={selectedDetailOrder.status} />

                {/* Main Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                  {/* Left Column */}
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] flex items-center gap-2">
                        <User size={12} /> Cliente e Contato
                      </h3>
                      <div className="bg-white/5 rounded-2xl p-4 border border-white/5 space-y-3">
                         <div>
                            <p className="text-[8px] font-bold text-white/20 uppercase">Nome</p>
                            <p className="text-xs font-black text-white uppercase">{selectedDetailOrder.customerName}</p>
                         </div>
                         <div>
                            <p className="text-[8px] font-bold text-white/20 uppercase">Telefone</p>
                            <p className="text-xs font-black text-white">{selectedDetailOrder.phone}</p>
                         </div>
                         <div>
                            <p className="text-[8px] font-bold text-white/20 uppercase">Origem do Pedido</p>
                            <p className="text-xs font-black text-blue-400 uppercase">{selectedDetailOrder.origin}</p>
                         </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] flex items-center gap-2">
                        <Package size={12} /> Produto Solicitado
                      </h3>
                      <div className="bg-white/5 rounded-2xl p-4 border border-white/5 space-y-3">
                         <div className="flex items-center justify-between">
                            <div>
                               <p className="text-[8px] font-bold text-white/20 uppercase">Item</p>
                               <p className="text-xs font-black text-white uppercase">{selectedDetailOrder.product}</p>
                            </div>
                            <div className="text-right">
                               <p className="text-[8px] font-bold text-white/20 uppercase">Qtd</p>
                               <p className="text-xs font-black text-white">{selectedDetailOrder.quantity} un</p>
                            </div>
                         </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] flex items-center gap-2">
                        <DollarSign size={12} /> Valores Financeiros
                      </h3>
                      <div className="bg-white/5 rounded-2xl p-4 border border-white/5 grid grid-cols-2 gap-4">
                         <div>
                            <p className="text-[8px] font-bold text-white/20 uppercase">Vlr Estimado</p>
                            <p className="text-xs font-black text-white">R$ {selectedDetailOrder.combinedValue.toFixed(2)}</p>
                         </div>
                         <div>
                            <p className="text-[8px] font-bold text-white/20 uppercase">Vlr Final</p>
                            <p className="text-xs font-black text-emerald-400">R$ {selectedDetailOrder.finalValue?.toFixed(2) || '0.00'}</p>
                         </div>
                         <div>
                            <p className="text-[8px] font-bold text-white/20 uppercase">Entrada</p>
                            <p className="text-xs font-black text-blue-400">R$ {selectedDetailOrder.downPayment.toFixed(2)}</p>
                         </div>
                         <div>
                            <p className="text-[8px] font-bold text-white/20 uppercase">Restante</p>
                            <p className="text-xs font-black text-red-400">R$ {(selectedDetailOrder.combinedValue - selectedDetailOrder.downPayment).toFixed(2)}</p>
                         </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] flex items-center gap-2">
                        <Calendar size={12} /> Prazo de Entrega
                      </h3>
                      <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                         <div className="flex items-center gap-3">
                            <Clock size={16} className="text-orange-400" />
                            <div>
                               <p className="text-[8px] font-bold text-white/20 uppercase">Previsão</p>
                               <p className="text-xs font-black text-white uppercase">{new Date(selectedDetailOrder.expectedDate + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                            </div>
                         </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Observations */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-2">
                      <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em]">Observações do Cliente</p>
                      <div className="bg-white/5 rounded-xl p-4 border border-white/5 min-h-[60px]">
                         <p className="text-[10px] font-bold text-white/60 uppercase italic">{selectedDetailOrder.observation || 'Nenhuma observação informada.'}</p>
                      </div>
                   </div>
                   <div className="space-y-2">
                      <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em]">Observações Internas (Restrito)</p>
                      <div className="bg-white/5 rounded-xl p-4 border border-blue-500/10 min-h-[60px]">
                         <p className="text-[10px] font-bold text-blue-400/60 uppercase italic">{selectedDetailOrder.internalObservation || 'Nenhuma nota interna.'}</p>
                      </div>
                   </div>
                </div>

                {/* Attachments Placeholder */}
                <div className="space-y-4">
                   <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] flex items-center gap-2">
                     <ClipboardList size={12} /> Imagens e Anexos
                   </h3>
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="aspect-square rounded-2xl bg-white/5 border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-2 opacity-50 cursor-not-allowed group">
                         <Plus size={24} className="text-white/20 group-hover:text-white/40 transition-all" />
                         <span className="text-[8px] font-black text-white/10 uppercase">Adicionar</span>
                      </div>
                      <div className="aspect-square rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center opacity-30">
                         <Search size={24} className="text-white/20" />
                      </div>
                   </div>
                   <p className="text-[8px] font-bold text-white/20 text-center uppercase italic italic italic">Módulo de anexos em desenvolvimento...</p>
                </div>
              </div>

              <div className="shrink-0 p-6 bg-white/5 border-t border-white/5 flex gap-4">
                <button 
                  disabled
                  className="flex-1 py-4 bg-zinc-800 text-zinc-500 rounded-2xl text-[10px] font-black uppercase tracking-widest cursor-not-allowed flex items-center justify-center gap-2 border border-white/5"
                >
                  <CheckCircle2 size={16} /> Converter para Pedido
                </button>
                <button 
                  onClick={() => setSelectedDetailOrder(null)}
                  className="px-8 py-4 bg-white/5 border border-white/10 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all active:scale-95"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
