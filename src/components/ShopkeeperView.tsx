/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useRef, FormEvent } from 'react';
import { generateUniqueId, getDeviceId } from '../lib/persistence';
import { 
  Users, 
  Plus, 
  Minus,
  Trash2, 
  Search, 
  UserPlus, 
  Store, 
  Package, 
  Truck, 
  CheckCircle, 
  History, 
  FileText, 
  Printer, 
  ArrowRight,
  TrendingUp,
  CreditCard,
  X,
  User,
  MapPin,
  Phone,
  LayoutGrid,
  ChevronDown,
  ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Shopkeeper {
  id: string;
  name: string; // Responsável
  storeName: string;
  taxId: string; // CPF/CNPJ
  phone: string;
  whatsapp?: string;
  cep: string;
  address: string;
  observations: string;
  image?: string;
  updatedAt: number;
  createdAt?: number;
  syncStatus?: 'local' | 'pending' | 'synced' | 'error';
  deviceId?: string;
}

interface ShopkeeperItem {
  productId: string;
  quantity: number; // Entregue
  soldQuantity: number; // Acertado/Vendido
  returnedQuantity: number; // Devolvido
  shopkeeperPrice: number;
  costPrice: number;
}

interface ShopkeeperDelivery {
  id: string;
  shopkeeperId: string;
  items: ShopkeeperItem[];
  status: 'aberto' | 'acerto' | 'finalizado';
  date: number;
  updatedAt: number;
  createdAt?: number;
  syncStatus?: 'local' | 'pending' | 'synced' | 'error';
  deviceId?: string;
  history: {
    action: string;
    date: number;
    details: string;
  }[];
}

interface Product {
  id: string;
  name: string;
  price: number;
  costPrice?: number;
  stock: number;
  shopkeeperPrice?: number;
  sku?: string;
  barcode?: string;
  imageUrl?: string;
}

interface ShopkeeperViewProps {
  shopkeepers: Shopkeeper[];
  setShopkeepers: (s: Shopkeeper[]) => void;
  deliveries: ShopkeeperDelivery[];
  setDeliveries: (d: ShopkeeperDelivery[]) => void;
  products: Product[];
  setProducts: (p: Product[]) => void;
  addActivity: (type: any, action: string, details: string) => void;
  canEdit: boolean;
  company: any;
  sales: any[];
  setSales: (s: any[]) => void;
  revenues: any[];
  setRevenues: (r: any[]) => void;
  addSaleToCashier: (sale: any) => void;
  currentUser: any | null;
  setView: (v: string) => void;
  showGlobalError?: (msg: string) => void;
  performPrint?: (type: string, content: string, printer: string, mode: string, dims?: any) => Promise<boolean>;
}

export function ShopkeeperView({ 
  shopkeepers, 
  setShopkeepers, 
  deliveries, 
  setDeliveries, 
  products,
  setProducts,
  addActivity,
  canEdit,
  company,
  sales,
  setSales,
  revenues,
  setRevenues,
  addSaleToCashier,
  currentUser,
  setView,
  showGlobalError,
  performPrint
}: ShopkeeperViewProps) {
  const [activeTab, setActiveTab] = useState<'cadastro' | 'entregas' | 'acertos' | 'historico'>('cadastro');
  const [searchTerm, setSearchTerm] = useState('');
  const [deliveryProductSearch, setDeliveryProductSearch] = useState('');
  const [settlementSearchTerm, setSettlementSearchTerm] = useState('');
  
  // Forms states
  const [showShopkeeperForm, setShowShopkeeperForm] = useState(false);
  const [isViewing, setIsViewing] = useState(false);
  const [editingShopkeeperId, setEditingShopkeeperId] = useState<string | null>(null);
  const [newShopkeeper, setNewShopkeeper] = useState<Omit<Shopkeeper, 'id' | 'updatedAt'>>({
    name: '',
    storeName: '',
    taxId: '',
    phone: '',
    cep: '',
    address: '',
    observations: ''
  });

  const [showDeliveryForm, setShowDeliveryForm] = useState(false);
  const [selectedLojistaId, setSelectedLojistaId] = useState('');
  const [deliveryCart, setDeliveryCart] = useState<{ productId: string, quantity: number }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedShopkeeperForSettlement, setSelectedShopkeeperForSettlement] = useState<string | null>(null);
  const [settlementData, setSettlementData] = useState<{ productId: string, sold: number, returned: number }[]>([]);

  // Helpers
  const maskPhone = (value: string) => {
    const nums = value.replace(/\D/g, '');
    if (nums.length <= 10) return nums.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    return nums.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').substring(0, 15);
  };

  const notify = (msg: string) => {
    if (showGlobalError) showGlobalError(msg);
    else alert(msg);
  };

  const handleSaveShopkeeper = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!newShopkeeper.name || !newShopkeeper.storeName) {
      return notify('Nome e Loja são obrigatórios');
    }

    setIsSubmitting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));

      if (editingShopkeeperId) {
        const updated = { 
          ...newShopkeeper, 
          id: editingShopkeeperId,
          updatedAt: Date.now() 
        };
        setShopkeepers(shopkeepers.map(s => s.id === editingShopkeeperId ? updated : s));
        addActivity('system', 'Lojista Atualizado', `Lojista ${newShopkeeper.storeName} foi atualizado.`);
      } else {
        const shopkeeper: Shopkeeper = {
          ...newShopkeeper,
          id: generateUniqueId('shop'),
          updatedAt: Date.now(),
          createdAt: Date.now(),
          syncStatus: 'pending',
          deviceId: getDeviceId()
        };
        setShopkeepers([...shopkeepers, shopkeeper]);
        addActivity('system', 'Novo Lojista', `Lojista ${newShopkeeper.storeName} foi cadastrado.`);
      }

      setShowShopkeeperForm(false);
      setEditingShopkeeperId(null);
      setNewShopkeeper({ name: '', storeName: '', taxId: '', phone: '', cep: '', address: '', observations: '' });
    } catch (err) {
      console.error(err);
      notify('Erro ao salvar lojista.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDelivery = async () => {
    if (isSubmitting) return;
    if (!selectedLojistaId) return notify('Selecione um lojista');
    if (deliveryCart.length === 0) return notify('Adicione produtos à entrega');

    setIsSubmitting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const deliveryItems: ShopkeeperItem[] = deliveryCart.map(item => {
        const p = products.find(prod => prod.id === item.productId);
        return {
          productId: item.productId,
          quantity: item.quantity,
          soldQuantity: 0,
          returnedQuantity: 0,
          shopkeeperPrice: p?.shopkeeperPrice || p?.price || 0,
          costPrice: p?.costPrice || 0
        };
      });

      const newDelivery: ShopkeeperDelivery = {
        id: generateUniqueId('del'),
        shopkeeperId: selectedLojistaId,
        items: deliveryItems,
        status: 'aberto',
        date: Date.now(),
        updatedAt: Date.now(),
        createdAt: Date.now(),
        syncStatus: 'pending',
        deviceId: getDeviceId(),
        history: [{
          action: 'Entrega Realizada',
          date: Date.now(),
          details: `Entrega de ${deliveryItems.length} produtos iniciada.`
        }]
      };

      // Update stocks
      const updatedProducts = products.map(p => {
        const item = deliveryCart.find(i => i.productId === p.id);
        if (item) {
          return { ...p, stock: p.stock - item.quantity };
        }
        return p;
      });

      setProducts(updatedProducts);
      setDeliveries([newDelivery, ...deliveries]);
      addActivity('system', 'Nova Entrega', `Entrega registrada para ${shopkeepers.find(s => s.id === selectedLojistaId)?.storeName}`);
      
      setShowDeliveryForm(false);
      setSelectedLojistaId('');
      setDeliveryCart([]);

      // Imprimir via logic
      if (typeof imprimirTermoEntrega === 'function') {
        imprimirTermoEntrega(newDelivery);
      }
    } catch (err) {
      console.error(err);
      notify('Erro ao salvar entrega.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveSettlement = () => {
    if (!selectedShopkeeperForSettlement) return;

    const pendingDeliveries = deliveries.filter(d => d.shopkeeperId === selectedShopkeeperForSettlement && d.status !== 'finalizado');
    
    // Validate totals across grouped items
    const groupedItems: Record<string, { totalSent: number, productId: string }> = {};
    pendingDeliveries.forEach(d => {
      d.items.forEach(item => {
        if (!groupedItems[item.productId]) {
          groupedItems[item.productId] = { totalSent: 0, productId: item.productId };
        }
        groupedItems[item.productId].totalSent += (item.quantity - item.soldQuantity - item.returnedQuantity);
      });
    });

    for (const item of settlementData) {
      if ((item.sold + item.returned > (groupedItems[item.productId]?.totalSent || 0))) {
        const p = products.find(prod => prod.id === item.productId);
        return alert(`A soma de vendidos e devolvidos para ${p?.name} não pode ser maior que o enviado (${groupedItems[item.productId].totalSent})`);
      }
    }

    const now = Date.now();
    const updatedDeliveries = [...deliveries];
    
    // Update each delivery involved
    pendingDeliveries.forEach(delivery => {
      const dIdx = updatedDeliveries.findIndex(d => d.id === delivery.id);
      if (dIdx === -1) return;

      const newItems = delivery.items.map(di => {
        const sEntry = settlementData.find(si => si.productId === di.productId);
        if (sEntry) {
          const remainingInThisDelivery = di.quantity - di.soldQuantity - di.returnedQuantity;
          // Distribute sold/returned to this delivery item until exhausted
          const toSettleInThisStore = settlementData.find(s => s.productId === di.productId);
          if (toSettleInThisStore) {
            // This is slightly complex because we need to track how much of sEntry.sold we've applied
            // Since we iterate over deliveries, we'll use a "remaining to settle" pattern
          }
        }
        return di;
      });
    });

    // Actually, a simpler way to distribute:
    const remainingToSettle = settlementData.map(s => ({ ...s }));

    const finalUpdatedDeliveries = updatedDeliveries.map(d => {
      if (d.shopkeeperId === selectedShopkeeperForSettlement && d.status !== 'finalizado') {
        const newItems = d.items.map(di => {
          const sIdx = remainingToSettle.findIndex(rs => rs.productId === di.productId);
          if (sIdx !== -1) {
            const diRemaining = di.quantity - di.soldQuantity - di.returnedQuantity;
            
            const soldFromThis = Math.min(diRemaining, remainingToSettle[sIdx].sold);
            remainingToSettle[sIdx].sold -= soldFromThis;
            
            const returnedFromThis = Math.min(diRemaining - soldFromThis, remainingToSettle[sIdx].returned);
            remainingToSettle[sIdx].returned -= returnedFromThis;

            return { 
              ...di, 
              soldQuantity: di.soldQuantity + soldFromThis, 
              returnedQuantity: di.returnedQuantity + returnedFromThis 
            };
          }
          return di;
        });

        const allSettled = newItems.every(ni => ni.soldQuantity + ni.returnedQuantity === ni.quantity);
        return { 
          ...d, 
          items: newItems, 
          status: allSettled ? 'finalizado' : 'acerto',
          updatedAt: now,
          history: [...d.history, { 
            action: 'Acerto Agrupado', 
            date: now, 
            details: `Acerto realizado via fluxo de lojista.` 
          }]
        } as ShopkeeperDelivery;
      }
      return d;
    });

    // Handle Stock for returns
    const updatedProducts = [...products];
    settlementData.forEach(s => {
      if (s.returned > 0) {
        const pIdx = updatedProducts.findIndex(p => p.id === s.productId);
        if (pIdx !== -1) {
          updatedProducts[pIdx] = { ...updatedProducts[pIdx], stock: updatedProducts[pIdx].stock + s.returned };
        }
      }
    });

    // Handle Finance/Sales for sold items
    const totalSold = settlementData.reduce((acc, s) => {
      // Find price from first delivery that has this product
      const dWithProduct = pendingDeliveries.find(d => d.items.some(i => i.productId === s.productId));
      const dItem = dWithProduct?.items.find(i => i.productId === s.productId);
      return acc + (s.sold * (dItem?.shopkeeperPrice || 0));
    }, 0);

    const totalSoldCost = settlementData.reduce((acc, s) => {
      const dWithProduct = pendingDeliveries.find(d => d.items.some(i => i.productId === s.productId));
      const dItem = dWithProduct?.items.find(i => i.productId === s.productId);
      return acc + (s.sold * (dItem?.costPrice || 0));
    }, 0);

    if (totalSold > 0) {
      const lojista = shopkeepers.find(s => s.id === selectedShopkeeperForSettlement);
      const newSale: any = {
        id: crypto.randomUUID(),
        date: now,
        total: totalSold,
        totalCost: totalSoldCost,
        totalProfit: totalSold - totalSoldCost,
        paymentMethod: 'ACERTO LOJISTA',
        status: 'entregue',
        customerId: lojista?.id,
        notes: `Acerto Lojista Agrupado: ${lojista?.storeName}`,
        items: settlementData.filter(s => s.sold > 0).map(s => {
          const dWithProduct = pendingDeliveries.find(d => d.items.some(i => i.productId === s.productId));
          const dItem = dWithProduct?.items.find(i => i.productId === s.productId);
          return {
            productId: s.productId,
            quantity: s.sold,
            price: dItem?.shopkeeperPrice || 0,
            cost: dItem?.costPrice || 0,
            profit: (dItem?.shopkeeperPrice || 0) - (dItem?.costPrice || 0)
          };
        })
      };

      setSales([...sales, newSale]);
      addSaleToCashier(newSale);
      
      const newRevenue = {
        id: crypto.randomUUID(),
        saleId: newSale.id,
        amount: totalSold,
        status: 'confirmado',
        date: new Date().toISOString(),
        updatedAt: Date.now()
      };
      setRevenues([...revenues, newRevenue]);
    }

    setProducts(updatedProducts);
    setDeliveries(finalUpdatedDeliveries);
    
    setSelectedShopkeeperForSettlement(null);
    setSettlementData([]);
    addActivity('system', 'Acerto Lojista', `Acerto finalizado para ${shopkeepers.find(s => s.id === selectedShopkeeperForSettlement)?.storeName}`);
  };

  const imprimirTermoEntrega = async (delivery: ShopkeeperDelivery) => {
    const lojista = shopkeepers.find(s => s.id === delivery.shopkeeperId);
    if (!lojista) return;

    const itemsContent = delivery.items.map(item => {
      const p = products.find(prod => prod.id === item.productId);
      return `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${p?.name || 'Produto'}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        </tr>
      `;
    }).join('');

    const htmlContent = `
      <html>
        <head>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #333; line-height: 1.6; }
            .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #333; padding-bottom: 20px; }
            .company { font-weight: bold; font-size: 24px; margin-bottom: 5px; }
            .doc-title { font-size: 18px; color: #666; text-transform: uppercase; letter-spacing: 2px; }
            .info-grid { display: grid; grid-template-cols: 1fr 1fr; gap: 20px; margin-bottom: 40px; }
            .info-card { background: #f9f9f9; padding: 20px; rounded: 8px; }
            .info-label { font-size: 10px; font-weight: bold; color: #999; text-transform: uppercase; }
            .info-value { font-size: 14px; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 60px; }
            th { text-align: left; background: #eee; padding: 12px; font-size: 12px; text-transform: uppercase; }
            .signature { margin-top: 100px; text-align: center; border-top: 1px solid #333; width: 300px; margin-left: auto; margin-right: auto; padding-top: 10px; font-weight: bold; }
            .date { text-align: right; margin-bottom: 20px; font-style: italic; }
          </style>
        </head>
        <body onload="window.print()">
          <div class="header">
            <div class="company">${company.name}</div>
            <div class="doc-title">Termo de Entrega ao Lojista</div>
          </div>
          
          <div class="date">Data: ${new Date(delivery.date).toLocaleDateString('pt-BR')}</div>

          <div class="info-grid">
            <div class="info-card">
              <div class="info-label">Lojista / Estabelecimento</div>
              <div class="info-value">${lojista.storeName}</div>
              <div class="info-label" style="margin-top: 10px;">Responsável</div>
              <div class="info-value">${lojista.name}</div>
            </div>
            <div class="info-card">
              <div class="info-label">Documento</div>
              <div class="info-value">${lojista.taxId}</div>
              <div class="info-label" style="margin-top: 10px;">Endereço</div>
              <div class="info-value">${lojista.address}, ${lojista.cep}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Produto</th>
                <th style="text-align: center;">Quantidade</th>
              </tr>
            </thead>
            <tbody>
              ${itemsContent}
            </tbody>
          </table>

          <div style="margin-top: 40px;">
            Declaro ter recebido os produtos acima relacionados em perfeitas condições para revenda em regime de consignação/acerto posterior.
          </div>

          <div class="signature">
            Assinatura do Responsável
          </div>
        </body>
      </html>
    `;

    if (performPrint) {
      return performPrint('termo-entrega', htmlContent, '', 'auto', {
        format: 'a4',
        orientation: 'portrait'
      });
    }

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(htmlContent);
      doc.close();

      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      }, 500);
    }
  };

  // Render sub-views
  return (
    <div className="fixed inset-0 z-[200] bg-[#0a1628] text-white p-2 md:p-4 font-sans flex flex-col overflow-hidden">
      {/* Header Padrao */}
      <div className="flex items-center justify-between mb-2 shrink-0 px-2 md:px-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setView('dashboard')}
            className="w-10 h-10 rounded-xl bg-[#1a2744] flex items-center justify-center border border-white/5 hover:bg-[#1a2744]/80 transition-all cursor-pointer group"
          >
            <ChevronDown className="w-5 h-5 text-[#64748b] group-hover:text-white" />
          </button>
          <div>
            <h2 className="text-lg md:text-xl font-black text-white uppercase italic leading-none">Gestão de Lojistas</h2>
            <p className="text-[9px] font-black text-pink-500 uppercase tracking-widest mt-1">Parceiros & Consignação</p>
          </div>
        </div>
      </div>

      {/* Abas e Busca Fixos Compactos */}
      <div className="shrink-0 space-y-2 mb-2">
        <div className="flex bg-[#0d1c30] rounded-xl p-1 border border-white/5 overflow-x-auto no-scrollbar">
          {[
            { id: 'cadastro', label: 'Cadastros', icon: <Users size={12} /> },
            { id: 'entregas', label: 'Entregas', icon: <Truck size={12} /> },
            { id: 'acertos', label: 'Acertos', icon: <CheckCircle size={12} /> },
            { id: 'historico', label: 'Histórico', icon: <History size={12} /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all whitespace-nowrap ${
                activeTab === tab.id ? 'bg-pink-600 text-white shadow-lg' : 'text-[#64748b] hover:text-white'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col md:flex-row items-center gap-3">
          <form onSubmit={e => e.preventDefault()} className="flex-1 w-full flex items-center gap-3 bg-[#0d1c30] border border-white/5 rounded-xl px-4 py-2.5">
            <Search className="w-4 h-4 text-[#334155]" />
            <input 
              placeholder="Buscar lojista ou estabelecimento..." 
              className="bg-transparent border-none outline-none text-white text-[10px] font-black w-full placeholder:text-[#334155] uppercase"
              value={activeTab === 'cadastro' ? searchTerm : activeTab === 'acertos' ? settlementSearchTerm : ''}
              onChange={e => {
                if (activeTab === 'cadastro') setSearchTerm(e.target.value);
                if (activeTab === 'acertos') setSettlementSearchTerm(e.target.value);
              }}
            />
          </form>
          {canEdit && activeTab === 'cadastro' && (
            <button 
              onClick={() => {
                setEditingShopkeeperId(null);
                setNewShopkeeper({ name: '', storeName: '', taxId: '', phone: '', cep: '', address: '', observations: '' });
                setIsViewing(false);
                setShowShopkeeperForm(true);
              }}
              className="w-full md:w-auto h-10 flex items-center justify-center gap-2 bg-pink-600 hover:bg-pink-500 text-white font-black px-6 rounded-xl text-[9px] uppercase tracking-widest transition-all shrink-0"
            >
              <UserPlus size={14} />
              Novo Lojista
            </button>
          )}
          {canEdit && activeTab === 'entregas' && (
            <button 
              onClick={() => setShowDeliveryForm(true)}
              className="w-full md:w-auto h-10 flex items-center justify-center gap-2 bg-pink-600 hover:bg-pink-500 text-white font-black px-6 rounded-xl text-[9px] uppercase tracking-widest transition-all shrink-0"
            >
              <Plus size={14} />
              Nova Entrega
            </button>
          )}
        </div>
      </div>

      {/* Conteúdo com Scroll Interno */}
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
        <div className="bg-[#0d1c30] rounded-2xl border border-white/5 min-h-[500px] overflow-hidden shadow-2xl">
          {activeTab === 'cadastro' && (
            <div className="p-4 md:p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {shopkeepers.filter(s => s.storeName.toLowerCase().includes(searchTerm.toLowerCase()) || s.name.toLowerCase().includes(searchTerm.toLowerCase())).map(s => (
                  <div key={s.id} className="bg-[#1a2744]/20 border border-white/5 rounded-xl p-5 hover:bg-[#1a2744]/40 transition-all group">
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-10 h-10 bg-pink-500/10 rounded-lg flex items-center justify-center text-pink-400 group-hover:scale-110 transition-transform">
                        <Store size={18} />
                      </div>
                      <div className="flex gap-1">
                        <button 
                          onClick={() => {
                            setEditingShopkeeperId(s.id);
                            setNewShopkeeper({ ...s });
                            setIsViewing(false);
                            setShowShopkeeperForm(true);
                          }}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-[#64748b] hover:text-white hover:bg-white/5 transition-all"
                        >
                          <FileText size={14} />
                        </button>
                        <button 
                          onClick={() => {
                            setEditingShopkeeperId(s.id);
                            setNewShopkeeper({ ...s });
                            setIsViewing(true);
                            setShowShopkeeperForm(true);
                          }}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-[#64748b] hover:text-white hover:bg-white/5 transition-all"
                        >
                          <Search size={14} />
                        </button>
                        {canEdit && (
                          <button 
                            onClick={() => {
                              if (confirm('Deseja excluir este lojista?')) {
                                setShopkeepers(shopkeepers.filter(sk => sk.id !== s.id));
                              }
                            }}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#64748b] hover:text-red-400 hover:bg-red-500/10 transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-[13px] font-black text-white uppercase italic truncate">{s.storeName}</h4>
                      <p className="text-[9px] font-black text-[#64748b] uppercase tracking-widest mt-1 truncate">{s.name}</p>
                    </div>
                    <div className="space-y-2 mt-4 pt-4 border-t border-white/5">
                      <div className="flex items-center gap-3 text-[9px] text-[#64748b] font-black uppercase tracking-widest">
                        <Phone size={10} className="text-pink-500/60" /> {s.phone}
                      </div>
                      <div className="flex items-center gap-3 text-[9px] text-[#64748b] font-black uppercase tracking-widest truncate">
                        <MapPin size={10} className="text-pink-500/60" /> {s.address}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {shopkeepers.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 opacity-20">
                  <Users size={64} strokeWidth={1} />
                  <p className="mt-4 text-[10px] font-black uppercase tracking-[0.3em]">Nenhum Lojista Encontrado</p>
                </div>
              )}
            </div>
          )}


        {activeTab === 'entregas' && (
          <div className="p-6 space-y-6">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-sm font-bold text-white/40 uppercase tracking-widest">Entregas em Aberto</h4>
              {canEdit && (
                <button 
                  onClick={() => setShowDeliveryForm(true)}
                  className="flex items-center gap-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors"
                >
                  <Plus size={14} /> Nova Entrega
                </button>
              )}
            </div>

            <div className="border border-[#1e2a4a] rounded-xl overflow-hidden font-medium">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-[#1a2744]/40 border-b border-[#1e2a4a]">
                      <th className="p-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Data</th>
                      <th className="p-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Lojista</th>
                      <th className="p-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Itens</th>
                      <th className="p-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                      <th className="p-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e2a4a]">
                    {deliveries.filter(d => d.status === 'aberto').sort((a,b) => b.date - a.date).map(d => {
                      const lojista = shopkeepers.find(s => s.id === d.shopkeeperId);
                      return (
                        <tr key={d.id} className="hover:bg-[#1a2744]/20 transition-all group">
                          <td className="p-4">
                            <p className="text-[11px] text-gray-500 uppercase">{new Date(d.date).toLocaleDateString('pt-BR')}</p>
                          </td>
                          <td className="p-4">
                            <p className="text-sm font-bold text-white uppercase tracking-tight">{lojista?.storeName}</p>
                            <p className="text-[10px] text-gray-500 uppercase mt-0.5">{lojista?.name}</p>
                          </td>
                          <td className="p-4">
                            <span className="bg-[#1a2744]/40 border border-[#1e2a4a] px-3 py-1 rounded-lg text-[10px] text-gray-400 uppercase tracking-widest">
                              {d.items.length} {d.items.length === 1 ? 'PRODUTO' : 'PRODUTOS'}
                            </span>
                          </td>
                          <td className="p-4">
                             <span className="text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/20">Em Aberto</span>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button 
                                onClick={() => imprimirTermoEntrega(d)}
                                className="p-2 text-gray-400 hover:text-white transition-all"
                              >
                                <Printer size={16} />
                              </button>
                              <button 
                                onClick={() => {
                                  const shopkeeperPendingDeliveries = deliveries.filter(del => del.shopkeeperId === d.shopkeeperId && del.status !== 'finalizado');
                                  const grouped: Record<string, { totalSent: number, productId: string }> = {};
                                  shopkeeperPendingDeliveries.forEach(del => {
                                    del.items.forEach(item => {
                                      if (!grouped[item.productId]) {
                                        grouped[item.productId] = { totalSent: 0, productId: item.productId };
                                      }
                                      grouped[item.productId].totalSent += (item.quantity - item.soldQuantity - item.returnedQuantity);
                                    });
                                  });

                                  setSettlementData(Object.values(grouped).filter(g => g.totalSent > 0).map(g => ({ 
                                    productId: g.productId, 
                                    sold: 0, 
                                    returned: 0 
                                  })));
                                  setSelectedShopkeeperForSettlement(d.shopkeeperId);
                                  setActiveTab('acertos');
                                }}
                                className="bg-[#3b82f6] hover:bg-[#2563eb] text-white px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors"
                              >
                                Acertar
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {deliveries.filter(d => d.status === 'aberto').length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-20 text-center text-[11px] font-bold text-gray-500 uppercase tracking-widest italic">
                           Nenhuma entrega pendente de acerto
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'acertos' && (
          <div className="p-6 space-y-8">
            {!selectedShopkeeperForSettlement ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {shopkeepers.filter(s => {
                  const hasPending = deliveries.some(d => d.shopkeeperId === s.id && d.status !== 'finalizado');
                  const matchesSearch = s.storeName.toLowerCase().includes(settlementSearchTerm.toLowerCase()) || 
                                      s.name.toLowerCase().includes(settlementSearchTerm.toLowerCase());
                  return hasPending && matchesSearch;
                }).map(s => {
                  const shopkeeperPendingDeliveries = deliveries.filter(d => d.shopkeeperId === s.id && d.status !== 'finalizado');
                  const totalPendingItems = shopkeeperPendingDeliveries.reduce((acc, d) => 
                    acc + d.items.reduce((iAcc, item) => iAcc + (item.quantity - item.soldQuantity - item.returnedQuantity), 0), 0
                  );

                  return (
                    <button 
                      key={s.id}
                      onClick={() => {
                        const grouped: Record<string, { totalSent: number, productId: string }> = {};
                        shopkeeperPendingDeliveries.forEach(d => {
                          d.items.forEach(item => {
                            if (!grouped[item.productId]) {
                              grouped[item.productId] = { totalSent: 0, productId: item.productId };
                            }
                            grouped[item.productId].totalSent += (item.quantity - item.soldQuantity - item.returnedQuantity);
                          });
                        });

                        setSettlementData(Object.values(grouped).filter(g => g.totalSent > 0).map(g => ({ 
                          productId: g.productId, 
                          sold: 0, 
                          returned: 0 
                        })));
                        setSelectedShopkeeperForSettlement(s.id);
                      }}
                      className="bg-[#1a2744]/20 border border-[#1e2a4a] rounded-xl p-6 text-left hover:border-[#3b82f6]/50 transition-all group relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 p-3">
                         <div className="w-2 h-2 bg-[#3b82f6] rounded-full animate-pulse shadow-[0_0_10px_#3b82f6]" />
                      </div>
                      <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 bg-[#3b82f6]/10 rounded-xl flex items-center justify-center text-[#3b82f6] group-hover:bg-[#3b82f6] group-hover:text-white transition-all shadow-lg">
                          <Store size={20} />
                        </div>
                        <div className="bg-[#1a2744]/40 border border-[#1e2a4a] px-3 py-1 rounded-lg text-[9px] text-gray-400 uppercase tracking-widest font-bold">
                          {shopkeeperPendingDeliveries.length} ENTREGAS
                        </div>
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-white uppercase tracking-tight">{s.storeName}</h4>
                        <div className="flex items-center gap-2 mt-2">
                           <Package size={12} className="text-gray-500" />
                           <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                             {totalPendingItems} ITENS PENDENTES
                           </p>
                        </div>
                      </div>
                    </button>
                  )
                })}
                {shopkeepers.filter(s => deliveries.some(d => d.shopkeeperId === s.id && d.status !== 'finalizado')).length === 0 && (
                  <div className="col-span-full py-20 flex flex-col items-center justify-center text-center">
                    <div className="w-20 h-20 bg-[#1a2744]/40 rounded-full flex items-center justify-center mb-6">
                       <CheckCircle className="text-gray-500/40" size={32} />
                    </div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Nenhum lojista com entregas pendentes</p>
                  </div>
                )}
              </div>
            ) : (
              <motion.form 
                onSubmit={e => {
                  e.preventDefault();
                  handleSaveSettlement();
                }}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6"
              >
                 <div className="bg-[#1a2744]/20 border border-[#1e2a4a] rounded-2xl p-8 space-y-8">
                    <div className="flex justify-between items-center pb-6 border-b border-[#1e2a4a]">
                       <div className="flex items-center gap-4">
                          <button onClick={() => setSelectedShopkeeperForSettlement(null)} className="p-2 bg-[#1a2744] hover:bg-[#1e2a4a] text-gray-400 hover:text-white rounded-lg transition-all">
                             <ArrowLeft size={18} />
                          </button>
                          <div>
                            <h4 className="text-lg font-bold text-white uppercase mb-1">Painel de Acerto</h4>
                            <p className="text-xs text-gray-500 uppercase font-bold">
                                {shopkeepers.find(s => s.id === selectedShopkeeperForSettlement)?.storeName}
                            </p>
                          </div>
                       </div>
                       <div className="flex gap-4">
                          <div className="bg-[#1a2744]/40 border border-[#1e2a4a] px-4 py-2 rounded-xl text-right">
                             <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest leading-none mb-1">Responsável</p>
                             <p className="text-xs font-bold text-white uppercase">{shopkeepers.find(s => s.id === selectedShopkeeperForSettlement)?.name}</p>
                          </div>
                       </div>
                    </div>

                    <div className="space-y-4">
                       {settlementData.map(si => {
                         const p = products.find(prod => prod.id === si.productId);
                         const pendingDeliveries = deliveries.filter(d => d.shopkeeperId === selectedShopkeeperForSettlement && d.status !== 'finalizado');
                         const totalSent = pendingDeliveries.reduce((acc, d) => {
                           const item = d.items.find(i => i.productId === si.productId);
                           return acc + (item ? (item.quantity - item.soldQuantity - item.returnedQuantity) : 0);
                         }, 0);
                         const dWithPrice = pendingDeliveries.find(d => d.items.some(i => i.productId === si.productId));
                         const price = dWithPrice?.items.find(i => i.productId === si.productId)?.shopkeeperPrice || p?.shopkeeperPrice || p?.price || 0;

                         return (
                           <div key={si.productId} className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-5 border border-[#1e2a4a] rounded-xl items-center bg-[#0d1321]/40 hover:bg-[#0d1321]/60 transition-all group">
                              <div className="lg:col-span-4 flex items-center gap-4">
                                 <div className="w-12 h-12 bg-[#1a2744] rounded-lg flex items-center justify-center text-gray-400 border border-[#1e2a4a] overflow-hidden shadow-inner group-hover:border-[#3b82f6]/30 transition-all">
                                    {p?.imageUrl ? <img src={p.imageUrl} className="w-full h-full object-cover" /> : <Package size={20} />}
                                 </div>
                                 <div className="min-w-0">
                                   <p className="text-sm font-bold text-white uppercase truncate tracking-tight">{p?.name}</p>
                                   <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mt-1">
                                      Pendentes: <span className="text-[#3b82f6]">{totalSent}</span> | R$ {price.toFixed(2)} un
                                   </p>
                                 </div>
                              </div>
                              
                              <div className="lg:col-span-3">
                                 <label className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-2 block">Vendidos</label>
                                 <div className="flex items-center gap-2">
                                    <button 
                                       onClick={() => setSettlementData(prev => prev.map(item => item.productId === si.productId ? { ...item, sold: Math.max(0, item.sold - 1) } : item))}
                                       className="w-8 h-8 flex items-center justify-center border border-[#1e2a4a] text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                                    >
                                       <Minus size={14} />
                                    </button>
                                    <input 
                                       type="number"
                                       className="w-16 p-2 bg-[#0a0e1a] border border-[#1e2a4a] rounded-lg text-center text-xs font-bold text-white outline-none focus:border-[#3b82f6] transition-all"
                                       value={si.sold}
                                       onChange={e => {
                                         const val = parseInt(e.target.value) || 0;
                                         setSettlementData(prev => prev.map(item => item.productId === si.productId ? { ...item, sold: Math.min(totalSent - item.returned, val) } : item));
                                       }}
                                    />
                                    <button 
                                       onClick={() => setSettlementData(prev => prev.map(item => item.productId === si.productId ? { ...item, sold: Math.min(totalSent - item.returned, item.sold + 1) } : item))}
                                       className="w-8 h-8 flex items-center justify-center border border-[#1e2a4a] text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                                    >
                                       <Plus size={14} />
                                    </button>
                                 </div>
                              </div>

                              <div className="lg:col-span-3">
                                 <label className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-2 block">Devolvidos</label>
                                 <div className="flex items-center gap-2">
                                    <button 
                                       onClick={() => setSettlementData(prev => prev.map(item => item.productId === si.productId ? { ...item, returned: Math.max(0, item.returned - 1) } : item))}
                                       className="w-8 h-8 flex items-center justify-center border border-[#1e2a4a] text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                                    >
                                       <Minus size={14} />
                                    </button>
                                    <input 
                                       type="number"
                                       className="w-16 p-2 bg-[#0a0e1a] border border-[#1e2a4a] rounded-lg text-center text-xs font-bold text-white outline-none focus:border-[#3b82f6] transition-all"
                                       value={si.returned}
                                       onChange={e => {
                                         const val = parseInt(e.target.value) || 0;
                                         setSettlementData(prev => prev.map(item => item.productId === si.productId ? { ...item, returned: Math.min(totalSent - item.sold, val) } : item));
                                       }}
                                    />
                                    <button 
                                       onClick={() => setSettlementData(prev => prev.map(item => item.productId === si.productId ? { ...item, returned: Math.min(totalSent - item.sold, item.returned + 1) } : item))}
                                       className="w-8 h-8 flex items-center justify-center border border-[#1e2a4a] text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                                    >
                                       <Plus size={14} />
                                    </button>
                                 </div>
                              </div>

                              <div className="lg:col-span-2 text-right">
                                 <label className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1 block">Subtotal</label>
                                 <p className="text-base font-bold text-[#3b82f6]">
                                    R$ {( si.sold * price ).toFixed(2)}
                                 </p>
                              </div>
                           </div>
                         );
                       })}
                    </div>

                    <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-[#1e2a4a] gap-6">
                       <div className="flex gap-12">
                          <div className="text-center md:text-left">
                             <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">TOTAL VENDIDO</p>
                             <h3 className="text-3xl font-black text-[#3b82f6] tracking-tight italic">
                                R$ {settlementData.reduce((acc, s) => {
                                  const pendingDeliveries = deliveries.filter(d => d.shopkeeperId === selectedShopkeeperForSettlement && d.status !== 'finalizado');
                                  const dWithProduct = pendingDeliveries.find(d => d.items.some(i => i.productId === s.productId));
                                  const price = dWithProduct?.items.find(i => i.productId === s.productId)?.shopkeeperPrice || products.find(p => p.id === s.productId)?.shopkeeperPrice || products.find(p => p.id === s.productId)?.price || 0;
                                  return acc + (s.sold * price);
                                }, 0).toFixed(2)}
                             </h3>
                          </div>
                          <div className="text-center md:text-left">
                             <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">LUCRO ESTIMADO</p>
                             <p className="text-3xl font-black text-emerald-500 tracking-tight italic">
                                R$ {settlementData.reduce((acc, s) => {
                                  const pendingDeliveries = deliveries.filter(d => d.shopkeeperId === selectedShopkeeperForSettlement && d.status !== 'finalizado');
                                  const dWithProduct = pendingDeliveries.find(d => d.items.some(i => i.productId === s.productId));
                                  const item = dWithProduct?.items.find(i => i.productId === s.productId);
                                  const price = item?.shopkeeperPrice || products.find(p => p.id === s.productId)?.shopkeeperPrice || products.find(p => p.id === s.productId)?.price || 0;
                                  const cost = item?.costPrice || products.find(p => p.id === s.productId)?.costPrice || 0;
                                  return acc + (s.sold * (price - cost));
                                }, 0).toFixed(2)}
                             </p>
                          </div>
                       </div>
                       <button 
                          type="submit"
                          disabled={settlementData.length === 0}
                          className="w-full md:w-auto bg-[#3b82f6] hover:bg-[#2563eb] text-white px-10 py-5 rounded-2xl text-xs font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all shadow-xl shadow-blue-500/20 active:scale-95 disabled:opacity-20 disabled:grayscale disabled:cursor-not-allowed"
                       >
                          <CheckCircle size={20} /> FINALIZAR ACERTO
                       </button>
                    </div>
                 </div>
              </motion.form>
            )}
          </div>
        )}

        {activeTab === 'historico' && (
          <div className="p-6 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="bg-[#1a2744]/20 border border-[#1e2a4a] rounded-2xl p-8 space-y-4 relative overflow-hidden group">
                  <div className="absolute -right-4 -bottom-4 text-[#3b82f6]/5 group-hover:text-[#3b82f6]/10 group-hover:scale-110 transition-all">
                     <TrendingUp size={120} />
                  </div>
                  <div className="flex items-center gap-3 text-[#3b82f6]">
                     <div className="w-10 h-10 bg-[#3b82f6]/10 rounded-xl flex items-center justify-center">
                        <TrendingUp size={20} />
                     </div>
                     <h5 className="text-[10px] font-black uppercase tracking-widest text-gray-500">Faturamento Realizado</h5>
                  </div>
                  <p className="text-3xl font-black text-white italic tracking-tight">
                     R$ {sales.filter(s => s.paymentMethod === 'ACERTO LOJISTA').reduce((acc, s) => acc + s.total, 0).toFixed(2)}
                  </p>
               </div>
               <div className="bg-[#1a2744]/20 border border-[#1e2a4a] rounded-2xl p-8 space-y-4 relative overflow-hidden group">
                  <div className="absolute -right-4 -bottom-4 text-emerald-500/5 group-hover:text-emerald-500/10 group-hover:scale-110 transition-all">
                     <CheckCircle size={120} />
                  </div>
                  <div className="flex items-center gap-3 text-emerald-500">
                     <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                        <CheckCircle size={20} />
                     </div>
                     <h5 className="text-[10px] font-black uppercase tracking-widest text-gray-500">Lucro Acumulado</h5>
                  </div>
                  <p className="text-3xl font-black text-white italic tracking-tight">
                     R$ {sales.filter(s => s.paymentMethod === 'ACERTO LOJISTA').reduce((acc, s) => acc + (s.totalProfit || 0), 0).toFixed(2)}
                  </p>
               </div>
               <div className="bg-[#1a2744]/20 border border-[#1e2a4a] rounded-2xl p-8 space-y-4 relative overflow-hidden group">
                  <div className="absolute -right-4 -bottom-4 text-white/5 group-hover:text-white/10 group-hover:scale-110 transition-all">
                     <Users size={120} />
                  </div>
                  <div className="flex items-center gap-3 text-white">
                     <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                        <Users size={20} />
                     </div>
                     <h5 className="text-[10px] font-black uppercase tracking-widest text-gray-500">Parceiros Ativos</h5>
                  </div>
                  <p className="text-3xl font-black text-white italic tracking-tight">{shopkeepers.length}</p>
               </div>
            </div>

            <div className="border border-[#1e2a4a] rounded-2xl overflow-hidden bg-[#1a2744]/10">
               <div className="p-6 bg-[#1a2744]/40 border-b border-[#1e2a4a] flex items-center justify-between">
                  <h4 className="text-[11px] font-black text-white uppercase tracking-[0.2em] italic">Histórico de Acertos</h4>
                  <History size={18} className="text-gray-500" />
               </div>
               <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                      <tr className="bg-[#1a2744]/20 border-b border-[#1e2a4a]">
                        <th className="p-5 text-[10px] font-black text-gray-500 uppercase tracking-widest">Data</th>
                        <th className="p-5 text-[10px] font-black text-gray-500 uppercase tracking-widest">Lojista</th>
                        <th className="p-5 text-[10px] font-black text-gray-500 uppercase tracking-widest">Venda Total</th>
                        <th className="p-5 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Lucro</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e2a4a]">
                      {sales.filter(s => s.paymentMethod === 'ACERTO LOJISTA').sort((a,b) => b.date - a.date).map(sale => {
                         const lojista = shopkeepers.find(sk => sk.id === sale.customerId);
                         return (
                           <tr key={sale.id} className="hover:bg-[#1a2744]/30 transition-all group">
                              <td className="p-5 text-gray-400">
                                 <p className="text-[11px] font-bold uppercase">{new Date(sale.date).toLocaleDateString('pt-BR')}</p>
                              </td>
                              <td className="p-5">
                                 <p className="text-sm font-bold text-white uppercase tracking-tight">{lojista?.storeName || 'PARCEIRO EXCLUÍDO'}</p>
                                 <p className="text-[9px] text-gray-500 uppercase mt-0.5">{lojista?.name}</p>
                              </td>
                              <td className="p-5">
                                 <p className="text-sm font-black text-[#3b82f6] italic">R$ {sale.total.toFixed(2)}</p>
                              </td>
                              <td className="p-5 text-right">
                                 <p className="text-sm font-black text-emerald-500 italic">R$ {(sale.totalProfit || 0).toFixed(2)}</p>
                              </td>
                           </tr>
                         );
                      })}
                      {sales.filter(s => s.paymentMethod === 'ACERTO LOJISTA').length === 0 && (
                        <tr>
                          <td colSpan={4} className="p-20 text-center">
                             <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] italic">Nenhum histórico de acerto disponível</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                </table>
               </div>
            </div>
          </div>
        )}
      </div>

      {/* Forms Modals */}
      <AnimatePresence>
        {showShopkeeperForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-[#0a0e1a] border border-[#1e2a4a] w-full max-w-2xl max-h-[95vh] overflow-y-auto p-8 rounded-2xl shadow-2xl space-y-8">
               <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-xl font-bold text-white uppercase">
                      {isViewing ? 'Detalhes do Lojista' : editingShopkeeperId ? 'Editar Lojista' : 'Novo Lojista'}
                    </h4>
                    <p className="text-xs text-gray-500 uppercase font-bold mt-1">Cadastro de Parceiros</p>
                  </div>
                  <button onClick={() => setShowShopkeeperForm(false)} className="p-2 text-gray-500 hover:text-white transition-all">
                     <X size={24} />
                  </button>
               </div>

               <form onSubmit={handleSaveShopkeeper} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block ml-1">Loja / Estabelecimento</label>
                        <input 
                           readOnly={isViewing}
                           placeholder="EX: FARMÁCIA CENTRAL"
                           className="w-full bg-[#0d1321] border border-[#1e2a4a] rounded-xl p-4 text-white outline-none focus:border-[#3b82f6] transition-all placeholder:text-white/5 uppercase font-medium"
                           value={newShopkeeper.storeName}
                           onChange={e => setNewShopkeeper({...newShopkeeper, storeName: e.target.value})}
                           required
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block ml-1">Responsável / Contato</label>
                        <input 
                           readOnly={isViewing}
                           placeholder="EX: JOÃO DA SILVA"
                           className="w-full bg-[#0d1321] border border-[#1e2a4a] rounded-xl p-4 text-white outline-none focus:border-[#3b82f6] transition-all placeholder:text-white/5 uppercase font-medium"
                           value={newShopkeeper.name}
                           onChange={e => setNewShopkeeper({...newShopkeeper, name: e.target.value})}
                           required
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block ml-1">CPF / CNPJ (Opcional)</label>
                        <input 
                           readOnly={isViewing}
                           placeholder="00.000.000/0000-00 (OPCIONAL)"
                           className="w-full bg-[#0d1321] border border-[#1e2a4a] rounded-xl p-4 text-white outline-none focus:border-[#3b82f6] transition-all placeholder:text-white/5 uppercase font-medium"
                           value={newShopkeeper.taxId}
                           onChange={e => setNewShopkeeper({...newShopkeeper, taxId: e.target.value})}
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block ml-1">Telefone / WhatsApp</label>
                        <input 
                           readOnly={isViewing}
                           placeholder="(00) 00000-0000"
                           className="w-full bg-[#0d1321] border border-[#1e2a4a] rounded-xl p-4 text-white outline-none focus:border-[#3b82f6] transition-all placeholder:text-white/5 uppercase font-medium"
                           value={newShopkeeper.phone}
                           onChange={e => setNewShopkeeper({...newShopkeeper, phone: maskPhone(e.target.value)})}
                           required
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block ml-1">CEP</label>
                        <input 
                           readOnly={isViewing}
                           placeholder="00000-000"
                           className="w-full bg-[#0d1321] border border-[#1e2a4a] rounded-xl p-4 text-white outline-none focus:border-[#3b82f6] transition-all placeholder:text-white/5 uppercase font-medium"
                           value={newShopkeeper.cep}
                           onChange={e => setNewShopkeeper({...newShopkeeper, cep: e.target.value})}
                        />
                     </div>
                     <div className="space-y-2 md:col-span-2">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block ml-1">Endereço Completo</label>
                        <input 
                           readOnly={isViewing}
                           placeholder="RUA, NÚMERO, BAIRRO, CIDADE - UF"
                           className="w-full bg-[#0d1321] border border-[#1e2a4a] rounded-xl p-4 text-white outline-none focus:border-[#3b82f6] transition-all placeholder:text-white/5 uppercase font-medium"
                           value={newShopkeeper.address}
                           onChange={e => setNewShopkeeper({...newShopkeeper, address: e.target.value})}
                        />
                     </div>
                     <div className="space-y-2 md:col-span-2">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block ml-1">Observações</label>
                        <textarea 
                           readOnly={isViewing}
                           placeholder="OBSERVAÇÕES ADICIONAIS..."
                           rows={3}
                           className="w-full bg-[#0d1321] border border-[#1e2a4a] rounded-xl p-4 text-white outline-none focus:border-[#3b82f6] transition-all placeholder:text-white/5 uppercase font-medium resize-none"
                           value={newShopkeeper.observations}
                           onChange={e => setNewShopkeeper({...newShopkeeper, observations: e.target.value})}
                        />
                     </div>
                  </div>
                  {!isViewing && (
                    <div className="pt-4">
                      <button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="w-full bg-[#3b82f6] hover:bg-[#2563eb] text-white p-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all shadow-xl shadow-blue-500/20 active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-wait"
                      >
                        {isSubmitting ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Processando...</span>
                          </>
                        ) : (
                          editingShopkeeperId ? 'Salvar Edição' : 'Finalizar Cadastro'
                        )}
                      </button>
                    </div>
                  )}
               </form>
            </motion.div>
          </motion.div>
        )}

        {showDeliveryForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.form 
              onSubmit={e => {
                e.preventDefault();
                handleSaveDelivery();
              }}
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="glass-panel border-white/10 w-full max-w-4xl max-h-[95vh] overflow-y-auto p-10 custom-scrollbar space-y-10 shadow-2xl bg-zinc-900/90 backdrop-blur-2xl font-black"
            >
               <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-2xl font-black text-white uppercase tracking-tight leading-tight italic">Nova Entrega</h4>
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mt-2">Selecione o parceiro e monte a grade</p>
                  </div>
                  <button type="button" onClick={() => setShowDeliveryForm(false)} className="p-3 glass-card border-white/5 text-white/40 hover:text-white transition-all shadow-lg">
                     <X size={24} />
                  </button>
               </div>

               <div className="space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                     <div className="space-y-4">
                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Selecione o Lojista</label>
                        <select 
                           className="w-full glass-input cursor-pointer appearance-none shadow-xl"
                           value={selectedLojistaId}
                           onChange={e => setSelectedLojistaId(e.target.value)}
                           required
                        >
                           <option value="">-- Escolha um Parceiro --</option>
                           {shopkeepers.map(s => (
                             <option key={s.id} value={s.id}>{s.storeName.toUpperCase()} ({s.name.toUpperCase()})</option>
                           ))}
                        </select>
                     </div>
                     <div className="flex flex-col justify-end">
                          <div className="p-6 glass-panel border-blue-500/20 bg-blue-600/10 text-center shadow-xl shadow-blue-500/10">
                             <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Total da Entrega</p>
                             <p className="text-2xl font-black text-emerald-400 italic">
                                R$ {deliveryCart.reduce((acc, item) => {
                                 const p = products.find(prod => prod.id === item.productId);
                                 return acc + (item.quantity * (p?.shopkeeperPrice || p?.price || 0));
                               }, 0).toFixed(2)}
                             </p>
                          </div>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                     <div className="space-y-6">
                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Buscar Produtos</label>
                        <div className="relative group">
                          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-blue-400 transition-colors" size={18} />
                          <input 
                            placeholder="Nome, SKU ou ID..." 
                            className="w-full pl-14 pr-6 py-4 glass-input shadow-xl"
                            value={deliveryProductSearch}
                            onChange={e => setDeliveryProductSearch(e.target.value)}
                          />
                        </div>
                        <div className="max-h-[50vh] overflow-y-auto pr-4 custom-scrollbar space-y-3">
                           {deliveryProductSearch.length >= 2 && products.filter(p => 
                             !deliveryCart.find(ci => ci.productId === p.id) && 
                             (p.name.toLowerCase().includes(deliveryProductSearch.toLowerCase()) || 
                              p.sku?.toLowerCase().includes(deliveryProductSearch.toLowerCase()) ||
                              p.barcode?.toLowerCase().includes(deliveryProductSearch.toLowerCase()) ||
                              p.id.toLowerCase().includes(deliveryProductSearch.toLowerCase())) && 
                             p.stock > 0
                           ).map(p => (
                             <button
                                type="button"
                                key={p.id}
                                onClick={() => {
                                  setDeliveryCart([...deliveryCart, { productId: p.id, quantity: 1 }]);
                                  setDeliveryProductSearch('');
                                }}
                                className="w-full flex items-center justify-between p-4 glass-panel border-white/5 hover:bg-white/10 transition-all text-left group"
                             >
                                <div className="flex items-center gap-4">
                                   <div className="w-10 h-10 glass-card border-white/10 flex items-center justify-center text-white/60 group-hover:text-white transition-colors">
                                      <Package size={18} />
                                   </div>
                                   <div>
                                      <p className="text-[10px] font-black text-white uppercase truncate leading-tight">{p.name}</p>
                                      <p className="text-[8px] font-black text-white/40 uppercase tracking-widest mt-1">Estoque: {p.stock} | R$ {(p.shopkeeperPrice || p.price).toFixed(2)}</p>
                                   </div>
                                </div>
                                <Plus size={16} className="text-white/20 group-hover:text-emerald-400 transition-colors" />
                             </button>
                           ))}
                           {deliveryProductSearch.length >= 2 && products.filter(p => 
                             !deliveryCart.find(ci => ci.productId === p.id) && 
                             (p.name.toLowerCase().includes(deliveryProductSearch.toLowerCase()) || 
                              p.sku?.toLowerCase().includes(deliveryProductSearch.toLowerCase()) ||
                              p.barcode?.toLowerCase().includes(deliveryProductSearch.toLowerCase()) ||
                              p.id.toLowerCase().includes(deliveryProductSearch.toLowerCase())) && 
                             p.stock > 0
                           ).length === 0 && (
                             <p className="text-[10px] text-center text-white/20 font-black uppercase py-8">Nenhum produto encontrado</p>
                           )}
                           {deliveryProductSearch.length < 2 && deliveryProductSearch.length > 0 && (
                             <p className="text-[10px] text-center text-white/40 font-black uppercase py-8 italic tracking-widest">Digite mais caracteres...</p>
                           )}
                        </div>
                     </div>

                     <div className="space-y-6">
                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Grade da Entrega</label>
                        <div className="max-h-80 overflow-y-auto pr-4 no-scrollbar space-y-4">
                           {deliveryCart.map(item => {
                             const p = products.find(prod => prod.id === item.productId);
                             return (
                               <div key={item.productId} className="p-5 glass-panel border-white/5 flex items-center justify-between shadow-lg hover:bg-white/5 transition-all">
                                  <div className="flex-1 min-w-0">
                                     <p className="text-[11px] font-black text-white uppercase truncate leading-tight mb-1">{p?.name}</p>
                                     <p className="text-[8px] font-black text-white/40 uppercase tracking-widest leading-none">R$ {(p?.shopkeeperPrice || p?.price || 0).toFixed(2)} / un</p>
                                  </div>
                                  <div className="flex items-center gap-4">
                                     <div className="flex items-center glass-card border-white/10 p-1">
                                        <button type="button" onClick={() => setDeliveryCart(prev => prev.map(i => i.productId === item.productId ? { ...i, quantity: Math.max(1, i.quantity - 1) } : i))} className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-all">
                                           <Minus size={12} />
                                        </button>
                                        <input 
                                           className="w-10 bg-transparent text-center text-xs font-black text-white outline-none"
                                           value={item.quantity}
                                           onChange={e => {
                                             const val = parseInt(e.target.value) || 1;
                                             setDeliveryCart(prev => prev.map(i => i.productId === item.productId ? { ...i, quantity: Math.min(p?.stock || 0, val) } : i));
                                           }}
                                        />
                                        <button type="button" onClick={() => setDeliveryCart(prev => prev.map(i => i.productId === item.productId ? { ...i, quantity: Math.min(p?.stock || 0, i.quantity + 1) } : i))} className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-all">
                                           <Plus size={12} />
                                        </button>
                                     </div>
                                     <button type="button" onClick={() => setDeliveryCart(deliveryCart.filter(i => i.productId !== item.productId))} className="p-2 text-white/20 hover:text-red-400 transition-all">
                                        <Trash2 size={20} />
                                     </button>
                                  </div>
                               </div>
                             );
                           })}
                           {deliveryCart.length === 0 && (
                             <div className="p-12 glass-panel border-dashed border-white/10 text-center flex flex-col items-center justify-center">
                                <Package className="text-white/10 mb-4" size={40} />
                                <p className="text-[10px] font-black text-white/20 uppercase tracking-widest italic">A grade está vazia</p>
                             </div>
                           )}
                        </div>
                     </div>
                  </div>

                  <button 
                     type="submit"
                     disabled={!selectedLojistaId || deliveryCart.length === 0 || isSubmitting}
                     className="w-full glass-button-primary !bg-blue-600 p-6 !rounded-2xl text-xs font-black uppercase tracking-[0.3em] shadow-xl shadow-blue-500/20 active:scale-[0.98] transition-all disabled:opacity-20 disabled:grayscale disabled:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                  >
                     {isSubmitting ? (
                        <>
                           <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                           <span>Processando Entrega...</span>
                        </>
                     ) : (
                        'Finalizar Entrega e Gerar Termo'
                     )}
                  </button>
               </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  </div>
  );
}
