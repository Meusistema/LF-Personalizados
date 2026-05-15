/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from 'react';
import { generateUniqueId, getDeviceId } from '../lib/persistence';
import { 
  TrendingUp, 
  Package, 
  ShoppingCart, 
  Plus, 
  Trash2, 
  Calendar,
  ArrowUpCircle,
  ArrowDownCircle,
  Target,
  Check,
  X,
  FileText,
  Printer,
  FileDown,
  ChevronLeft,
  AlertTriangle,
  History,
  DollarSign
} from 'lucide-react';
import { PrintService } from '../services/printService';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  Legend
} from 'recharts';

interface FinanceViewProps {
  revenues: any[];
  setRevenues: (r: any[]) => void;
  purchases: any[];
  setPurchases: (p: any[]) => void;
  expenses: any[];
  setExpenses: (e: any[]) => void;
  sales: any[]; // New prop
  rawMaterials: any[];
  setRawMaterials: (rm: any[]) => void;
  productRecipes: any[];
  setProductRecipes: (pr: any[]) => void;
  products: any[];
  addActivity: any;
  setView: (v: any) => void;
  canEdit: boolean;
  currentUser: any | null;
  paymentIcons: Record<string, string>;
}

export function FinanceView({ 
  revenues, 
  setRevenues, 
  purchases, 
  setPurchases, 
  expenses, 
  setExpenses,
  sales,
  rawMaterials,
  setRawMaterials,
  productRecipes,
  setProductRecipes,
  products,
  addActivity,
  setView,
  canEdit,
  currentUser,
  paymentIcons
}: FinanceViewProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'revenues' | 'purchases' | 'expenses' | 'costs' | 'materials'>('overview');
  
  // Date filter states
  const [filterType, setFilterType] = useState<'day' | 'month' | 'year'>('month');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().substring(0, 10)); // YYYY-MM-DD

  // Add state for forms
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);
  const [newPurchase, setNewPurchase] = useState({ itemName: '', quantity: 0, totalValue: 0, rawMaterialId: '' });
  
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [newExpense, setNewExpense] = useState({ description: '', amount: 0, category: 'Outros' });

  // Materials form
  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [newMaterial, setNewMaterial] = useState({ name: '', unitCost: 0, unit: 'g' as any });

  // Recipe selection
  const [editingRecipeProductId, setEditingRecipeProductId] = useState<string | null>(null);

  // Report state
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState<'day' | 'week' | 'month'>('day');
  const [isGenerating, setIsGenerating] = useState(false);

  const isAdmin = useMemo(() => {
    return currentUser?.id === 'admin' || currentUser?.roleId === 'role-gerente';
  }, [currentUser]);

  const getCalculatedReport = () => {
    const now = new Date();
    let start: Date;
    let end: Date = new Date();

    if (selectedReportType === 'day') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    } else if (selectedReportType === 'week') {
      const day = now.getDay();
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day, 0, 0, 0);
    } else {
      // Month: from 1st to current day
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    }

    const startTime = start.getTime();
    const endTime = end.getTime();
    const startStr = start.toISOString().substring(0, 10);
    const endStr = end.toISOString().substring(0, 10);

    const reportSales = sales.filter(s => s.date >= startTime && s.date <= endTime);
    const reportRevenues = revenues.filter(r => r.date.substring(0, 10) >= startStr && r.date.substring(0, 10) <= endStr);
    const reportExpenses = expenses.filter(e => e.date.substring(0, 10) >= startStr && e.date.substring(0, 10) <= endStr);
    const reportPurchases = purchases.filter(p => p.date.substring(0, 10) >= startStr && p.date.substring(0, 10) <= endStr);

    const totalSalesVal = reportSales.filter(s => s.status !== 'cancelado').reduce((acc, s) => acc + s.total, 0);
    const totalReceivedVal = reportRevenues.filter(r => r.status === 'confirmado').reduce((acc, r) => acc + r.amount, 0);
    const totalExpensesVal = reportExpenses.reduce((acc, e) => acc + e.amount, 0);
    const totalPurchasesVal = reportPurchases.reduce((acc, p) => acc + p.totalValue, 0);
    const netTotalVal = totalReceivedVal - totalExpensesVal - totalPurchasesVal;

    const validSales = reportSales.filter(s => s.status !== 'cancelado');
    const canceledCount = reportSales.filter(s => s.status === 'cancelado').length;

    let missingItemsCount = 0;
    let lostValue = 0;

    validSales.forEach(s => {
      if (s.originalItems && s.items) {
        s.originalItems.forEach((oi: any) => {
          const item = s.items.find((i: any) => i.productId === oi.productId);
          const separatedQty = item?.quantity || 0;
          const missing = oi.quantity - separatedQty;
          if (missing > 0) {
            missingItemsCount += missing;
            lostValue += missing * oi.price;
          }
        });
      }
    });

    return {
      type: selectedReportType,
      period: `${start.toLocaleDateString('pt-BR')} até ${end.toLocaleDateString('pt-BR')}`,
      totalSales: totalSalesVal,
      totalReceived: totalReceivedVal,
      totalExpenses: totalExpensesVal,
      totalPurchases: totalPurchasesVal,
      netTotal: netTotalVal,
      orderCount: validSales.length,
      canceledCount,
      missingItemsCount,
      lostValue,
      dateGenerated: now.toLocaleString('pt-BR')
    };
  };

  const renderReportHTML = (data: any) => {
    return `
      <div style="font-family: sans-serif; color: #1a1a1a; padding: 40px; border: 1px solid #eee; border-radius: 20px; background: white;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 50px; border-bottom: 2px solid #f0f0f0; padding-bottom: 30px;">
          <div>
            <h1 style="font-size: 28px; font-weight: 900; margin: 0; text-transform: uppercase; letter-spacing: -1px; color: #000;">Relatório Financeiro</h1>
            <p style="font-size: 11px; font-weight: 800; margin: 5px 0 0; color: #ec4899; text-transform: uppercase; letter-spacing: 2px;">Sistema de Gestão Integrada</p>
          </div>
          <div style="text-align: right;">
            <p style="font-size: 10px; font-weight: 800; color: #999; margin: 0; text-transform: uppercase;">Período</p>
            <p style="font-size: 14px; font-weight: 900; margin: 0; color: #000;">${data.period}</p>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 40px;">
          <div style="background: #f8fafc; padding: 25px; border-radius: 20px; border: 1px solid #f1f5f9;">
            <p style="font-size: 9px; font-weight: 900; color: #64748b; margin: 0 0 10px; text-transform: uppercase; letter-spacing: 1px;">Saldo de Vendas</p>
            <p style="font-size: 20px; font-weight: 900; margin: 0; color: #0f172a;">R$ ${data.totalSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
          <div style="background: #f0fdf4; padding: 25px; border-radius: 20px; border: 1px solid #dcfce7;">
            <p style="font-size: 9px; font-weight: 900; color: #15803d; margin: 0 0 10px; text-transform: uppercase; letter-spacing: 1px;">Total Recebido</p>
            <p style="font-size: 20px; font-weight: 900; margin: 0; color: #166534;">R$ ${data.totalReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
          <div style="background: #fff1f2; padding: 25px; border-radius: 20px; border: 1px solid #ffe4e6;">
            <p style="font-size: 9px; font-weight: 900; color: #be123c; margin: 0 0 10px; text-transform: uppercase; letter-spacing: 1px;">Despesas</p>
            <p style="font-size: 20px; font-weight: 900; margin: 0; color: #9f1239;">R$ ${data.totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
          <div style="background: #fff7ed; padding: 25px; border-radius: 20px; border: 1px solid #ffedd5;">
            <p style="font-size: 9px; font-weight: 900; color: #c2410c; margin: 0 0 10px; text-transform: uppercase; letter-spacing: 1px;">Compras (Custos)</p>
            <p style="font-size: 20px; font-weight: 900; margin: 0; color: #9a3412;">R$ ${data.totalPurchases.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>

        <div style="background: #0f172a; padding: 35px; border-radius: 25px; margin-bottom: 40px; color: white; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <p style="font-size: 10px; font-weight: 900; color: #94a3b8; margin: 0 0 5px; text-transform: uppercase; letter-spacing: 3px;">Resultado Líquido Final</p>
            <p style="font-size: 12px; font-weight: 500; color: #475569; margin: 0;">Valor total em caixa após todas as deduções</p>
          </div>
          <p style="font-size: 36px; font-weight: 900; margin: 0; color: ${data.netTotal >= 0 ? '#4ade80' : '#fb7185'}; font-style: italic;">
            R$ ${data.netTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div style="background: white; border: 1px solid #f1f5f9; border-radius: 25px; overflow: hidden;">
          <div style="background: #f8fafc; padding: 20px 30px; border-bottom: 1px solid #f1f5f9;">
            <h2 style="font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; margin: 0; color: #64748b;">Fluxo Operacional</h2>
          </div>
          <div style="padding: 30px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 40px;">
            <div style="display: flex; flex-direction: column; gap: 15px;">
               <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed #e2e8f0; padding-bottom: 10px;">
                  <span style="font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase;">Quantidade de Pedidos</span>
                  <span style="font-size: 14px; font-weight: 900; color: #0f172a;">${data.orderCount} und</span>
               </div>
               <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed #e2e8f0; padding-bottom: 10px;">
                  <span style="font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase;">Pedidos Cancelados</span>
                  <span style="font-size: 14px; font-weight: 900; color: #ef4444;">${data.canceledCount} und</span>
               </div>
            </div>
            <div style="display: flex; flex-direction: column; gap: 15px;">
               <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed #e2e8f0; padding-bottom: 10px;">
                <span style="font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase;">Produtos Faltantes (Itens)</span>
                <span style="font-size: 14px; font-weight: 900; color: #f59e0b;">${data.missingItemsCount} und</span>
               </div>
               <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed #e2e8f0; padding-bottom: 10px;">
                  <span style="font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase;">Valor Perdido (Faltas)</span>
                  <span style="font-size: 14px; font-weight: 900; color: #ef4444;">R$ ${data.lostValue.toFixed(2)}</span>
               </div>
            </div>
          </div>
        </div>

        <div style="margin-top: 50px; text-align: center; border-top: 1px solid #f0f0f0; padding-top: 30px;">
          <p style="font-size: 9px; font-weight: 700; color: #999; margin: 0; text-transform: uppercase; letter-spacing: 1px;">Gerado em ${data.dateGenerated}</p>
        </div>
      </div>
    `;
  };

  const handleGenerateReport = async (mode: 'print' | 'pdf') => {
    setIsGenerating(true);
    try {
      const reportData = getCalculatedReport();
      const html = renderReportHTML(reportData);
      
      const container = document.getElementById('financial-report-capture');
      if (container) {
        container.innerHTML = html;
        
        const options = {
          format: 'a4' as const,
          orientation: 'portrait' as const,
          fileName: `Relatorio_Financeiro_${selectedReportType}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}`
        };

        if (mode === 'pdf') {
          await PrintService.generatePDF('financial-report-capture', options);
        } else {
          await PrintService.printElement('financial-report-capture', options);
        }
      }
    } catch (err) {
      console.error('Erro ao gerar relatório:', err);
    } finally {
      setIsGenerating(false);
      setShowReportModal(false);
    }
  };

  // Filtering logic
  const filteredRevenues = useMemo(() => {
    return revenues.filter(r => {
      const matchesUser = isAdmin || r.userId === currentUser?.id;
      if (!matchesUser) return false;

      if (filterType === 'day') return r.date.startsWith(selectedDate);
      if (filterType === 'month') return r.date.startsWith(selectedDate.substring(0, 7));
      return r.date.startsWith(selectedDate.substring(0, 4));
    });
  }, [revenues, selectedDate, filterType, isAdmin, currentUser]);

  const filteredPurchases = useMemo(() => {
    return purchases.filter(p => {
      const matchesUser = isAdmin || p.userId === currentUser?.id;
      if (!matchesUser) return false;

      if (filterType === 'day') return p.date.startsWith(selectedDate);
      if (filterType === 'month') return p.date.startsWith(selectedDate.substring(0, 7));
      return p.date.startsWith(selectedDate.substring(0, 4));
    });
  }, [purchases, selectedDate, filterType, isAdmin, currentUser]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const matchesUser = isAdmin || e.userId === currentUser?.id;
      if (!matchesUser) return false;

      if (filterType === 'day') return e.date.startsWith(selectedDate);
      if (filterType === 'month') return e.date.startsWith(selectedDate.substring(0, 7));
      return e.date.startsWith(selectedDate.substring(0, 4));
    });
  }, [expenses, selectedDate, filterType, isAdmin, currentUser]);

  // Calculations
  const totalRevenues = useMemo(() => filteredRevenues.reduce((acc, r) => acc + (r.status === 'confirmado' ? r.amount : 0), 0), [filteredRevenues]);
  const pendingRevenues = useMemo(() => filteredRevenues.reduce((acc, r) => acc + (r.status === 'pendente' ? r.amount : 0), 0), [filteredRevenues]);
  const totalPurchases = useMemo(() => filteredPurchases.reduce((acc, p) => acc + p.totalValue, 0), [filteredPurchases]);
  const totalExpenses = useMemo(() => filteredExpenses.reduce((acc, e) => acc + e.amount, 0), [filteredExpenses]);
  const netProfit = totalRevenues - totalPurchases - totalExpenses;

  const handleAddPurchase = () => {
    if (!newPurchase.itemName || newPurchase.quantity <= 0 || newPurchase.totalValue <= 0) return;
    
    const purchase = {
      id: generateUniqueId('pur'),
      date: new Date().toISOString(),
      userId: currentUser?.id,
      userName: currentUser?.name,
      ...newPurchase,
      updatedAt: Date.now()
    };
    setPurchases([purchase, ...purchases]);

    // If purchase is linked to a raw material, update its unit cost
    if (newPurchase.rawMaterialId) {
      const unitCost = newPurchase.totalValue / newPurchase.quantity;
      setRawMaterials(rawMaterials.map(m => {
        if (m.id === newPurchase.rawMaterialId) {
          const updatedM = { ...m, unitCost, updatedAt: Date.now() };
          return updatedM;
        }
        return m;
      }));
      addActivity('system', 'Custo Atualizado', `Custo do insumo ${newPurchase.itemName} atualizado via compra.`);
    }

    addActivity('system', 'Nova Compra', `Compra de ${newPurchase.itemName} registrada.`);
    setNewPurchase({ itemName: '', quantity: 0, totalValue: 0, rawMaterialId: '' });
    setShowPurchaseForm(false);
  };

  const handleAddExpense = () => {
    if (!newExpense.description || newExpense.amount <= 0) return;
    const expense = {
      id: generateUniqueId('exp'),
      date: new Date().toISOString(),
      userId: currentUser?.id,
      userName: currentUser?.name,
      ...newExpense,
      updatedAt: Date.now()
    };
    setExpenses([expense, ...expenses]);
    addActivity('system', 'Nova Despesa', `Despesa ${newExpense.description} registrada.`);
    setNewExpense({ description: '', amount: 0, category: 'Outros' });
    setShowExpenseForm(false);
  };

  const handleAddMaterial = () => {
    if (!newMaterial.name || newMaterial.unitCost <= 0) return;
    const material = {
      id: generateUniqueId('mat'),
      userId: currentUser?.id,
      userName: currentUser?.name,
      ...newMaterial,
      updatedAt: Date.now(),
      createdAt: Date.now(),
      syncStatus: 'pending',
      deviceId: getDeviceId()
    };
    setRawMaterials([...rawMaterials, material]);
    setNewMaterial({ name: '', unitCost: 0, unit: 'g' });
    setShowMaterialForm(false);
  };

  const updateRecipe = (productId: string, rawMaterialId: string, quantity: number) => {
    const existingRecipe = productRecipes.find(r => r.productId === productId);
    let newRecipes = [];
    
    let targetRecipe: any = null;
    if (existingRecipe) {
      const existingIngredient = existingRecipe.ingredients.find((i: any) => i.rawMaterialId === rawMaterialId);
      let newIngredients = [];
      
      if (quantity === 0) {
        newIngredients = existingRecipe.ingredients.filter((i: any) => i.rawMaterialId !== rawMaterialId);
      } else if (existingIngredient) {
        newIngredients = existingRecipe.ingredients.map((i: any) => i.rawMaterialId === rawMaterialId ? { ...i, quantity } : i);
      } else {
        newIngredients = [...existingRecipe.ingredients, { rawMaterialId, quantity }];
      }
      
      targetRecipe = { ...existingRecipe, ingredients: newIngredients, updatedAt: Date.now() };
      newRecipes = productRecipes.map(r => r.productId === productId ? targetRecipe : r);
    } else {
      if (quantity > 0) {
        targetRecipe = { 
          id: generateUniqueId('rec'), 
          productId, 
          ingredients: [{ rawMaterialId, quantity }], 
          updatedAt: Date.now(),
          createdAt: Date.now(),
          syncStatus: 'pending',
          deviceId: getDeviceId()
        };
        newRecipes = [...productRecipes, targetRecipe];
      } else {
        newRecipes = productRecipes;
      }
    }
    setProductRecipes(newRecipes);
  };

  const COLORS = ['#5d5dff', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  const chartData = useMemo(() => [
    { name: 'Receitas', value: totalRevenues },
    { name: 'Compras', value: totalPurchases },
    { name: 'Despesas', value: totalExpenses }
  ], [totalRevenues, totalPurchases, totalExpenses]);

  return (
    <div className="fixed inset-0 z-[200] bg-[#0a1628] text-white p-2 md:p-4 font-sans flex flex-col overflow-hidden">
      {/* Header Padrao */}
      <div className="flex items-center justify-between mb-2 shrink-0 px-2 md:px-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => window.history.back()}
            className="w-10 h-10 rounded-xl bg-[#1a2744] flex items-center justify-center border border-white/5 hover:bg-[#1a2744]/80 transition-all cursor-pointer group"
          >
            <X className="w-5 h-5 text-[#64748b] group-hover:text-white" />
          </button>
          <div>
            <h2 className="text-lg md:text-xl font-black text-white uppercase italic leading-none">Centro Financeiro</h2>
            <p className="text-[9px] font-black text-pink-500 uppercase tracking-widest mt-1">Gestão de Fluxo & Rentabilidade</p>
          </div>
        </div>
      </div>

      {/* Navegação e Filtros Fixos */}
      <div className="shrink-0 space-y-2 mb-2">
        <div className="flex flex-col items-center gap-4">
          <div className="flex overflow-x-auto no-scrollbar justify-start md:justify-center gap-2 bg-[#0d1c30] rounded-2xl p-2 w-full max-w-4xl border border-white/5 shadow-inner">
            {[
              { id: 'overview', label: 'Dashboard', icon: TrendingUp },
              { id: 'revenues', label: 'Receitas', icon: ArrowUpCircle },
              { id: 'purchases', label: 'Compras', icon: ShoppingCart },
              { id: 'expenses', label: 'Despesas', icon: ArrowDownCircle },
              { id: 'materials', label: 'Insumos', icon: Package },
              { id: 'costs', label: 'Custos', icon: Target }
            ].map(t => (
              <button 
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`px-4 py-2.5 rounded-xl text-[9px] whitespace-nowrap font-black uppercase tracking-widest transition-all flex items-center gap-2 border ${activeTab === t.id ? 'bg-pink-600 text-white border-pink-500 shadow-lg' : 'bg-transparent text-[#64748b] border-transparent hover:text-white'}`}
              >
                <t.icon size={12} />
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 w-full px-2">
            <div className="flex bg-[#0d1c30] p-1 rounded-xl border border-white/5 w-full max-w-[240px]">
              {[
                { id: 'day', label: 'Dia' },
                { id: 'month', label: 'Mês' },
                { id: 'year', label: 'Ano' }
              ].map(type => (
                <button
                  key={type.id}
                  onClick={() => setFilterType(type.id as any)}
                  className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${filterType === type.id ? 'bg-pink-600/20 text-pink-400 shadow-sm' : 'text-[#64748b] hover:text-white'}`}
                >
                  {type.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 bg-[#0d1c30] px-4 py-2 rounded-xl border border-white/5">
              <Calendar size={14} className="text-[#64748b]" />
              {filterType === 'day' && (
                <input 
                  type="date" 
                  value={selectedDate} 
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="text-[10px] font-black uppercase outline-none bg-transparent text-white"
                />
              )}
              {filterType === 'month' && (
                <input 
                  type="month" 
                  value={selectedDate.substring(0, 7)} 
                  onChange={(e) => setSelectedDate(e.target.value + '-01')}
                  className="text-[10px] font-black uppercase outline-none bg-transparent text-white"
                />
              )}
              {filterType === 'year' && (
                <input 
                  type="number" 
                  min="2000" 
                  max="2100"
                  value={selectedDate.substring(0, 4)} 
                  onChange={(e) => setSelectedDate(e.target.value + '-01-01')}
                  className="text-[10px] font-black uppercase outline-none bg-transparent text-white w-16"
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo com Scroll Interno */}
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
        {activeTab === 'overview' && (
          <div className="space-y-4 pb-12">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-[#1a2744] p-4 rounded-xl border border-white/5">
                <p className="text-[8px] font-black text-[#64748b] uppercase tracking-widest mb-1">Receita</p>
                <p className="text-xl font-black text-white italic">R$ {totalRevenues.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                <p className="text-[7px] font-bold text-pink-500/50 mt-1 uppercase">Pendente: R$ {pendingRevenues.toFixed(2)}</p>
              </div>
              <div className="bg-[#1a2744] p-4 rounded-xl border border-white/5">
                <p className="text-[8px] font-black text-[#64748b] uppercase tracking-widest mb-1">Compras</p>
                <p className="text-xl font-black text-pink-500 italic">R$ {totalPurchases.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="bg-[#1a2744] p-4 rounded-xl border border-white/5">
                <p className="text-[8px] font-black text-[#64748b] uppercase tracking-widest mb-1">Despesas</p>
                <p className="text-xl font-black text-red-400 italic">R$ {totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="bg-[#1a2744] p-4 rounded-xl border border-white/5">
                <p className="text-[8px] font-black text-[#64748b] uppercase tracking-widest mb-1">Resultado</p>
                <p className={`text-xl font-black italic ${netProfit >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                  R$ {netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-[#0d1c30] p-6 rounded-xl border border-white/5 min-h-[300px]">
                <h4 className="text-[9px] font-black uppercase text-[#64748b] mb-4 tracking-widest">Distribuição</h4>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {chartData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0d1c30', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                        itemStyle={{ color: '#fff', fontSize: '10px', textTransform: 'uppercase', fontWeight: '900' }}
                      />
                      <Legend verticalAlign="bottom" height={36} formatter={(value) => <span className="text-[#64748b] text-[8px] font-black uppercase ml-1">{value}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-[#0d1c30] p-6 rounded-xl border border-white/5">
                <h4 className="text-[9px] font-black uppercase text-[#64748b] mb-4 tracking-widest">Lançamentos Recentes</h4>
                <div className="space-y-2">
                  {[...filteredPurchases, ...filteredExpenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-white/5">
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-lg ${(item as any).itemName ? 'bg-pink-500/10 text-pink-400' : 'bg-red-500/10 text-red-400'}`}>
                          {(item as any).itemName ? <ShoppingCart size={12} /> : <ArrowDownCircle size={12} />}
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase text-white">{(item as any).itemName || (item as any).description}</p>
                          <p className="text-[8px] font-medium text-[#64748b] uppercase">{new Date(item.date).toLocaleDateString('pt-BR')}</p>
                        </div>
                      </div>
                      <p className={`text-[10px] font-black ${(item as any).itemName ? 'text-pink-400' : 'text-red-400'}`}>
                        R$ {((item as any).totalValue || (item as any).amount).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}


      {activeTab === 'revenues' && (
        <div className="glass-panel overflow-hidden border-white/10 text-white">
          <div className="p-6 border-b border-white/10 flex flex-col md:flex-row justify-between items-center bg-white/5 gap-4">
            <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest">
              Histórico de Receitas ({filterType === 'day' ? selectedDate : filterType === 'month' ? selectedDate.substring(0, 7) : selectedDate.substring(0, 4)})
            </h4>
            <div className="flex flex-wrap gap-2 justify-center">
               <button 
                 onClick={() => setShowReportModal(true)}
                 className="flex items-center gap-2 px-4 py-2 border border-pink-500/30 bg-pink-500/10 text-pink-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-pink-500/20 transition-all active:scale-95 shadow-lg shadow-pink-500/5 mb-4 md:mb-0"
               >
                 <FileText size={14} /> Gerar Relatório
               </button>
               <span className="bg-emerald-500/10 text-emerald-400 text-[9px] font-black px-3 py-1.5 rounded-lg uppercase border border-emerald-500/20">CONFIRMADO: R$ {totalRevenues.toFixed(2)}</span>
               <span className="bg-orange-500/10 text-orange-400 text-[9px] font-black px-3 py-1.5 rounded-lg uppercase border border-orange-500/20">PENDENTE: R$ {pendingRevenues.toFixed(2)}</span>
            </div>
          </div>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/5 border-b border-white/10 text-[10px] font-black text-white/30 uppercase tracking-widest">
                  <th className="px-6 py-4">Data</th>
                  <th className="px-6 py-4">ID Pedido</th>
                  <th className="px-6 py-4">Método</th>
                  <th className="px-6 py-4">Valor</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredRevenues.length > 0 ? filteredRevenues.map(r => (
                  <tr key={r.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 text-xs font-black text-white/60">{new Date(r.date).toLocaleString('pt-BR')}</td>
                    <td className="px-6 py-4 text-xs font-black text-blue-400 uppercase">#{r.saleId.substring(0, 8)}</td>
                    <td className="px-6 py-4 text-[10px] font-black text-white/80 uppercase italic">
                      <div className="flex items-center gap-2">
                        {r.paymentMethod && <span className="text-sm shrink-0">{paymentIcons[r.paymentMethod] || '📦'}</span>}
                        {r.paymentMethod || '---'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-black text-white">R$ {r.amount.toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-lg border ${
                        r.status === 'confirmado' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        r.status === 'cancelado' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                        'bg-orange-500/10 text-orange-400 border-orange-500/20'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={5} className="px-6 py-20 text-center text-white/20 italic text-xs font-black uppercase">Nenhuma receita para este mês</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="md:hidden divide-y divide-white/10">
             {filteredRevenues.length > 0 ? filteredRevenues.map(r => (
               <div key={r.id} className="p-4 space-y-3 hover:bg-white/5">
                 <div className="flex justify-between items-start">
                   <div>
                     <p className="text-[10px] font-black text-white/30 uppercase tracking-widest leading-none mb-1">Data/Hora</p>
                     <p className="text-xs font-black text-white/80">{new Date(r.date).toLocaleString('pt-BR')}</p>
                   </div>
                   <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-lg border ${
                        r.status === 'confirmado' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        r.status === 'cancelado' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                        'bg-orange-500/10 text-orange-400 border-orange-500/20'
                      }`}>
                        {r.status}
                   </span>
                 </div>
                 <div className="flex justify-between items-end">
                   <div>
                     <p className="text-[10px] font-black text-white/30 uppercase tracking-widest leading-none mb-1">ID Pedido / Método</p>
                     <p className="text-xs font-black text-blue-400">#{r.saleId.substring(0, 8)} <span className="text-[9px] text-white/40 italic">({paymentIcons[r.paymentMethod] || '📦'} {r.paymentMethod || '---'})</span></p>
                   </div>
                   <div className="text-right">
                     <p className="text-[10px] font-black text-white/30 uppercase tracking-widest leading-none mb-1">Valor</p>
                     <p className="text-sm font-black text-white">R$ {r.amount.toFixed(2)}</p>
                   </div>
                 </div>
               </div>
             )) : (
               <div className="p-10 text-center text-white/20 italic text-xs font-black uppercase">Nenhuma receita para este período</div>
             )}
          </div>
        </div>
      )}

      {activeTab === 'purchases' && (
        <div className="space-y-6">
          {canEdit && (
            <button 
              onClick={() => setShowPurchaseForm(true)}
              className="glass-button-primary !from-pink-600 !to-purple-600 px-8 py-5 !rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3 shadow-[0_0_20px_rgba(236,72,153,0.3)]"
            >
              <Plus size={18} /> Registrar Compra
            </button>
          )}

          <AnimatePresence>
            {showPurchaseForm && (
              <motion.form 
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }} 
                exit={{ opacity: 0, scale: 0.95 }} 
                onSubmit={(e: any) => { e.preventDefault(); handleAddPurchase(); }}
                className="glass-panel p-8 !rounded-[2rem] border-white/10 grid grid-cols-1 md:grid-cols-4 gap-6 relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-600" />
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Vincular Insumo (Opcional)</label>
                  <select 
                    className="w-full glass-input p-4 font-black text-xs uppercase"
                    value={newPurchase.rawMaterialId}
                    onChange={e => {
                      const material = rawMaterials.find(m => m.id === e.target.value);
                      setNewPurchase({
                        ...newPurchase, 
                        rawMaterialId: e.target.value,
                        itemName: material ? material.name : newPurchase.itemName
                      });
                    }}
                  >
                    <option value="" className="bg-zinc-900">Nenhum (Item Avulso)</option>
                    {rawMaterials.map(m => (
                      <option key={m.id} value={m.id} className="bg-zinc-900">{m.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Item / Matéria-Prima</label>
                  <input className="w-full glass-input p-4 text-xs font-black uppercase" value={newPurchase.itemName ?? ''} onChange={e => setNewPurchase({...newPurchase, itemName: e.target.value})} placeholder="EX: FILAMENTO PLA" required />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Quantidade</label>
                  <input type="number" className="w-full glass-input p-4 text-xs font-black" value={newPurchase.quantity ?? 0} onChange={e => setNewPurchase({...newPurchase, quantity: parseFloat(e.target.value)})} min="0.01" step="any" required />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Valor Total</label>
                  <div className="flex gap-2">
                    <input type="number" className="flex-1 glass-input p-4 text-xs font-black" value={newPurchase.totalValue ?? 0} onChange={e => setNewPurchase({...newPurchase, totalValue: parseFloat(e.target.value)})} min="0.01" step="any" required />
                    <button type="submit" className="glass-button-primary !bg-emerald-600 p-4 !rounded-xl"><Check size={20} /></button>
                    <button type="button" onClick={() => setShowPurchaseForm(false)} className="glass-button-secondary p-4 !rounded-xl"><X size={20} /></button>
                  </div>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          <div className="glass-panel overflow-hidden border-white/10">
            <div className="p-6 border-b border-white/10 flex flex-col md:flex-row justify-between items-center bg-orange-600/5 gap-4">
              <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                Histórico de Compras ({filterType === 'day' ? selectedDate : filterType === 'month' ? selectedDate.substring(0, 7) : selectedDate.substring(0, 4)})
              </h4>
              <span className="bg-orange-600/10 text-orange-400 text-[9px] font-black px-3 py-1.5 rounded-lg uppercase border border-orange-600/20">TOTAL: R$ {totalPurchases.toFixed(2)}</span>
            </div>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10 text-[10px] font-black text-white/30 uppercase tracking-widest">
                    <th className="px-6 py-4">Data</th>
                    <th className="px-6 py-4">Item</th>
                    <th className="px-6 py-4 text-center">Insumo</th>
                    <th className="px-6 py-4">Quantidade</th>
                    <th className="px-6 py-4">Valor Total</th>
                    <th className="px-6 py-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {filteredPurchases.length > 0 ? filteredPurchases.map(p => (
                    <tr key={p.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 text-xs font-black text-white/20">{new Date(p.date).toLocaleDateString('pt-BR')}</td>
                      <td className="px-6 py-4 text-xs font-black uppercase text-white">{p.itemName}</td>
                      <td className="px-6 py-4 text-center font-black">
                        {p.rawMaterialId ? (
                           <span className="text-[8px] font-black uppercase bg-blue-600/10 text-blue-400 px-2 py-1 rounded border border-blue-600/20">VINCULADO</span>
                        ) : (
                           <span className="text-[8px] font-black uppercase bg-white/5 text-white/20 px-2 py-1 rounded border border-white/10">AVULSO</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs font-black text-white/60">{p.quantity}</td>
                      <td className="px-6 py-4 text-xs font-black text-orange-400">R$ {p.totalValue.toFixed(2)}</td>
                      <td className="px-6 py-4 text-right">
                        {canEdit && (
                          <button onClick={() => {
                            setPurchases(purchases.filter(x => x.id !== p.id));
                          }} className="text-white/20 hover:text-red-400 transition-colors hover:scale-110"><Trash2 size={16} /></button>
                        )}
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={6} className="px-6 py-20 text-center text-white/20 italic text-xs font-black uppercase">Nenhuma compra para este mês</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-white/10">
               {filteredPurchases.length > 0 ? filteredPurchases.map(p => (
                 <div key={p.id} className="p-4 space-y-3 hover:bg-white/5 transition-colors">
                   <div className="flex justify-between items-start">
                     <div>
                       <p className="text-[10px] font-black text-white/30 uppercase tracking-widest leading-none mb-1">Data</p>
                       <p className="text-xs font-black text-white/80">{new Date(p.date).toLocaleDateString('pt-BR')}</p>
                     </div>
                     {p.rawMaterialId ? (
                        <span className="text-[7px] font-black uppercase bg-blue-600/10 text-blue-400 px-1.5 py-0.5 rounded border border-blue-600/20">VINCULADO</span>
                     ) : (
                        <span className="text-[7px] font-black uppercase bg-white/5 text-white/20 px-1.5 py-0.5 rounded border border-white/10">AVULSO</span>
                     )}
                   </div>
                   <div>
                     <p className="text-[10px] font-black text-white/30 uppercase tracking-widest leading-none mb-1">Item</p>
                     <p className="text-xs font-black uppercase text-white">{p.itemName}</p>
                   </div>
                   <div className="flex justify-between items-end">
                     <div>
                       <p className="text-[10px] font-black text-white/30 uppercase tracking-widest leading-none mb-1">Qtd x Valor</p>
                       <p className="text-xs font-black text-white/40">{p.quantity} un - <span className="text-orange-400 font-black">R$ {p.totalValue.toFixed(2)}</span></p>
                     </div>
                     <button onClick={() => {
                       setPurchases(purchases.filter(x => x.id !== p.id));
                     }} className="p-2 text-white/20 hover:text-red-400 glass-card rounded-lg border-white/5 hover:scale-110 transition-all font-black">
                       <Trash2 size={16} />
                     </button>
                   </div>
                 </div>
               )) : (
                 <div className="p-10 text-center text-white/20 italic text-xs font-black uppercase">Nenhuma compra para este período</div>
               )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'expenses' && (
        <div className="space-y-6">
          {canEdit && (
            <button 
              onClick={() => setShowExpenseForm(true)}
              className="glass-button-primary !bg-red-600 px-8 py-5 !rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3"
            >
              <Plus size={18} /> Registrar Despesa
            </button>
          )}

          <AnimatePresence>
            {showExpenseForm && (
              <motion.form 
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }} 
                exit={{ opacity: 0, scale: 0.95 }} 
                onSubmit={(e: any) => { e.preventDefault(); handleAddExpense(); }}
                className="glass-panel p-8 !rounded-[2rem] border-white/10 grid grid-cols-1 md:grid-cols-3 gap-6 relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-1.5 h-full bg-red-600" />
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Descrição</label>
                  <input className="w-full glass-input p-4 font-black text-xs uppercase" value={newExpense.description ?? ''} onChange={e => setNewExpense({...newExpense, description: e.target.value})} placeholder="EX: ALUGUEL, LUZ, ETC." required />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Categoria</label>
                  <select className="w-full glass-input p-4 font-black text-xs uppercase" value={newExpense.category ?? 'Outros'} onChange={e => setNewExpense({...newExpense, category: e.target.value})}>
                    <option className="bg-zinc-900">Fixa</option>
                    <option className="bg-zinc-900">Variável</option>
                    <option className="bg-zinc-900">Impostos</option>
                    <option className="bg-zinc-900">Outros</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Valor</label>
                  <div className="flex gap-2">
                    <input type="number" min="0.01" step="any" className="flex-1 glass-input p-4 text-xs font-black" value={newExpense.amount ?? 0} onChange={e => setNewExpense({...newExpense, amount: parseFloat(e.target.value)})} required />
                    <button type="submit" className="glass-button-primary !bg-red-600 p-4 !rounded-xl"><Check size={20} /></button>
                    <button type="button" onClick={() => setShowExpenseForm(false)} className="glass-button-secondary p-4 !rounded-xl"><X size={20} /></button>
                  </div>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          <div className="glass-panel overflow-hidden border-white/10">
            <div className="p-6 border-b border-white/10 flex flex-col md:flex-row justify-between items-center bg-red-600/5 gap-4 text-white">
              <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                Histórico de Despesas ({filterType === 'day' ? selectedDate : filterType === 'month' ? selectedDate.substring(0, 7) : selectedDate.substring(0, 4)})
              </h4>
              <span className="bg-red-600/10 text-red-400 text-[9px] font-black px-3 py-1.5 rounded-lg uppercase border border-red-600/20">TOTAL: R$ {totalExpenses.toFixed(2)}</span>
            </div>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10 text-[10px] font-black text-white/30 uppercase tracking-widest">
                    <th className="px-6 py-4">Data</th>
                    <th className="px-6 py-4">Descrição</th>
                    <th className="px-6 py-4">Categoria</th>
                    <th className="px-6 py-4">Valor</th>
                    <th className="px-6 py-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {filteredExpenses.length > 0 ? filteredExpenses.map(e => (
                    <tr key={e.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 text-xs font-black text-white/20">{new Date(e.date).toLocaleDateString('pt-BR')}</td>
                      <td className="px-6 py-4 text-xs font-black uppercase text-white">{e.description}</td>
                      <td className="px-6 py-4"><span className="text-[8px] font-black uppercase bg-white/5 text-white/40 px-2 py-1 rounded border border-white/10">{e.category}</span></td>
                      <td className="px-6 py-4 text-xs font-black text-red-400">R$ {e.amount.toFixed(2)}</td>
                      <td className="px-6 py-4 text-right">
                        {canEdit && (
                          <button onClick={() => {
                            setExpenses(expenses.filter(x => x.id !== e.id));
                          }} className="text-white/20 hover:text-red-400 transition-all hover:scale-110"><Trash2 size={16} /></button>
                        )}
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={5} className="px-6 py-20 text-center text-white/20 italic text-xs font-black uppercase">Nenhuma despesa para este mês</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-white/10">
               {filteredExpenses.length > 0 ? filteredExpenses.map(e => (
                 <div key={e.id} className="p-4 space-y-3 hover:bg-white/5 transition-colors">
                   <div className="flex justify-between items-start">
                     <div>
                       <p className="text-[10px] font-black text-white/30 uppercase tracking-widest leading-none mb-1">Data</p>
                       <p className="text-xs font-black text-white/80">{new Date(e.date).toLocaleDateString('pt-BR')}</p>
                     </div>
                     <span className="text-[7px] font-black uppercase bg-white/5 text-white/40 px-1.5 py-0.5 rounded border border-white/10">{e.category}</span>
                   </div>
                   <div>
                     <p className="text-[10px] font-black text-white/30 uppercase tracking-widest leading-none mb-1">Descrição</p>
                     <p className="text-xs font-black uppercase text-white">{e.description}</p>
                   </div>
                   <div className="flex justify-between items-end">
                     <div>
                       <p className="text-[10px] font-black text-white/30 uppercase tracking-widest leading-none mb-1">Valor</p>
                       <p className="text-sm font-black text-red-400">R$ {e.amount.toFixed(2)}</p>
                     </div>
                     <button onClick={() => {
                       setExpenses(expenses.filter(x => x.id !== e.id));
                     }} className="p-2 text-white/20 hover:text-red-400 glass-card rounded-lg border-white/5 hover:scale-110 transition-all">
                       <Trash2 size={16} />
                     </button>
                   </div>
                 </div>
               )) : (
                 <div className="p-10 text-center text-white/20 italic text-xs font-black uppercase">Nenhuma despesa para este período</div>
               )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'materials' && (
        <div className="space-y-6">
          {canEdit && (
            <button 
              onClick={() => setShowMaterialForm(true)}
              className="glass-button-primary !bg-indigo-600 px-8 py-5 !rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3"
            >
              <Plus size={18} /> Cadastrar Insumo (Matéria-prima)
            </button>
          )}

          <AnimatePresence>
            {showMaterialForm && (
              <motion.form 
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }} 
                exit={{ opacity: 0, scale: 0.95 }} 
                onSubmit={(e: any) => { e.preventDefault(); handleAddMaterial(); }}
                className="glass-panel p-8 !rounded-[2rem] border-white/10 grid grid-cols-1 md:grid-cols-3 gap-6 relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-600" />
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Nome do Insumo</label>
                  <input className="w-full glass-input p-4 font-black text-xs uppercase" value={newMaterial.name ?? ''} onChange={e => setNewMaterial({...newMaterial, name: e.target.value})} placeholder="EX: FILAMENTO PLA, RESINA..." required />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Unidade</label>
                  <select className="w-full glass-input p-4 font-black text-xs uppercase text-white" value={newMaterial.unit ?? 'un'} onChange={e => setNewMaterial({...newMaterial, unit: e.target.value as any})}>
                    <option value="g" className="bg-zinc-900">Grama (g)</option>
                    <option value="kg" className="bg-zinc-900">Quilo (kg)</option>
                    <option value="ml" className="bg-zinc-900">Mililitro (ml)</option>
                    <option value="l" className="bg-zinc-900">Litro (l)</option>
                    <option value="un" className="bg-zinc-900">Unidade (un)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Custo p/ Unidade</label>
                  <div className="flex gap-2">
                    <input type="number" min="0.01" step="any" className="flex-1 glass-input p-4 font-black text-xs uppercase" value={newMaterial.unitCost ?? 0} onChange={e => setNewMaterial({...newMaterial, unitCost: parseFloat(e.target.value)})} required />
                    <button type="submit" className="glass-button-primary !bg-indigo-600 p-4 !rounded-xl"><Check size={20} /></button>
                    <button type="button" onClick={() => setShowMaterialForm(false)} className="glass-button-secondary p-4 !rounded-xl"><X size={20} /></button>
                  </div>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          <div className="glass-panel overflow-hidden border-white/10">
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10 text-[10px] font-black text-white/30 uppercase tracking-widest">
                    <th className="px-6 py-4">Insumo</th>
                    <th className="px-6 py-4">Unidade</th>
                    <th className="px-6 py-4">Custo Unitário</th>
                    <th className="px-6 py-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10 text-white">
                  {rawMaterials.length > 0 ? rawMaterials.map(m => (
                    <tr key={m.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 text-xs font-black uppercase text-white">{m.name}</td>
                      <td className="px-6 py-4 text-[10px] font-black text-white/40 uppercase tracking-widest">{m.unit}</td>
                      <td className="px-6 py-4 text-xs font-black text-indigo-400 font-mono italic">R$ {m.unitCost.toFixed(4)}</td>
                        <td className="px-6 py-4 text-right">
                          {canEdit && (
                            <button onClick={() => {
                              setRawMaterials(rawMaterials.filter(x => x.id !== m.id));
                            }} className="text-white/20 hover:text-red-400 transition-all hover:scale-110"><Trash2 size={16} /></button>
                          )}
                        </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={4} className="px-6 py-20 text-center text-white/20 italic text-xs font-black uppercase">Nenhum insumo cadastrado</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-white/10 text-white">
               {rawMaterials.length > 0 ? rawMaterials.map(m => (
                 <div key={m.id} className="p-4 space-y-3 hover:bg-white/5 transition-colors">
                   <div className="flex justify-between items-start">
                     <div>
                       <p className="text-[10px] font-black text-white/40 uppercase tracking-widest leading-none mb-1">Insumo</p>
                       <p className="text-xs font-black uppercase text-white">{m.name}</p>
                     </div>
                     <span className="text-[8px] font-black uppercase bg-white/5 text-white/30 px-2 py-1 rounded border border-white/10">{m.unit}</span>
                   </div>
                   <div className="flex justify-between items-end">
                     <div>
                       <p className="text-[10px] font-black text-white/40 uppercase tracking-widest leading-none mb-1">Custo Unit.</p>
                       <p className="text-xs font-black text-indigo-400 font-mono italic text-[10px]">R$ {m.unitCost.toFixed(4)}</p>
                     </div>
                     <button onClick={() => {
                       setRawMaterials(rawMaterials.filter(x => x.id !== m.id));
                     }} className="p-2 text-white/20 hover:text-red-400 glass-card rounded-lg border-white/5 hover:scale-110 transition-all">
                       <Trash2 size={16} />
                     </button>
                   </div>
                 </div>
               )) : (
                 <div className="p-10 text-center text-white/20 italic text-xs font-black uppercase">Nenhum insumo cadastrado</div>
               )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'costs' && (
        <div className="space-y-6 animate-in fade-in duration-500">
           <div className="glass-panel p-10 !rounded-[3rem] border-white/10">
             <div className="flex justify-between items-center mb-8 pb-4 border-b border-white/10">
               <h4 className="text-[10px] font-black uppercase text-white/40 tracking-widest">Lucratividade e Receitas (Ficha Técnica)</h4>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
               {products.map(p => {
                 const recipe = productRecipes.find(r => r.productId === p.id);
                 const isEditing = editingRecipeProductId === p.id;
                 
                 let calculatedCost = 0;
                 if (recipe) {
                   calculatedCost = recipe.ingredients.reduce((acc: number, ing: any) => {
                     const material = rawMaterials.find(m => m.id === ing.rawMaterialId);
                     return acc + (material ? material.unitCost * ing.quantity : 0);
                   }, 0);
                 } else {
                   calculatedCost = p.costPrice || 0;
                 }
                 const profit = p.price - calculatedCost;
                 const margin = p.price > 0 ? (profit / p.price) * 100 : 0;

                 return (
                   <div key={p.id} className={`p-8 rounded-[2.5rem] border transition-all hover:translate-y-[-4px] group ${isEditing ? 'glass-panel !bg-blue-600/10 border-blue-500/50 shadow-lg shadow-blue-500/10' : 'glass-panel border-white/10 hover:border-white/20'}`}>
                     <div className="flex justify-between items-start mb-6">
                        <div className="min-w-0">
                          <p className="font-black text-white uppercase text-sm truncate">{p.name}</p>
                          <p className="text-[10px] font-black text-white/40 mt-1 uppercase">Preço: R$ {p.price.toFixed(2)}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className={`text-[10px] font-black px-3 py-1.5 rounded-lg border ${margin > 30 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                            {margin.toFixed(1)}%
                          </span>
                          {canEdit && (
                            <button 
                              onClick={() => setEditingRecipeProductId(isEditing ? null : p.id)}
                              className="text-[9px] font-black p-1 text-blue-400 uppercase tracking-widest hover:scale-105 transition-all"
                            >
                              {isEditing ? 'Fechar [X]' : 'Ficha Técnica'}
                            </button>
                          )}
                        </div>
                     </div>

                     {isEditing ? (
                       <div className="space-y-4 pt-6 border-t border-white/10">
                         <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-4">Configuração da Receita</p>
                         <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2 no-scrollbar font-black uppercase">
                           {rawMaterials.map(m => {
                             const ing = recipe?.ingredients.find((i: any) => i.rawMaterialId === m.id);
                             const qty = ing?.quantity || 0;
                             
                             return (
                               <div key={m.id} className="flex items-center justify-between gap-3 p-3 glass-card border-white/5">
                                 <span className="text-[10px] font-black text-white/60 uppercase truncate flex-1">{m.name}</span>
                                 <div className="flex items-center gap-1.5">
                                   <input 
                                     type="number" 
                                     value={qty ?? 0} 
                                     onChange={(e) => updateRecipe(p.id, m.id, parseFloat(e.target.value) || 0)}
                                     className="w-16 p-2 text-[10px] font-black text-right border-b border-white/10 outline-none focus:border-blue-500 bg-white/5 rounded-lg text-white"
                                   />
                                   <span className="text-[9px] font-black text-white/40 uppercase w-4">{m.unit}</span>
                                 </div>
                               </div>
                             );
                           })}
                         </div>
                       </div>
                     ) : (
                       <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-6 font-black">
                          <div className="glass-card p-3 border-white/5">
                             <p className="text-[8px] font-black text-white/40 uppercase tracking-widest mb-1 leading-none">Custo Base</p>
                             <p className="text-xs font-black text-white mb-0 leading-none">R$ {calculatedCost.toFixed(2)}</p>
                          </div>
                          <div className="bg-blue-500/10 p-3 rounded-2xl border border-blue-500/20">
                             <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest mb-1 leading-none">Margem Unit.</p>
                             <p className="text-xs font-black text-blue-400 mb-0 leading-none">R$ {profit.toFixed(2)}</p>
                          </div>
                       </div>
                     )}
                   </div>
                 );
               })}
             </div>
           </div>
        </div>
      )}

      {/* Report Selection Modal */}
      <AnimatePresence>
        {showReportModal && (
          <div className="fixed inset-0 z-[750] flex items-center justify-center p-4 bg-[#0d0a1a]/95 backdrop-blur-xl">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-md bg-[#12122b] rounded-[2.5rem] border border-white/10 shadow-[0_0_100px_rgba(236,72,153,0.1)] p-8 space-y-8"
            >
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-pink-500/10 rounded-2xl flex items-center justify-center mx-auto border border-pink-500/20 mb-4">
                  <FileText size={32} className="text-pink-500" />
                </div>
                <h3 className="text-2xl font-black text-white uppercase italic tracking-tight">Relatório Financeiro</h3>
                <p className="text-[10px] font-bold text-[#64748b] uppercase tracking-[0.3em]">Selecione o período desejado</p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {[
                  { id: 'day', label: 'Fechamento do Dia', sub: 'Dados de hoje' },
                  { id: 'week', label: 'Resumo Semanal', sub: 'Semana atual (Dom-Sab)' },
                  { id: 'month', label: 'Balanço Mensal', sub: 'Do dia 1 até hoje' }
                ].map(type => (
                  <button
                    key={type.id}
                    onClick={() => setSelectedReportType(type.id as any)}
                    className={`p-5 rounded-[1.5rem] border transition-all text-left group flex items-center justify-between ${
                      selectedReportType === type.id 
                        ? 'bg-pink-600/20 border-pink-500 shadow-lg' 
                        : 'bg-white/5 border-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div>
                      <p className={`text-xs font-black uppercase tracking-widest ${selectedReportType === type.id ? 'text-white' : 'text-[#64748b] group-hover:text-white'}`}>
                        {type.label}
                      </p>
                      <p className="text-[9px] font-bold text-pink-500/50 uppercase mt-1 italic">{type.sub}</p>
                    </div>
                    {selectedReportType === type.id && <div className="w-2 h-2 rounded-full bg-pink-500 shadow-[0_0_100px_#ec4899]" />}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4">
                <button 
                  onClick={() => handleGenerateReport('pdf')}
                  disabled={isGenerating}
                  className="flex flex-col items-center gap-3 p-5 bg-white/5 hover:bg-white/10 rounded-[1.5rem] border border-white/5 transition-all group active:scale-95 disabled:opacity-50"
                >
                  <FileDown size={24} className="text-pink-400 group-hover:scale-110 transition-transform" />
                  <span className="text-[9px] font-black uppercase text-white/40 tracking-widest">Gerar PDF</span>
                </button>
                <button 
                  onClick={() => handleGenerateReport('print')}
                  disabled={isGenerating}
                  className="flex flex-col items-center gap-3 p-5 bg-white/5 hover:bg-white/10 rounded-[1.5rem] border border-white/5 transition-all group active:scale-95 disabled:opacity-50"
                >
                  <Printer size={24} className="text-blue-400 group-hover:scale-110 transition-transform" />
                  <span className="text-[9px] font-black uppercase text-white/40 tracking-widest">Imprimir</span>
                </button>
              </div>

              <button 
                onClick={() => setShowReportModal(false)}
                className="w-full py-4 text-[9px] font-black uppercase tracking-[0.4em] text-[#64748b] hover:text-white transition-colors"
              >
                Cancelar Operação
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Hidden Report Container for printing */}
      <div id="financial-report-capture" className="fixed left-[-9999px] top-0 bg-white text-black p-8 font-sans w-[210mm]" style={{ minHeight: '297mm' }}>
         {/* This will be populated dynamically by the generation function */}
      </div>
    </div>
  </div>
  );
};

export default FinanceView;
