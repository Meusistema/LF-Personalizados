import React, { useState, useMemo, useEffect } from 'react';
import { 
  ChevronLeft, Search, Package, Video, QrCode, Star, Calendar, 
  ChevronDown, Filter, Play, Eye, MoreVertical, X, CheckCircle2,
  Clock, User, CheckCircle, ExternalLink, Printer, AlertCircle,
  Youtube, ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { QRCodeCanvas } from 'qrcode.react';
import { CouponVisualEditor } from './CouponVisualEditor';
import { UnifiedCouponRenderer } from './UnifiedCouponRenderer';

interface SaleItem {
  productId: string;
  quantity: number;
  price: number;
  cost: number;
  profit: number;
}

interface Sale {
  id: string;
  sequentialId?: string;
  items: SaleItem[];
  originalItems?: SaleItem[];
  total: number;
  totalCost: number;
  totalProfit: number;
  date: number;
  customerId?: string;
  paymentMethod: string;
  status?: 'pendente' | 'em_separacao' | 'separado' | 'embalado' | 'enviado' | 'em_transporte' | 'entregue' | 'cancelado' | 'falta_confirmada';
  separatedByUserId?: string;
  separatedByUserName?: string;
  separationTimestamp?: string;
  youtubeLink?: string;
  greetingConfig?: GreetingCouponConfig;
}

interface Customer {
  id: string;
  name: string;
  whatsapp?: string;
}

interface Emoji {
  id: string;
  char: string;
  x: number;
  y: number;
  size: number;
  rotation?: number;
  opacity?: number;
  isImage?: boolean;
}

interface QRCodeDesignConfig {
  style: 'standard' | 'suave' | 'moderno' | 'elegante' | 'logo';
  color: string;
  backgroundColor: string;
  opacity: number;
  dotType: 'square' | 'rounded';
  cornerType: 'standard' | 'rounded';
  logoUrl?: string;
}

interface GreetingCouponConfig {
  title: string;
  message: string;
  showCustomerName: boolean;
  showOrderNumber: boolean;
  footerText: string;
  qrCodeText: string;
  logo?: string;
  showCompanyName?: boolean;
  format: 'thermal' | 'a6' | 'custom' | '58mm' | '80mm' | 'a4';
  width?: number;
  height?: number;
  backgroundImage?: string;
  backgroundOpacity?: number;
  emojiOpacity?: number;
  emojis?: Emoji[];
  customEmojis?: string[];
  qrCodeDesign?: QRCodeDesignConfig;
}

interface CompanyInfo {
  logo?: string;
  tradeName?: string;
  name: string;
}

interface CustomerExperienceViewProps {
  sales: Sale[];
  customers: Customer[];
  company: CompanyInfo;
  greetingCouponConfig: GreetingCouponConfig;
  onUpdateSale: (saleId: string, data: Partial<Sale>) => void;
  onPrintGreeting: (sale: Sale) => void;
  setView?: (view: any) => void;
}

export function CustomerExperienceView({ 
  sales, 
  customers, 
  company, 
  greetingCouponConfig, 
  onUpdateSale,
  onPrintGreeting,
  setView
}: CustomerExperienceViewProps) {
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [rightTab, setRightTab] = useState<'coupon' | 'video'>('coupon');
  const [youtubeInput, setYoutubeInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeConfig, setActiveConfig] = useState<GreetingCouponConfig | null>(null);

  const selectedSale = useMemo(() => {
    return sales.find(s => s.id === selectedSaleId);
  }, [sales, selectedSaleId]);

  const selectedCustomer = useMemo(() => {
    if (!selectedSale) return null;
    return customers.find(c => c.id === selectedSale.customerId);
  }, [selectedSale, customers]);

  const filteredSales = useMemo(() => {
    return sales
      .filter(s => ['separado', 'embalado', 'enviado', 'entregue'].includes(s.status || ''))
      .filter(s => {
        const customer = customers.find(c => c.id === s.customerId);
        const search = searchTerm.toLowerCase();
        return (
          s.sequentialId?.toString().includes(search) || 
          customer?.name.toLowerCase().includes(search) ||
          s.id.toLowerCase().includes(search)
        );
      })
      .sort((a, b) => b.date - a.date);
  }, [sales, customers, searchTerm]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const relevantSales = sales.filter(s => s.status !== 'cancelado');
    const videos = relevantSales.filter(s => s.youtubeLink).length;
    const qrcodes = relevantSales.filter(s => s.youtubeLink).length; // Usually 1:1 with video
    const impactedCustomers = new Set(relevantSales.filter(s => s.youtubeLink).map(s => s.customerId)).size;
    
    return {
      pendingShipment: relevantSales.filter(s => s.status === 'separado').length,
      videosGenerated: videos,
      qrcodesGenerated: qrcodes,
      impactedCustomers
    };
  }, [sales]);

  useEffect(() => {
    if (selectedSale) {
      const baseConfig = { ...greetingCouponConfig };
      if (selectedSale.greetingConfig) {
        setActiveConfig({ ...baseConfig, ...selectedSale.greetingConfig });
      } else {
        setActiveConfig({ ...baseConfig });
      }
      setYoutubeInput(selectedSale.youtubeLink || '');
    } else {
      setActiveConfig(null);
    }
  }, [selectedSale, greetingCouponConfig]);

  const handleUpdateConfig = (newConfig: GreetingCouponConfig) => {
    setActiveConfig(newConfig);
    if (selectedSaleId) {
      onUpdateSale(selectedSaleId, { greetingConfig: newConfig });
    }
  };

  const getVideoEmbedUrl = (url: string) => {
    if (!url) return null;
    const ytRegExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const ytMatch = url.match(ytRegExp);
    if (ytMatch && ytMatch[2].length === 11) {
      return `https://www.youtube.com/embed/${ytMatch[2]}`;
    }
    const driveRegExp = /\/file\/d\/([^\/]+)/;
    const driveMatch = url.match(driveRegExp);
    if (driveMatch && (url.includes('drive.google.com') || url.includes('google.com/drive')) && driveMatch && driveMatch[1]) {
      return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
    }
    return null;
  };

  const currentEmbedUrl = selectedSale?.youtubeLink ? getVideoEmbedUrl(selectedSale.youtubeLink) : null;

  const handleGenerateQr = () => {
    if (!selectedSale || !youtubeInput) return;
    setIsGenerating(true);
    setTimeout(() => {
      onUpdateSale(selectedSale.id, { youtubeLink: youtubeInput });
      setIsGenerating(false);
    }, 500);
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'entregue': return 'Entregue';
      case 'enviado': return 'Enviado';
      case 'embalado': return 'Embalado';
      case 'separado': return 'Pronto para envio';
      case 'em_separacao': return 'Em preparação';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'entregue': return 'bg-gray-500/20 text-gray-400';
      case 'enviado': return 'bg-emerald-500/20 text-emerald-400';
      case 'separado': return 'bg-green-500/20 text-green-400';
      case 'em_separacao': return 'bg-blue-500/20 text-blue-400';
      default: return 'bg-yellow-500/20 text-yellow-400';
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-[#0a1628] text-white p-2 md:p-4 font-sans flex flex-col overflow-hidden">
      {/* Back Button & Header Row */}
      <div className="flex items-center gap-4 mb-4">
        <button 
          onClick={() => setView?.('dashboard')}
          className="w-10 h-10 rounded-lg border border-[#334155] flex items-center justify-center bg-transparent cursor-pointer hover:bg-white/5 transition-colors shrink-0"
        >
          <ChevronLeft size={20} className="text-[#94a3b8]" />
        </button>
        
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#b01e4e]/20 flex items-center justify-center border border-[#b01e4e]/30 shadow-xl shrink-0">
            <Star size={22} className="text-[#ec4899]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold tracking-tight m-0 uppercase truncate">EXPERIÊNCIA DO CLIENTE</h1>
            <p className="text-[#64748b] text-[10px] m-0 uppercase font-bold tracking-widest">PERSONALIZAÇÃO & ENCANTAMENTO</p>
          </div>
        </div>

        <form 
          onSubmit={(e) => e.preventDefault()}
          className="relative flex-1 max-w-md ml-auto hidden md:block"
        >
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#64748b]" />
          <input 
            type="text" 
            placeholder="BUSCAR PEDIDO OU CLIENTE..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-black/20 border border-[#334155] rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-[#64748b] focus:ring-1 ring-pink-500/50 outline-none transition-all uppercase" 
          />
        </form>
      </div>

      {!selectedSaleId ? (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Mobile Search */}
          <form 
            onSubmit={(e) => e.preventDefault()}
            className="md:hidden relative mb-4 shrink-0"
          >
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#64748b]" />
            <input 
              type="text" 
              placeholder="BUSCAR..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-black/20 border border-[#334155] rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-[#64748b] focus:ring-1 ring-pink-500/50 outline-none uppercase" 
            />
          </form>

          {/* Cards de Resumo Compactos */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-2 shrink-0">
            {[
              { label: 'Total Pedidos', value: metrics.pendingShipment + metrics.videosGenerated, icon: Package, color: 'text-pink-400', bg: 'bg-pink-400/10' },
              { label: 'Vídeos', value: metrics.videosGenerated, icon: Video, color: 'text-blue-400', bg: 'bg-blue-400/10' },
              { label: 'QR Codes', value: metrics.qrcodesGenerated, icon: QrCode, color: 'text-green-400', bg: 'bg-green-400/10' },
              { label: 'Impacto', value: metrics.impactedCustomers, icon: Star, color: 'text-yellow-400', bg: 'bg-yellow-400/10' }
            ].map((stat, idx) => (
              <div key={idx} className="bg-[#1a2744] p-3 rounded-xl border border-white/5 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg ${stat.bg} ${stat.color} flex items-center justify-center shrink-0`}>
                  <stat.icon size={14} />
                </div>
                <div className="truncate">
                  <p className="text-[7px] font-black text-[#64748b] uppercase tracking-widest">{stat.label}</p>
                  <p className="text-sm font-black text-white italic leading-none truncate">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Filtros Padronizados */}
          <div className="flex flex-col md:flex-row gap-2 mb-2 shrink-0">
            <form 
              onSubmit={(e) => e.preventDefault()}
              className="flex-1 relative"
            >
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#334155]" />
              <input 
                type="text" 
                placeholder="BUSCAR CLIENTE OU PEDIDO..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-[#0d1c30] border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-[9px] font-black text-white placeholder-[#334155] focus:ring-1 ring-pink-500/30 outline-none uppercase transition-all" 
              />
            </form>
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {['Este Mês', 'Semana', 'Hoje'].map((period) => (
                <button 
                  key={period}
                  className="px-4 h-9 bg-[#0d1c30] border border-white/5 rounded-xl text-[9px] font-black text-[#64748b] hover:text-white uppercase tracking-widest transition-all"
                >
                  {period}
                </button>
              ))}
              <button 
                onClick={() => setSearchTerm('')}
                className="px-4 h-9 border border-pink-500/30 text-pink-500 hover:bg-pink-500/10 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
              >
                LIMPAR
              </button>
            </div>
          </div>

          {/* Tabela Area */}
          <div className="flex-1 min-h-0 bg-[#0d1c30] rounded-xl border border-white/5 shadow-2xl flex flex-col overflow-hidden">
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full border-collapse min-w-[800px]">
                <thead className="sticky top-0 z-10 bg-[#0d1c30]">
                  <tr className="bg-black/40 border-b border-white/5">
                    <th className="px-6 py-3 text-left text-[9px] text-[#64748b] uppercase tracking-widest font-black">Nº Pedido</th>
                    <th className="px-6 py-3 text-left text-[9px] text-[#64748b] uppercase tracking-widest font-black">Cliente</th>
                    <th className="px-6 py-3 text-left text-[9px] text-[#64748b] uppercase tracking-widest font-black">Data</th>
                    <th className="px-6 py-3 text-left text-[9px] text-[#64748b] uppercase tracking-widest font-black">Status</th>
                    <th className="px-6 py-3 text-left text-[9px] text-[#64748b] uppercase tracking-widest font-black">Vídeo</th>
                    <th className="px-6 py-3 text-left text-[9px] text-[#64748b] uppercase tracking-widest font-black">QR Code</th>
                    <th className="px-6 py-3 text-right text-[9px] text-[#64748b] uppercase tracking-widest font-black">Ações</th>
                  </tr>
                </thead>
              </table>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar">
              <table className="w-full border-collapse min-w-[800px]">
                <tbody className="divide-y divide-white/[0.03]">
                  {filteredSales.length > 0 ? (
                    filteredSales.map((sale) => {
                      const customer = customers.find(c => c.id === sale.customerId);
                      return (
                        <tr key={sale.id} className="hover:bg-white/[0.02] transition-colors group">
                          <td className="px-6 py-3">
                            <span className="text-pink-400 font-bold text-xs">#{sale.sequentialId || sale.id.substring(0, 6)}</span>
                            <p className="text-[#64748b] text-[9px] uppercase font-medium">ID: {sale.id.substring(0, 5)}</p>
                          </td>
                          <td className="px-6 py-3">
                            <span className="text-white/90 font-bold text-[11px] uppercase tracking-tight">{customer?.name || 'Cliente Casual'}</span>
                            <p className="text-[#64748b] text-[9px] uppercase font-medium">{customer?.whatsapp || 'Sem Contato'}</p>
                          </td>
                          <td className="px-6 py-3">
                            <span className="text-gray-300 text-[10px] font-medium">{new Date(sale.date).toLocaleDateString()}</span>
                            <p className="text-[#64748b] text-[9px] uppercase font-bold">{new Date(sale.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          </td>
                          <td className="px-6 py-3">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border border-white/5 ${getStatusColor(sale.status || '')}`}>
                              <span className={`w-1 h-1 rounded-full animate-pulse ${getStatusColor(sale.status || '').replace('bg-', 'bg-').split(' ')[1]}`}></span>
                              {getStatusLabel(sale.status || '')}
                            </span>
                          </td>
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-2">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${sale.youtubeLink ? 'bg-green-500/20' : 'bg-white/5'}`}>
                                <Play className={`w-2.5 h-2.5 ${sale.youtubeLink ? 'text-green-400 fill-green-400' : 'text-[#64748b]'}`} />
                              </div>
                              <span className={`text-[10px] font-bold uppercase ${sale.youtubeLink ? 'text-gray-400' : 'text-[#64748b]'}`}>
                                {sale.youtubeLink ? 'Gerado' : 'Pend.'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-2">
                              <QrCode className={`w-4 h-4 ${sale.youtubeLink ? 'text-green-400' : 'text-[#64748b]'}`} />
                              <span className={`text-[10px] font-bold uppercase ${sale.youtubeLink ? 'text-gray-400' : 'text-[#64748b]'}`}>
                                {sale.youtubeLink ? 'Gerado' : 'Pend.'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => setSelectedSaleId(sale.id)}
                                className="w-8 h-8 rounded-lg border border-[#334155] flex items-center justify-center hover:bg-white/5 hover:border-[#475569] transition-all bg-transparent cursor-pointer active:scale-95"
                              >
                                <Eye className="w-3.5 h-3.5 text-[#94a3b8]" />
                              </button>
                              <button className="w-8 h-8 rounded-lg border border-[#334155] flex items-center justify-center hover:bg-white/5 bg-transparent cursor-pointer">
                                <MoreVertical className="w-3.5 h-3.5 text-[#94a3b8]" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-20 text-center text-[#64748b] font-black uppercase tracking-widest text-xs opacity-50 italic">
                        Nenhum pedido encontrado
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Paginação */}
          <div className="flex items-center justify-between mt-4 shrink-0">
            <span className="text-[#64748b] text-[9px] font-black uppercase tracking-widest">Página 1 de 1</span>
            <div className="flex items-center gap-1">
              <button className="w-8 h-8 rounded-lg border border-[#334155] flex items-center justify-center hover:bg-white/5 text-[#64748b] bg-transparent cursor-pointer disabled:opacity-30" disabled>
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button className="w-8 h-8 rounded-lg bg-pink-500 text-white flex items-center justify-center font-black text-[10px] border-none">1</button>
              <button className="w-8 h-8 rounded-lg border border-[#334155] flex items-center justify-center hover:bg-white/5 text-[#64748b] bg-transparent cursor-pointer">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <motion.div 
            initial={{ opacity: 0, x: 20 }} 
            animate={{ opacity: 1, x: 0 }} 
            className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 items-start min-h-0"
          >
            {/* Lado Esquerdo: Editor (Scrollable) */}
            <div className="lg:col-span-5 flex flex-col gap-4 overflow-y-auto no-scrollbar max-h-full">
              <div className="bg-[#0f1629] p-6 rounded-2xl border border-white/5 shadow-2xl flex flex-col gap-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-pink-500"></div>
                
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-pink-400 text-[9px] font-black uppercase tracking-[0.3em] mb-1">Editor de Experiência</p>
                    <h3 className="text-2xl font-black text-white italic uppercase tracking-tight">PEDIDO #{selectedSale?.sequentialId}</h3>
                  </div>
                  <button 
                    onClick={() => setSelectedSaleId(null)}
                    className="w-10 h-10 bg-white/5 text-gray-400 rounded-xl flex items-center justify-center border border-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="bg-black/20 p-3 rounded-xl border border-white/5 flex items-center justify-between">
                    <div>
                      <p className="text-[#64748b] text-[8px] font-black uppercase tracking-widest">Cliente</p>
                      <p className="text-white font-bold text-xs uppercase">{selectedCustomer?.name}</p>
                    </div>
                    <User className="text-[#334155]" size={18} />
                  </div>

                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleGenerateQr();
                    }}
                    className="bg-black/20 p-3 rounded-xl border border-white/5"
                  >
                    <label className="text-[#64748b] text-[8px] font-black uppercase tracking-widest mb-2 block pl-1">Link do Vídeo (YouTube ou Drive)</label>
                    <div className="relative">
                      <Play className="absolute left-3 top-1/2 -translate-y-1/2 text-[#334155]" size={16} />
                      <input 
                        type="text"
                        placeholder="COLE O LINK AQUI..."
                        value={youtubeInput}
                        onChange={(e) => setYoutubeInput(e.target.value)}
                        className="w-full bg-[#0a0e1a] border border-[#334155] rounded-lg py-2.5 pl-10 pr-4 text-[11px] text-white placeholder-[#334155] focus:border-pink-500 transition-all outline-none font-bold uppercase"
                      />
                    </div>
                    <button type="submit" className="hidden">Submit</button>
                  </form>

                  <div className="grid grid-cols-1 gap-2 pt-2">
                    <button 
                      onClick={handleGenerateQr}
                      disabled={!youtubeInput || isGenerating}
                      className={`w-full py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 border-none cursor-pointer ${
                        !youtubeInput || isGenerating ? 'bg-[#1a2744] text-[#334155] cursor-not-allowed' : 'bg-pink-600 text-white hover:bg-pink-500 shadow-pink-500/20'
                      }`}
                    >
                      {isGenerating ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <><QrCode size={16} /> Gerar QR Code & Vincular</>
                      )}
                    </button>

                    {selectedSale?.youtubeLink && (
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onPrintGreeting(selectedSale!);
                        }}
                        className="w-full py-4 bg-transparent border border-[#334155] text-gray-400 hover:bg-white/5 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 cursor-pointer"
                      >
                        <Printer size={16} /> Imprimir Saudação
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Lado Direito: Prévias (Scrollable if needed) */}
            <div className="lg:col-span-7 flex flex-col gap-4 min-h-0 h-full">
              <div className="bg-[#0f1629] rounded-2xl border border-white/5 shadow-2xl flex flex-col h-full overflow-hidden">
                <div className="flex bg-black/40 border-b border-white/5 shrink-0">
                  <button 
                    onClick={() => setRightTab('coupon')}
                    className={`flex-1 py-4 flex items-center justify-center gap-2 font-black text-[9px] uppercase tracking-widest transition-all cursor-pointer border-none ${rightTab === 'coupon' ? 'text-pink-400 bg-pink-400/5' : 'text-[#64748b] hover:text-gray-300 bg-transparent'}`}
                  >
                    <Eye size={16} /> Cupom Visual
                  </button>
                  <div className="w-px bg-white/5"></div>
                  <button 
                    onClick={() => setRightTab('video')}
                    className={`flex-1 py-4 flex items-center justify-center gap-2 font-black text-[9px] uppercase tracking-widest transition-all cursor-pointer border-none ${rightTab === 'video' ? 'text-pink-400 bg-pink-400/5' : 'text-[#64748b] hover:text-gray-300 bg-transparent'}`}
                  >
                    <Play size={16} /> Prévia do Vídeo
                  </button>
                </div>

                <div className="flex-1 p-4 md:p-6 overflow-y-auto no-scrollbar flex items-center justify-center bg-black/20">
                  {rightTab === 'coupon' ? (
                    <div className="w-full h-full flex items-center justify-center">
                      {activeConfig && (
                        <div className="bg-[#0f172a]/80 p-6 rounded-[2rem] border border-white/5 shadow-2xl relative">
                          <div className="flex items-center gap-2 mb-4 bg-white/5 px-3 py-1 rounded-full border border-white/5 mx-auto w-fit">
                             <div className="w-1 h-1 rounded-full bg-blue-500 animate-pulse" />
                             <span className="text-[7px] font-black text-[#64748b] uppercase tracking-widest whitespace-nowrap">Visualização do Cupom</span>
                          </div>
                          
                          <div className="relative mx-auto overflow-hidden rounded-[1px] bg-white shadow-2xl shadow-black/50" style={{ 
                            width: `${(activeConfig.format === 'a4' ? 210 : activeConfig.format === 'a6' ? 105 : activeConfig.width || 80) * 0.8}mm`, 
                            height: `${(activeConfig.format === 'a4' ? 297 : activeConfig.format === 'a6' ? 148 : activeConfig.height || 180) * 0.8}mm`,
                            maxWidth: '100%',
                            maxHeight: '400px',
                            aspectRatio: activeConfig.orientation === 'landscape' ? '1.41 / 1' : '1 / 1.41'
                          }}>
                            <div className="h-full w-full overflow-auto no-scrollbar">
                              <UnifiedCouponRenderer 
                                config={activeConfig}
                                company={company}
                                sale={selectedSale}
                                customer={selectedCustomer}
                                scale={0.8}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-full max-w-2xl bg-black rounded-3xl overflow-hidden shadow-2xl relative border border-white/5 aspect-video self-center">
                      {currentEmbedUrl ? (
                        <iframe 
                          width="100%" 
                          height="100%" 
                          src={currentEmbedUrl}
                          title="Player" 
                          frameBorder="0" 
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                          allowFullScreen
                        ></iframe>
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-8 text-center bg-[#0a0e1a]">
                           <div className="w-16 h-16 bg-pink-500/10 text-pink-400 rounded-2xl flex items-center justify-center mb-4 border border-pink-500/20">
                              <Video size={32} />
                           </div>
                           <h4 className="text-lg font-black uppercase tracking-tight">Vincule um vídeo</h4>
                           <p className="text-[#64748b] text-xs mt-2 max-w-xs font-medium uppercase tracking-tight">Insira o link para habilitar a prévia.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
