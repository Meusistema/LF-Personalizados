import React, { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ImageIcon, Plus, Trash2, Smile, RotateCcw, RotateCw, Minus, MousePointer2, X, Star, FileDown, Printer } from 'lucide-react';
import { UniversalImageSelector } from './UniversalImageSelector';
import { UnifiedCouponRenderer } from './UnifiedCouponRenderer';

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
  format: '58mm' | '80mm' | 'a4' | 'a5' | 'a6' | 'custom' | 'thermal';
  customWidth?: number;
  customHeight?: number;
  width?: number;
  height?: number;
  backgroundImage?: string;
  backgroundOpacity?: number;
  emojiOpacity?: number;
  emojis?: Emoji[];
  customEmojis?: string[];
  qrCodeDesign?: QRCodeDesignConfig;
}

interface CouponVisualEditorProps {
  config: GreetingCouponConfig;
  onChange: (config: GreetingCouponConfig) => void;
  onPrint: () => void;
  onExportPDF: () => void;
  previewContent: React.ReactNode;
  company: {
    name: string;
    logo?: string;
  };
}

const EMOJI_CATEGORIES = {
  feminino: ['❤️', '💖', '🌹', '✨', '🎀', '🌸', '💅', '💃'],
  masculino: ['💀', '⚡', '🔥', '🏍️', '🎸', '🕹️', '🕶️', '🦾'],
  neutro: ['🎁', '⭐', '🎉', '📦', '🛒', '🎈', '🎊', '👋', '👍', '😊']
};

const CONTAINER_WIDTH = 300;
const CONTAINER_HEIGHT = 450; 

