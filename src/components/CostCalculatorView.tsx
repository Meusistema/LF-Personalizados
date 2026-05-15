/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, FormEvent } from 'react';
import { generateUniqueId, getDeviceId } from '../lib/persistence';
import { 
  Calculator, 
  Layers, 
  Database, 
  History, 
  Search,
  Plus, 
  Trash2, 
  Save, 
  Package, 
  Zap, 
  ChevronRight, 
  X, 
  ArrowLeft,
  Settings,
  Clock,
  Coins,
  ArrowRight,
  PlusCircle,
  Copy,
  LayoutGrid,
  Info,
  DollarSign,
  BadgeDollarSign,
  CheckCircle,
  Home,
  FolderKanban,
  Upload,
  Lightbulb,
  Box,
  ChevronDown,
  RotateCcw,
  MoreHorizontal,
  FileText,
  Download,
  Percent,
  TrendingUp,
  AlertCircle,
  Printer
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types & Constants ---

const noScrollbarStyle = `
  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
`;

export type CalculatorUnit = 'kg' | 'g' | 'L' | 'ml' | 'unidade' | 'folha' | 'h' | 'min' | 'kWh';
export type CalculatorCategory = 
  | 'Resina' | 'Filamento' | 'Papel' | 'Tinta de Impressora' | 'Tinta Acrílica/Normal' 
  | 'Primer' | 'Verniz' | 'Cola' | 'Energia Elétrica' | 'Desgaste de Máquina' 
  | 'Manutenção' | 'Perdas/Refugo' | 'Margem de Segurança' | 'Mão de Obra' 
  | 'Embalagem' | 'Taxas' | 'Frete' | 'Outros';

export type RootCategory = 'Direto' | 'Indireto' | 'Operacional';

export type CalculationType = 'peso' | 'volume' | 'folha' | 'unidade' | 'tempo' | 'energia';

export interface CalculatorMaterial {
  id: string;
  name: string;
  category: CalculatorCategory;
  rootCategory: RootCategory;
  calcType: CalculationType;
  
  // Purchase/Base data
  buyUnit: CalculatorUnit;
  buyQuantity: number;
  paidAmount: number;
  
  // Specifics
  partsPerUnit?: number; // For 'folha' (Artes por folha)
  potencyWatts?: number; // For 'energia'
  kwhPrice?: number; // For 'energia'
  hourlyRate?: number; // For 'tempo'
  
  // Calculated for display
  unitCost: number; 
  
  updatedAt: number;
  createdAt?: number;
}

export interface ProjectMaterialUsage {
  id: string;
  materialId: string;
  quantityUsed: number; // Weight, Volume, Unit, Parts, or Hours (decimal)
  cost: number;
}

export interface CalculatorProject {
  id: string;
  name: string;
  description?: string;
  usages: ProjectMaterialUsage[];
  totalCost: number;
  margin: number; // Profit margin percentage
  suggestedPrice: number;
  createdAt: number;
  updatedAt: number;
}

interface CostCalculatorViewProps {
  materials: CalculatorMaterial[];
  setMaterials: (m: CalculatorMaterial[]) => void;
  projects: CalculatorProject[];
  setProjects: (p: CalculatorProject[]) => void;
  setView: (v: string) => void;
}

// --- Utils ---

const formatCurrency = (value: number) => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const CATEGORIES: Record<RootCategory, CalculatorCategory[]> = {
  'Direto': ['Resina', 'Filamento', 'Papel', 'Tinta de Impressora', 'Tinta Acrílica/Normal', 'Primer', 'Verniz', 'Cola', 'Outros'],
  'Indireto': ['Energia Elétrica', 'Desgaste de Máquina', 'Manutenção', 'Perdas/Refugo', 'Margem de Segurança'],
  'Operacional': ['Mão de Obra', 'Embalagem', 'Taxas', 'Frete']
};

const GET_ROOT_CAT = (cat: CalculatorCategory): RootCategory => {
  if (CATEGORIES['Direto'].includes(cat)) return 'Direto';
  if (CATEGORIES['Indireto'].includes(cat)) return 'Indireto';
  return 'Operacional';
};

const GET_DEFAULT_TYPE = (cat: CalculatorCategory): CalculationType => {
  if (['Resina', 'Filamento', 'Cola', 'Tinta Acrílica/Normal', 'Primer', 'Verniz'].includes(cat)) return 'peso';
  if (['Tinta de Impressora'].includes(cat)) return 'volume';
  if (['Papel'].includes(cat)) return 'folha';
  if (['Embalagem', 'Taxas', 'Frete'].includes(cat)) return 'unidade';
  if (['Mão de Obra', 'Desgaste de Máquina', 'Manutenção'].includes(cat)) return 'tempo';
  if (['Energia Elétrica'].includes(cat)) return 'energia';
  return 'unidade';
};

const GET_DEFAULT_UNIT = (type: CalculationType): CalculatorUnit => {
  switch (type) {
    case 'peso': return 'kg';
    case 'volume': return 'L';
    case 'folha': return 'folha';
    case 'unidade': return 'unidade';
    case 'tempo': return 'h';
    case 'energia': return 'kWh';
    default: return 'unidade';
  }
};

const CALCULATE_COST = (material: CalculatorMaterial, quantity: number, time?: { h: number, min: number }): number => {
  const price = material.paidAmount;
  const buyQty = material.buyQuantity;
  const buyUnit = material.buyUnit;

  switch (material.calcType) {
    case 'peso':
      // Conversion: 1kg = 1000g
      const costPerGram = buyUnit === 'kg' ? (price / buyQty) / 1000 : (price / buyQty);
      return costPerGram * quantity;
    case 'volume':
      // Conversion: 1L = 1000ml
      const costPerMl = buyUnit === 'L' ? (price / buyQty) / 1000 : (price / buyQty);
      return costPerMl * quantity;
    case 'unidade':
      return (price / buyQty) * quantity;
    case 'folha':
      const costPerPart = (price / buyQty) / (material.partsPerUnit || 1);
      return costPerPart * quantity;
    case 'tempo':
      const totalHours = time ? (time.h + time.min / 60) : quantity;
      return (material.hourlyRate || 0) * totalHours;
    case 'energia':
      const hours = time ? (time.h + time.min / 60) : quantity;
      return ((material.potencyWatts || 0) / 1000) * hours * (material.kwhPrice || 0);
    default:
      return 0;
  }
};

// --- Component ---

export function CostCalculatorView({
  materials,
  setMaterials,
  projects,
  setProjects,
  setView
}: CostCalculatorViewProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'insumos' | 'calculo' | 'historico'>('dashboard');
  
  // Material Form
  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<CalculatorMaterial | null>(null);
  const [materialFormData, setMaterialFormData] = useState({
    name: '',
    category: 'Filamento' as CalculatorCategory,
    calcType: 'peso' as CalculationType,
    buyUnit: 'kg' as CalculatorUnit,
    buyQuantity: 1,
    paidAmount: 0,
    partsPerUnit: 1,
    potencyWatts: 0,
    kwhPrice: 0,
    hourlyRate: 0
  });

  // Calculation State
  const [productName, setProductName] = useState('');
  const [currentUsages, setCurrentUsages] = useState<ProjectMaterialUsage[]>([]);
  const [pendingQuantities, setPendingQuantities] = useState<Record<string, string>>({});
  const [pendingTimes, setPendingTimes] = useState<Record<string, { h: string, min: string }>>({});
  const [profitMargin, setProfitMargin] = useState(100);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [showMaterialSelector, setShowMaterialSelector] = useState(false);
  const [materialSearchQuery, setMaterialSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState<Record<RootCategory, boolean>>({
    Direto: true,
    Indireto: true,
    Operacional: true
  });

  // Stats for Dashboard
  const stats = useMemo(() => {
    const totalInvestedInMaterials = materials.reduce((acc, m) => acc + (m.paidAmount || 0), 0);
    const averageProjectCost = projects.length > 0 
      ? projects.reduce((acc, p) => acc + (p.totalCost || 0), 0) / projects.length 
      : 0;
    
    return {
      totalMaterials: materials.length,
      totalProjects: projects.length,
      investment: totalInvestedInMaterials,
      avgCost: averageProjectCost
    };
  }, [materials, projects]);

  // --- Handlers ---

  const handleSaveMaterial = (e: FormEvent) => {
    e.preventDefault();
    
    if (materialFormData.paidAmount <= 0 && materialFormData.calcType !== 'tempo' && materialFormData.calcType !== 'energia') {
      return alert('O valor pago deve ser maior que zero.');
    }

    const rootCat = GET_ROOT_CAT(materialFormData.category);
    let unitCost = 0;
    
    if (materialFormData.calcType === 'peso') {
        const pricePerPkg = materialFormData.paidAmount / Math.max(materialFormData.buyQuantity, 0.000001);
        unitCost = materialFormData.buyUnit === 'kg' ? pricePerPkg : pricePerPkg * 1000; // Normalized to KG for display
    } else if (materialFormData.calcType === 'volume') {
        const pricePerPkg = materialFormData.paidAmount / Math.max(materialFormData.buyQuantity, 0.000001);
        unitCost = materialFormData.buyUnit === 'L' ? pricePerPkg : pricePerPkg * 1000; // Normalized to L for display
    } else if (materialFormData.calcType === 'unidade') {
        unitCost = materialFormData.paidAmount / Math.max(materialFormData.buyQuantity, 0.000001);
    } else if (materialFormData.calcType === 'folha') {
        const costPerSheet = materialFormData.paidAmount / Math.max(materialFormData.buyQuantity, 0.000001);
        unitCost = costPerSheet / (materialFormData.partsPerUnit || 1);
    } else if (materialFormData.calcType === 'tempo') {
        unitCost = materialFormData.hourlyRate;
    } else if (materialFormData.calcType === 'energia') {
        unitCost = ((materialFormData.potencyWatts || 0) / 1000) * (materialFormData.kwhPrice || 0);
    }

    const newMaterial: CalculatorMaterial = {
      id: editingMaterial?.id || generateUniqueId('mat'),
      name: materialFormData.name,
      category: materialFormData.category,
      rootCategory: rootCat,
      calcType: materialFormData.calcType,
      buyUnit: materialFormData.buyUnit,
      buyQuantity: materialFormData.buyQuantity,
      paidAmount: materialFormData.paidAmount,
      partsPerUnit: materialFormData.partsPerUnit,
      potencyWatts: materialFormData.potencyWatts,
      kwhPrice: materialFormData.kwhPrice,
      hourlyRate: materialFormData.hourlyRate,
      unitCost: unitCost,
      updatedAt: Date.now(),
      createdAt: editingMaterial?.createdAt || Date.now()
    };

    if (editingMaterial) {
      setMaterials(materials.map(m => m.id === editingMaterial.id ? newMaterial : m));
    } else {
      setMaterials([...materials, newMaterial]);
    }

    setShowMaterialForm(false);
    setEditingMaterial(null);
  };

  const handleEditMaterial = (m: CalculatorMaterial) => {
    setEditingMaterial(m);
    setMaterialFormData({
      name: m.name,
      category: m.category,
      calcType: m.calcType || GET_DEFAULT_TYPE(m.category),
      buyUnit: m.buyUnit,
      buyQuantity: m.buyQuantity,
      paidAmount: m.paidAmount,
      partsPerUnit: m.partsPerUnit || 1,
      potencyWatts: m.potencyWatts || 0,
      kwhPrice: m.kwhPrice || 0,
      hourlyRate: m.hourlyRate || 0
    });
    setShowMaterialForm(true);
  };

  const addUsageToProduct = (materialId: string) => {
    const mat = materials.find(m => m.id === materialId);
    if (!mat) return;

    const usageId = generateUniqueId('use');

    setCurrentUsages([...currentUsages, {
      id: usageId,
      materialId,
      quantityUsed: 0,
      cost: 0
    }]);

    setPendingQuantities(prev => ({ ...prev, [usageId]: '' }));
    setPendingTimes(prev => ({ ...prev, [usageId]: { h: '0', min: '0' } }));
  };

  const updateUsageQuantity = (index: number) => {
    const usage = currentUsages[index];
    const mat = materials.find(m => m.id === usage.materialId);
    if (!mat) return;

    let qty = 0;
    if (mat.calcType === 'tempo' || mat.calcType === 'energia') {
      const time = pendingTimes[usage.id] || { h: '0', min: '0' };
      const hours = parseFloat(time.h) || 0;
      const mins = parseFloat(time.min) || 0;
      qty = hours + (mins / 60);
    } else {
      const pendingRaw = pendingQuantities[usage.id] || '0';
      qty = parseFloat(pendingRaw.replace(',', '.')) || 0;
    }

    const updated = currentUsages.map((u, i) => 
      i === index ? { ...u, quantityUsed: qty, cost: CALCULATE_COST(mat, qty) } : u
    );
    setCurrentUsages(updated);
  };

  const removeUsageFromProduct = (index: number) => {
    setCurrentUsages(currentUsages.filter((_, i) => i !== index));
  };

  const duplicateUsage = (index: number) => {
    const usage = currentUsages[index];
    const usageId = generateUniqueId('use');
    const newUsage = { ...usage, id: usageId };
    
    // Copy pending values if they exist
    if (pendingQuantities[usage.id]) {
      setPendingQuantities(prev => ({ ...prev, [usageId]: prev[usage.id] }));
    }
    if (pendingTimes[usage.id]) {
      setPendingTimes(prev => ({ ...prev, [usageId]: { ...prev[usage.id] } }));
    }

    const updated = [...currentUsages];
    updated.splice(index + 1, 0, newUsage);
    setCurrentUsages(updated);
  };

  const totalProductCost = useMemo(() => {
    return currentUsages.reduce((acc, u) => acc + u.cost, 0);
  }, [currentUsages]);

  const suggestedPrice = totalProductCost * (1 + profitMargin / 100);

  const handleSaveProject = () => {
    if (!productName) return alert('Por favor, dê um nome ao seu cálculo.');
    if (currentUsages.length === 0) return alert('Adicione pelo menos um custo.');

    const project: CalculatorProject = {
      id: editingProjectId || generateUniqueId('proj'),
      name: productName,
      usages: currentUsages,
      totalCost: totalProductCost,
      margin: profitMargin,
      suggestedPrice: suggestedPrice,
      createdAt: projects.find(p => p.id === editingProjectId)?.createdAt || Date.now(),
      updatedAt: Date.now()
    };

    if (editingProjectId) {
      setProjects(projects.map(p => p.id === editingProjectId ? project : p));
    } else {
      setProjects([...projects, project]);
    }

    resetCalculation();
    setActiveTab('historico');
  };

  const resetCalculation = () => {
    setProductName('');
    setCurrentUsages([]);
    setPendingQuantities({});
    setPendingTimes({});
    setProfitMargin(100);
    setEditingProjectId(null);
  };

  const loadProjectForEdit = (p: CalculatorProject) => {
    // Ensure every usage has a unique ID (for older data support)
    const usagesWithIds = (p.usages || []).map(u => ({
      ...u,
      id: u.id || generateUniqueId('use')
    }));

    setProductName(p.name);
    setCurrentUsages(usagesWithIds);
    const initialPending: Record<string, string> = {};
    const initialTimes: Record<string, { h: string, min: string }> = {};
    
    usagesWithIds.forEach(u => {
      const mat = materials.find(m => m.id === u.materialId);
      if (mat) {
        if (mat.calcType === 'tempo' || mat.calcType === 'energia') {
          const totalHours = u.quantityUsed;
          const h = Math.floor(totalHours);
          const min = Math.round((totalHours - h) * 60);
          initialTimes[u.id] = { h: h.toString(), min: min.toString() };
        } else {
          initialPending[u.id] = u.quantityUsed.toString();
        }
      }
    });
    
    setPendingQuantities(initialPending);
    setPendingTimes(initialTimes);
    setProfitMargin(p.margin);
    setEditingProjectId(p.id);
    setActiveTab('calculo');
  };

  // --- Components ---

  const MaterialCard: React.FC<{ material: CalculatorMaterial }> = ({ material }) => {
    return (
      <div className="bg-[#0d1c30] p-4 rounded-2xl border border-white/5 flex flex-col gap-3 group hover:border-indigo-500/30 transition-all">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <Package size={18} />
            </div>
            <div className="min-w-0">
              <h4 className="text-[11px] font-black text-white uppercase italic truncate max-w-[120px]">{material.name}</h4>
              <div className="flex items-center gap-2">
                <span className="text-[8px] font-bold text-white/40 uppercase tracking-widest">{material.category}</span>
                <span className="text-[7px] font-black bg-indigo-500/20 text-indigo-400 px-1 rounded uppercase">{material.calcType}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => handleEditMaterial(material)} className="p-2 bg-white/5 text-white/40 hover:text-white rounded-lg transition-all">
              <Settings size={14} />
            </button>
            <button onClick={() => setMaterials(materials.filter(m => m.id !== material.id))} className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-all">
              <Trash2 size={14} />
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
          <div className="space-y-1">
            <p className="text-[8px] font-bold text-white/20 uppercase tracking-widest">Base de Custo</p>
            <p className="text-xs font-black text-white italic">
              {material.calcType === 'tempo' ? `${formatCurrency(material.hourlyRate || 0)}/h` : 
               material.calcType === 'energia' ? `${material.potencyWatts}W • ${formatCurrency(material.kwhPrice || 0)}/kWh` :
               `${material.buyQuantity}${material.buyUnit} • ${formatCurrency(material.paidAmount)}`}
            </p>
          </div>
          <div className="space-y-1 text-right">
            <p className="text-[8px] font-bold text-white/20 uppercase tracking-widest">Custo Unitário</p>
            <p className="text-xs font-black text-emerald-400 italic">
              {formatCurrency(material.unitCost)} / {GET_DEFAULT_UNIT(material.calcType)}
            </p>
          </div>
        </div>

        <div className="bg-black/20 p-2 rounded-xl border border-white/5 flex flex-col justify-center">
          <span className="text-[7px] font-black text-white/20 uppercase tracking-widest">Grupo de Custo</span>
          <span className="text-[10px] font-black text-white italic uppercase">{material.rootCategory}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[200] bg-[#0a1628] text-white p-2 md:p-4 font-sans flex flex-col overflow-hidden">
      <style>{noScrollbarStyle}</style>
      
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0 px-2 md:px-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setView('dashboard')}
            className="w-10 h-10 rounded-xl bg-[#1a2744] flex items-center justify-center border border-white/5 hover:bg-[#1a2744]/80 transition-all cursor-pointer group"
          >
            <ArrowLeft className="w-5 h-5 text-[#64748b] group-hover:text-white" />
          </button>
          <div>
            <h2 className="text-lg md:text-xl font-black text-white uppercase italic leading-none">CUSTEIO & PRODUÇÃO</h2>
            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mt-1">Gestão de Lucratividade</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              setEditingMaterial(null);
              setMaterialFormData({
                name: '',
                category: 'Filamento',
                buyUnit: 'kg',
                buyQuantity: 1,
                paidAmount: 0,
                useUnit: 'g',
                partsPerUnit: 1
              });
              setShowMaterialForm(true);
            }}
            className="h-10 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
          >
            <Plus size={14} />
            <span className="hidden xs:inline">Cadastrar Insumo</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto no-scrollbar shrink-0 mb-4 px-2 md:px-0 border-b border-white/5 pb-2">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
          { id: 'insumos', label: 'Lista de Insumos', icon: Package },
          { id: 'calculo', label: 'Cálculo de Produto', icon: Calculator },
          { id: 'historico', label: 'Histórico', icon: History },
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 h-10 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all shrink-0 ${
              activeTab === tab.id 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                : 'bg-[#1a2744]/40 text-[#64748b] hover:text-white border border-white/5'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-2 md:px-0">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: 'Insumos', value: stats.totalMaterials, icon: Package, color: 'text-blue-400', sub: 'Cadastrados' },
                  { label: 'Cálculos', value: stats.totalProjects, icon: Calculator, color: 'text-indigo-400', sub: 'No Histórico' },
                  { label: 'Investimento', value: formatCurrency(stats.investment), icon: Coins, color: 'text-emerald-400', sub: 'Valor Total' },
                  { label: 'Custo Médio', value: formatCurrency(stats.avgCost), icon: TrendingUp, color: 'text-amber-400', sub: 'P/ Produção' },
                ].map((stat, i) => (
                  <div key={i} className="bg-[#0d1c30] p-4 rounded-xl border border-white/5 flex flex-col gap-1.5">
                    <div className={`p-1.5 w-fit rounded-lg bg-white/5 ${stat.color}`}>
                      <stat.icon size={16} />
                    </div>
                    <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em]">{stat.label}</p>
                    <p className={`text-lg font-black italic ${stat.color}`}>{stat.value}</p>
                    <p className="text-[7px] font-bold text-white/40 uppercase tracking-widest">{stat.sub}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button 
                  onClick={() => setActiveTab('calculo')}
                  className="bg-indigo-600/20 border border-indigo-500/30 p-5 rounded-2xl flex items-center gap-4 group hover:bg-indigo-600/30 transition-all text-left"
                >
                  <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0 shadow-xl">
                    <Calculator size={24} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white italic uppercase">Novo Cálculo de Custo</h3>
                    <p className="text-[9px] font-bold text-indigo-300 uppercase tracking-widest mt-1">Iniciar um orçamento de produção</p>
                  </div>
                </button>

                <div className="bg-[#0d1c30] border border-white/5 p-5 rounded-2xl flex flex-col justify-center">
                  <h4 className="text-xs font-black text-white italic uppercase mb-1 flex items-center gap-2">
                    <Lightbulb size={16} className="text-amber-500" />
                    Dica de Produção
                  </h4>
                  <p className="text-[9px] font-bold text-[#64748b] uppercase tracking-widest leading-relaxed">
                    Lembre-se de incluir custos de embalagem e energia para garantir que sua margem seja real.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'insumos' && (
            <motion.div 
              key="insumos"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] ml-2">Materiais de Produção ({materials.length})</h3>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={12} />
                    <input 
                      type="text"
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-9 pr-4 text-[10px] font-black text-white italic outline-none focus:border-indigo-500/50 uppercase placeholder:text-white/10"
                      placeholder="FILTRAR MATERIAIS..."
                      value={materialSearchQuery}
                      onChange={e => setMaterialSearchQuery(e.target.value)}
                    />
                  </div>
                  <button 
                    onClick={() => {
                      setEditingMaterial(null);
                      setMaterialFormData({
                        name: '',
                        category: 'Filamento',
                        calcType: 'peso',
                        buyUnit: 'kg',
                        buyQuantity: 1,
                        paidAmount: 0,
                        partsPerUnit: 1,
                        potencyWatts: 0,
                        kwhPrice: 0,
                        hourlyRate: 0
                      });
                      setShowMaterialForm(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20"
                  >
                    <Plus size={14} /> Novo Item
                  </button>
                </div>
              </div>

              {materials.length === 0 ? (
                <div className="py-32 flex flex-col items-center justify-center text-white/10 italic">
                  <Package size={64} strokeWidth={1} />
                  <p className="text-[11px] font-black uppercase tracking-[0.3em] mt-6">Nenhum insumo cadastrado</p>
                  <button 
                    onClick={() => setShowMaterialForm(true)}
                    className="mt-6 text-[10px] font-black text-indigo-400 underline decoration-indigo-400/30 underline-offset-8"
                  >
                    CADASTRE SEU PRIMEIRO MATERIAL
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-10">
                  {materials
                    .filter(m => m.name.toLowerCase().includes(materialSearchQuery.toLowerCase()))
                    .map(m => <MaterialCard key={m.id} material={m} />)
                  }
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'calculo' && (
            <motion.div 
              key="calculo"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-10"
            >
              {/* Lado Esquerdo - Montagem */}
              <div className="lg:col-span-8 space-y-4">
                <div className="bg-[#0d1c30] p-6 rounded-3xl border border-white/5 space-y-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-black text-white italic uppercase underline decoration-indigo-500/50 underline-offset-8">CALCULADORA PROFISSIONAL</h3>
                      <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-3">Refinamento de custos por categorias</p>
                    </div>
                    {editingProjectId && (
                      <button onClick={resetCalculation} className="p-2.5 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all">
                        <RotateCcw size={16} />
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Nome do Produto / Projeto</label>
                    <input 
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3.5 text-base font-black text-white italic outline-none focus:border-indigo-500/50 transition-all placeholder:text-white/5 uppercase"
                      placeholder="EX: IMPRESSÃO 3D - BUSTO BATMAN"
                      value={productName}
                      onChange={e => setProductName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 ml-1">
                      <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Estrutura de Custos</label>
                      <button 
                        onClick={() => setShowMaterialSelector(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-indigo-500 transition-all"
                      >
                        <Plus size={14} /> Adicionar Item ao Cálculo
                      </button>
                    </div>

                    <div className="space-y-3">
                      {(['Direto', 'Indireto', 'Operacional'] as RootCategory[]).map(rootCat => {
                        const rootUsages = currentUsages.filter(u => {
                          const mat = materials.find(m => m.id === u.materialId);
                          return mat?.rootCategory === rootCat;
                        });

                        if (rootUsages.length === 0 && !expandedSections[rootCat]) return null;

                        return (
                          <div key={rootCat} className="bg-black/20 rounded-2xl border border-white/5 overflow-hidden">
                            <button 
                              onClick={() => setExpandedSections(prev => ({ ...prev, [rootCat]: !prev[rootCat] }))}
                              className={`w-full p-4 flex items-center justify-between transition-all ${expandedSections[rootCat] ? 'bg-white/5' : 'hover:bg-white/[0.02]'}`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border border-white/10 ${
                                  rootCat === 'Direto' ? 'text-blue-400' : rootCat === 'Indireto' ? 'text-amber-400' : 'text-emerald-400'
                                }`}>
                                  {rootCat === 'Direto' ? <Package size={16} /> : rootCat === 'Indireto' ? <Zap size={16} /> : <TrendingUp size={16} />}
                                </div>
                                <h4 className="text-[10px] font-black text-white uppercase tracking-widest italic leading-none">CUSTOS {rootCat.toUpperCase()}S</h4>
                                <span className="px-2 py-0.5 bg-black/40 rounded text-[7px] font-black text-white/40">{rootUsages.length} itens</span>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="text-[10px] font-black text-white italic">{formatCurrency(rootUsages.reduce((acc, u) => acc + u.cost, 0))}</span>
                                <ChevronDown size={16} className={`text-white/20 transition-transform ${expandedSections[rootCat] ? 'rotate-180' : ''}`} />
                              </div>
                            </button>

                            <AnimatePresence>
                              {expandedSections[rootCat] && (
                                <motion.div 
                                  initial={{ height: 0 }}
                                  animate={{ height: 'auto' }}
                                  exit={{ height: 0 }}
                                  className="divide-y divide-white/[0.03] overflow-hidden"
                                >
                                  {rootUsages.length === 0 ? (
                                    <div className="p-8 text-center text-white/10 italic text-[9px] uppercase font-black tracking-widest">Nenhum item adicionado</div>
                                  ) : rootUsages.map((usage) => {
                                    const mat = materials.find(m => m.id === usage.materialId);
                                    const globalIdx = currentUsages.indexOf(usage);
                                    return (
                                      <div key={usage.id} className="p-4 flex flex-col sm:flex-row items-center gap-4 hover:bg-white/[0.01] transition-all group">
                                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/20 shrink-0">
                                          <PlusCircle size={16} />
                                        </div>
                                        <div className="flex-1 min-w-0 w-full">
                                            <p className="text-xs font-black text-white italic uppercase truncate">{mat?.name || 'Item Excluído'}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                              <span className="text-[8px] font-bold text-white/40 uppercase tracking-widest">{mat?.category}</span>
                                              <span className="px-1.5 py-0.5 bg-indigo-500/10 rounded text-[7px] font-black text-indigo-400 uppercase tracking-widest">{mat?.calcType}</span>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-3">
                                          <div className="flex items-center gap-2">
                                            {mat?.calcType === 'tempo' || mat?.calcType === 'energia' ? (
                                              <div className="flex items-center gap-1.5">
                                                <div className="relative">
                                                  <input 
                                                    type="text" inputMode="numeric"
                                                    className="w-14 bg-white/5 border border-white/10 rounded-lg p-2 text-center text-[11px] font-black text-white italic outline-none focus:border-indigo-500"
                                                    value={pendingTimes[usage.id]?.h || '0'}
                                                    onChange={e => setPendingTimes({...pendingTimes, [usage.id]: {...(pendingTimes[usage.id] || {min: '0'}), h: e.target.value}})}
                                                  />
                                                  <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[7px] font-black text-white/20 uppercase">H</span>
                                                </div>
                                                <span className="text-white/20 font-black">:</span>
                                                <div className="relative">
                                                  <input 
                                                    type="text" inputMode="numeric"
                                                    className="w-14 bg-white/5 border border-white/10 rounded-lg p-2 text-center text-[11px] font-black text-white italic outline-none focus:border-indigo-500"
                                                    value={pendingTimes[usage.id]?.min || '0'}
                                                    onChange={e => setPendingTimes({...pendingTimes, [usage.id]: {...(pendingTimes[usage.id] || {h: '0'}), min: e.target.value}})}
                                                  />
                                                  <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[7px] font-black text-white/20 uppercase">MIN</span>
                                                </div>
                                              </div>
                                            ) : (
                                              <div className="relative">
                                                <input 
                                                  type="text" inputMode="decimal"
                                                  className="w-24 bg-white/5 border border-white/10 rounded-lg p-2 text-right text-[11px] font-black text-white italic outline-none focus:border-indigo-500 transition-all font-mono"
                                                  value={pendingQuantities[usage.id] || ''}
                                                  onChange={e => setPendingQuantities({ ...pendingQuantities, [usage.id]: e.target.value })}
                                                />
                                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[7px] font-black text-white/30 uppercase">
                                                  {mat?.calcType === 'peso' ? 'g' : mat?.calcType === 'volume' ? 'ml' : mat?.calcType === 'folha' ? 'UN' : 'UN'}
                                                </span>
                                              </div>
                                            )}
                                            <button 
                                              onClick={() => updateUsageQuantity(globalIdx)}
                                              className="p-2 bg-indigo-600 rounded-lg text-[9px] font-black text-white uppercase hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 active:scale-95 transition-all"
                                            >
                                              OK
                                            </button>
                                          </div>
                                          <div className="min-w-[80px] text-right">
                                            <p className="text-[10px] font-black text-emerald-400 italic leading-none">{formatCurrency(usage.cost)}</p>
                                          </div>
                                          <button onClick={() => duplicateUsage(globalIdx)} className="p-2 bg-white/5 text-white/40 hover:text-white rounded-lg transition-all" title="Duplicar">
                                            <Copy size={14} />
                                          </button>
                                          <button onClick={() => removeUsageFromProduct(globalIdx)} className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-all" title="Remover">
                                            <Trash2 size={14} />
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Lado Direito - Totais */}
              <div className="lg:col-span-4 space-y-4">
                <div className="bg-[#0d1c30] p-6 rounded-3xl border border-white/5 space-y-6 sticky top-24 shadow-2xl">
                  <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] italic">Resumo do Cálculo</h3>

                  <div className="space-y-4 pt-4 border-t border-white/10">
                    <div className="flex justify-between items-center text-[9px] font-bold text-white/40 uppercase tracking-widest">
                      <span>Custo de Materiais</span>
                      <span className="text-white italic">{formatCurrency(currentUsages.filter(u => materials.find(m => m.id === u.materialId)?.rootCategory === 'Direto').reduce((acc, u) => acc + u.cost, 0))}</span>
                    </div>
                    <div className="flex justify-between items-center text-[9px] font-bold text-white/40 uppercase tracking-widest">
                      <span>Custos Indiretos</span>
                      <span className="text-white italic">{formatCurrency(currentUsages.filter(u => materials.find(m => m.id === u.materialId)?.rootCategory === 'Indireto').reduce((acc, u) => acc + u.cost, 0))}</span>
                    </div>
                    <div className="flex justify-between items-center text-[9px] font-bold text-white/40 uppercase tracking-widest">
                      <span>Custos Operacionais</span>
                      <span className="text-white italic">{formatCurrency(currentUsages.filter(u => materials.find(m => m.id === u.materialId)?.rootCategory === 'Operacional').reduce((acc, u) => acc + u.cost, 0))}</span>
                    </div>

                    <div className="pt-4 flex justify-between items-end border-t border-white/10">
                      <p className="text-[10px] font-black text-white/60 uppercase italic">Custo Total de Produção</p>
                      <p className="text-xl font-black text-indigo-400 italic leading-none">{formatCurrency(totalProductCost)}</p>
                    </div>
                  </div>

                  <div className="space-y-4 p-4 bg-black/30 rounded-2xl border border-white/10">
                    <div className="flex justify-between items-center">
                      <label className="text-[9px] font-black text-amber-500 uppercase tracking-widest italic">Margem de Lucro</label>
                      <span className="text-xs font-black text-white italic">{profitMargin}%</span>
                    </div>
                    <input 
                      type="range"
                      min="0"
                      max="500"
                      step="5"
                      className="w-full h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-amber-500"
                      value={profitMargin}
                      onChange={e => setProfitMargin(parseInt(e.target.value))}
                    />
                    <div className="flex justify-between text-[7px] font-black text-white/20 uppercase">
                      <span>Conservadora</span>
                      <span>100%</span>
                      <span>Alta</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 p-5 bg-emerald-500/10 rounded-2xl border border-emerald-500/30">
                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest italic">Preço de Venda Sugerido</p>
                    <p className="text-3xl font-black text-white italic">{formatCurrency(suggestedPrice)}</p>
                    <div className="flex justify-between items-center pt-2 mt-2 border-t border-emerald-500/20">
                      <p className="text-[9px] font-black text-emerald-400/60 uppercase">Lucro Bruto</p>
                      <p className="text-xs font-black text-emerald-400 italic">+{formatCurrency(suggestedPrice - totalProductCost)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={handleSaveProject}
                      className="group flex flex-col items-center justify-center gap-2 p-4 bg-indigo-600 rounded-2xl text-white hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/20"
                    >
                      <Save size={18} className="group-hover:scale-110 transition-transform" />
                      <span className="text-[9px] font-black uppercase tracking-widest leading-none">
                        {editingProjectId ? 'Atualizar' : 'Salvar'}
                      </span>
                    </button>
                    <button 
                      onClick={() => {
                        if (confirm('Deseja limpar todos os itens deste cálculo?')) {
                          resetCalculation();
                        }
                      }}
                      className="group flex flex-col items-center justify-center gap-2 p-4 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl transition-all border border-red-500/20 shadow-xl shadow-red-500/5"
                    >
                      <Trash2 size={18} className="group-hover:scale-110 transition-transform" />
                      <span className="text-[9px] font-black uppercase tracking-widest leading-none">Limpar Tudo</span>
                    </button>
                    <button 
                      onClick={() => alert('Função de exportação estará disponível em breve.')}
                      className="group col-span-2 flex items-center justify-center gap-3 p-4 bg-white/5 rounded-2xl text-white/40 hover:bg-white/10 hover:text-white transition-all border border-white/10"
                    >
                      <Download size={18} className="group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-black uppercase tracking-widest leading-none">Gerar Memória de Cálculo</span>
                    </button>
                  </div>
                </div>

                <div className="bg-[#0b1221] border border-white/5 p-5 rounded-2xl space-y-3">
                   <div className="flex items-center gap-2 text-emerald-400 mb-1">
                      <AlertCircle size={16} />
                      <h4 className="text-[9px] font-black uppercase tracking-widest italic">Análise de Markup</h4>
                   </div>
                   <div className="space-y-2">
                      <div className="flex justify-between p-3 bg-black/40 rounded-xl border border-white/5">
                        <span className="text-[8px] font-black text-white/40 uppercase">Markup Final:</span>
                        <span className="text-xs font-black text-indigo-400 italic">{(suggestedPrice / Math.max(totalProductCost, 0.01)).toFixed(2)}x</span>
                      </div>
                   </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'historico' && (
            <motion.div 
              key="historico"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6 pb-10"
            >
              <div className="flex items-center justify-between px-2">
                <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Meus Cálculos Salvos ({projects.length})</h3>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold text-white/20 uppercase">Ordenar por:</span>
                  <select className="bg-[#1a2744] text-[9px] font-black text-white/40 border border-white/5 rounded px-3 py-1 outline-none uppercase tracking-widest">
                    <option>Data Recente</option>
                    <option>Preço Alto</option>
                  </select>
                </div>
              </div>

              {projects.length === 0 ? (
                <div className="py-40 flex flex-col items-center justify-center text-white/5 italic">
                  <History size={80} strokeWidth={1} />
                  <p className="text-[11px] font-black uppercase tracking-[0.3em] mt-8">Nenhum cálculo registrado no banco</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {projects.slice().reverse().map(proj => (
                    <div key={proj.id} className="bg-[#0d1c30] p-4 rounded-2xl border border-white/5 hover:border-indigo-500/30 transition-all group flex flex-col sm:flex-row items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0 shadow-lg group-hover:scale-105 transition-all duration-500">
                        <FolderKanban size={24} />
                      </div>
                      <div className="flex-1 min-w-0 w-full">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="text-sm font-black text-white uppercase italic truncate max-w-[150px]">{proj.name}</h4>
                          <span className="text-[7px] font-bold text-white/20 bg-white/5 px-1.5 py-0.5 rounded italic uppercase">{new Date(proj.updatedAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-3 text-[8px] font-black uppercase tracking-widest text-[#64748b]">
                          <span className="flex items-center gap-1"><Box size={10} /> {proj.usages?.length || 0} Itens</span>
                          <span className="flex items-center gap-1"><Coins size={10} /> {formatCurrency(proj.totalCost)}</span>
                        </div>
                        <div className="flex items-center justify-between mt-3">
                           <div className="space-y-0">
                             <p className="text-[7px] font-black text-indigo-400 uppercase tracking-widest">Sugerido</p>
                             <p className="text-lg font-black text-white italic leading-none">R$ {proj.suggestedPrice?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00'}</p>
                           </div>
                           <div className="flex gap-1.5">
                              <button onClick={() => loadProjectForEdit(proj)} className="p-2 bg-white/5 text-white/40 hover:text-indigo-400 hover:bg-indigo-400/10 rounded-lg transition-all border border-white/5">
                                <Settings size={14} />
                              </button>
                              <button onClick={() => setProjects(projects.filter(p => p.id !== proj.id))} className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-all border border-red-500/20">
                                <Trash2 size={14} />
                              </button>
                           </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

        {/* Modals */}
        <AnimatePresence>
          {showMaterialSelector && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
              onClick={() => setShowMaterialSelector(false)}
            >
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                onClick={e => e.stopPropagation()}
                className="relative w-full max-w-lg bg-[#0d1c30] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
              >
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-black text-white italic uppercase leading-none">Selecionar Item de Custo</h3>
                    <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest mt-1">Escolha um item para adicionar ao cálculo</p>
                  </div>
                  <button onClick={() => setShowMaterialSelector(false)} className="p-2 hover:bg-white/5 rounded-xl text-white/40 transition-all">
                    <X size={20} />
                  </button>
                </div>

                <div className="p-4 bg-black/20">
                  <input 
                    type="text"
                    placeholder="BUSCAR ITEM..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-[10px] font-black text-white italic outline-none focus:border-indigo-500/50 uppercase placeholder:text-white/10"
                    value={materialSearchQuery}
                    onChange={e => setMaterialSearchQuery(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar p-2 space-y-1">
                  {materials
                    .filter(m => m.name.toLowerCase().includes(materialSearchQuery.toLowerCase()))
                    .map(m => (
                      <button 
                        key={m.id}
                        onClick={() => {
                          addUsageToProduct(m.id);
                          setShowMaterialSelector(false);
                          setMaterialSearchQuery('');
                        }}
                        className="w-full p-4 hover:bg-white/5 text-left rounded-2xl transition-all border border-transparent hover:border-white/5 flex items-center gap-4 group"
                      >
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                          <PlusCircle size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black text-white uppercase italic truncate">{m.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[8px] font-bold text-white/40 uppercase tracking-widest">{m.category}</span>
                            <span className="text-[7px] font-black text-indigo-400 uppercase">R$ {m.unitCost.toFixed(4)} / {GET_DEFAULT_UNIT(m.calcType)}</span>
                          </div>
                        </div>
                        <ChevronRight size={16} className="text-white/10 group-hover:text-indigo-400 transition-all" />
                      </button>
                    ))}
                  {materials.length === 0 && (
                    <div className="py-12 flex flex-col items-center justify-center text-white/10 italic">
                      <Box size={40} strokeWidth={1} />
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] mt-4">Nenhum item cadastrado</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}

          {showMaterialForm && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" 
              onClick={() => setShowMaterialForm(false)}
            >
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="bg-[#0b1221] border border-white/10 p-8 rounded-[2rem] w-full max-w-xl shadow-2xl overflow-y-auto max-h-[90vh] no-scrollbar"
                    onClick={e => e.stopPropagation()}
                >
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h3 className="text-xl font-black text-white italic tracking-tight uppercase leading-none">{editingMaterial ? 'Editar Item de Custo' : 'Novo Item de Custo'}</h3>
                        <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mt-1">Configure o método de cálculo e valores base</p>
                    </div>
                    <button onClick={() => setShowMaterialForm(false)} className="p-2.5 bg-white/5 rounded-xl text-white/40 hover:text-white transition-all border border-white/5">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSaveMaterial} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Nome do Item</label>
                        <input 
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm font-black text-white italic outline-none focus:border-indigo-500/50 transition-all placeholder:text-white/5 uppercase"
                            placeholder="EX: RESINA TOUGH-G 1L"
                            value={materialFormData.name}
                            onChange={e => setMaterialFormData({...materialFormData, name: e.target.value})}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Categoria Principal</label>
                            <select 
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-[10px] font-black text-white uppercase outline-none focus:border-indigo-500/50 transition-all cursor-pointer appearance-none"
                                value={materialFormData.category}
                                onChange={e => {
                                  const cat = e.target.value as CalculatorCategory;
                                  const calcType = GET_DEFAULT_TYPE(cat);
                                  setMaterialFormData({
                                    ...materialFormData, 
                                    category: cat, 
                                    calcType,
                                    buyUnit: GET_DEFAULT_UNIT(calcType)
                                  });
                                }}
                            >
                                {Object.values(CATEGORIES).flat().map(cat => (
                                    <option key={cat} value={cat} className="bg-[#0b1221]">{cat.toUpperCase()}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Método de Cálculo</label>
                            <select 
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-[10px] font-black text-white uppercase outline-none focus:border-indigo-500/50 transition-all cursor-pointer appearance-none"
                                value={materialFormData.calcType}
                                onChange={e => {
                                  const type = e.target.value as CalculationType;
                                  setMaterialFormData({
                                    ...materialFormData, 
                                    calcType: type,
                                    buyUnit: GET_DEFAULT_UNIT(type)
                                  });
                                }}
                            >
                                <option value="peso" className="bg-[#0b1221]">POR PESO (kg/g)</option>
                                <option value="volume" className="bg-[#0b1221]">POR VOLUME (L/ml)</option>
                                <option value="folha" className="bg-[#0b1221]">POR FOLHA/PARTE</option>
                                <option value="unidade" className="bg-[#0b1221]">POR UNIDADE</option>
                                <option value="tempo" className="bg-[#0b1221]">POR TEMPO (h)</option>
                                <option value="energia" className="bg-[#0b1221]">POR ENERGIA (kWh)</option>
                            </select>
                        </div>
                    </div>

                    <div className="p-6 bg-black/40 rounded-2xl border border-white/5 space-y-6">
                        {materialFormData.calcType === 'tempo' ? (
                          <div className="space-y-4">
                            <label className="text-[10px] font-black text-white/60 uppercase tracking-widest ml-1">Valor da Hora (R$)</label>
                            <input 
                                type="number" step="0.01"
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm font-black text-white italic outline-none focus:border-indigo-500/50 transition-all"
                                value={materialFormData.hourlyRate || ''}
                                onChange={e => setMaterialFormData({...materialFormData, hourlyRate: parseFloat(e.target.value.replace(',', '.')) || 0})}
                                required
                            />
                          </div>
                        ) : materialFormData.calcType === 'energia' ? (
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-4">
                              <label className="text-[10px] font-black text-white/60 uppercase tracking-widest ml-1">Potência (Watts)</label>
                              <input 
                                  type="number" step="1"
                                  className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm font-black text-white italic outline-none focus:border-indigo-500/50 transition-all"
                                  value={materialFormData.potencyWatts || ''}
                                  onChange={e => setMaterialFormData({...materialFormData, potencyWatts: parseInt(e.target.value) || 0})}
                                  required
                              />
                            </div>
                            <div className="space-y-4">
                              <label className="text-[10px] font-black text-white/60 uppercase tracking-widest ml-1">Preço kWh (R$)</label>
                              <input 
                                  type="number" step="0.0001"
                                  className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm font-black text-white italic outline-none focus:border-indigo-500/50 transition-all"
                                  value={materialFormData.kwhPrice || ''}
                                  onChange={e => setMaterialFormData({...materialFormData, kwhPrice: parseFloat(e.target.value.replace(',', '.')) || 0})}
                                  required
                              />
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-4">
                                <div className="flex justify-between items-center px-1">
                                  <label className="text-[10px] font-black text-white/60 uppercase tracking-widest">Qtd Comprada</label>
                                  {['peso', 'volume'].includes(materialFormData.calcType) && (
                                    <button 
                                      type="button"
                                      onClick={() => {
                                        const units: Record<string, string[]> = { peso: ['kg', 'g'], volume: ['L', 'ml'] };
                                        const currentOptions = units[materialFormData.calcType];
                                        const nextUnit = currentOptions.find(u => u !== materialFormData.buyUnit) || currentOptions[0];
                                        setMaterialFormData({...materialFormData, buyUnit: nextUnit as CalculatorUnit});
                                      }}
                                      className="text-[8px] font-black text-indigo-400 bg-indigo-400/10 px-2 py-0.5 rounded-md hover:bg-indigo-400/20 transition-all uppercase"
                                    >
                                      Mudar p/ {materialFormData.calcType === 'peso' ? (materialFormData.buyUnit === 'kg' ? 'GRAMAS' : 'QUILOS') : (materialFormData.buyUnit === 'L' ? 'MILILITROS' : 'LITROS')}
                                    </button>
                                  )}
                                </div>
                                <div className="relative">
                                    <input 
                                        type="number" step="0.01"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm font-black text-white italic outline-none focus:border-indigo-500/50 transition-all font-mono"
                                        value={materialFormData.buyQuantity || ''}
                                        onChange={e => setMaterialFormData({...materialFormData, buyQuantity: parseFloat(e.target.value.replace(',', '.')) || 0})}
                                        required
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[8px] font-black text-indigo-400 uppercase tracking-widest">{materialFormData.buyUnit}</span>
                                </div>
                              </div>
                              <div className="space-y-4">
                                <label className="text-[10px] font-black text-white/60 uppercase tracking-widest ml-1">Valor Pago (R$)</label>
                                <input 
                                    type="number" step="0.01"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm font-black text-white italic outline-none focus:border-indigo-500/50 transition-all"
                                    value={materialFormData.paidAmount || ''}
                                    onChange={e => setMaterialFormData({...materialFormData, paidAmount: parseFloat(e.target.value.replace(',', '.')) || 0})}
                                    required
                                />
                              </div>
                            </div>
                            
                            {materialFormData.calcType === 'folha' && (
                              <div className="space-y-4 pt-2">
                                <div className="p-3 bg-indigo-500/5 rounded-xl border border-indigo-500/10">
                                  <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest ml-1 mb-2 block">Artes por Folha (Divisão)</label>
                                  <input 
                                      type="number" step="1"
                                      className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-sm font-black text-white italic outline-none focus:border-indigo-500/50 transition-all"
                                      value={materialFormData.partsPerUnit || ''}
                                      onChange={e => setMaterialFormData({...materialFormData, partsPerUnit: parseInt(e.target.value) || 1})}
                                      required
                                  />
                                  <p className="text-[7px] font-black text-white/20 uppercase tracking-widest mt-2 ml-1 italic">Este valor será usado para calcular o custo unitário por arte.</p>
                                </div>
                              </div>
                            )}
                          </>
                        )}

                        <div className="flex items-center justify-between p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                           <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Custo Projetado:</span>
                           <span className="text-lg font-black text-white italic tracking-tight">
                              {formatCurrency(
                                materialFormData.calcType === 'tempo' ? materialFormData.hourlyRate :
                                materialFormData.calcType === 'energia' ? ((materialFormData.potencyWatts || 0) / 1000) * (materialFormData.kwhPrice || 0) :
                                materialFormData.calcType === 'folha' ? (materialFormData.paidAmount / (materialFormData.buyQuantity || 1)) / (materialFormData.partsPerUnit || 1) :
                                materialFormData.paidAmount / (materialFormData.buyQuantity || 1)
                              )}
                              <span className="text-[8px] font-bold text-white/20 ml-1 uppercase">/ {GET_DEFAULT_UNIT(materialFormData.calcType)}</span>
                           </span>
                        </div>
                    </div>

                    <button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white p-5 rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-600/20 transition-all active:scale-[0.98]">
                        {editingMaterial ? 'Atualizar Insumo' : 'Cadastrar Insumo'}
                    </button>
                </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
