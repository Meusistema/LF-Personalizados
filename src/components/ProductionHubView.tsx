/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, FormEvent } from 'react';
import { 
  Package, 
  Search, 
  ChevronLeft, 
  LogOut, 
  Clock, 
  Send, 
  CheckCircle, 
  PackageCheck, 
  Eye, 
  Printer, 
  MoreVertical,
  Layers,
  ArrowRight,
  User,
  ShoppingBag,
  X,
  FileText,
  FileDown,
  QrCode,
  History,
  CreditCard,
  RotateCcw,
  Handshake
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Sale, Product, Customer, CompanyInfo } from '../App';

interface ProductionHubViewProps {
  sales: Sale[];
  setSales: (sales: Sale[] | ((prev: Sale[]) => Sale[])) => void;
  products: Product[];
  customers: Customer[];
  addActivity: (type: string, action: string, details: string) => void;
  setView: (view: string) => void;
  currentUser: any;
  setSelectedLabelProduct: (product: Product | null) => void;
  couponConfig: any;
  couponPDVConfig: any;
  imprimirCupom: (sale: Sale) => void;
  imprimirPedidoPDV: (sale: Sale) => void;
  generateReceiptHTML: any;
  generateSimpleReceiptHTML: any;
  performUnifiedPrint: any;
  company: CompanyInfo;
  selectedPrinter: string;
}