export const CouponVisualEditor: React.FC<CouponVisualEditorProps> = ({ config, onChange, onPrint, onExportPDF, company }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pendingEmoji, setPendingEmoji] = useState<{ char: string, isImage: boolean } | null>(null);
  const [activeEmojiId, setActiveEmojiId] = useState<string | null>(null);

  // Calcula escala para caber na tela
  const getScale = () => {
    switch (config.format) {
      case 'a4': return 0.4;
      case 'a5': return 0.6;
      case 'a6': return 0.8;
      default: return 1;
    }
  };

  const currentScale = getScale();

  const handleCustomEmojiUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Emoji muito grande. Máximo 2MB.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64Emoji = ev.target?.result as string;
        if (base64Emoji) {
          onChange({ 
            ...config, 
            customEmojis: [...(config.customEmojis || []), base64Emoji] 
          });
        }
      };
      reader.onerror = () => {
        alert('Erro ao ler o arquivo do emoji.');
      };
      reader.readAsDataURL(file);
    }
  };

  const selectEmoji = (char: string, isImage = false) => {
    setPendingEmoji({ char, isImage });
    setActiveEmojiId(null);
  };

  const placeEmoji = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!pendingEmoji || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    // QR Code protection: Bottom ~35% area (y > 0.65)
    if (y > 0.65) {
      alert('Não é possível colocar emoji sobre o QR Code.');
      return;
    }

    const newEmoji: Emoji = {
      id: crypto.randomUUID(),
      char: pendingEmoji.char,
      x,
      y,
      size: pendingEmoji.isImage ? 60 : 40,
      rotation: 0,
      opacity: 100,
      isImage: pendingEmoji.isImage
    };

    onChange({ ...config, emojis: [...(config.emojis || []), newEmoji] });
    setPendingEmoji(null);
    setActiveEmojiId(newEmoji.id);
  };

  const updateEmoji = (id: string, updates: Partial<Emoji>) => {
    onChange({
      ...config,
      emojis: (config.emojis || []).map(e => e.id === id ? { ...e, ...updates } : e)
    });
  };

  const removeEmoji = (id: string) => {
    onChange({
      ...config,
      emojis: (config.emojis || []).filter(e => e.id !== id)
    });
    if (activeEmojiId === id) setActiveEmojiId(null);
  };

  const activeEmoji = (config.emojis || []).find(e => e.id === activeEmojiId);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Lado Esquerdo: Controles */}
        <div className="space-y-3">
          <div className="bg-[#1a2744]/40 p-4 rounded-2xl border border-white/5 space-y-4 shadow-xl">
             <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                <div className="w-5 h-5 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-400">
                   <Star size={10} />
                </div>
                <h3 className="text-[9px] font-black text-white uppercase tracking-widest">Configuração do Cupom</h3>
             </div>

             <div className="space-y-3">
                {/* Título & Mensagem */}
                <div className="grid grid-cols-1 gap-3">
                  <div className="space-y-1">
                    <label className="text-[7px] font-black text-[#64748b] tracking-widest uppercase ml-1">Título do Cupom</label>
                    <input 
                      type="text" 
                      value={config.title}
                      onChange={e => onChange({ ...config, title: e.target.value })}
                      className="w-full p-2.5 bg-[#0f172a] border border-white/10 rounded-xl outline-none text-[10px] font-black uppercase text-white focus:border-blue-500/50 transition-all shadow-inner"
                      placeholder="EX: MUITO OBRIGADO!"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[7px] font-black text-[#64748b] tracking-widest uppercase ml-1">Mensagem Especial</label>
                    <textarea 
                      value={config.message}
                      onChange={e => onChange({ ...config, message: e.target.value })}
                      className="w-full p-2.5 bg-[#0f172a] border border-white/10 rounded-xl outline-none text-[10px] font-bold text-white focus:border-blue-500/50 transition-all resize-none h-16 shadow-inner"
                      placeholder="Escreva sua mensagem aqui..."
                    />
                  </div>
                </div>

                {/* Formato & Orientação */}
                <div className="grid grid-cols-2 gap-3">
                   <div className="space-y-1">
                      <label className="text-[7px] font-black text-[#64748b] tracking-widest uppercase ml-1">Formato</label>
                      <select 
                        value={config.format}
                        onChange={e => onChange({ ...config, format: e.target.value as any })}
                        className="w-full p-2.5 bg-[#0f172a] border border-white/10 rounded-xl outline-none text-[10px] font-black uppercase text-white cursor-pointer focus:border-blue-500/50 transition-all shadow-inner"
                      >
                         <option value="58mm">58mm Térmico</option>
                         <option value="80mm">80mm Térmico</option>
                         <option value="a4">Folha A4</option>
                         <option value="a5">Folha A5</option>
                         <option value="a6">Folha A6</option>
                      </select>
                   </div>
                   <div className="space-y-1">
                      <label className="text-[7px] font-black text-[#64748b] tracking-widest uppercase ml-1">Orientação</label>
                      <select 
                        value={config.orientation || 'portrait'}
                        onChange={e => onChange({ ...config, orientation: e.target.value as any })}
                        className="w-full p-2.5 bg-[#0f172a] border border-white/10 rounded-xl outline-none text-[10px] font-black uppercase text-white cursor-pointer focus:border-blue-500/50 transition-all shadow-inner"
                      >
                        <option value="portrait">Vertical</option>
                        <option value="landscape">Horizontal</option>
                      </select>
                   </div>
                </div>

                {/* Toggles */}
                <div className="grid grid-cols-2 gap-2">
                   <button 
                     onClick={() => onChange({ ...config, showLogo: !config.showLogo })}
                     className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all ${config.showLogo ? 'bg-blue-600/10 border-blue-500/50 text-blue-400' : 'bg-[#0f172a] border-white/5 text-[#64748b]'}`}
                   >
                      <Star size={10} fill={config.showLogo ? "currentColor" : "none"} />
                      <span className="text-[8px] font-black uppercase tracking-widest">Ver Logo</span>
                   </button>

                   <button 
                     onClick={() => onChange({ ...config, showCustomerName: !config.showCustomerName })}
                     className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all ${config.showCustomerName ? 'bg-blue-600/10 border-blue-500/50 text-blue-400' : 'bg-[#0f172a] border-white/5 text-[#64748b]'}`}
                   >
                      <Star size={10} fill={config.showCustomerName ? "currentColor" : "none"} />
                      <span className="text-[8px] font-black uppercase tracking-widest">Nome Cliente</span>
                   </button>
                </div>

                {/* Footer & QR */}
                <div className="grid grid-cols-2 gap-3">
                   <div className="space-y-1">
                      <label className="text-[7px] font-black text-[#64748b] tracking-widest uppercase ml-1">Rodapé (Mídias)</label>
                      <input 
                        type="text" 
                        value={config.footerText}
                        onChange={e => onChange({ ...config, footerText: e.target.value })}
                        className="w-full p-2.5 bg-[#0f172a] border border-white/10 rounded-xl outline-none text-[10px] font-bold text-white focus:border-blue-500/50 transition-all shadow-inner"
                        placeholder="@SUALOJA"
                      />
                   </div>
                   <div className="space-y-1">
                      <label className="text-[7px] font-black text-[#64748b] tracking-widest uppercase ml-1">Chamada QR Code</label>
                      <input 
                        type="text" 
                        value={config.qrCodeText}
                        onChange={e => onChange({ ...config, qrCodeText: e.target.value })}
                        className="w-full p-2.5 bg-[#0f172a] border border-white/10 rounded-xl outline-none text-[10px] font-bold text-white focus:border-blue-500/50 transition-all shadow-inner"
                        placeholder="ACESSE SEU VÍDEO"
                      />
                   </div>
                </div>

                <div className="pt-2 flex gap-2">
                    <button 
                      onClick={onExportPDF}
                      className="flex-1 py-3 bg-white/5 text-white border border-white/10 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 group active:scale-95"
                    >
                       <FileDown size={14} className="text-zinc-400 group-hover:text-white transition-colors" />
                       <span className="text-[10px] font-black uppercase tracking-[0.2em]">Gerar PDF</span>
                    </button>
                    <button 
                      onClick={onPrint}
                      className="flex-1 py-3 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 group"
                    >
                       <Printer size={14} className="group-hover:rotate-12 transition-transform" />
                       <span className="text-[10px] font-black uppercase tracking-[0.2em]">Imprimir</span>
                    </button>
                </div>
             </div>
          </div>
        </div>

        {/* Lado Direito: Preview */}
        <div className="flex flex-col items-center justify-start lg:pt-4">
           <div className="bg-[#0f172a]/80 p-6 rounded-[2rem] border border-white/5 shadow-2xl relative">
              <div className="flex items-center gap-2 mb-4 bg-white/5 px-3 py-1 rounded-full border border-white/5 mx-auto w-fit">
                 <div className="w-1 h-1 rounded-full bg-blue-500 animate-pulse" />
                 <span className="text-[7px] font-black text-[#64748b] uppercase tracking-widest whitespace-nowrap">Simulação Visual</span>
              </div>
              
              <div className="relative mx-auto overflow-hidden rounded-[1px] bg-white shadow-2xl shadow-black/50" style={{ 
                width: `${(config.format === 'a4' ? 210 : config.format === 'a5' ? 148 : config.format === 'a6' ? 105 : config.width || 80) * currentScale}mm`, 
                height: `${(config.format === 'a4' ? 297 : config.format === 'a5' ? 210 : config.format === 'a6' ? 148 : config.height || 180) * currentScale}mm`,
                maxWidth: '100%',
                maxHeight: '400px',
                aspectRatio: config.orientation === 'landscape' ? '1.41 / 1' : '1 / 1.41'
              }}>
                <div className="h-full w-full overflow-auto no-scrollbar">
                  <UnifiedCouponRenderer 
                    config={config} 
                    company={company} 
                    scale={currentScale}
                  />
                </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};