export function ProductionHubView({ 
  sales, 
  setSales, 
  products, 
  customers, 
  addActivity, 
  setView, 
  currentUser, 
  setSelectedLabelProduct, 
  couponConfig,
  couponPDVConfig,
  imprimirCupom,
  imprimirPedidoPDV,
  generateReceiptHTML,
  generateSimpleReceiptHTML,
  performUnifiedPrint,
  company,
  selectedPrinter
}: ProductionHubViewProps) {
  const [activeTab, setActiveTab] = useState<'aguardando' | 'separacao' | 'separado' | 'embalado' | 'enviado' | 'finalizado'>('aguardando');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  });
  const [saleToPrint, setSaleToPrint] = useState<Sale | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLookupOpen, setIsLookupOpen] = useState(false);
  const [lookupTerm, setLookupTerm] = useState('');
  const [lookupResult, setLookupResult] = useState<Sale | null>(null);
  const [lookupError, setLookupError] = useState(false);

  const tabs = [
    { id: 'aguardando', label: 'Aguardando Produção', icon: Clock, color: 'text-amber-400', themeColor: '#fbbf24' },
    { id: 'separacao', label: 'Em Separação', icon: Send, color: 'text-blue-400', themeColor: '#60a5fa' },
    { id: 'separado', label: 'Separados', icon: CheckCircle, color: 'text-emerald-400', themeColor: '#34d399' },
    { id: 'embalado', label: 'Embalados', icon: PackageCheck, color: 'text-purple-400', themeColor: '#c084fc' },
    { id: 'enviado', label: 'Enviados', icon: Send, color: 'text-indigo-400', themeColor: '#818cf8' },
    { id: 'finalizado', label: 'Finalizados', icon: CheckCircle, color: 'text-zinc-400', themeColor: '#a1a1aa' },
  ];

  const filteredSales = useMemo(() => {
    const [year, month, day] = selectedDate.split('-').map(Number);
    
    return sales.filter((s: Sale) => {
      const customer = customers.find(c => c.id === s.customerId);
      const matchSearch = s.sequentialId?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         customer?.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      const saleDate = new Date(s.date);
      const matchDate = saleDate.getFullYear() === year && 
                        (saleDate.getMonth() + 1) === month && 
                        saleDate.getDate() === day;

      let matchTab = false;
      const status = s.status || 'pendente';
      if (activeTab === 'aguardando') matchTab = (status === 'aguardando_producao' || status === 'pendente');
      else if (activeTab === 'separacao') matchTab = (status === 'em_separacao');
      else if (activeTab === 'separado') matchTab = (status === 'separado');
      else if (activeTab === 'embalado') matchTab = (status === 'embalado');
      else if (activeTab === 'enviado') matchTab = (status === 'enviado' || status === 'em_transporte');
      else if (activeTab === 'finalizado') matchTab = (status === 'finalizado' || status === 'entregue');

      return matchSearch && matchTab && matchDate;
    }).sort((a: Sale, b: Sale) => b.date - a.date);
  }, [sales, activeTab, searchTerm, customers, selectedDate]);

  const updateStatus = (saleId: string, newStatus: Sale['status']) => {
    // Se estiver enviando para separação, pergunta sobre o comprovante
    if (newStatus === 'em_separacao') {
      const sale = sales.find(s => s.id === saleId);
      if (sale) {
        setSaleToPrint(sale);
        return; // Interrompe para mostrar o modal de impressão
      }
    }

    setSales((prev: Sale[]) => prev.map(s => s.id === saleId ? { 
      ...s, 
      status: newStatus, 
      updatedAt: Date.now(),
      // Add specific timestamps if moving forward
      ...(newStatus === 'em_separacao' ? { productionSentAt: new Date().toISOString() } : {}),
      ...(newStatus === 'embalado' ? { packedAt: new Date().toISOString(), packedByUserId: currentUser?.id, packedByUserName: currentUser?.name } : {}),
      ...(newStatus === 'enviado' ? { sentAt: new Date().toISOString() } : {}),
      ...(newStatus === 'finalizado' ? { finalizedAt: new Date().toISOString() } : {})
    } : s));
    
    const label = newStatus?.replace('_', ' ').toUpperCase();
    const sale = sales.find(s => s.id === saleId);
    addActivity('sale', 'Atualização Produção', `Pedido #${sale?.sequentialId} movido para ${label}`);
  };

  const handleStatusUpdateAndClose = (saleId: string, newStatus: Sale['status']) => {
    setSales((prev: Sale[]) => prev.map(s => s.id === saleId ? { 
      ...s, 
      status: newStatus, 
      updatedAt: Date.now(),
      ...(newStatus === 'em_separacao' ? { productionSentAt: new Date().toISOString() } : {}),
      ...(newStatus === 'embalado' ? { packedAt: new Date().toISOString(), packedByUserId: currentUser?.id, packedByUserName: currentUser?.name } : {}),
      ...(newStatus === 'enviado' ? { sentAt: new Date().toISOString() } : {}),
      ...(newStatus === 'finalizado' ? { finalizedAt: new Date().toISOString() } : {})
    } : s));
    const label = newStatus?.replace('_', ' ').toUpperCase();
    const sale = sales.find(s => s.id === saleId);
    addActivity('sale', 'Atualização Produção', `Pedido #${sale?.sequentialId} movido para ${label}`);
    setSaleToPrint(null);
  };

  const handlePrintAction = async (sale: Sale, mode: 'print' | 'pdf') => {
    setIsSubmitting(true);
    try {
      if (mode === 'pdf') {
        const title = `COMPROVANTE-PEDIDO-${sale.sequentialId || sale.id.slice(0, 5)}`;
        const html = await generateSimpleReceiptHTML(sale, company, couponPDVConfig);
        await performUnifiedPrint('Comprovante', html, 'browser', 'browser', couponPDVConfig, 'download');
      } else {
        await imprimirPedidoPDV(sale);
      }
    } catch (error) {
      console.error('Erro ao processar impressão:', error);
    } finally {
      setIsSubmitting(false);
      handleStatusUpdateAndClose(sale.id, 'em_separacao');
    }
  };

  const handleLookup = (e?: FormEvent) => {
    if (e) e.preventDefault();
    setLookupError(false);
    const found = sales.find(s => 
      s.sequentialId?.toLowerCase() === lookupTerm.toLowerCase() || 
      s.id.toLowerCase() === lookupTerm.toLowerCase() ||
      s.id.toLowerCase().startsWith(lookupTerm.toLowerCase())
    );
    if (found) {
      setLookupResult(found);
      setIsLookupOpen(false);
      setLookupTerm('');
    } else {
      setLookupResult(null);
      setLookupError(true);
    }
  };

  if (lookupResult) {
    return (
      <div className="fixed inset-0 z-[700] bg-[#0d0a1a] text-white flex flex-col font-sans overflow-hidden">
        {/* Detail Page Header */}
        <header className="shrink-0 bg-[#12122b]/50 backdrop-blur-xl border-b border-white/5 p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setLookupResult(null)}
              className="w-10 h-10 rounded-xl bg-[#1a1625] flex items-center justify-center text-gray-500 active:scale-90 transition-all border border-white/5 hover:bg-white/5 hover:text-white shadow-lg"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <h1 className="text-sm font-black text-white uppercase tracking-[0.2em]">Detalhes do Pedido</h1>
              <p className="text-[9px] font-bold text-purple-400 uppercase tracking-widest mt-0.5">#{lookupResult.sequentialId || lookupResult.id.slice(0, 8)}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                imprimirPedidoPDV(lookupResult);
              }}
              className="px-4 py-2 rounded-xl bg-white/5 text-white/40 border border-white/5 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all active:scale-95 flex items-center gap-2"
            >
              <Printer size={14} /> Imprimir Comprovante
            </button>
            <button 
              onClick={() => setLookupResult(null)}
              className="px-4 py-2 rounded-xl bg-purple-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-purple-500 transition-all active:scale-95 flex items-center gap-2"
            >
              <ChevronLeft size={14} /> Voltar para Hub
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 no-scrollbar">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Main Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#1a1625] p-6 rounded-[2rem] border border-white/5 shadow-xl">
                <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1 italic">Número do Pedido</p>
                <p className="text-xl font-black text-white uppercase italic truncate group-hover:text-purple-400 transition-colors">
                  #{lookupResult.sequentialId || lookupResult.id.slice(0, 8)}
                </p>
              </div>
              <div className="bg-[#1a1625] p-6 rounded-[2rem] border border-white/5 shadow-xl">
                <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1 italic">Cliente</p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                    <User size={16} />
                  </div>
                  <p className="text-sm font-black text-white uppercase truncate italic">
                    {customers.find(c => c.id === lookupResult.customerId)?.name || 'Cliente Casual'}
                  </p>
                </div>
              </div>
              <div className="bg-[#1a1625] p-6 rounded-[2rem] border border-white/5 shadow-xl">
                <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1 italic">Status Atual</p>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    lookupResult.status === 'finalizado' || lookupResult.status === 'entregue' ? 'bg-emerald-500' :
                    lookupResult.status === 'enviado' ? 'bg-indigo-500' :
                    lookupResult.status === 'embalado' ? 'bg-purple-500' :
                    lookupResult.status === 'separado' ? 'bg-blue-500' :
                    'bg-amber-500'
                  }`} />
                  <p className="text-xs font-black text-white uppercase tracking-[0.1em]">
                    {lookupResult.status?.toUpperCase().replace('_', ' ') || 'AGUARDANDO'}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: Products & Values */}
              <div className="space-y-6">
                <div className="bg-[#1a1625] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                  <div className="p-6 bg-white/[0.02] border-b border-white/5 flex items-center justify-between">
                    <h3 className="text-xs font-black text-white uppercase tracking-[0.3em] flex items-center gap-3">
                      <ShoppingBag size={14} className="text-purple-400" /> Produtos do PDV
                    </h3>
                    <div className="text-right">
                       <p className="text-[9px] font-black text-white/30 uppercase">Vendido por</p>
                       <p className="text-xs font-black text-purple-400 uppercase italic leading-none mt-1">{lookupResult.soldByUserName || 'PDV Local'}</p>
                    </div>
                  </div>
                  <div className="p-6 space-y-4">
                    {(lookupResult.originalItems || lookupResult.items).map((item, idx) => {
                      const p = products.find(prod => prod.id === item.productId);
                      const actualItem = lookupResult.items.find(i => i.productId === item.productId);
                      const separatedQty = actualItem?.quantity || 0;
                      const missing = item.quantity - separatedQty;
                      
                      return (
                        <div key={idx} className="flex items-center justify-between p-4 bg-black/20 rounded-3xl border border-white/5 group hover:border-white/10 transition-all">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-[#1a1625] flex items-center justify-center border border-white/5 shadow-inner">
                              {p?.imageUrl ? (
                                <img src={p.imageUrl} className="w-full h-full object-cover rounded-[inherit]" referrerPolicy="no-referrer" />
                              ) : (
                                <Package size={20} className="text-white/10" />
                              )}
                            </div>
                            <div>
                              <p className="text-xs font-black text-white uppercase truncate max-w-[200px] leading-tight mb-1">{p?.name || 'Produto'}</p>
                              <div className="flex items-center gap-3">
                                <div className="flex flex-col">
                                  <span className="text-[7px] font-black text-white/30 uppercase">Original</span>
                                  <span className="text-[10px] font-black text-white">{item.quantity}x</span>
                                </div>
                                <div className="w-px h-4 bg-white/5" />
                                <div className="flex flex-col">
                                  <span className="text-[7px] font-black text-emerald-500/50 uppercase">Separado</span>
                                  <span className="text-[10px] font-black text-emerald-500">{separatedQty}x</span>
                                </div>
                                {missing > 0 && (
                                  <>
                                    <div className="w-px h-4 bg-white/5" />
                                    <div className="flex flex-col">
                                      <span className="text-[7px] font-black text-red-500/50 uppercase">Faltante</span>
                                      <span className="text-[10px] font-black text-red-500">{missing}x</span>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-black text-white italic tracking-tight">R$ {(item.quantity * item.price).toFixed(2)}</p>
                            <p className="text-[8px] text-white/20 font-bold uppercase tracking-widest mt-1">UN: R$ {item.price.toFixed(2)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="p-8 bg-black/40 border-t border-white/5 space-y-3">
                    <div className="flex justify-between items-center text-[10px] font-black text-white/40 uppercase tracking-widest italic">
                      <span>Total Original (PDV)</span>
                      <span>R$ {(lookupResult.originalItems || lookupResult.items).reduce((acc, i) => acc + (i.price * i.quantity), 0).toFixed(2)}</span>
                    </div>
                    {((lookupResult.originalItems || lookupResult.items).reduce((acc, i) => acc + (i.price * i.quantity), 0) - lookupResult.total) > 0 && (
                      <div className="flex justify-between items-center text-[10px] font-black text-red-500 uppercase tracking-widest italic">
                        <span>Desconto / Produtos Faltantes</span>
                        <span className="flex items-center gap-2 px-2 py-1 bg-red-500/10 rounded-lg">- R$ {((lookupResult.originalItems || lookupResult.items).reduce((acc, i) => acc + (i.price * i.quantity), 0) - lookupResult.total).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-4 border-t border-white/10">
                      <span className="text-sm font-black text-white uppercase tracking-[0.2em] italic">Valor Final Atualizado</span>
                      <span className="text-3xl font-black text-emerald-500 italic drop-shadow-2xl">R$ {lookupResult.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Timeline & History */}
              <div className="space-y-6">
                <div className="bg-[#1a1625] rounded-[2.5rem] border border-white/5 p-8 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 blur-[80px] rounded-full" />
                  
                  <h3 className="text-xs font-black text-white uppercase tracking-[0.3em] mb-10 flex items-center gap-3 italic">
                    <History size={16} className="text-purple-400" /> Histórico de Processamento
                  </h3>

                  <div className="relative space-y-12">
                    {/* Road Line */}
                    <div className="absolute left-6 top-2 bottom-2 w-px bg-gradient-to-b from-blue-500/50 via-purple-500/50 to-emerald-500/50" />

                    {/* Venda / Início */}
                    <div className="relative flex items-start gap-6">
                      <div className="w-12 h-12 rounded-[1.25rem] bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-lg shadow-blue-500/10 shrink-0 z-10 bg-[#1a1625]">
                        <Clock size={24} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-black text-white uppercase italic mb-1">Venda Realizada</p>
                        <p className="text-[10px] font-bold text-white/40 uppercase tracking-wide leading-relaxed">
                          O pedido foi iniciado no PDV às {new Date(lookupResult.date).toLocaleString('pt-BR')} por <span className="text-blue-400">{lookupResult.soldByUserName || 'PDV Local'}</span>.
                        </p>
                      </div>
                    </div>

                    {/* Separação */}
                    <div className="relative flex items-start gap-6">
                      <div className={`w-12 h-12 rounded-[1.25rem] border flex items-center justify-center shadow-lg shrink-0 z-10 bg-[#1a1625] transition-all ${
                        lookupResult.separatedByAt ? 'bg-blue-500/10 border-blue-500/30 text-blue-400 shadow-blue-500/10 scale-100' : 'bg-white/5 border-white/10 text-white/10 scale-90'
                      }`}>
                        <Handshake size={24} />
                      </div>
                      <div className={`flex-1 ${!lookupResult.separatedByAt ? 'opacity-30' : ''}`}>
                        <p className="text-sm font-black text-white uppercase italic mb-1">Conferência / Separação</p>
                        {lookupResult.separatedByAt ? (
                          <div className="space-y-2">
                             <p className="text-[10px] font-bold text-white/40 uppercase tracking-wide leading-relaxed">
                               Separado e conferido por <span className="text-blue-400 font-black">{lookupResult.separatedByUserName}</span> em {new Date(lookupResult.separatedByAt).toLocaleString('pt-BR')}.
                             </p>
                             {lookupResult.items.some((item, idx) => {
                               const oi = (lookupResult.originalItems || [])[idx];
                               return oi && item.quantity < oi.quantity;
                             }) ? (
                               <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                  <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest">Contém produtos faltantes</span>
                               </div>
                             ) : (
                               <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Pedido completo</span>
                               </div>
                             )}
                          </div>
                        ) : (
                          <p className="text-[10px] font-bold text-white/20 uppercase italic tracking-widest">Aguardando início do processo...</p>
                        )}
                      </div>
                    </div>

                    {/* Embalagem */}
                    <div className="relative flex items-start gap-6">
                      <div className={`w-12 h-12 rounded-[1.25rem] border flex items-center justify-center shadow-lg shrink-0 z-10 bg-[#1a1625] transition-all ${
                        lookupResult.packedAt ? 'bg-purple-500/10 border-purple-500/30 text-purple-400 shadow-purple-500/10 scale-100' : 'bg-white/5 border-white/10 text-white/10 scale-90'
                      }`}>
                        <PackageCheck size={24} />
                      </div>
                      <div className={`flex-1 ${!lookupResult.packedAt ? 'opacity-30' : ''}`}>
                        <p className="text-sm font-black text-white uppercase italic mb-1">Empacotamento</p>
                        {lookupResult.packedAt ? (
                          <p className="text-[10px] font-bold text-white/40 uppercase tracking-wide leading-relaxed">
                            Embalado e rotulado por <span className="text-purple-400 font-black">{lookupResult.packedByUserName}</span> em {new Date(lookupResult.packedAt).toLocaleString('pt-BR')}.
                          </p>
                        ) : (
                          <p className="text-[10px] font-bold text-white/20 uppercase italic tracking-widest">Aguardando conferência de itens...</p>
                        )}
                      </div>
                    </div>

                    {/* Finalização */}
                    <div className="relative flex items-start gap-6">
                      <div className={`w-12 h-12 rounded-[1.25rem] border flex items-center justify-center shadow-lg shrink-0 z-10 bg-[#1a1625] transition-all ${
                        lookupResult.status === 'finalizado' || lookupResult.status === 'entregue' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-emerald-500/10 scale-100' : 'bg-white/5 border-white/10 text-white/10 scale-90'
                      }`}>
                        <CheckCircle size={24} />
                      </div>
                      <div className={`flex-1 ${!(lookupResult.status === 'finalizado' || lookupResult.status === 'entregue') ? 'opacity-30' : ''}`}>
                        <p className="text-sm font-black text-white uppercase italic mb-1">Finalização do Ciclo</p>
                        {lookupResult.finalizedAt || lookupResult.sentAt ? (
                          <div className="space-y-1">
                             <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">STATUS: {lookupResult.status?.toUpperCase()}</p>
                             <p className="text-[10px] font-bold text-white/40 uppercase tracking-wide">
                               Ciclo encerrado em {new Date(lookupResult.finalizedAt || lookupResult.sentAt || lookupResult.updatedAt).toLocaleString('pt-BR')}.
                             </p>
                          </div>
                        ) : (
                          <p className="text-[10px] font-bold text-white/20 uppercase italic tracking-widest">Aguardando despacho/entrega...</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-[#1a1625] p-8 rounded-[2.5rem] border border-white/5 flex flex-col items-center gap-4 text-center shadow-2xl group">
                   <div className="w-16 h-16 rounded-3xl bg-emerald-500/5 flex items-center justify-center text-emerald-500 mb-2 group-hover:scale-110 transition-transform">
                      <CreditCard size={32} />
                   </div>
                   <div>
                      <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.4em] mb-2">Forma de Pagamento Original</p>
                      <p className="text-xl font-black text-white uppercase italic tracking-widest">{lookupResult.paymentMethod || 'DINHEIRO / PIX'}</p>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] bg-[#0d0a1a] text-white flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <header className="shrink-0 bg-[#12122b]/50 backdrop-blur-xl border-b border-white/5 p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setView('dashboard')}
            className="w-10 h-10 rounded-xl bg-[#1a1625] flex items-center justify-center text-gray-500 active:scale-90 transition-all border border-white/5 hover:bg-white/5 hover:text-white shadow-lg"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-sm font-black text-white uppercase tracking-[0.2em]">Central de Produção</h1>
            <p className="text-[9px] font-bold text-purple-400 uppercase tracking-widest mt-0.5">Workflow de Pedidos Internos</p>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-1 max-w-2xl mx-6">
          <div className="relative flex-1">
             <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
             <input 
               type="text" 
               placeholder="BUSCAR PEDIDO OU CLIENTE..."
               value={searchTerm}
               onChange={e => setSearchTerm(e.target.value)}
               className="w-full bg-[#1a1625] border border-white/10 rounded-xl py-2 pl-10 pr-4 text-[10px] font-bold uppercase tracking-widest outline-none focus:border-purple-500/50 transition-all placeholder:text-white/10"
             />
          </div>
          
          <div className="flex items-center gap-2 bg-[#1a1625] border border-white/10 rounded-xl px-3 py-1.5 min-w-fit shadow-lg">
            <Clock size={12} className="text-purple-400" />
            <span className="text-[8px] font-black text-white/30 uppercase tracking-widest mr-1">Data:</span>
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent border-none text-[10px] font-black text-white uppercase outline-none cursor-pointer [color-scheme:dark] p-0"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              setLookupTerm('');
              setLookupResult(null);
              setLookupError(false);
              setIsLookupOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-black uppercase tracking-widest hover:bg-blue-500/20 transition-all active:scale-95"
          >
            <Search size={14} /> Consultar Pedido
          </button>
        </div>
      </header>

      {/* Tabs Menu */}
      <nav className="shrink-0 bg-[#0d0a1a] p-2 flex gap-1 border-b border-white/5 overflow-x-auto no-scrollbar">
        {tabs.map(tab => {
          const count = sales.filter(s => {
            const saleDate = new Date(s.date);
            const [year, month, day] = selectedDate.split('-').map(Number);
            const matchDate = saleDate.getFullYear() === year && 
                              (saleDate.getMonth() + 1) === month && 
                              saleDate.getDate() === day;
            
            if (!matchDate) return false;

            const status = s.status || 'pendente';
            if (tab.id === 'aguardando') return status === 'aguardando_producao' || status === 'pendente';
            if (tab.id === 'separacao') return status === 'em_separacao';
            if (tab.id === 'separado') return status === 'separado';
            if (tab.id === 'embalado') return status === 'embalado';
            if (tab.id === 'enviado') return status === 'enviado' || status === 'em_transporte';
            if (tab.id === 'finalizado') return status === 'finalizado' || status === 'entregue';
            return false;
          }).length;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-3 px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${
                activeTab === tab.id 
                ? 'bg-purple-600/10 border-purple-500/30 text-purple-400 shadow-xl' 
                : 'bg-transparent border-transparent text-white/30 hover:bg-white/5 hover:text-white'
              }`}
            >
              <tab.icon size={14} className={activeTab === tab.id ? 'text-purple-400' : ''} />
              {tab.label}
              <span className={`ml-1 px-1.5 py-0.5 rounded-md font-black text-[9px] ${
                activeTab === tab.id 
                ? 'bg-purple-500 text-white' 
                : 'bg-white/5 text-white/20'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Main Grid */}
      <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 no-scrollbar content-start pb-24">
        {filteredSales.map((sale: Sale) => {
          const customer = customers.find(c => c.id === sale.customerId);
          
          return (
            <motion.div 
              layout
              key={sale.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-[#1a1625] rounded-2xl border border-white/5 flex flex-col group hover:border-purple-500/20 transition-all shadow-xl relative overflow-hidden"
            >
               {/* Order Top Content */}
               <div className="p-3 bg-white/[0.02] border-b border-white/5">
                  <div className="flex justify-between items-start mb-0.5">
                     <span className="text-[9px] font-black text-purple-400 tracking-widest italic leading-none">#{sale.sequentialId}</span>
                     <span className="text-[10px] font-black text-emerald-400 italic leading-none">R$ {sale.total.toFixed(2)}</span>
                  </div>
                  <h3 className="text-xs font-black text-white uppercase truncate leading-tight">
                     {customer?.name || 'Cliente Casual'}
                  </h3>
               </div>

               {/* Footer Action */}
               <div className="p-2 mt-auto">
                  {activeTab === 'aguardando' && (
                    <button 
                      onClick={() => updateStatus(sale.id, 'em_separacao')}
                      className="w-full h-10 bg-blue-600 hover:bg-blue-500 rounded-xl text-[9px] font-black uppercase tracking-widest text-white transition-all shadow-lg shadow-blue-600/10 active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      <ArrowRight size={14} /> ENVIAR SEPARAÇÃO
                    </button>
                  )}

                  {activeTab === 'separado' && (
                    <button 
                      onClick={() => updateStatus(sale.id, 'embalado')}
                      className="w-full h-10 bg-purple-600 hover:bg-purple-500 rounded-xl text-[9px] font-black uppercase tracking-widest text-white transition-all shadow-lg shadow-purple-600/10 active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      <Package size={14} /> EMBALAR
                    </button>
                  )}

                  {activeTab === 'embalado' && (
                    <button 
                      onClick={() => updateStatus(sale.id, 'enviado')}
                      className="w-full h-10 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-[9px] font-black uppercase tracking-widest text-white transition-all shadow-lg shadow-indigo-600/10 active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      <Send size={14} /> ENVIAR
                    </button>
                  )}

                  {activeTab === 'enviado' && (
                    <button 
                      onClick={() => updateStatus(sale.id, 'finalizado')}
                      className="w-full h-10 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-[9px] font-black uppercase tracking-widest text-white transition-all shadow-lg shadow-emerald-600/10 active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle size={14} /> FINALIZAR
                    </button>
                  )}

                  {(activeTab === 'separacao' || activeTab === 'finalizado') && (
                    <div className="w-full h-10 bg-white/5 rounded-xl flex items-center justify-center gap-1.5 border border-white/10 opacity-30">
                       {activeTab === 'separacao' ? (
                          <>
                             <Clock size={14} />
                             <span className="text-[9px] font-black uppercase tracking-widest">EM PROCESSO</span>
                          </>
                       ) : (
                          <>
                             <CheckCircle size={14} />
                             <span className="text-[9px] font-black uppercase tracking-widest">CONCLUÍDO</span>
                          </>
                       )}
                    </div>
                  )}
               </div>

               {/* Simple status indicator */}
               {sale.status === 'em_separacao' && (
                  <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
               )}
            </motion.div>
          );
        })}

        {filteredSales.length === 0 && (
          <div className="col-span-full py-40 flex flex-col items-center justify-center gap-6 opacity-20">
             <div className="w-32 h-32 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center">
                <Layers size={48} className="text-white/40" />
             </div>
             <div className="text-center">
                <p className="text-sm font-black uppercase tracking-[0.5em] mb-2">Fila Vazia</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 italic">Aguardando novos pedidos...</p>
             </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {saleToPrint && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm bg-[#12122b] rounded-[2.5rem] border border-white/10 shadow-3xl p-8 space-y-6 text-center"
            >
              <div className="w-20 h-20 bg-blue-600/10 rounded-3xl flex items-center justify-center mx-auto border border-blue-500/20 shadow-xl">
                <Printer size={40} className="text-blue-500" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-xl font-black text-white uppercase tracking-tight leading-tight">Comprovante de Pedido</h3>
                <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Deseja gerar o comprovante agora?</p>
                <p className="text-[9px] font-black text-blue-500 uppercase italic">Pedido #{saleToPrint.sequentialId || saleToPrint.id.slice(0, 5)}</p>
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => handlePrintAction(saleToPrint, 'pdf')}
                    disabled={isSubmitting}
                    className="flex flex-col items-center gap-2 p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-all group active:scale-95 disabled:opacity-50"
                  >
                    <FileDown size={20} className="text-blue-400 group-hover:scale-110 transition-transform" />
                    <span className="text-[9px] font-black uppercase text-white/60">Gerar PDF</span>
                  </button>
                  <button 
                    onClick={() => handlePrintAction(saleToPrint, 'print')}
                    disabled={isSubmitting}
                    className="flex flex-col items-center gap-2 p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-all group active:scale-95 disabled:opacity-50"
                  >
                    <Printer size={20} className="text-emerald-400 group-hover:scale-110 transition-transform" />
                    <span className="text-[9px] font-black uppercase text-white/60">Imprimir</span>
                  </button>
                </div>
                
                <button 
                  onClick={() => handleStatusUpdateAndClose(saleToPrint.id, 'em_separacao')}
                  disabled={isSubmitting}
                  className="w-full py-4 text-[10px] font-black uppercase tracking-widest text-white/30 hover:text-white transition-colors disabled:opacity-50"
                >
                  Continuar sem imprimir
                </button>
              </div>
            </motion.div>
          </div>
        )}
        {isLookupOpen && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsLookupOpen(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 50 }}
              className="relative w-full max-w-sm bg-[#0d0a1a] rounded-[2.5rem] border border-white/10 shadow-full-blur flex flex-col overflow-hidden"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-black/20">
                <div>
                  <h2 className="text-lg font-black text-white uppercase italic tracking-tight">Consultar</h2>
                  <p className="text-[9px] font-bold text-purple-400 uppercase tracking-widest">Digite o número ou use o QR</p>
                </div>
                <button onClick={() => setIsLookupOpen(false)} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 hover:bg-white/10 hover:text-white transition-all">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Search Box */}
                <form onSubmit={handleLookup} className="relative group">
                  <input 
                    type="text" 
                    placeholder="PEDIDO..."
                    value={lookupTerm}
                    onChange={e => setLookupTerm(e.target.value)}
                    autoFocus
                    className="w-full bg-[#1a1625] border-2 border-white/5 group-focus-within:border-purple-500/50 rounded-2xl py-4 pl-12 pr-4 text-sm font-black uppercase tracking-widest outline-none transition-all placeholder:text-white/10 shadow-xl"
                  />
                  <QrCode size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-500" />
                  <button 
                    type="submit"
                    className="w-full mt-4 py-4 bg-purple-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-purple-500 transition-all shadow-lg active:scale-95"
                  >
                    Consultar Pedido
                  </button>
                </form>

                {lookupError && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-center"
                  >
                    <p className="text-red-500 text-[9px] font-black uppercase tracking-widest">Pedido não encontrado.</p>
                  </motion.div>
                )}
              </div>

              <div className="p-6 border-t border-white/5 bg-black/20 shrink-0">
                <button 
                  onClick={() => setIsLookupOpen(false)}
                  className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black text-white/40 uppercase tracking-[0.3em] transition-all"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
