/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, useRef, ChangeEvent, FormEvent, MouseEvent, forwardRef } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import QRCode from 'qrcode';
import { QRCodeCanvas } from 'qrcode.react';
import { DashboardView } from './components/DashboardView';
import { 
  TrendingUp, BarChart3, Users, LayoutGrid, Store, CreditCard, 
  Package, UserPlus, Handshake, Boxes, Tag, Truck, Calculator, 
  BadgeDollarSign, Plus, Minus, Search, X, ChevronLeft, ArrowLeft, Trash2, Save, Edit3, Settings, Home,
  ShoppingBag, Pencil, Edit, Printer, ChevronRight, ChevronDown,
  Zap, Link, Download, Upload, Database, Loader2, Check, History, Lock, Unlock, 
  Info, Eye, Receipt, User, QrCode, ShieldCheck, Star, AlertCircle,
  Clock, Send, RefreshCw, RotateCcw, LayoutDashboard, Cake, Play, Heart, PackageCheck,
  DollarSign, Percent, Lightbulb, ExternalLink, SlidersHorizontal,
  Monitor, Cpu, AlertTriangle, Cloud, CheckCircle, MapPin, FileText, Maximize2, UserX, Box, LogOut, Keyboard, HelpCircle, Link2, Calendar, Filter, MoreVertical, Contact, ChefHat, ClipboardList,
  Hash, Scissors, Square, FileDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Html5Qrcode } from 'html5-qrcode';
import { APP_VERSION } from './lib/version';
import { UpdateService } from './services/updateService';
import { uploadToServer } from './lib/utils';
import { syncService, type ServiceStatus } from './services/syncService';
import { 
  salvarDados, 
  salvarDadosAsync,
  carregarDados, 
  carregarDadosAsync,
  STORAGE_KEYS, 
  salvarBackupArquivo, 
  carregarBackupArquivo,
  exportarBackup,
  importarBackup,
  LocalBackup,
  generateUniqueId,
  getDeviceId,
  SyncableEntity,
  setRestoringFlag
} from './lib/persistence';
import { db } from './lib/db';
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
  Cell
} from 'recharts';

import { AppUpdater } from './components/AppUpdater';
import { PrintService } from './services/printService';
import { FinanceView } from './components/FinanceView';
import { CustomerExperienceView } from './components/CustomerExperienceView';
import { CouponVisualEditor } from './components/CouponVisualEditor';
import { UnifiedCouponRenderer } from './components/UnifiedCouponRenderer';
import { CatalogView } from './components/CatalogView';
import { CustomerView, CustomerForm } from './components/CustomerView';
import { ShopkeeperView } from './components/ShopkeeperView';
import { CostCalculatorView } from './components/CostCalculatorView';
import { UniversalImageSelector } from './components/UniversalImageSelector';
import { PreOrderView } from './components/PreOrderView';
import { ProductionHubView } from './components/ProductionHubView';
import { ProductLocationView } from './components/ProductLocationView';

import { backupService } from './services/backupService';
import { logger } from './lib/logger';

const noScrollbarStyle = `
  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
`;

// --- Types ---
export interface Product extends SyncableEntity {
  name: string;
  price: number; // Varejo
  costPrice?: number;
  stock: number;
  minStock?: number;
  supplier?: string;
  wholesalePrice?: number; // Atacado
  wholesaleMinQty?: number; // Quantidade mínima para atacado
  category?: string;
  categoryId?: string;
  subcategoryId?: string;
  sku?: string; // Código fornecedor
  barcode?: string;
  imageUrl?: string;
  updatedByUserId?: string;
  updatedByUserName?: string;
  showInCatalog?: boolean;
  isFeatured?: boolean;
  locationRow?: string;
  locationShelf?: string;
  locationDrawer?: string;
  locationId?: string;
  shopkeeperPrice?: number;
}

export interface ProductLocation extends SyncableEntity {
  name: string;
  rua: string;
  gondola: string;
  prateleira: string;
  gaveta: string;
  description: string;
}

export interface Category extends SyncableEntity {
  name: string;
}

export interface Subcategory extends SyncableEntity {
  categoryId: string;
  name: string;
}

interface Activity {
  id: string;
  type: 'customer' | 'product' | 'sale' | 'system' | 'product_edit' | 'auth' | 'security' | 'ajustes';
  action: string;
  details: string;
  timestamp: string;
  user: string;
  userRole?: string;
  productId?: string;
  productName?: string;
  field?: string;
  oldValue?: any;
  newValue?: any;
}

export interface Customer extends SyncableEntity {
  displayId: string;
  name: string;
  email?: string;
  whatsapp?: string;
  phone?: string; // Backward compatibility
  dob?: string;
  taxId?: string; // CPF/CNPJ
  image?: string; // Base64 image
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
  notes?: string;
}

interface DeliveryChannel extends SyncableEntity {
  name: string;
}

interface DeliveryMethod extends SyncableEntity {
  name: string;
  isActive: boolean;
}

interface PaymentEntry {
  method: string;
  amount: number;
  date: number;
}

interface SaleItem {
  productId: string;
  quantity: number;
  price: number;
  cost: number;
  profit: number;
}

interface SaleReturnItem {
  productId: string;
  quantity: number;
}

interface SaleReturn {
  id: string;
  items: SaleReturnItem[];
  reason: string;
  date: number;
  userId: string;
  userName: string;
}

export interface Sale extends SyncableEntity {
  sequentialId?: string; // e.g. "00001"
  items: SaleItem[];
  originalItems?: SaleItem[];
  returns?: SaleReturn[];
  total: number;
  totalCost: number;
  totalProfit: number;
  date: number;
  customerId?: string;
  deliveryChannelId?: string;
  deliveryMethodId?: string;
  cashierSessionId?: string;
  paymentMethod: string; // Keep for backward compatibility (primary or summary)
  payments?: PaymentEntry[];
  trackingCode?: string;
  deliveryMethod?: string;
  receivedAmount?: number;
  change?: number;
  status?: 'aguardando_producao' | 'pendente' | 'em_separacao' | 'separado' | 'embalado' | 'enviado' | 'em_transporte' | 'entregue' | 'cancelado' | 'falta_confirmada' | 'finalizado';
  notes?: string;
  soldByUserId?: string;
  soldByUserName?: string;
  separatedByUserId?: string;
  separatedByUserName?: string;
  packedByUserId?: string;
  packedByUserName?: string;
  startedSeparationByUserId?: string;
  startedSeparationByUserName?: string;
  startedSeparationAt?: string;
  separatedByAt?: string;
  packedAt?: string;
  shippedByUserId?: string;
  shippedByUserName?: string;
  shippedAt?: string;
  missingConfirmedByUserId?: string;
  missingConfirmedByUserName?: string;
  youtubeLink?: string;
  separationTimestamp?: string;
  updatedAt?: number;
  greetingConfig?: GreetingCouponConfig;
}

interface Revenue extends SyncableEntity {
  saleId: string;
  amount: number;
  paymentMethod?: string;
  status: 'pendente' | 'confirmado' | 'cancelado';
  date: string;
  updatedAt: number;
  userId?: string;
  userName?: string;
}

interface Purchase extends SyncableEntity {
  date: string;
  itemName: string;
  quantity: number;
  totalValue: number;
  rawMaterialId?: string;
  updatedAt: number;
  userId?: string;
  userName?: string;
}

interface Expense extends SyncableEntity {
  date: string;
  description: string;
  amount: number;
  category: string;
  updatedAt: number;
  userId?: string;
  userName?: string;
}

interface RawMaterial extends SyncableEntity {
  name: string;
  unitCost: number;
  unit: 'g' | 'ml' | 'unidade';
  updatedAt: number;
}

interface ProductIngredient {
  rawMaterialId: string;
  quantity: number;
}

interface ProductRecipe extends SyncableEntity {
  productId: string;
  ingredients: ProductIngredient[];
}

interface Shopkeeper extends SyncableEntity {
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
}

interface ShopkeeperItem {
  productId: string;
  quantity: number; // Entregue
  soldQuantity: number; // Acertado/Vendido
  returnedQuantity: number; // Devolvido
  shopkeeperPrice: number;
  costPrice: number;
}

interface ShopkeeperDelivery extends SyncableEntity {
  shopkeeperId: string;
  items: ShopkeeperItem[];
  status: 'aberto' | 'acerto' | 'finalizado';
  date: number;
  updatedAt: number;
  history: {
    action: string;
    date: number;
    details: string;
  }[];
}


interface CouponConfig {
  format: '58mm' | '80mm' | 'a4' | 'a5' | 'a6' | 'custom';
  orientation?: 'portrait' | 'landscape';
  customWidth?: number;
  customHeight?: number;
  printerName?: string;
  profileName?: string;
  outputType: 'impressora' | 'pdf';
  printMode: 'browser' | 'auto';
  headerMessage: string;
  footerMessage: string;
  defaultMessage: string;
  // Visibilidade Empresa
  showLogo: boolean;
  showCompanyName: boolean;
  showCompanyId: boolean;
  showCompanyAddress: boolean;
  showIdNumber: boolean; 
  showAddress: boolean;
  // Visibilidade Cliente
  showCustomer: boolean;
  showCustomerData: boolean; // Se true, exibe todos os dados disponíveis (Nome, Doc, Fone, Endereço)
  // Visibilidade Itens
  showItemName: boolean;
  showItemQty: boolean;
  showItemPrice: boolean;
  showItemUnitPrice: boolean;
  showItemSubtotal: boolean;
  // Visibilidade Totais
  showDiscounts: boolean;
  showDiscount: boolean;
  showFinalTotal: boolean;
  // Visibilidade Pagamento
  showPaymentMethod: boolean;
  showChange: boolean;
  // Extras
  showOrderNumber: boolean;
  showDateTime: boolean;
  showOrderQrCode: boolean;
  showPrice: boolean;
  qrCodeDesign?: QRCodeDesignConfig;
}

// --- Helpers ---
export const maskCEP = (value: string) => {
  return value.replace(/\D/g, '').replace(/^(\d{5})(\d)/, '$1-$2').substring(0, 9);
};

export const maskPhone = (value: string) => {
  const nums = value.replace(/\D/g, '');
  if (nums.length <= 10) return nums.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
  return nums.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').substring(0, 15);
};

export const maskCPF_CNPJ = (value: string) => {
  const nums = value.replace(/\D/g, '');
  if (nums.length <= 11) {
    return nums.replace(/^(\d{3})(\d{3})(\d{3})(\d{0,2})/, '$1.$2.$3-$4').substring(0, 14);
  }
  return nums.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, '$1.$2.$3/$4-$5').substring(0, 18);
};

const validateEmail = (email: string) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const parseLocaleFloat = (value: any): number => {
  if (typeof value === 'number') return value;
  if (!value || typeof value !== 'string') return 0;
  // Remove thousands separator (dot) and convert decimal separator (comma) to dot
  // Logic: "1.234,56" -> "1234.56"
  // If user typed "1234.56" directly, it should still work
  let clean = value.trim();
  if (clean.includes(',') && clean.includes('.')) {
    // Both present: assume "." is thousand and "," is decimal
    clean = clean.replace(/\./g, '').replace(/,/g, '.');
  } else if (clean.includes(',')) {
    // Only comma: decimal separator
    clean = clean.replace(/,/g, '.');
  }
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
};

export interface CompanyInfo {
  logo?: string;
  name: string;
  tradeName?: string;
  slogan?: string;
  idNumber: string; // CPF/CNPJ
  stateRegistration?: string;
  email: string;
  website: string;
  address: {
    logradouro: string;
    cep: string;
    numero: string;
    bairro: string;
    cidade: string;
    estado: string;
  };
  pix: string;
  phone: string;
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

interface BarcodeDesignConfig {
  type: 'code128' | 'ean13';
  height: number;
  width: number; // bar thickness
  showText: boolean;
  color: string;
  backgroundColor: string;
}

interface CouponPDVConfig {
  headerMessage: string;
  showOrderNumber: boolean;
  showDateTime: boolean;
  showSoldBy: boolean;
  showQrCode: boolean;
  showLogo?: boolean;
  format: '58mm' | '80mm' | 'a4' | 'a5' | 'a6' | 'custom';
  orientation?: 'portrait' | 'landscape';
  customWidth?: number;
  customHeight?: number;
  printerName?: string;
  profileName?: string;
  printMode: 'browser' | 'auto';
  qrCodeDesign?: QRCodeDesignConfig;
}

interface LabelConfig {
  width: number; // mm
  height: number; // mm
  format: 'a4' | 'a5' | 'a6' | 'custom' | 'thermal';
  showProductName: boolean;
  showQRCode: boolean;
  showCodeNumber: boolean;
  showPrice: boolean;
  showPrintDate: boolean;
  showCutLines?: boolean;
  showCutLine?: boolean;
  showLabelBorder?: boolean;
  showBarcode?: boolean;
  showDate?: boolean;
  cutLineOpacity?: number;
  showKit?: boolean;
  showInstallments?: boolean;
  installments?: number;
  printerName: string;
  profileName?: string;
  printMode: 'browser' | 'auto';
  sheetType?: 'a4' | 'a5' | 'a6' | 'thermal' | 'custom';
  labelsPerSheet?: number;
  qrCodeDesign?: QRCodeDesignConfig;
  quantity?: number;
  orientation?: 'portrait' | 'landscape';
  // Margens Externas (mm)
  marginTop?: number;
  marginBottom?: number;
  marginLeft?: number;
  marginRight?: number;
  // Margens Internas (mm)
  paddingTop?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  paddingRight?: number;
  // Dimensões do Papel
  paperWidth?: number;
  paperHeight?: number;
  hGap?: number;
  vGap?: number;
}

interface SystemUser extends SyncableEntity {
  username: string;
  name: string;
  password?: string;
  roleId?: string;
  isActive?: boolean;
  deactivatedAt?: string;
  isFirstAccess?: boolean;
  masterCode?: string;
}

type AccessLevel = 'total' | 'limitado' | 'nenhum';

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

interface GreetingCouponConfig {
  title: string;
  message: string;
  showCustomerName: boolean;
  showOrderNumber: boolean;
  showLogo?: boolean;
  footerText: string;
  qrCodeText: string;
  logo?: string;
  showCompanyName?: boolean;
  format: '58mm' | '80mm' | 'a4' | 'a5' | 'a6' | 'custom' | 'thermal';
  orientation?: 'portrait' | 'landscape';
  customWidth?: number;
  customHeight?: number;
  width?: number;
  height?: number;
  printerName?: string;
  printMode?: 'browser' | 'auto';
  backgroundImage?: string;
  backgroundOpacity?: number;
  emojiOpacity?: number;
  emojis?: Emoji[];
  customEmojis?: string[];
  qrCodeDesign?: QRCodeDesignConfig;
}

interface ModuleActions {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  adjust: boolean;
  print: boolean;
}

interface ModulePermissions {
  dashboard: ModuleActions;
  pdv: ModuleActions;
  separacao: ModuleActions;
  estoque: ModuleActions;
  financeiro: ModuleActions;
  historico: ModuleActions;
  consultarPedido: ModuleActions;
  customerExperience: ModuleActions;
  ajustes: ModuleActions;
  lojistas: ModuleActions;
  devolucao: ModuleActions;
  calculadoraCosts: ModuleActions;
  centralProducao: ModuleActions;
}

const isUserAdmin = (user: SystemUser | null, roles?: Role[]) => {
  if (!user) return false;
  const isMaster = user.id === 'admin' || user.username?.toUpperCase() === 'ADM';
  if (isMaster) return true;
  if (!roles) return false;
  return roles.find(r => r.id === user.roleId)?.name.toLowerCase() === 'administrador';
};

const DEFAULT_ACTIONS: ModuleActions = {
  view: false,
  create: false,
  edit: false,
  delete: false,
  adjust: false,
  print: false
};

const ALL_ACTIONS: ModuleActions = {
  view: true,
  create: true,
  edit: true,
  delete: true,
  adjust: true,
  print: true
};

const DEFAULT_PERMISSIONS: ModulePermissions = {
  dashboard: { ...DEFAULT_ACTIONS },
  pdv: { ...DEFAULT_ACTIONS },
  separacao: { ...DEFAULT_ACTIONS },
  estoque: { ...DEFAULT_ACTIONS },
  financeiro: { ...DEFAULT_ACTIONS },
  historico: { ...DEFAULT_ACTIONS },
  consultarPedido: { ...DEFAULT_ACTIONS },
  customerExperience: { ...DEFAULT_ACTIONS },
  ajustes: { ...DEFAULT_ACTIONS },
  lojistas: { ...DEFAULT_ACTIONS },
  devolucao: { ...DEFAULT_ACTIONS },
  calculadoraCosts: { ...DEFAULT_ACTIONS },
  centralProducao: { ...DEFAULT_ACTIONS }
};

interface Role extends SyncableEntity {
  name: string;
  isDefault?: boolean;
  permissions: ModulePermissions;
}

const INITIAL_ROLES: Role[] = [
  {
    id: 'role-gerente',
    name: 'Gerente',
    isDefault: true,
    permissions: {
      dashboard: { ...ALL_ACTIONS },
      pdv: { ...ALL_ACTIONS },
      separacao: { ...ALL_ACTIONS },
      estoque: { ...ALL_ACTIONS },
      financeiro: { ...ALL_ACTIONS },
      historico: { ...ALL_ACTIONS },
      consultarPedido: { ...ALL_ACTIONS },
      customerExperience: { ...ALL_ACTIONS },
      ajustes: { ...ALL_ACTIONS },
      lojistas: { ...ALL_ACTIONS },
      devolucao: { ...ALL_ACTIONS },
      calculadoraCosts: { ...ALL_ACTIONS },
      centralProducao: { ...ALL_ACTIONS }
    }
  },
  {
    id: 'role-caixa',
    name: 'Operador de caixa',
    isDefault: true,
    permissions: {
      dashboard: { ...DEFAULT_ACTIONS, view: true },
      pdv: { ...ALL_ACTIONS },
      separacao: { ...DEFAULT_ACTIONS },
      estoque: { ...DEFAULT_ACTIONS, view: true },
      financeiro: { ...DEFAULT_ACTIONS },
      historico: { ...DEFAULT_ACTIONS },
      consultarPedido: { ...DEFAULT_ACTIONS },
      customerExperience: { ...DEFAULT_ACTIONS },
      ajustes: { ...DEFAULT_ACTIONS },
      lojistas: { ...DEFAULT_ACTIONS },
      devolucao: { ...DEFAULT_ACTIONS },
      calculadoraCosts: { ...DEFAULT_ACTIONS },
      centralProducao: { ...DEFAULT_ACTIONS },
    }
  },
  {
    id: 'role-separador',
    name: 'Separador',
    isDefault: true,
    permissions: {
      dashboard: { ...DEFAULT_ACTIONS },
      pdv: { ...DEFAULT_ACTIONS },
      separacao: { ...ALL_ACTIONS },
      estoque: { ...DEFAULT_ACTIONS, view: true },
      financeiro: { ...DEFAULT_ACTIONS },
      historico: { ...DEFAULT_ACTIONS },
      consultarPedido: { ...ALL_ACTIONS },
      customerExperience: { ...ALL_ACTIONS },
      ajustes: { ...DEFAULT_ACTIONS },
      lojistas: { ...DEFAULT_ACTIONS },
      devolucao: { ...DEFAULT_ACTIONS },
      calculadoraCosts: { ...DEFAULT_ACTIONS },
      centralProducao: { ...DEFAULT_ACTIONS, view: true },
    }
  },
  {
    id: 'role-estoquista',
    name: 'Estoquista',
    isDefault: true,
    permissions: {
      dashboard: { ...DEFAULT_ACTIONS },
      pdv: { ...DEFAULT_ACTIONS },
      separacao: { ...DEFAULT_ACTIONS },
      estoque: { ...ALL_ACTIONS },
      financeiro: { ...DEFAULT_ACTIONS },
      historico: { ...DEFAULT_ACTIONS },
      consultarPedido: { ...DEFAULT_ACTIONS },
      customerExperience: { ...DEFAULT_ACTIONS },
      ajustes: { ...DEFAULT_ACTIONS },
      lojistas: { ...DEFAULT_ACTIONS },
      devolucao: { ...DEFAULT_ACTIONS },
      calculadoraCosts: { ...DEFAULT_ACTIONS },
      centralProducao: { ...DEFAULT_ACTIONS },
    }
  },
  {
    id: 'role-financeiro',
    name: 'Financeiro',
    isDefault: true,
    permissions: {
      dashboard: { ...ALL_ACTIONS },
      pdv: { ...DEFAULT_ACTIONS },
      separacao: { ...DEFAULT_ACTIONS },
      estoque: { ...DEFAULT_ACTIONS },
      financeiro: { ...ALL_ACTIONS },
      historico: { ...ALL_ACTIONS },
      consultarPedido: { ...DEFAULT_ACTIONS },
      customerExperience: { ...DEFAULT_ACTIONS },
      ajustes: { ...DEFAULT_ACTIONS },
      lojistas: { ...DEFAULT_ACTIONS },
      devolucao: { ...DEFAULT_ACTIONS },
      calculadoraCosts: { ...DEFAULT_ACTIONS },
      centralProducao: { ...DEFAULT_ACTIONS },
    }
  }
];

interface CashierSession extends SyncableEntity {
  isOpen: boolean;
  openedAt: string;
  closedAt?: string;
  userId?: string;
  userName?: string;
  openingBalance: number;
  closingBalance?: number;
  totalSales: number;
  totalCanceled: number;
  salesCount: number;
  canceledCount: number;
  salesByMethod: Record<string, number>;
  reforsos?: number;
  sangrias?: number;
  estornos?: number;
  descontos?: number;
  acrescimos?: number;
  taxaEntrega?: number;
  updatedAt?: number;
}


export interface PreOrder extends SyncableEntity {
  code: string; // PRE-0001
  customerName: string;
  phone: string;
  product: string;
  quantity: number;
  combinedValue: number; // Valor estimado
  finalValue?: number;
  downPayment: number;
  expectedDate: string;
  observation: string;
  internalObservation?: string;
  origin: 'WhatsApp' | 'Instagram' | 'Loja' | 'Evento' | 'Cliente Fixo' | 'Site' | 'Outro';
  status: 'Aguardando' | 'Confirmado' | 'Em análise' | 'Em produção' | 'Finalizado' | 'Cancelado';
  priority: 'Normal' | 'Alta' | 'Urgente';
  createdAt: number;
  images?: string[];
}


type View = 'dashboard' | 'summary' | 'adjust' | 'payments' | 'add-product' | 'add-customer' | 'movement' | 'delivery' | 'cashier' | 'finance' | 'sales-history' | 'pos' | 'separation' | 'results' | 'consultar-pedido' | 'search-order' | 'customer-experience' | 'catalog' | 'lojistas' | 'calculadora-custo' | 'auditoria' | 'returns' | 'first-access' | 'master-code-display' | 'forgot-password' | 'pre-order' | 'central-producao' | 'product-locations';

const INITIAL_QR_DESIGN: QRCodeDesignConfig = {
  style: 'standard',
  color: '#000000',
  backgroundColor: '#FFFFFF',
  opacity: 100,
  dotType: 'square',
  cornerType: 'standard'
};

const PAYMENT_ICON_LIBRARY = [
  { char: '💵', label: 'Dinheiro' },
  { char: '💳', label: 'Cartão' },
  { char: '📲', label: 'Pix' },
  { char: '🏦', label: 'Banco' },
  { char: '🔗', label: 'Link' },
  { char: '📦', label: 'Outro' },
  { char: '💰', label: 'Saco de Dinheiro' },
  { char: '⚡', label: 'Raio' },
  { char: '💎', label: 'Diamante' },
  { char: '🎁', label: 'Presente' }
];

const DEFAULT_PAYMENT_ICONS: Record<string, string> = {
  'DINHEIRO': '💵',
  'PIX': '📲',
  'CARTÃO DE CRÉDITO': '💳',
  'CARTÃO DE DÉBITO': '��',
  'MULTIMEIOS': '💰'
};

const INITIAL_COUPON_PDV_CONFIG: CouponPDVConfig = {
  headerMessage: 'Pedido Criado',
  showOrderNumber: true,
  showDateTime: true,
  showSoldBy: true,
  showQrCode: true,
  showLogo: true,
  format: '80mm',
  orientation: 'portrait',
  printMode: 'browser',
  profileName: 'BALCÃO',
  qrCodeDesign: INITIAL_QR_DESIGN
};

const INITIAL_COUPON_CONFIG: CouponConfig = {
  format: '80mm',
  orientation: 'portrait',
  outputType: 'impressora',
  printMode: 'browser',
  printerName: '',
  profileName: 'GERAL',
  customWidth: 80,
  customHeight: 300,
  headerMessage: 'CUPOM DE VENDA',
  footerMessage: 'Obrigado pela preferência!',
  defaultMessage: 'Obrigado pela preferência! Volte sempre.',
  showLogo: true,
  showCompanyName: true,
  showCompanyId: true,
  showCompanyAddress: true,
  showIdNumber: true,
  showAddress: true,
  showCustomer: true,
  showCustomerData: true,
  showItemName: true,
  showItemQty: true,
  showItemPrice: true,
  showItemUnitPrice: true,
  showItemSubtotal: true,
  showDiscounts: true,
  showDiscount: true,
  showFinalTotal: true,
  showPaymentMethod: true,
  showChange: true,
  showOrderNumber: true,
  showDateTime: true,
  showOrderQrCode: true,
  showPrice: true,
  qrCodeDesign: INITIAL_QR_DESIGN
};

const INITIAL_GREETING_COUPON_CONFIG: GreetingCouponConfig = {
  title: 'MUITO OBRIGADO!',
  message: 'Preparamos seu pedido com muito carinho. Esperamos que você adore sua nova aquisição!',
  showCustomerName: true,
  showOrderNumber: false,
  showLogo: true,
  showCompanyName: false,
  footerText: 'SIGA-NOS NO INSTAGRAM: @LOJA_EXEMPLO',
  qrCodeText: 'ACESSE SEU VÍDEO',
  format: '80mm',
  orientation: 'portrait',
  width: 80,
  height: 180,
  printMode: 'browser',
  backgroundOpacity: 10,
  emojiOpacity: 100,
  emojis: [],
  customEmojis: [],
  qrCodeDesign: INITIAL_QR_DESIGN
};

interface PrinterConfig {
  id: string;
  name: string;
  displayName?: string;
  type: 'thermal' | 'desktop';
  connection: 'usb' | 'network' | 'bluetooth';
}

// --- Main App ---
// Helper for scan feedback
const playScanFeedback = () => {
  // Beep
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.1);
  } catch (err) {
    console.warn("Audio feedback failed");
  }

  // Vibration
  if ('vibrate' in navigator) {
    navigator.vibrate(80);
  }
};

// --- Global Utilities ---
const getPaperDimensions = (config: { 
  format?: string, 
  orientation?: 'portrait' | 'landscape', 
  customWidth?: number, 
  customHeight?: number,
  width?: number,
  height?: number
}) => {
  const isLandscape = config.orientation === 'landscape';
  const fmt = (config.format || 'thermal').toLowerCase();
  
  let widthMm: number;
  let heightMm: number | 'auto' = 'auto';
  let pageSizeCss: string;

  // Standard widths for thermal printers
  const THERMAL_58 = 58;
  const THERMAL_80 = 80;

  switch (fmt) {
    case '58mm':
      widthMm = isLandscape ? (config.height || 100) : THERMAL_58;
      heightMm = isLandscape ? THERMAL_58 : (config.height || 'auto');
      pageSizeCss = heightMm === 'auto' ? '58mm auto' : `${widthMm}mm ${heightMm}mm`;
      break;
    case '80mm':
    case 'thermal':
      widthMm = isLandscape ? (config.height || 150) : THERMAL_80;
      heightMm = isLandscape ? THERMAL_80 : (config.height || 'auto');
      pageSizeCss = heightMm === 'auto' ? `${widthMm}mm auto` : `${widthMm}mm ${heightMm}mm`;
      break;
    case 'a4':
      widthMm = isLandscape ? 297 : 210;
      heightMm = isLandscape ? 210 : 297;
      pageSizeCss = `${widthMm}mm ${heightMm}mm`;
      break;
    case 'a5':
      widthMm = isLandscape ? 210 : 148;
      heightMm = isLandscape ? 148 : 210;
      pageSizeCss = `${widthMm}mm ${heightMm}mm`;
      break;
    case 'a6':
      // A6 exact dims are 105x148.5
      widthMm = isLandscape ? 148.5 : 105;
      heightMm = isLandscape ? 105 : 148.5;
      pageSizeCss = `${widthMm}mm ${heightMm}mm`;
      break;
    case 'custom':
      widthMm = isLandscape ? (config.customHeight || config.height || 100) : (config.customWidth || config.width || 80);
      heightMm = isLandscape ? (config.customWidth || config.width || 80) : (config.customHeight || config.height || 100);
      pageSizeCss = `${widthMm}mm ${heightMm}mm`;
      break;
    default:
      widthMm = config.width || 80;
      pageSizeCss = `${widthMm}mm auto`;
  }

  return {
    widthMm,
    heightMm,
    orientation: config.orientation || (isLandscape ? 'landscape' : 'portrait'),
    pageSizeCss,
    format: fmt,
    width: widthMm,
    height: heightMm,
    widthCss: `${widthMm}mm`,
    heightCss: heightMm === 'auto' ? 'auto' : `${heightMm}mm`
  };
};

/**
 * Geração de PDF Programática para Etiquetas
 * Substitui o uso de html2canvas por comandos diretos do jsPDF (mm)
 */
let isGeneratingPDF = false;

const generateProgrammaticLabelPDF = async (
  items: { product: any, quantity: number }[],
  config: LabelConfig,
  mode: 'download' | 'preview' = 'download'
) => {
  if (isGeneratingPDF) return false;
  isGeneratingPDF = true;

  try {
    const { jsPDF } = await import('jspdf');
    const qrcodeLib = await import('qrcode');
    const toDataUrlFn = qrcodeLib.toDataURL || (qrcodeLib as any).default?.toDataURL;

    const paperDims = getPaperDimensions({ 
      format: config.sheetType, 
      orientation: config.orientation,
      customWidth: config.paperWidth,
      customHeight: config.paperHeight
    });
    const paperW = paperDims.widthMm;
    const paperH = typeof paperDims.heightMm === 'number' ? paperDims.heightMm : 297;
    const isThermal = config.sheetType === 'thermal';

    const doc = new jsPDF({
      orientation: config.orientation || 'portrait',
      unit: 'mm',
      format: [paperW, paperH]
    });

    const drawSingleLabel = async (p: any, x: number, y: number, w: number, h: number) => {
    // Sanitize numeric inputs for rect
    const safeX = Number(x) || 0;
    const safeY = Number(y) || 0;
    const safeW = (Number(w) && Number(w) > 0) ? Number(w) : 1;
    const safeH = (Number(h) && Number(h) > 0) ? Number(h) : 1;

    // Fundo branco
    doc.setFillColor(255, 255, 255);
    doc.rect(safeX, safeY, safeW, safeH, 'F');

    // Borda da Etiqueta
    if (config.showLabelBorder) {
      doc.setDrawColor(226, 232, 240); // text-zinc-200 / border gray
      doc.setLineWidth(0.1);
      doc.rect(safeX, safeY, safeW, safeH, 'S');
    }

    // Linhas de Corte
    if (config.showCutLine) {
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.05);
      // Top cut line
      doc.line(safeX + safeW / 2, safeY, safeX + safeW / 2, safeY + 2);
      // Bottom cut line
      doc.line(safeX + safeW / 2, safeY + safeH - 2, safeX + safeW / 2, safeY + safeH);
      // Left cut line
      doc.line(safeX, safeY + safeH / 2, safeX + 2, safeY + safeH / 2);
      // Right cut line
      doc.line(safeX + safeW - 2, safeY + safeH / 2, safeX + safeW, safeY + safeH / 2);
    }

    if (config.showCutLines && !config.showCutLine) {
      const opacity = (config.cutLineOpacity || 30) / 100;
      const grayValue = Math.floor(255 - (255 - 100) * opacity);
      doc.setDrawColor(grayValue, grayValue, grayValue);
      doc.setLineWidth(0.05);
      doc.rect(safeX, safeY, safeW, safeH, 'S');
    }

    // Content Scaling Reference (50x30mm)
    const refW = 50;
    const refH = 30;
    const contentScale = Math.min(safeW / refW, safeH / refH);

    const padding = (config.paddingTop || 2) * contentScale;
    const centerX = safeX + (safeW / 2);
    
    // Calculate total layout height to center vertically
    let estContentHeight = 0;
    if (config.showProductName) estContentHeight += 5 * contentScale;
    if (config.showPrice && Number(p.price) >= 0) estContentHeight += 6 * contentScale;
    if (config.showInstallments && (Number(config.installments) || 0) > 1) estContentHeight += 4 * contentScale;
    if (config.showBarcode || config.showQRCode) estContentHeight += 15 * contentScale;
    if (config.showKit) estContentHeight += 5 * contentScale;
    
    // Start Y centered
    let currentY = safeY + Math.max(padding, (safeH - estContentHeight) / 2) + (2 * contentScale);

    // Nome / Título (Multilinha se necessário)
    if (config.showProductName) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5 * contentScale);
      const productName = String(p.name || '').toUpperCase();
      const lines = doc.splitTextToSize(productName, safeW - (padding * 2));
      const displayLines = lines.slice(0, 2); // Max 2 lines
      doc.text(displayLines, centerX, currentY, { align: 'center' });
      currentY += (4.5 * contentScale * displayLines.length);
    }

    // Preço
    if (config.showPrice && Number(p.price) >= 0) {
      doc.setFont('helvetica', 'bolditalic');
      doc.setFontSize(10 * contentScale);
      doc.text(String(`R$ ${Number(p.price || 0).toFixed(2)}`), centerX, currentY + (2 * contentScale), { align: 'center' });
      currentY += 6 * contentScale;

      if (config.showInstallments) {
        const installmentsNum = Number(config.installments || 0);
        if (installmentsNum > 1) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(5.5 * contentScale);
          const instVal = (Number(p.price || 0) / installmentsNum).toFixed(2);
          doc.text(String(`${installmentsNum}X R$ ${instVal}`), centerX, currentY, { align: 'center' });
          currentY += 4 * contentScale;
        }
      }
    }

    // QR Code / Barcode (Lógica de Visibilidade Estrita)
    if (config.showQRCode) {
      try {
        // Cálculo de tamanho garantido para leitura
        // Em etiquetas pequenas (ex: 30x30), o QR deve ser o protagonista
        const qrSize = Math.max(16, Math.min(safeW * 0.85, safeH - (currentY - safeY) - padding - 2));
        
        if (toDataUrlFn) {
          // Geramos com escala alta para garantir que os pontos do QR sejam nítidos e legíveis
          const qrDataUrl = await toDataUrlFn(p.barcode || p.sku || p.id || '123456789', { 
            margin: 1, 
            scale: 8 
          });
          
          const qrX = centerX - (qrSize / 2);
          doc.addImage(qrDataUrl, 'PNG', qrX, currentY, qrSize, qrSize);
          currentY += qrSize + (1 * contentScale);
        }

        if (config.showCodeNumber) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(Math.max(5.2 * contentScale, 4.5));
          const code = p.barcode || p.sku || p.id || '';
          doc.text(String(code).substring(0, 25), centerX, currentY + (1.2 * contentScale), { align: 'center' });
          currentY += 3.5 * contentScale;
        }
      } catch (err) {
        console.error('Falha ao renderizar QR Code:', err);
      }
    } else if (config.showBarcode) {
      // Espaço reservado para código de barras tradicional (se futuramente implementado)
      doc.setFontSize(5);
      doc.text("BARCODE", centerX, currentY + 5, { align: 'center' });
    }

    // Kit
    if (config.showKit) {
      const boxW = 8 * contentScale;
      const boxH = 4 * contentScale;
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.2);
      doc.rect(centerX - (boxW/2), currentY, boxW, boxH, 'S');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5 * contentScale);
      doc.text("KIT", centerX, currentY + (3 * contentScale), { align: 'center' });
      currentY += boxH + (2 * contentScale);
    }

    // Observação
    if (config.showDate && p.observation) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(4.5 * contentScale);
      doc.setTextColor(100, 100, 100);
      doc.text(String(p.observation || '').substring(0, 30), centerX, currentY, { align: 'center' });
      doc.setTextColor(0, 0, 0);
    }

    // Data de Impressão
    if (config.showPrintDate) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(4 * contentScale);
      doc.setTextColor(150, 150, 150);
      doc.text(String(new Date().toLocaleDateString('pt-BR')), centerX, safeY + safeH - 1.5, { align: 'center' });
      doc.setTextColor(0, 0, 0);
    }
  };

  if (isThermal) {
    // Rolo térmico: Uma etiqueta por página
    let first = true;
    for (const item of items) {
      for (let i = 0; i < item.quantity; i++) {
        if (!first) doc.addPage([paperW, paperH]);
        await drawSingleLabel(item.product, 0, 0, paperW, paperH);
        first = false;
      }
    }
  } else {
    // Folha (A4/A6): Grid
    const mTop = config.marginTop || 0;
    const mLeft = config.marginLeft || 0;
    const mRight = config.marginRight || 0;
    const labelW = Number(config.width) || 40;
    const labelH = Number(config.height) || 25;
    const hGap = config.hGap || 0;
    const vGap = config.vGap || 0;
    
    // Cálculo de centralização horizontal automática se não for térmico
    const availWidth = paperW - mLeft - mRight;
    const labelsPerRow = Math.max(1, Math.floor((availWidth + hGap) / (labelW + hGap)));
    const totalRowWidth = (labelsPerRow * labelW) + ((labelsPerRow - 1) * hGap);
    const centeringOffset = (availWidth - totalRowWidth) / 2;
    
    let currentX = mLeft + centeringOffset;
    let currentY = mTop;
    let labelsInPage = 0;

    for (const item of items) {
      for (let i = 0; i < item.quantity; i++) {
        // Verifica se cabe na largura
        if (currentX + labelW > paperW - mRight + 0.1) {
          currentX = mLeft + centeringOffset;
          currentY += labelH + vGap;
        }

        // Verifica se cabe na altura da página
        if (currentY + labelH > paperH - (config.marginBottom || 0) + 0.1) {
          doc.addPage([paperW, paperH]);
          currentX = mLeft + centeringOffset;
          currentY = mTop;
        }

        await drawSingleLabel(item.product, currentX, currentY, labelW, labelH);
        currentX += labelW + hGap;
        labelsInPage++;
      }
    }
  }

    if (mode === 'download') {
      doc.save(`etiquetas_${new Date().getTime()}.pdf`);
    } else if (mode === 'preview') {
      const blob = doc.output('blob');
      const pdfUrl = URL.createObjectURL(blob);
      const newWin = window.open(pdfUrl, '_blank');
      if (!newWin) {
        doc.save(`etiquetas_${new Date().getTime()}.pdf`);
      }
    } else if (mode === 'print') {
      // Direct printing logic
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = url;
      document.body.appendChild(iframe);
      
      iframe.onload = () => {
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
          URL.revokeObjectURL(url);
        }, 3000);
      };
    }
  isGeneratingPDF = false;
  return true;
} catch (err) {
  console.error("Erro ao gerar PDF:", err);
  isGeneratingPDF = false;
  return false;
}
};


export const getPrintLabel = (printMode: string, defaultLabel: string = "Imprimir") => {
  return printMode === 'browser' ? "Gerar PDF" : defaultLabel;
};

export const getPrintIcon = (printMode: string, iconSize: number = 18) => {
  return printMode === 'browser' ? <FileText size={iconSize} /> : <Printer size={iconSize} />;
};

function hashString(str: string) {
  let hash = 0;
  if (str.length === 0) return '0';
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

function secureHash(str: string) { return `h:${hashString(str)}`; }
function isHashed(str: string) { return str ? str.startsWith('h:') : false; }
function verifyPassword(input: string, stored: string) {
  if (!stored) return false;
  if (isHashed(stored)) {
    return secureHash(input) === stored;
  }
  return input === stored;
}

export default function App() {
  // --- Surgically clean test data for production (One-time execution) ---
  useEffect(() => {
    const SYSTEM_VERSION_KEY = '__SYSTEM_CLEANED_PROD_V6__';
    const isCleaned = localStorage.getItem(SYSTEM_VERSION_KEY);

    if (!isCleaned) {
      const performSurgicalCleanup = async () => {
        console.log('[PROD] Iniciando limpeza cirúrgica de dados de teste...');
        
        try {
          // Identify Admin from localStorage directly
          const storedUsersRaw = localStorage.getItem(STORAGE_KEYS.USERS);
          let adminUser = null;
          if (storedUsersRaw) {
            try {
              const storedUsers = JSON.parse(storedUsersRaw);
              adminUser = storedUsers.find((u: any) => u.id === 'admin' || (u.username && (u.username.toUpperCase() === 'ADM' || u.username.toLowerCase() === 'admin')));
            } catch (e) {
              console.error('Error parsing users for cleanup', e);
            }
          }

          // Tables to clear in IndexedDB (Dexie)
          const tablesToClear = [
            'products', 'customers', 'sales', 'activities', 
            'revenues', 'purchases', 'expenses', 'raw_materials', 
            'product_recipes', 'stock_moves', 'deliveries',
            'shopkeepers', 'shopkeeper_deliveries', 'calculator_materials',
            'calculator_projects', 'cashier_sessions', 'pre_orders',
            'categories', 'subcategories', 'product_locations', 'stock_inventories'
          ];

          for (const table of tablesToClear) {
            if ((db as any)[table]) {
              try {
                await (db as any)[table].clear();
              } catch (e) {
                console.warn(`Could not clear table ${table}`, e);
              }
            }
          }

          // LocalStorage keys to clear
          const keysToClear = [
            STORAGE_KEYS.PRODUCTS, STORAGE_KEYS.SALES, STORAGE_KEYS.CUSTOMERS, 
            STORAGE_KEYS.CATEGORIES, STORAGE_KEYS.SUBCATEGORIES,
            STORAGE_KEYS.CLOSED_SESSIONS, STORAGE_KEYS.CASHIER_SESSION, 
            STORAGE_KEYS.OPEN_SESSIONS, STORAGE_KEYS.ACTIVITIES,
            STORAGE_KEYS.REVENUES, STORAGE_KEYS.PURCHASES, STORAGE_KEYS.EXPENSES,
            STORAGE_KEYS.INVENTORIES, STORAGE_KEYS.PRODUCT_RECIPES,
            STORAGE_KEYS.RAW_MATERIALS, STORAGE_KEYS.CATALOG_DESCRIPTIONS, 
            STORAGE_KEYS.SHOPKEEPERS, STORAGE_KEYS.SHOPKEEPER_DELIVERIES, 
            STORAGE_KEYS.CALCULATOR_MATERIALS, STORAGE_KEYS.CALCULATOR_PROJECTS,
            STORAGE_KEYS.PRE_ORDERS, STORAGE_KEYS.LABEL_LOT, 
            STORAGE_KEYS.PRODUCT_LOCATIONS, STORAGE_KEYS.ORDER_COUNTER
          ];

          keysToClear.forEach(key => localStorage.removeItem(key));

          // Restore Admin User if found, otherwise bootstrap default
          if (adminUser) {
            logger.info('Administrador encontrado na limpeza cirúrgica.', { username: adminUser.username }, 'Setup');
            localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify([adminUser]));
          } else {
            logger.warn('Administrador não encontrado na limpeza. Criando administrador padrão...', null, 'Setup');
            const defaultAdmin = {
              id: 'admin',
              username: 'admin',
              name: 'Administrador Mestre',
              password: secureHash('ADM1234'),
              roleId: 'role-gerente',
              isActive: true,
              isFirstAccess: true,
              createdAt: Date.now(),
              updatedAt: Date.now()
            };
            localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify([defaultAdmin]));
            logger.info('Administrador padrão criado com sucesso durante a limpeza.', { username: 'admin' }, 'Setup');
          }

          // Mark as cleaned
          localStorage.setItem(SYSTEM_VERSION_KEY, 'true');
          console.log('[PROD] Limpeza concluída. Reiniciando para aplicar mudanças...');
          
          setTimeout(() => {
            window.location.reload();
          }, 800);
        } catch (err) {
          console.error('[PROD] Erro crítico na limpeza:', err);
          localStorage.setItem(SYSTEM_VERSION_KEY, 'error');
        }
      };

      performSurgicalCleanup();
    }
  }, []);

  const [users, setUsers] = useState<SystemUser[]>([]);
  const [roles, setRoles] = useState<Role[]>(() => carregarDados(STORAGE_KEYS.ROLES, INITIAL_ROLES));
  const [currentUser, setCurrentUser] = useState<SystemUser | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [orderCounter, setOrderCounter] = useState<number>(() => carregarDados(STORAGE_KEYS.ORDER_COUNTER, 0));

  const [view, setView] = useState<View>(() => {
    // Check if ADM is already set up in users
    const usersData = carregarDados(STORAGE_KEYS.USERS, []);
    const adm = usersData.find((u: any) => u.username && (u.username.toUpperCase() === 'ADM' || u.username.toLowerCase() === 'admin'));
    if (!adm) return 'dashboard'; // Will show login but check default
    return 'dashboard';
  });
  const [newAdmUsername, setNewAdmUsername] = useState('admin');
  const [newAdmPassword, setNewAdmPassword] = useState('');
  const [confirmAdmPassword, setConfirmAdmPassword] = useState('');
  const [generatedMasterCode, setGeneratedMasterCode] = useState('');
  const [recoveryMasterCodeInput, setRecoveryMasterCodeInput] = useState('');
  const [recoveryNewPassword, setRecoveryNewPassword] = useState('');
  const [recoveryConfirmPassword, setRecoveryConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    salvarDados(STORAGE_KEYS.ORDER_COUNTER, orderCounter);
  }, [orderCounter]);

  const showGlobalError = (msg: string) => {
    setError(msg);
    // Auto-limpar após 8 segundos se não for fechado manualmente
    setTimeout(() => {
      setError(prev => prev === msg ? null : prev);
    }, 8000);
  };

  const handleConfirmReturn = (saleId: string, items: { productId: string, quantity: number }[], reason: string) => {
    const sale = sales.find(s => s.id === saleId);
    if (!sale || !currentUser) return;

    const returnId = Date.now().toString();
    const newReturn: SaleReturn = {
      id: returnId,
      items: items,
      reason,
      date: Date.now(),
      userId: currentUser.id,
      userName: currentUser.name
    };

    // Update Sale
    setSales(prev => prev.map(s => {
      if (s.id === saleId) {
        return {
          ...s,
          returns: [...(s.returns || []), newReturn]
        };
      }
      return s;
    }));

    // Update Stock
    setProducts((prevP: Product[]) => prevP.map(p => {
      const returnedItem = items.find(ri => ri.productId === p.id);
      if (returnedItem) {
        return { ...p, stock: (p.stock || 0) + returnedItem.quantity };
      }
      return p;
    }));

    // Audit / Activity
    addActivity('sale', 'Devolução Realizada', `Usuário ${currentUser.name} realizou devolução no pedido ${sale.sequentialId || sale.id.substring(0, 8)}`);
    
    alert('Devolução registrada com sucesso!');
    // Redirecionamento removido para manter o usuário na tela de devolução
  };
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isRightDrawerOpen, setIsRightDrawerOpen] = useState(false);
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dynamicVersion, setDynamicVersion] = useState<string>(APP_VERSION);
  const [hardwarePrinters, setHardwarePrinters] = useState<any[]>([]);
  const [registeredPrinters, setRegisteredPrinters] = useState<any[]>(() => carregarDados(STORAGE_KEYS.REGISTERED_PRINTERS, []));
  const [selectedPrinter, setSelectedPrinter] = useState<string>('');
  const [selectedLabelPrinter, setSelectedLabelPrinter] = useState<string>('');
  const [selectedLabelProduct, setSelectedLabelProduct] = useState<Product | null>(null);
  const [labelLot, setLabelLot] = useState<{product: Product, quantity: number, selected: boolean}[]>(() => {
    const data = carregarDados(STORAGE_KEYS.LABEL_LOT, []);
    return data.map((item: any) => ({ ...item, selected: item.selected !== false }));
  });
  const [preOrders, setPreOrders] = useState<PreOrder[]>(() => carregarDados(STORAGE_KEYS.PRE_ORDERS, []));
  const [syncStatus, setSyncStatus] = useState<ServiceStatus>(navigator.onLine ? 'online' : 'offline');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const isPrintingRef = useRef(false);
  const isRestoringRef = useRef(false);

  useEffect(() => {
    syncService.setStatusCallback((status) => {
      setSyncStatus(status);
      setIsOnline(status !== 'offline');
    });
    syncService.startSync();
  }, []);
  
  // PWA Automatic Reload on Update
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // Quando o novo service worker assume o controle, recarregamos a página
        window.location.reload();
      });
    }
  }, []);

  useEffect(() => {
    salvarDados(STORAGE_KEYS.PRE_ORDERS, preOrders);
  }, [preOrders]);

  const lastPrintTime = useRef(0);

  const performUnifiedPrint = async (type: string, content: string, printer: string, mode: string, dims?: { width?: number, height?: number | string, format?: string, orientation?: 'portrait' | 'landscape' }, target: 'print' | 'download' = 'print'): Promise<boolean> => {
    const now = Date.now();
    if (now - lastPrintTime.current < 2000) {
      console.warn("[Impressão] Bloqueando chamada duplicada no intervalo de 2s", type);
      return false;
    }
    
    if (isPrintingRef.current) {
      console.warn("[Impressão] Bloqueando chamada duplicada simultânea", type);
      return false;
    }
    
    isPrintingRef.current = true;
    lastPrintTime.current = now;
    
    try {
      const targetPrinter = printer || selectedPrinter;
      
      const PX_PER_MM = 3.7795275591;
      const d = dims as any;
      
      // Use the global utility to get correct dimensions considering orientation
      const paperDims = getPaperDimensions({
        format: d?.format,
        orientation: d?.orientation,
        customWidth: d?.customWidth || d?.width,
        customHeight: d?.customHeight || d?.height,
        width: d?.width,
        height: d?.height
      });
      
      const paperWidth = paperDims.widthMm;
      const paperHeightRaw = paperDims.heightMm;
      const isThermalFormat = d?.format === '80mm' || d?.format === '58mm' || d?.format === 'thermal' || paperDims.heightMm === 'auto';
      const isFixedSize = paperDims.heightMm !== 'auto';
      
      const pxWidth = Math.round(paperWidth * PX_PER_MM);

      // ELECTRON AUTO-PRINT
      if (mode === 'auto' && (window as any).electronAPI) {
        try {
          if (!targetPrinter) {
            alert('Nenhuma impressora real selecionada. Por favor, configure uma impressora nas configurações de Hardware.');
            isPrintingRef.current = false;
            return false;
          }

          const printOptions: any = { 
            deviceName: targetPrinter, 
            silent: true,
            printBackground: true,
            margins: { marginType: 'none' },
            scaleFactor: 100
          };

          // Define paper size precisely to avoid printer fallback to A4
          if (dims?.format === 'a4') {
            printOptions.pageSize = 'A4';
          } else if (dims?.format === 'a6') {
            printOptions.pageSize = { 
              width: Math.round(paperWidth * 1000), 
              height: Math.round((typeof paperHeightRaw === 'number' ? paperHeightRaw : 148.5) * 1000) 
            };
          } else if (dims?.format === '58mm' || paperWidth === 58) {
            printOptions.pageSize = { width: 58000, height: 2000000 }; // Continuous for thermal
          } else if (dims?.format === '80mm' || dims?.format === 'thermal' || paperWidth === 80) {
            printOptions.pageSize = { width: 80000, height: 2000000 }; // Continuous for thermal
          } else if (paperWidth && paperHeightRaw) {
            const h = typeof paperHeightRaw === 'number' ? paperHeightRaw : 297;
            printOptions.pageSize = { 
              width: Math.round(paperWidth * 1000), 
              height: Math.round(h * 1000) 
            };
          }

          if (dims?.orientation) {
            printOptions.landscape = dims.orientation === 'landscape';
          }

          const result = await (window as any).electronAPI.print(content, printOptions);
          isPrintingRef.current = false;
          if (result.success) return true;
          
          const errorMsg = `Erro ao imprimir em "${targetPrinter}": ${result.error || 'Erro desconhecido'}.`;
          if (!confirm(`${errorMsg}\n\nDeseja abrir o diálogo de impressão do navegador como fallback?`)) return false;
          isPrintingRef.current = true; // For fallback
        } catch (error) {
          console.error('[Impressão] Falha na Electron API:', error);
          if (!confirm('Erro ao comunicar com o sistema de impressão Desktop. Deseja usar o navegador?')) {
            isPrintingRef.current = false;
            return false;
          }
          isPrintingRef.current = true; // For fallback
        }
      }

      // BROWSER PRINT OR PDF GENERATION
      return await new Promise((resolve, reject) => {
        // RESPEITAR O ALVO SOLICITADO (PRINT OU DOWNLOAD)
        // Antes estava forçado a 'download' se fosse no browser, o que impedia a impressão direta.
        const finalTarget = target;
        
        const finalPaperHeightMm = isFixedSize ? (Number(paperHeightRaw) || 297) : (isThermalFormat ? 1000 : 297);
        const pxHeight = Math.round(finalPaperHeightMm * PX_PER_MM);

        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.left = '-9999px';
        iframe.style.top = '0';
        iframe.style.width = pxWidth + 'px';
        iframe.style.height = (isFixedSize ? pxHeight : 1000) + 'px';
        iframe.style.visibility = 'hidden';
        
        // Timeout de segurança para não travar o isPrintingRef se algo falhar silenciosamente
        const safetyTimeout = setTimeout(() => {
          if (isPrintingRef.current) {
            console.warn("[Impressão] Safety timeout disparado - Liberando isPrintingRef");
            isPrintingRef.current = false;
            if (iframe.parentNode) document.body.removeChild(iframe);
            reject(new Error('Timeout na geração do documento'));
          }
        }, 15000);

        let hasProcessed = false;
        iframe.onload = async () => {
          if (hasProcessed) return;
          hasProcessed = true;
          
          try {
            // Pequeno delay para renderização de fontes/estilos
            await new Promise(r => setTimeout(r, 800));
            
            const docContent = iframe.contentDocument || iframe.contentWindow?.document;
            if (!docContent) throw new Error('Iframe content not accessible');

            // If PDF target, use html2canvas + jsPDF
            if (finalTarget === 'download' || d?.outputType === 'pdf') {
              const contentBody = docContent.body;
              
              // Force exact width and allow height to be auto
              contentBody.style.width = pxWidth + 'px';
              contentBody.style.height = 'auto';
              contentBody.style.margin = '0';
              contentBody.style.padding = '0';

              const actualHeightPx = Math.max(10, contentBody.scrollHeight || contentBody.offsetHeight);
              const actualHeightMm = actualHeightPx / PX_PER_MM;
              
              const renderScale = 2;

              const canvas = await html2canvas(contentBody, {
                scale: renderScale,
                useCORS: true,
                backgroundColor: '#ffffff',
                width: pxWidth,
                height: actualHeightPx,
                windowWidth: pxWidth,
                windowHeight: actualHeightPx,
                logging: false,
                onclone: (clonedDoc) => {
                  const clonedBody = clonedDoc.body;
                  clonedBody.style.width = pxWidth + 'px';
                  clonedBody.style.height = 'auto';
                }
              });

              const imgData = canvas.toDataURL('image/jpeg', 0.95);
              
              const finalHeightMm = isFixedSize ? (Number(paperHeightRaw) || 297) : actualHeightMm;

              const pdfDoc = new jsPDF({
                orientation: d?.orientation || (paperWidth > finalHeightMm ? 'landscape' : 'portrait'),
                unit: 'mm',
                format: [paperWidth, finalHeightMm],
                compress: true
              });

              // Centering vertically if content is smaller than fixed paper
              const imgHeightOnPdf = isFixedSize ? Math.min(finalHeightMm, actualHeightMm) : actualHeightMm;
              const yOffset = isFixedSize ? Math.max(0, (finalHeightMm - actualHeightMm) / 2) : 0;
              
              pdfDoc.addImage(imgData, 'JPEG', 0, yOffset, paperWidth, imgHeightOnPdf, undefined, 'FAST');

              if (finalTarget === 'download') {
                pdfDoc.save(`${type.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}.pdf`);
              } else {
                // FALLBACK: Se window.open falhar, tenta download
                try {
                  const blob = pdfDoc.output('blob');
                  const blobUrl = URL.createObjectURL(blob);
                  const newWindow = window.open(blobUrl, '_blank');
                  if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
                    throw new Error('Pop-up blocked');
                  }
                } catch (e) {
                  console.warn('[Impressão] Pop-up bloqueado ou falhou, fazendo download direto');
                  pdfDoc.save(`${type.replace(/\s+/g, '_').toLowerCase()}.pdf`);
                }
              }
            } else {
              // Standard Browser Print
              iframe.contentWindow?.focus();
              iframe.contentWindow?.print();
            }

            clearTimeout(safetyTimeout);
            setTimeout(() => {
              if (iframe.parentNode) document.body.removeChild(iframe);
              isPrintingRef.current = false;
              resolve(true);
            }, 800);
          } catch (err) {
            clearTimeout(safetyTimeout);
            console.error('[Impressão] Erro no processamento:', err);
            if (iframe.parentNode) document.body.removeChild(iframe);
            isPrintingRef.current = false;
            reject(err);
          }
        };

        // Adiciona ao corpo e escreve o conteúdo
        document.body.appendChild(iframe);
        const docContent = iframe.contentDocument || iframe.contentWindow?.document;
        if (docContent) {
          docContent.open();
          docContent.write(content);
          
          // Injetar estilos dinâmicos do PrintService no iframe
          const styleOptions = {
            format: d?.format as any,
            orientation: d?.orientation,
            customWidth: d?.width,
            customHeight: d?.height
          };
          const dynamicStyles = PrintService.getPrintStyles(styleOptions);
          const styleEl = docContent.createElement('style');
          styleEl.innerHTML = dynamicStyles;
          docContent.head.appendChild(styleEl);

          docContent.close();
        } else {
          clearTimeout(safetyTimeout);
          if (iframe.parentNode) document.body.removeChild(iframe);
          isPrintingRef.current = false;
          reject(new Error('Falha ao abrir documento no iframe'));
        }
      });
    } catch (err) {
      isPrintingRef.current = false;
      console.error('[Impressão] Erro fatal:', err);
      return false;
    }
  };

  const addToLabelLot = (product: Product, quantity: number) => {
    setLabelLot(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + quantity, selected: true } : item);
      }
      return [...prev, { product, quantity, selected: true }];
    });
    alert(`${quantity} etiquetas de "${product.name}" adicionadas ao lote.`);
  };

  const updateLabelLotItem = (index: number, updates: Partial<{quantity: number, selected: boolean}>) => {
    setLabelLot(prev => prev.map((item, i) => i === index ? { ...item, ...updates } : item));
  };

  const clearLabelLot = () => {
    setLabelLot([]);
    localStorage.setItem(STORAGE_KEYS.LABEL_LOT, JSON.stringify([]));
  };

  const removeFromLabelLot = (index: number) => {
    setLabelLot(prev => prev.filter((_, i) => i !== index));
  };

  const [printers, setPrinters] = useState<PrinterConfig[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [catalogDescriptions, setCatalogDescriptions] = useState<Record<string, string>>({});
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [deliveryChannels, setDeliveryChannels] = useState<DeliveryChannel[]>([]);
  const [deliveryMethods, setDeliveryMethods] = useState<DeliveryMethod[]>([]);
  const [closedSessions, setClosedSessions] = useState<CashierSession[]>([]);
  const [shopkeepers, setShopkeepers] = useState<Shopkeeper[]>([]);
  const [shopkeeperDeliveries, setShopkeeperDeliveries] = useState<ShopkeeperDelivery[]>([]);
  const [calculatorMaterials, setCalculatorMaterials] = useState<any[]>(() => carregarDados(STORAGE_KEYS.CALCULATOR_MATERIALS, []));
  const [calculatorProjects, setCalculatorProjects] = useState<any[]>(() => carregarDados(STORAGE_KEYS.CALCULATOR_PROJECTS, []));

  const generateReceiptHTML = async (sale: Sale, products: Product[], customers: Customer[], company: CompanyInfo, config: CouponConfig, customTitle?: string) => {
    const customer = customers.find(c => c.id === sale.customerId);
    const itemsHtml = sale.items.map(item => {
      const p = products.find(prod => prod.id === item.productId);
      const originalPrice = p?.price || item.price;
      const discountPerUnit = originalPrice - item.price;
      const hasDiscount = (config.showDiscount || config.showDiscounts) && discountPerUnit > 0;

      return `
        <tr class="item-row">
          <td class="item-qty">${item.quantity}x</td>
          <td class="item-desc">
            <div class="item-name">${p?.name || 'Item'}</div>
            ${config.showItemUnitPrice ? `<div class="item-unit">R$ ${item.price.toFixed(2)}</div>` : ''}
            ${hasDiscount ? `<div class="item-discount">Economia: R$ ${(discountPerUnit * item.quantity).toFixed(2)}</div>` : ''}
          </td>
          <td class="item-total">R$ ${(item.price * item.quantity).toFixed(2)}</td>
        </tr>
      `;
    }).join('');

    const qrDataUrl = await generateStyledQRCode(sale.sequentialId?.toString() || sale.id, config.qrCodeDesign || INITIAL_QR_DESIGN);
    const { pageSizeCss, widthCss, heightCss, width: paperWidthMm } = getPaperDimensions(config);

    // Payment methods summary
    const getPaymentLabel = (method: string) => {
      const map: Record<string, string> = {
        'pix': 'PIX',
        'dinheiro': 'DINHEIRO',
        'cartao': 'CARTÃO',
        'cartao_credito': 'C. CRÉDITO',
        'cartao_debito': 'C. DÉBITO',
        'transferencia': 'TRANSFERÊNCIA',
        'outros': 'OUTROS'
      };
      return map[(method || '').toLowerCase()] || (method || 'PAGAMENTO').toUpperCase();
    };

    let paymentsHtml = '';
    if (sale.payments && sale.payments.length > 0) {
      paymentsHtml = sale.payments.map(p => `
        <div class="payment-row">
          <span>${getPaymentLabel(p.method)}</span>
          <span>R$ ${p.amount.toFixed(2)}</span>
        </div>
      `).join('');
    } else {
      paymentsHtml = `
        <div class="payment-row">
          <span>${getPaymentLabel(sale.paymentMethod || 'NÃO SPECIF.')}</span>
          <span>R$ ${sale.total.toFixed(2)}</span>
        </div>
      `;
    }

    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8">
          <title>${customTitle || 'Cupom'} #${sale.sequentialId}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=JetBrains+Mono:wght@700&display=swap');
            
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              color-scheme: light;
            }

            @page {
              size: ${pageSizeCss};
              margin: 0;
            }
            
            html, body {
              margin: 0;
              padding: 0;
              background-color: #ffffff !important;
              color: #000000 !important;
              width: ${paperWidthMm}mm;
              min-width: ${paperWidthMm}mm;
              max-width: ${paperWidthMm}mm;
              font-family: 'Inter', -apple-system, sans-serif;
              line-height: 1.2;
            }
            body { 
              display: flex;
              flex-direction: column;
              align-items: center;
              height: auto;
            }
            
            .outer-container {
              width: 100%;
              padding: ${config.format === 'a4' ? '15mm' : config.format === 'a6' ? '5mm' : '3mm'};
              display: flex;
              flex-direction: column;
              align-items: center;
              overflow: hidden;
            }

            .scale-to-fit {
              width: 100%;
              display: flex;
              flex-direction: column;
              align-items: center;
            }
            
            .header { 
              width: 100%;
              text-align: center; 
              margin-bottom: 4mm; 
              display: flex;
              flex-direction: column;
              align-items: center;
              border-bottom: 1px dashed #000;
              padding-bottom: 4mm;
            }
            .header img { 
              max-width: 35mm; 
              max-height: 20mm; 
              object-fit: contain;
              margin-bottom: 3mm; 
            }
            .company-name { 
              font-size: 14px; 
              font-weight: 900; 
              text-transform: uppercase; 
              margin: 0;
              letter-spacing: -0.2px;
            }
            .company-info { 
              font-size: 9px; 
              font-weight: 400;
              color: #000 !important;
              margin-top: 1mm;
              text-transform: uppercase;
            }

            .header-message {
              font-size: 10px;
              font-weight: 700;
              text-transform: uppercase;
              margin-top: 3mm;
              width: 100%;
              text-align: center;
            }

            .badge-title {
              width: 100%;
              text-align: center;
              font-size: 12px;
              font-weight: 900;
              padding: 2mm 0;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 4mm;
              border-bottom: 1px solid #000;
            }

            .customer-section {
              width: 100%;
              font-size: 9px;
              margin-bottom: 4mm;
              padding: 2mm;
              border: 1px solid #eee;
              background-color: #f9f9f9 !important;
            }
            .customer-title { font-weight: 900; margin-bottom: 1mm; border-bottom: 1px solid #ddd; padding-bottom: 1mm; }

            .items-table { 
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 4mm;
            }
            .items-table th {
              text-align: left;
              font-size: 9px;
              font-weight: 900;
              text-transform: uppercase;
              border-bottom: 1px solid #000;
              padding-bottom: 1mm;
            }
            .item-row td {
              padding: 2mm 0;
              vertical-align: top;
              border-bottom: 1px solid #eee;
            }
            .item-qty { font-size: 10px; font-weight: 900; width: 8mm; }
            .item-desc { font-size: 10px; padding-right: 2mm !important; }
            .item-name { font-weight: 700; text-transform: uppercase; }
            .item-unit { font-size: 8px; color: #666; }
            .item-discount { font-size: 8px; color: #d00; font-weight: 700; }
            .item-total { font-size: 10px; font-weight: 900; text-align: right; white-space: nowrap; }

            .summary-section {
              width: 100%;
              margin-top: 2mm;
              padding-top: 2mm;
              border-top: 2px solid #000;
            }
            .summary-row {
              display: flex;
              justify-content: space-between;
              font-size: 10px;
              font-weight: 700;
              margin-bottom: 1mm;
            }
            .summary-total {
              font-size: 16px;
              font-weight: 900;
              border-top: 1px solid #000;
              padding-top: 2mm;
              margin-top: 2mm;
            }

            .payments-section {
              width: 100%;
              margin-top: 4mm;
              padding: 2mm;
              background-color: #fefefe !important;
              border: 1px solid #eee;
            }
            .payment-title { font-size: 10px; font-weight: 900; border-bottom: 1px solid #ddd; margin-bottom: 2mm; padding-bottom: 1mm; text-transform: uppercase; }
            .payment-row {
              display: flex;
              justify-content: space-between;
              font-size: 10px;
              font-weight: 700;
              margin-bottom: 1mm;
            }

            .footer {
              width: 100%;
              text-align: center;
              border-top: 1px dashed #000;
              padding-top: 4mm;
              margin-top: 6mm;
            }
            .footer-msg {
              font-size: 10px;
              font-weight: 700;
              margin-bottom: 4mm;
              text-transform: uppercase;
            }
            
            .qr-wrapper img { width: 30mm; height: 30mm; display: block; margin: 0 auto; }
            .order-ref { font-size: 8px; font-weight: 900; margin-top: 2mm; text-transform: uppercase; opacity: 0.7; }
          </style>
        </head>
        <body>
          <div class="scale-to-fit">
            <div class="outer-container">
              <div class="header">
              ${company.logo && config.showLogo ? `<img src="${company.logo}" />` : ''}
              ${config.showCompanyName ? `<h3 class="company-name">${company.tradeName || company.name || 'EMPRESA'}</h3>` : ''}
              ${config.showAddress ? `
                <div class="company-info">${company.address.logradouro}, ${company.address.numero}</div>
                <div class="company-info">${company.address.bairro} - ${company.address.cidade}/${company.address.estado}</div>
              ` : ''}
              ${config.headerMessage ? `<p class="header-message">${config.headerMessage}</p>` : ''}
            </div>

            <div class="badge-title">${customTitle || 'EXTRATO DE PEDIDO'} #${sale.sequentialId}</div>

            ${config.showCustomerData && customer ? `
              <div class="customer-section">
                <div class="customer-title">DADOS DO CLIENTE</div>
                <div><b>NOME:</b> ${customer.name.toUpperCase()}</div>
                ${customer.taxId ? `<div><b>DOC:</b> ${maskCPF_CNPJ(customer.taxId)}</div>` : ''}
                ${customer.phone || customer.whatsapp ? `<div><b>FONE:</b> ${maskPhone(customer.phone || customer.whatsapp || '')}</div>` : ''}
                ${customer.address ? `<div><b>END:</b> ${customer.address.street}, ${customer.address.number}</div>` : ''}
              </div>
            ` : ''}
            
            <table class="items-table">
              <thead>
                <tr>
                  <th style="width: 8mm">QTD</th>
                  <th>DESCRIÇÃO</th>
                  <th style="text-align: right">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
            
            <div class="summary-section">
              <div class="summary-row">
                <span>SUBTOTAL:</span>
                <span>R$ ${sale.total.toFixed(2)}</span>
              </div>
              ${config.showFinalTotal ? `
                <div class="summary-row summary-total">
                  <span>TOTAL:</span>
                  <span>R$ ${sale.total.toFixed(2)}</span>
                </div>
              ` : ''}
            </div>

            ${config.showPaymentMethod ? `
              <div class="payments-section">
                <div class="payment-title">FORMA DE PAGAMENTO</div>
                ${paymentsHtml}
              </div>
            ` : ''}

            <div class="footer">
              ${config.footerMessage ? `<p class="footer-msg">${config.footerMessage}</p>` : ''}
              ${config.showDateTime ? `<div class="company-info" style="margin-bottom: 4mm">${new Date(sale.date).toLocaleString('pt-BR')}</div>` : ''}
              ${qrDataUrl && config.showOrderQrCode ? `
                <div class="qr-wrapper"><img src="${qrDataUrl}" /></div>
                <div class="order-ref">#${sale.sequentialId || sale.id.substring(0, 8)}</div>
              ` : ''}
            </div>
          </div>
        </body>
      </html>
    `;
  };

  const generateStyledQRCode = async (content: string, design?: QRCodeDesignConfig) => {
    if (!design) return await QRCode.toDataURL(content);
    
    // Level 'H' is needed for logo/customizations to ensure scannability (High error correction)
    const options: any = {
      level: 'H',
      margin: 1,
      scale: 8,
      color: {
        dark: design.color || '#000000',
        light: design.backgroundColor || '#FFFFFF'
      }
    };

    try {
      const dataUrl = await QRCode.toDataURL(content, options);
      
      // If no advanced styling or logo, return basic dataUrl
      if (design.style === 'standard' && !design.logoUrl && design.dotType === 'square') {
        return dataUrl;
      }

      // Final canvas composite for Logo or Styles
      return new Promise<string>((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const qrImg = new Image();
        qrImg.src = dataUrl;
        
        qrImg.onload = () => {
          // Increase canvas size for better resolution and margin
          const padding = 20;
          canvas.width = qrImg.width + (padding * 2);
          canvas.height = qrImg.height + (padding * 2);
          if (!ctx) { resolve(dataUrl); return; }

          // Force white background for scanning stability
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Draw standard QR centered
          ctx.drawImage(qrImg, padding, padding);

          if (design.style === 'logo' && design.logoUrl) {
            const logoImg = new Image();
            logoImg.crossOrigin = "anonymous";
            logoImg.src = design.logoUrl;
            logoImg.onload = () => {
              const logoSize = qrImg.width * 0.22;
              const x = (canvas.width - logoSize) / 2;
              const y = (canvas.height - logoSize) / 2;
              
              // White quiet zone around logo
              ctx.fillStyle = '#FFFFFF';
              ctx.beginPath();
              // Rounded rect for logo background
              const rad = 4;
              const qx = x - 4;
              const qy = y - 4;
              const qw = logoSize + 8;
              const qh = logoSize + 8;
              ctx.moveTo(qx + rad, qy);
              ctx.lineTo(qx + qw - rad, qy);
              ctx.quadraticCurveTo(qx + qw, qy, qx + qw, qy + rad);
              ctx.lineTo(qx + qw, qy + qh - rad);
              ctx.quadraticCurveTo(qx + qw, qy + qh, qx + qw - rad, qy + qh);
              ctx.lineTo(qx + rad, qy + qh);
              ctx.quadraticCurveTo(qx, qy + qh, qx, qy + qh - rad);
              ctx.lineTo(qx, qy + rad);
              ctx.quadraticCurveTo(qx, qy, qx + rad, qy);
              ctx.closePath();
              ctx.fill();
              
              ctx.drawImage(logoImg, x, y, logoSize, logoSize);
              resolve(canvas.toDataURL('image/png'));
            };
            logoImg.onerror = () => resolve(canvas.toDataURL('image/png'));
          } else {
            resolve(canvas.toDataURL('image/png'));
          }
        };
        qrImg.onerror = () => resolve(dataUrl);
      });
    } catch (e) {
      console.error(e);
      return '';
    }
  };

  const generateSimpleReceiptHTML = async (sale: Sale, company: CompanyInfo, config: CouponPDVConfig) => {
    const qrContent = sale.sequentialId?.toString() || sale.id;
    const qrDataUrl = await generateStyledQRCode(qrContent, config.qrCodeDesign || INITIAL_QR_DESIGN);

    const { pageSizeCss, widthCss, heightCss, width: paperWidthMm, heightMm } = getPaperDimensions(config);

    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8">
          <title>Recibo Moderno #${sale.sequentialId}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
            
            @page { 
              size: ${pageSizeCss};
              margin: 0;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              color-scheme: light;
            }
            html, body {
              margin: 0;
              padding: 0;
              background-color: #ffffff !important;
              color: #000000 !important;
              width: ${paperWidthMm}mm;
              min-width: ${paperWidthMm}mm;
              max-width: ${paperWidthMm}mm;
              font-family: 'Inter', -apple-system, sans-serif;
            }
            body { 
              padding: 0;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: ${heightMm === 'auto' ? 'flex-start' : 'center'};
              min-height: ${heightMm === 'auto' ? '100vh' : (heightMm + 'mm')};
              max-height: ${heightMm === 'auto' ? 'none' : (heightMm + 'mm')};
              overflow: hidden;
            }
            
            .outer-container {
              background-color: #ffffff !important;
              width: 100%;
              padding: ${config.format === 'a4' ? '15mm' : config.format === 'a6' ? '5mm' : '3mm'};
              display: flex;
              flex-direction: column;
              align-items: center;
              overflow: hidden;
            }

            .scale-to-fit {
              width: 100%;
              display: flex;
              flex-direction: column;
              align-items: center;
            }

            .main-title {
              color: #000 !important;
              font-size: 18px;
              font-weight: 900;
              text-transform: uppercase;
              margin: 0;
              text-align: center;
              letter-spacing: -0.5px;
            }

            .green-divider {
              width: 10mm;
              height: 1.5mm;
              background-color: #16d45f !important;
              border-radius: 2mm;
              margin: 4mm 0;
            }

            .badge {
              background-color: rgba(22, 212, 95, 0.1) !important;
              color: #16d45f !important;
              padding: 2mm 6mm;
              border-radius: 10mm;
              font-size: 10px;
              font-weight: 900;
              letter-spacing: 1.5px;
              text-transform: uppercase;
              margin-bottom: 6mm;
              border: 1px solid rgba(22, 212, 95, 0.2);
              white-space: nowrap;
            }

            .card {
              width: 100%;
              background: white !important;
              border-radius: 8mm;
              padding: ${config.format === 'a4' ? '12mm' : config.format === '80mm' ? '6mm' : '4mm'};
              display: flex;
              flex-direction: column;
              align-items: center;
              border: 1px solid #f1f5f9;
              box-shadow: 0 10px 20px rgba(0, 0, 0, 0.05);
            }

            .label-text {
              color: #888888 !important;
              font-size: 9px;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 2px;
              margin-bottom: 2mm;
            }

            .order-number {
              color: #000000 !important;
              font-size: 36px;
              font-weight: 900;
              margin: 0;
              letter-spacing: -1px;
            }

            .divider {
              width: 100%;
              height: 1px;
              background-color: #f1f5f9 !important;
              margin: 6mm 0;
            }

            .qr-wrapper {
              margin: 2mm 0 8mm 0;
            }
            .qr-wrapper img {
              width: 35mm;
              height: 35mm;
              display: block;
            }

            .info-row {
              width: 100%;
              display: flex;
              align-items: center;
              gap: 4mm;
              margin-bottom: 6mm;
            }
            .info-icon {
              width: 10mm;
              height: 10mm;
              background-color: rgba(22, 212, 95, 0.1) !important;
              color: #16d45f !important;
              border-radius: 4mm;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .info-icon svg {
              width: 6mm;
              height: 6mm;
            }
            .info-content {
              flex: 1;
              min-width: 0;
            }
            .info-label {
              color: #8b8b8b !important;
              font-size: 8px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .info-value {
              color: #000000 !important;
              font-size: 13px;
              font-weight: 900;
              text-transform: uppercase;
              margin: 0;
            }
          </style>
        </head>
        <body>
          <div class="scale-to-fit">
            <h1 class="main-title">${config.headerMessage || 'Pedido Criado'}</h1>
          <div class="green-divider"></div>
          <div class="badge">OPERAÇÃO FINALIZADA</div>

          <div class="card">
            <span class="label-text">NÚMERO DO PEDIDO</span>
            <h2 class="order-number">#${sale.sequentialId}</h2>
            
            <div class="divider"></div>

            ${config.showQrCode ? `
              <div class="qr-wrapper">
                <img src="${qrDataUrl}" alt="QR Code">
              </div>
            ` : ''}

            ${config.showDateTime ? `
              <div class="info-row">
                <div class="info-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                </div>
                <div class="info-content">
                  <span class="info-label">FINALIZADO EM</span>
                  <p class="info-value">
                    ${new Date(sale.date).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
              <div class="divider"></div>
            ` : ''}

            ${config.showSoldBy ? `
              <div class="info-row" style="margin-bottom: 0;">
                <div class="info-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </div>
                <div class="info-content">
                  <span class="info-label">VENDEDOR</span>
                  <p class="info-value">${sale.soldByUserName || 'SISTEMA'}</p>
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      </body>
      </html>
    `;
  };

  const imprimirPedidoPDV = async (sale: Sale) => {
    const html = await generateSimpleReceiptHTML(sale, company, couponPDVConfig);
    const dims = getPaperDimensions(couponPDVConfig);
    return performUnifiedPrint('cupom-pdv', html, couponPDVConfig.printerName || selectedPrinter, couponPDVConfig.printMode, {
      width: dims.widthMm,
      height: dims.heightMm,
      format: couponPDVConfig.format,
      orientation: couponPDVConfig.orientation
    });
  };

  const generateGreetingCupomHTML = async (sale: Sale, customers: Customer[], config: GreetingCouponConfig) => {
    const customer = customers.find(c => c.id === sale.customerId);
    const qrContent = sale.youtubeLink || '';
    const qrDataUrl = await generateStyledQRCode(qrContent, config.qrCodeDesign || INITIAL_QR_DESIGN);

    const { pageSizeCss, width: paperWidthMm, height: paperHeightMm } = getPaperDimensions(config);
    const isA6 = config.format === 'a6';
    const isA5 = config.format === 'a5';
    const isThermal = config.format === '58mm' || config.format === '80mm' || config.format === 'thermal';
    const h_val = isThermal ? 'auto' : (paperHeightMm === 'auto' ? '297' : paperHeightMm);

    // Dynamic sizes for better fit on different paper sizes
    const logoMaxW = isA6 ? '35mm' : (isA5 ? '40mm' : '45mm');
    const logoMaxH = isA6 ? '15mm' : (isA5 ? '20mm' : '25mm');
    const titleSize = isA6 ? '20px' : (isA5 ? '24px' : '28px');
    const messageSize = isA6 ? '13px' : (isA5 ? '15px' : '16px');
    const qrSize = isA6 ? '32mm' : (isA5 ? '40mm' : '44mm');
    const marginMd = isA6 ? '3mm' : '5mm';
    const marginLg = isA6 ? '5mm' : '8mm';
    const marginXl = isA6 ? '6mm' : '12mm';

    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8">
          <title>Cupom Saudação</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');

            @page { 
              size: ${pageSizeCss}; 
              margin: 0;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              color-scheme: light;
            }
            html, body {
              margin: 0;
              padding: 0;
              background-color: #ffffff !important;
              color: #000000 !important;
              width: ${paperWidthMm}mm;
              min-width: ${paperWidthMm}mm;
              max-width: ${paperWidthMm}mm;
              font-family: 'Inter', -apple-system, sans-serif;
              overflow: hidden;
            }
            body { 
              margin: 0; 
              padding: 0;
              min-height: ${h_val}${typeof h_val === 'string' && h_val.includes('mm') ? '' : 'mm'};
              max-height: ${isThermal ? 'none' : (h_val + 'mm')};
              overflow: hidden;
            }
            
            .coupon-container {
              position: relative;
              width: 100%;
              min-height: ${h_val}${typeof h_val === 'string' && h_val.includes('mm') ? '' : 'mm'};
              display: flex;
              flex-direction: column;
              align-items: center;
              background: #fff;
              overflow: hidden;
              padding: ${isThermal ? '2mm' : (isA6 ? '4mm' : (isA5 ? '8mm' : '10mm'))};
              box-sizing: border-box;
            }

            .bg-image {
              position: absolute;
              inset: 0;
              width: 100%;
              height: 100%;
              object-fit: cover;
              opacity: ${(config.backgroundOpacity ?? 10) / 100};
              z-index: 0;
            }

            .emojis-layer {
              position: absolute;
              inset: 0;
              z-index: 1;
              pointer-events: none;
            }

            .emoji {
              position: absolute;
              transform: translate(-50%, -50%);
              opacity: ${(config.emojiOpacity ?? 100) / 100};
            }

            .content-layer {
              position: relative;
              z-index: 2;
              width: 100%;
              display: flex;
              flex-direction: column;
              align-items: center;
              text-align: center;
              flex: 1;
            }

            .logo-wrapper { margin-bottom: ${marginLg}; }
            .logo-wrapper img { max-width: ${logoMaxW}; max-height: ${logoMaxH}; object-fit: contain; }
            
            .company-name {
              font-size: ${isA6 ? '8px' : '10px'};
              font-weight: 900;
              text-transform: uppercase;
              color: #94a3b8 !important;
              letter-spacing: 2px;
              margin-bottom: ${marginMd};
            }

            .title { 
              font-size: ${titleSize}; 
              font-weight: 900; 
              margin-bottom: ${marginLg}; 
              text-transform: uppercase; 
              color: #0f172a !important;
              letter-spacing: -1px;
              line-height: 1.1;
            }

            .message { 
              font-size: ${messageSize}; 
              line-height: 1.4; 
              font-style: italic; 
              color: #1e293b !important;
              margin-bottom: ${marginXl};
              max-width: 90%;
              font-weight: 500;
            }
            
            .qr-wrapper { 
              margin-bottom: ${marginLg}; 
              background: #fff !important;
              padding: ${isA6 ? '3mm' : '4mm'};
              border-radius: ${isA6 ? '4mm' : '8mm'};
              border: 1px solid #f1f5f9;
              box-shadow: 0 10px 20px rgba(0,0,0,0.05);
              display: inline-block;
            }
            .qr-wrapper img { width: ${qrSize}; height: ${qrSize}; }

            .footer { 
              width: 100%;
              margin-top: auto;
              padding-top: ${isA6 ? '4mm' : '8mm'};
              border-top: 1px solid #e2e8f0;
            }
            .footer-text { 
              font-size: ${isA6 ? '9px' : '12px'}; 
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 1px;
              color: #64748b !important;
            }

            .scale-to-fit {
              width: 100%;
              height: 100%;
              display: flex;
              flex-direction: column;
              align-items: center;
            }
          </style>
        </head>
        <body>
          <div class="scale-to-fit">
            <div class="coupon-container">
            ${config.backgroundImage ? `<img src="${config.backgroundImage}" class="bg-image" />` : ''}

            <div class="emojis-layer">
              ${(config.emojis || []).map(emoji => `
                <div class="emoji" style="left: ${emoji.x}%; top: ${emoji.y}%; transform: translate(-50%, -50%) rotate(${emoji.rotation || 0}deg); opacity: ${(emoji.opacity ?? 100) / 100 * ((config.emojiOpacity ?? 100) / 100)};">
                  ${emoji.isImage 
                    ? `<img src="${emoji.char}" style="width: ${emoji.size}px; height: ${emoji.size}px; object-fit: contain;" />` 
                    : `<span style="font-size: ${emoji.size}px;">${emoji.char}</span>`
                  }
                </div>
              `).join('')}
            </div>

            <div class="content-layer">
              <div class="logo-wrapper">
                ${(config.showLogo && (config.logo || company.logo)) ? `<img src="${config.logo || company.logo}" />` : ''}
              </div>

              ${config.showCompanyName ? `<div class="company-name">${company.name}</div>` : ''}
              
              <h1 class="title">${config.title || 'Obrigado!'}</h1>
              
              <p class="message">"${config.message || ''}"</p>
              
              <div class="qr-wrapper">
                <img src="${qrDataUrl}" />
              </div>

              <div class="footer">
                 <p class="footer-text">${config.footerText || ''}</p>
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  const imprimirGreetingCupom = async (sale: Sale): Promise<boolean> => {
    const activeConfig = sale.greetingConfig || greetingCouponConfig;
    const html = await generateGreetingCupomHTML(sale, customers, activeConfig);
    const dims = getPaperDimensions(activeConfig);
    return performUnifiedPrint('cupom-saudacao', html, activeConfig.printerName || selectedPrinter, activeConfig.printMode || couponConfig.printMode, {
      width: dims.widthMm,
      height: dims.heightMm,
      format: activeConfig.format,
      orientation: activeConfig.orientation
    });
  };

  const imprimirCupom = async (saleOrHtml: Sale | string, customTitle?: string): Promise<boolean> => {
    const html = typeof saleOrHtml === 'string' 
      ? saleOrHtml 
      : await generateReceiptHTML(saleOrHtml, products, customers, company, couponConfig, customTitle);
    
    const dims = getPaperDimensions(couponConfig);
    return performUnifiedPrint('cupom', html, couponConfig.printerName || selectedPrinter, couponConfig.printMode, {
      width: dims.widthMm,
      height: dims.heightMm,
      format: couponConfig.format,
      orientation: couponConfig.orientation
    });
  };

  const imprimirEtiqueta = async (product: Product, quantity: number, customConfig?: LabelConfig) => {
    const activeConfig = customConfig || labelConfig;
    // Validação de segurança para etiquetas (PONTO 6)
    if (activeConfig.printMode === 'auto' && !activeConfig.printerName) {
      alert('⚠️ Selecione uma impressora de etiquetas nas configurações.');
      return false;
    }

    if (activeConfig.printMode === 'browser') {
      return generateProgrammaticLabelPDF([{ product, quantity }], activeConfig, 'download');
    }

    const mmToPx = (mm: number) => Math.round(mm * 3.7795275591);

    // Reutilizando lógica do LabelPrintModal de forma simplificada para chamada direta
    const generateLabelHtml = (p: Product, config: LabelConfig) => {
      const installmentsText = config.showInstallments && config.installments ? `<div style="font-size: 1.8mm; font-weight: bold; margin-top: 0.5mm;">${config.installments}X R$ ${(Number(p.price) / config.installments).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>` : '';

      return `
        <div class="label" style="
          width: ${config.width}mm; 
          height: ${config.height}mm; 
          padding: ${config.paddingTop || 2}mm ${config.paddingRight || 2}mm ${config.paddingBottom || 2}mm ${config.paddingLeft || 2}mm; 
          box-sizing: border-box; 
          display: flex; 
          flex-direction: column; 
          align-items: center; 
          justify-content: center; 
          text-align: center;
          overflow: hidden;
          position: relative;
          background: white;
          ${config.showLabelBorder ? 'border: 0.1mm solid #e2e8f0;' : (config.showCutLines || config.showCutLine ? `border: 0.1mm solid rgba(0,0,0,${(config.cutLineOpacity || 20) / 100});` : 'none')}
          page-break-inside: avoid;
        ">
          ${config.showCutLine ? `
            <div style="position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 0.1mm; height: 8px; background: #e2e8f0;"></div>
            <div style="position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 0.1mm; height: 8px; background: #e2e8f0;"></div>
            <div style="position: absolute; left: 0; top: 50%; transform: translateY(-50%); height: 0.1mm; width: 8px; background: #e2e8f0;"></div>
            <div style="position: absolute; right: 0; top: 50%; transform: translateY(-50%); height: 0.1mm; width: 8px; background: #e2e8f0;"></div>
          ` : ''}

          ${config.showProductName ? `<div style="font-size: 2.2mm; font-weight: 900; text-transform: uppercase; margin-bottom: 0.5mm; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #000;">${p.name}</div>` : ''}
          ${(config.showBarcode || config.showQRCode) ? `
            <div style="display: flex; flex-direction: column; align-items: center; width: 100%; margin: 1mm 0;">
              <canvas class="qrcode" style="width: 12mm; height: 12mm;"></canvas>
              ${config.showCodeNumber ? `<div style="font-size: 1.6mm; font-family: monospace; margin-top: 0.3mm; color: #000;">${p.barcode || p.sku || ''}</div>` : ''}
            </div>
          ` : ''}
          <div style="display: flex; flex-direction: column; align-items: center; width: 100%; margin-top: auto;">
            ${config.showPrice ? `<div style="font-size: 3.2mm; font-weight: 900; font-style: italic; color: #000;">R$ ${Number(p.price).toFixed(2)}</div>` : ''}
            ${installmentsText}
            ${config.showDate && (p as any).observation ? `<div style="font-size: 1.4mm; font-weight: bold; margin-top: 0.5mm; opacity: 0.5; color: #000;">${(p as any).observation}</div>` : ''}
            ${config.showPrintDate ? `<div style="font-size: 1.4mm; font-family: monospace; margin-top: 0.8mm; color: #000;">${new Date().toLocaleDateString('pt-BR')}</div>` : ''}
            ${config.showKit ? `<div style="margin-top: 0.5mm; font-size: 1.8mm; font-weight: bold; border: 0.3mm solid #000; padding: 0.2mm 0.5mm; text-transform: uppercase; color: #000;">KIT</div>` : ''}
          </div>
        </div>
      `;
    };

    const labels = Array.from({ length: quantity }).map(() => generateLabelHtml(product, activeConfig)).join('');

    const paper_w = activeConfig.paperWidth || (activeConfig.sheetType === 'a4' ? 210 : activeConfig.sheetType === 'a6' ? 105 : activeConfig.width);
    const paper_h = activeConfig.paperHeight || (activeConfig.sheetType === 'a4' ? 297 : activeConfig.sheetType === 'a6' ? 148 : activeConfig.height);
    const isThermal = activeConfig.sheetType === 'thermal';

    const paperConfig = (activeConfig.sheetType === 'a4' || activeConfig.sheetType === 'a6') 
      ? { ...activeConfig, format: activeConfig.sheetType } 
      : { ...activeConfig, format: 'custom', customWidth: paper_w, customHeight: paper_h };
    
    const dims = getPaperDimensions(paperConfig as any);

    const PX_PER_MM = 3.7795275591;
    const pxPaperWidth = Math.round(paper_w * PX_PER_MM);

    const fullHtml = `
      <html>
        <head>
          <meta charset="utf-8">
          <title>Etiquetas - ${product.name}</title>
          <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.0/build/qrcode.min.js"></script>
          <style>
            @page { 
              margin: 0; 
              size: ${paper_w}mm ${isThermal ? 'auto' : (paper_h + 'mm')}; 
            }
            * { 
              box-sizing: border-box !important; 
              color-scheme: light !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            html, body {
              margin: 0;
              padding: 0;
              background-color: #ffffff !important;
              color: #000000 !important;
              display: block;
              width: ${paper_w}mm;
              min-width: ${paper_w}mm;
              max-width: ${paper_w}mm;
              overflow: visible;
            }
            body { 
              color: black;
              background: white;
              display: flex;
              flex-direction: column;
              align-items: center;
            }
            .sheet {
              display: flex;
              flex-wrap: wrap;
              justify-content: flex-start;
              align-content: flex-start;
              width: ${paper_w}mm;
              min-width: ${paper_w}mm;
              padding: ${activeConfig.marginTop || 0}mm ${activeConfig.marginRight || 0}mm ${activeConfig.marginBottom || 0}mm ${activeConfig.marginLeft || 0}mm;
            }
            .label {
              page-break-inside: avoid;
            }
          </style>
        </head>
        <body>
          <div class="sheet">
            ${labels}
          </div>

          <script>
            window.onload = () => {
              const qrcodes = document.querySelectorAll('.qrcode');
              const qrDesign = ${JSON.stringify(activeConfig.qrCodeDesign || INITIAL_QR_DESIGN)};
               const sku = "${(product.barcode || product.sku || '123456789012').replace(/"/g, '\\"')}";
              
              qrcodes.forEach(el => {
                try {
                  QRCode.toCanvas(el, sku, {
                    width: 128,
                    margin: 1,
                    color: {
                      dark: qrDesign.color || '#000000',
                      light: qrDesign.backgroundColor || '#FFFFFF'
                    }
                  }, function (error) {
                    if (error) console.error(error)
                  });
                  el.style.width = '${mmToPx(activeConfig.width > 40 ? 15 : 12)}px';
                  el.style.height = '${mmToPx(activeConfig.width > 40 ? 15 : 12)}px';
                } catch (err) {
                  console.error("Erro ao gerar QR Code:", err);
                }
              });
            };
          </script>
        </body>
      </html>
    `;

    return performUnifiedPrint('etiqueta', fullHtml, activeConfig.printerName || selectedPrinter, activeConfig.printMode, {
      width: paper_w,
      height: isThermal ? 'auto' : paper_h,
      format: (isThermal && paper_w === 58) ? '58mm' : ((isThermal && paper_w === 80) ? '80mm' : (activeConfig.sheetType === 'custom' ? 'custom' : activeConfig.sheetType)),
      orientation: activeConfig.orientation || 'portrait'
    });
  };

  const addActivity = (type: Activity['type'], action: string, details: string, extra?: Partial<Activity>) => {
    const userRole = currentUser ? roles.find(r => r.id === currentUser.roleId)?.name : 'Sistema';
    const newActivity: Activity = {
      id: generateUniqueId('act'),
      type,
      action,
      details,
      timestamp: new Date().toLocaleString('pt-BR'),
      user: currentUser?.name || 'Sistema',
      userRole,
      ...extra
    };
    setActivities(prev => [newActivity, ...prev].slice(0, 1000));
  };

  // Gold Customer Logic - Shared
  const goldCustomerIds = useMemo(() => {
    const stats: Record<string, { totalSpent: number, orderCount: number }> = {};
    sales.forEach(s => {
      if (s.status !== 'cancelado' && s.customerId) {
        if (!stats[s.customerId]) stats[s.customerId] = { totalSpent: 0, orderCount: 0 };
        stats[s.customerId].totalSpent += s.total;
        stats[s.customerId].orderCount += 1;
      }
    });

    const ids = new Set<string>();
    const LIMIT_VALUE = 1000;
    const MIN_ORDERS = 3;

    Object.entries(stats).forEach(([id, s]: [string, any]) => {
      if (s.orderCount >= MIN_ORDERS || s.totalSpent >= LIMIT_VALUE) {
        ids.add(id);
      }
    });
    return ids;
  }, [sales]);

  const [company, setCompany] = useState<CompanyInfo>({
    name: '',
    tradeName: '',
    slogan: '',
    idNumber: '',
    stateRegistration: '',
    email: '',
    website: '',
    address: { logradouro: '', cep: '', numero: '', bairro: '', cidade: '', estado: '' },
    pix: '',
    phone: ''
  });
  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [rawMaterialsStructured, setRawMaterialsStructured] = useState<RawMaterial[]>([]);
  const [productRecipes, setProductRecipes] = useState<ProductRecipe[]>([]);

  const [couponConfig, setCouponConfig] = useState<CouponConfig>(carregarDados(STORAGE_KEYS.COUPON_CONFIG, INITIAL_COUPON_CONFIG));
  const [greetingCouponConfig, setGreetingCouponConfig] = useState<GreetingCouponConfig>(carregarDados(STORAGE_KEYS.GREETING_COUPON_CONFIG, INITIAL_GREETING_COUPON_CONFIG));
  
  useEffect(() => {
    salvarDados(STORAGE_KEYS.COUPON_CONFIG, couponConfig);
  }, [couponConfig]);

  useEffect(() => {
    salvarDados(STORAGE_KEYS.GREETING_COUPON_CONFIG, greetingCouponConfig);
  }, [greetingCouponConfig]);

  const [couponPDVConfig, setCouponPDVConfig] = useState<CouponPDVConfig>(() => carregarDados(STORAGE_KEYS.COUPON_PDV_CONFIG, INITIAL_COUPON_PDV_CONFIG));
  const [pdvTestSale, setPdvTestSale] = useState<Sale | null>(null);

  useEffect(() => {
    salvarDados(STORAGE_KEYS.COUPON_PDV_CONFIG, couponPDVConfig);
  }, [couponPDVConfig]);

  useEffect(() => {
    salvarDados(STORAGE_KEYS.REGISTERED_PRINTERS, registeredPrinters);
  }, [registeredPrinters]);

  useEffect(() => {
    salvarDados(STORAGE_KEYS.SHOPKEEPERS, shopkeepers);
  }, [shopkeepers]);

  useEffect(() => {
    salvarDados(STORAGE_KEYS.SHOPKEEPER_DELIVERIES, shopkeeperDeliveries);
  }, [shopkeeperDeliveries]);

  const [labelConfig, setLabelConfig] = useState<LabelConfig>(() => carregarDados(STORAGE_KEYS.LABEL_CONFIG, {
    width: 50,
    height: 30,
    format: 'a4',
    sheetType: 'a4',
    paperWidth: 210,
    paperHeight: 297,
    hGap: 0,
    vGap: 0,
    labelsPerSheet: 1,
    printMode: 'browser',
    printerName: '',
    profileName: 'ETIQUETAS',
    quantity: 1,
    showProductName: true,
    showQRCode: true,
    showCodeNumber: true,
    showPrice: true,
    showPrintDate: false,
    showKit: false,
    showInstallments: false,
    showCutLines: true,
    cutLineOpacity: 30,
    installments: 1,
    marginTop: 0,
    marginBottom: 0,
    marginLeft: 0,
    marginRight: 0,
    paddingTop: 2,
    paddingBottom: 2,
    paddingLeft: 2,
    paddingRight: 2,
    qrCodeDesign: INITIAL_QR_DESIGN
  }));

  const [labelLotConfig, setLabelLotConfig] = useState<LabelConfig>(() => carregarDados(STORAGE_KEYS.LABEL_LOT_CONFIG, {
    width: 50,
    height: 30,
    format: 'a4',
    sheetType: 'a4',
    paperWidth: 210,
    paperHeight: 297,
    hGap: 0,
    vGap: 0,
    labelsPerSheet: 1,
    printMode: 'browser',
    printerName: '',
    profileName: 'LOTE',
    quantity: 1,
    showProductName: true,
    showQRCode: true,
    showCodeNumber: true,
    showPrice: true,
    showPrintDate: false,
    showKit: false,
    showInstallments: false,
    showCutLines: true,
    cutLineOpacity: 30,
    installments: 1,
    marginTop: 0,
    marginBottom: 0,
    marginLeft: 0,
    marginRight: 0,
    paddingTop: 2,
    paddingBottom: 2,
    paddingLeft: 2,
    paddingRight: 2,
    qrCodeDesign: INITIAL_QR_DESIGN
  }));

  const [isLoaded, setIsLoaded] = useState(false);
  const [isLogged, setIsLogged] = useState(false);
  const [homeSearchTerm, setHomeSearchTerm] = useState('');
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [paymentMethods, setPaymentMethods] = useState<string[]>(['DINHEIRO', 'PIX', 'CARTÃO DE CRÉDITO', 'CARTÃO DE DÉBITO']);
  const [paymentIcons, setPaymentIcons] = useState<Record<string, string>>(() => {
    const loaded = carregarDados(STORAGE_KEYS.PAYMENT_ICONS, DEFAULT_PAYMENT_ICONS);
    // Migration for Debit Card icon if empty or outdated or broken
    if (loaded['CARTÃO DE DÉBITO'] === '💳' || !loaded['CARTÃO DE DÉBITO'] || loaded['CARTÃO DE DÉBITO'].length !== 2) {
       loaded['CARTÃO DE DÉBITO'] = '🏧';
    }
    return loaded;
  });

  useEffect(() => {
    salvarDados(STORAGE_KEYS.PAYMENT_ICONS, paymentIcons);
  }, [paymentIcons]);

  const [customPaymentMethods, setCustomPaymentMethods] = useState<string[]>([]);
  const [hiddenPaymentMethods, setHiddenPaymentMethods] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [productLocations, setProductLocations] = useState<ProductLocation[]>([]);
  
  const [openSessions, setOpenSessions] = useState<Record<string, CashierSession>>({});
  
  const [cashierSession, setCashierSession] = useState<CashierSession>({
    id: '',
    isOpen: false,
    openedAt: '',
    openingBalance: 0,
    totalSales: 0,
    totalCanceled: 0,
    salesCount: 0,
    canceledCount: 0,
    salesByMethod: {}
  });

  const [redirectAfterCashier, setRedirectAfterCashier] = useState<View | null>(null);

  const handleMenuClick = (targetView: View) => {
    if (targetView === 'pos' && !cashierSession.isOpen) {
      setRedirectAfterCashier('pos');
      setView('cashier');
    } else {
      setView(targetView);
    }
    setIsMobileMenuOpen(false);
    setIsRightDrawerOpen(false);
  };

  // Sincroniza a sessão ativa na UI com a persistência por usuário
  useEffect(() => {
    if (currentUser) {
      if (cashierSession.isOpen && cashierSession.userId === currentUser.id) {
        setOpenSessions(prev => ({
          ...prev,
          [currentUser.id]: { ...cashierSession, updatedAt: Date.now() }
        }));
      } else if (!cashierSession.isOpen) {
        setOpenSessions(prev => {
          if (prev[currentUser.id]) {
            const next = { ...prev };
            delete next[currentUser.id];
            return next;
          }
          return prev;
        });
      }
    }
  }, [cashierSession, currentUser]);

  // Carrega impressoras do sistema no boot
  useEffect(() => {
    const loadSystemPrinters = async () => {
      if ((window as any).electronAPI) {
        try {
          const sysPrinters = await (window as any).electronAPI.getPrinters();
          if (sysPrinters && Array.isArray(sysPrinters)) {
            setHardwarePrinters(sysPrinters);
            const formatted: PrinterConfig[] = sysPrinters.map((p: any) => ({
              id: p.name,
              name: p.name,
              displayName: p.displayName || p.name,
              type: 'thermal',
              connection: 'usb'
            }));
            setPrinters(formatted);
          }
        } catch (err) {
          console.error("Erro ao carregar impressoras no boot:", err);
        }
      }
    };
    loadSystemPrinters();
  }, []);
  
  
// Persistence
useEffect(() => {
  // Override alert global para evitar travamentos em modo desktop
  const originalAlert = window.alert;
  window.alert = (msg) => {
    // Pequeno timeout para garantir que o React não esteja no meio de um render e o loop de eventos respire
    setTimeout(() => {
      showGlobalError(msg ? msg.toString() : 'Aviso do sistema');
    }, 100);
  };

  const initData = async () => {
    console.log("%c[Persistência] INICIANDO CARREGAMENTO DE DADOS...", "color: #5d5dff; font-weight: bold;");
    
    // Tenta carregar do backup de arquivo primeiro (Electron)
    let backupData = await carregarBackupArquivo();
    
    const productsData = backupData?.products || await carregarDadosAsync(STORAGE_KEYS.PRODUCTS, []);
    const catalogDescriptionsData = backupData?.catalogDescriptions || await carregarDadosAsync(STORAGE_KEYS.CATALOG_DESCRIPTIONS, {});
    const customersData = backupData?.customers || await carregarDadosAsync(STORAGE_KEYS.CUSTOMERS, []);
    const salesData = backupData?.sales || await carregarDadosAsync(STORAGE_KEYS.SALES, []);
    const activitiesData = backupData?.activities || await carregarDadosAsync(STORAGE_KEYS.ACTIVITIES, []);
    const categoriesData = backupData?.categories || await carregarDadosAsync(STORAGE_KEYS.CATEGORIES, []);
    const subcategoriesData = backupData?.subcategories || await carregarDadosAsync(STORAGE_KEYS.SUBCATEGORIES, []);
    const productLocationsData = backupData?.productLocations || await carregarDadosAsync(STORAGE_KEYS.PRODUCT_LOCATIONS, []);
    const deliveryChannelsData = backupData?.delivery_channels || await carregarDadosAsync(STORAGE_KEYS.DELIVERY_CHANNELS, [
      { id: 'pdv', name: 'PDV' }
    ]);

    // Ensure at least PDV exists
    if (deliveryChannelsData.length === 0 || !deliveryChannelsData.find((d: any) => d.name === 'PDV' || d.id === 'pdv')) {
      deliveryChannelsData.push({ id: 'pdv', name: 'PDV' });
    }
    const deliveryMethodsData = backupData?.delivery_methods || await carregarDadosAsync(STORAGE_KEYS.DELIVERY_METHODS, []);
    const closedSessionsData = backupData?.closed_sessions || await carregarDadosAsync(STORAGE_KEYS.CLOSED_SESSIONS, []);
    const usersData = backupData?.users || await carregarDadosAsync(STORAGE_KEYS.USERS, []);
    const rolesData = backupData?.roles || await carregarDadosAsync(STORAGE_KEYS.ROLES, INITIAL_ROLES);
    
    // Ensure default roles exist and have correct permissions
    const mergedRoles = [...rolesData];
    INITIAL_ROLES.forEach(initRole => {
      if (!mergedRoles.find(r => r.id === initRole.id)) {
        mergedRoles.push(initRole);
      }
    });

    const paymentMethodsData = (backupData?.paymentMethods || carregarDados(STORAGE_KEYS.PAYMENT_METHODS, ['DINHEIRO', 'PIX', 'CARTÃO DE CRÉDITO', 'CARTÃO DE DÉBITO'])).filter((m: string) => m !== 'OUTROS');
    const customPaymentMethodsData = (backupData?.customPaymentMethods || carregarDados(STORAGE_KEYS.CUSTOM_PAYMENT_METHODS, [])).filter((m: string) => m !== 'OUTROS');
    const hiddenPaymentMethodsData = backupData?.hiddenPaymentMethods || carregarDados(STORAGE_KEYS.HIDDEN_PAYMENT_METHODS, []);
    const printersData = backupData?.printers || carregarDados(STORAGE_KEYS.PRINTERS, []);
    let finalPrinters = printersData.filter((p: any) => 
      !p.name.includes('Impressora Balcão') && 
      !p.name.includes('Impressora Cozinha')
    );
    
    // Carrega impressoras reais do sistema se estiver no Electron
    if ((window as any).electronAPI) {
      try {
        const sysPrinters = await (window as any).electronAPI.getPrinters();
        if (sysPrinters && Array.isArray(sysPrinters)) {
          setHardwarePrinters(sysPrinters);
        }
      } catch (err) {
        console.error("Erro ao carregar hardware no init:", err);
      }
    }

    const companyData = backupData?.company || carregarDados(STORAGE_KEYS.COMPANY_INFO, {
      name: '', tradeName: '', slogan: '', idNumber: '', stateRegistration: '', email: '', website: '', address: { logradouro: '', cep: '', numero: '', bairro: '', cidade: '', estado: '' }, pix: '', phone: ''
    });
    
    const couponConfigData = backupData?.couponConfig || carregarDados(STORAGE_KEYS.COUPON_CONFIG, {
      format: '80mm',
      headerMessage: 'CUPOM DE VENDA',
      footerMessage: 'Obrigado pela preferência!',
      showLogo: true,
      showCompanyName: true,
      showCompanyId: true,
      showCompanyAddress: true,
      showCustomerName: true,
      showCustomerId: true,
      showCustomerPhone: true,
      showCustomerAddress: true,
      showCustomerCep: true,
      showItemName: true,
      showItemQty: true,
      showItemPrice: true,
      showItemUnitPrice: true,
      showItemSubtotal: true,
      showDiscounts: true,
      showFinalTotal: true,
      showPaymentMethod: true,
      showChange: true,
      showOrderNumber: true,
      showDateTime: true,
    });
    
    const revenuesData = backupData?.revenues || await carregarDadosAsync(STORAGE_KEYS.REVENUES, []);
    const purchasesData = backupData?.purchases || await carregarDadosAsync(STORAGE_KEYS.PURCHASES, []);
    const expensesData = backupData?.expenses || await carregarDadosAsync(STORAGE_KEYS.EXPENSES, []);
    const rawMaterialsStructuredData = backupData?.rawMaterialsStructured || await carregarDadosAsync(STORAGE_KEYS.RAW_MATERIALS, []);
    const productRecipesData = backupData?.productRecipes || await carregarDadosAsync(STORAGE_KEYS.PRODUCT_RECIPES, []);
    const shopkeepersData = backupData?.shopkeepers || await carregarDadosAsync(STORAGE_KEYS.SHOPKEEPERS, []);
    const shopkeeperDeliveriesData = backupData?.shopkeeperDeliveries || await carregarDadosAsync(STORAGE_KEYS.SHOPKEEPER_DELIVERIES, []);

    setRevenues(revenuesData);
    setPurchases(purchasesData);
    setExpenses(expensesData);
    setRawMaterialsStructured(rawMaterialsStructuredData);
    setProductRecipes(productRecipesData);
    
    const labelConfigData = backupData?.labelConfig || carregarDados(STORAGE_KEYS.LABEL_CONFIG, {
      format: '50x30', showBarcode: true, showCodeNumber: true, showPrice: true, showDate: true, printMode: 'browser'
    });
    
    const cashierSessionData = backupData?.cashierSession || carregarDados(STORAGE_KEYS.CASHIER_SESSION, {
      id: '', isOpen: false, openedAt: '', openingBalance: 0, totalSales: 0, totalCanceled: 0, salesCount: 0, canceledCount: 0, salesByMethod: {}
    });
    
    const openSessionsData = backupData?.openSessions || carregarDados(STORAGE_KEYS.OPEN_SESSIONS, {});

    const selectedPrinterData = backupData?.selectedPrinter || carregarDados(STORAGE_KEYS.SELECTED_PRINTER, '');
    const selectedLabelPrinterData = backupData?.selectedLabelPrinter || carregarDados(STORAGE_KEYS.SELECTED_LABEL_PRINTER, '');

    setProducts(productsData);
    setCatalogDescriptions(catalogDescriptionsData);
    setCustomers(customersData);
    setSales(salesData);
    setActivities(activitiesData);
    setCategories(categoriesData);
    setSubcategories(subcategoriesData);
    setProductLocations(productLocationsData);
    setDeliveryChannels(deliveryChannelsData);
    setDeliveryMethods(deliveryMethodsData);
    setClosedSessions(closedSessionsData);
    // --- BOOTSTRAP INITIAL DATA ---
    let validatedUsers = [...usersData];
    let adminUser = validatedUsers.find(u => u.id === 'admin' || (u.username && (u.username.toUpperCase() === 'ADM' || u.username.toLowerCase() === 'admin')));
    
    // Check if initial base doesn't exist or is corrupted (no admin or empty users)
    if (!adminUser || validatedUsers.length === 0) {
      logger.warn('Administrador não encontrado no boot. Criando administrador padrão...', null, 'Segurança');
      const defaultAdmin: SystemUser = {
        id: 'admin',
        username: 'admin',
        name: 'Administrador Mestre',
        password: secureHash('ADM1234'),
        roleId: 'role-gerente',
        isActive: true,
        isFirstAccess: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      validatedUsers = [defaultAdmin];
      salvarDados(STORAGE_KEYS.USERS, validatedUsers);
      logger.info('Administrador padrão criado com sucesso.', { username: 'admin' }, 'Segurança');
    } else {
      logger.info('Administrador encontrado.', { username: adminUser.username }, 'Segurança');
      // Check for legacy/unhashed password on Master Admin
      if (!isHashed(adminUser.password || '')) {
         logger.warn('Senha do Admin não está em formato seguro. Forçando hash.', null, 'Segurança');
         adminUser.password = secureHash(adminUser.password || 'ADM1234');
         salvarDados(STORAGE_KEYS.USERS, validatedUsers);
      }
    }
    
    setUsers(validatedUsers);
    setShopkeepers(shopkeepersData);
    setShopkeeperDeliveries(shopkeeperDeliveriesData);
    
    // Auto-cleanup for inactive users (> 15 days)
    const now = new Date();
    const fifteenDaysInMs = 15 * 24 * 60 * 60 * 1000;
    const finalUsers = usersData.filter((u: SystemUser) => {
      if (!u.isActive && u.deactivatedAt) {
        const deactivationDate = new Date(u.deactivatedAt);
        if (now.getTime() - deactivationDate.getTime() > fifteenDaysInMs) {
          console.log(`[Segurança] Usuário ${u.name} excluído automaticamente por inatividade.`);
          return false;
        }
      }
      return true;
    });
    if (finalUsers.length !== usersData.length) {
      setUsers(finalUsers);
    }

    setRoles(mergedRoles);
    setPaymentMethods(paymentMethodsData);
    setCustomPaymentMethods(customPaymentMethodsData);
    setHiddenPaymentMethods(hiddenPaymentMethodsData);
    setPrinters(finalPrinters);
    setSelectedPrinter(selectedPrinterData);
    setSelectedLabelPrinter(selectedLabelPrinterData);
    setCompany(companyData);
    setCouponConfig(couponConfigData);
    setLabelConfig(labelConfigData);
    setLabelLotConfig(backupData?.labelLotConfig || carregarDados(STORAGE_KEYS.LABEL_LOT_CONFIG, {
      width: 50,
      height: 30,
      format: 'a4',
      sheetType: 'a4',
      paperWidth: 210,
      paperHeight: 297,
      hGap: 0,
      vGap: 0,
      labelsPerSheet: 1,
      printMode: 'browser',
      printerName: '',
      profileName: 'LOTE',
      quantity: 1,
      showProductName: true,
      showQRCode: true,
      showCodeNumber: true,
      showPrice: true,
      showPrintDate: false,
      showKit: false,
      showInstallments: false,
      showCutLines: true,
      cutLineOpacity: 30,
      installments: 1,
      marginTop: 0,
      marginBottom: 0,
      marginLeft: 0,
      marginRight: 0,
      paddingTop: 2,
      paddingBottom: 2,
      paddingLeft: 2,
      paddingRight: 2,
      qrCodeDesign: INITIAL_QR_DESIGN
    }));
    setCashierSession(cashierSessionData);
    setOpenSessions(openSessionsData);
    setSelectedPrinter(selectedPrinterData);
    setLabelLot(backupData?.labelLot || await carregarDadosAsync(STORAGE_KEYS.LABEL_LOT, []));
    
    // Inicia serviços secundários
    backupService.startAutoBackup();
    logger.info('Sistema carregado com sucesso.', { version: APP_VERSION }, 'Boot');

    setIsLoaded(true);
    console.log("%c[Persistência] CARREGAMENTO CONCLUÍDO!", "color: #22c55e; font-weight: bold;");

    // Listener para fechamento do app (Electron)
    if ((window as any).electronAPI?.onAppClosing) {
      (window as any).electronAPI.onAppClosing(async () => {
        console.log('[App] Fechamento detectado. Iniciando backup final...');
        try {
          // Backup rápido ao fechar
          await backupService.createAutoBackup('fechamento');
          console.log('[App] Backup final concluído. Encerrando app...');
        } catch (err) {
          console.error('[App] Erro no backup final:', err);
        } finally {
          (window as any).electronAPI.quitApp();
        }
      });
    }
  };

  initData();
}, []);

// Ensure "Em mãos" delivery method exists
useEffect(() => {
  if (isLoaded) {
    if (deliveryMethods.length > 0) {
      if (!deliveryMethods.find(m => m.name.toUpperCase() === 'EM MÃOS')) {
        setDeliveryMethods(prev => [{ id: 'em-maos', name: 'Em mãos', isActive: true }, ...prev]);
      }
    } else {
      setDeliveryMethods([{ id: 'em-maos', name: 'Em mãos', isActive: true }]);
    }
  }
}, [isLoaded, deliveryMethods.length]);

// Initial Cleanup and Migration
useEffect(() => {
  if (isLoaded) {
    let hasChanges = false;
    const migratedUsers = users.map(u => {
      let updated = { ...u };
      let changed = false;
      
      // Migrate password to hash if not already hashed
      if (u.password && !isHashed(u.password)) {
        updated.password = secureHash(u.password);
        changed = true;
      }

      // Migrate existing masterCodes to hash if they are not already hashed
      // (Older versions saved them as plain text)
      if (u.id === 'admin' && u.masterCode && !isHashed(u.masterCode)) {
        updated.masterCode = secureHash(u.masterCode);
        changed = true;
      }

      if (changed) hasChanges = true;
      return updated;
    });

    if (hasChanges) {
      setUsers(migratedUsers);
      console.log("[Segurança] Migração de senhas/chaves concluída.");
    }
  }
}, [isLoaded]);

useEffect(() => {
  if (!isLoaded) return;
  
  // Lógica de auto-exclusão (15 dias de inatividade)
  const now = Date.now();
  const fifteenDaysMs = 15 * 24 * 60 * 60 * 1000;
  const usersToKeep = users.filter(user => {
    // Não exclui o admin mestre
    if (user.id === 'admin') return true;
    
    if (user.isActive === false && user.deactivatedAt) {
      const deactivationDate = new Date(user.deactivatedAt).getTime();
      if (now - deactivationDate > fifteenDaysMs) {
        console.log(`[Segurança] Removendo permanentemente usuário @${user.username} por inatividade > 15 dias.`);
        return false;
      }
    }
    return true;
  });

  if (usersToKeep.length !== users.length) {
    setUsers(usersToKeep);
  }
}, [users, isLoaded]);

useEffect(() => {
  if (!isLoaded || isRestoringRef.current) return;

  const saveAll = async () => {
    console.log("SALVANDO DADOS");
    
    // Salva no LocalStorage
    salvarDados(STORAGE_KEYS.PRODUCTS, products);
    salvarDados(STORAGE_KEYS.CUSTOMERS, customers);
    salvarDados(STORAGE_KEYS.SALES, sales);
    salvarDados(STORAGE_KEYS.ACTIVITIES, activities);
    salvarDados(STORAGE_KEYS.CATEGORIES, categories);
    salvarDados(STORAGE_KEYS.PRODUCT_LOCATIONS, productLocations);
    salvarDados(STORAGE_KEYS.SUBCATEGORIES, subcategories);
    salvarDados(STORAGE_KEYS.DELIVERY_CHANNELS, deliveryChannels);
    salvarDados(STORAGE_KEYS.DELIVERY_METHODS, deliveryMethods);
    salvarDados(STORAGE_KEYS.CLOSED_SESSIONS, closedSessions);
    salvarDados(STORAGE_KEYS.USERS, users);
    salvarDados(STORAGE_KEYS.ROLES, roles);
    salvarDados(STORAGE_KEYS.PAYMENT_METHODS, paymentMethods);
    salvarDados(STORAGE_KEYS.CUSTOM_PAYMENT_METHODS, customPaymentMethods);
    salvarDados(STORAGE_KEYS.HIDDEN_PAYMENT_METHODS, hiddenPaymentMethods);
    salvarDados(STORAGE_KEYS.PRINTERS, printers);
    salvarDados(STORAGE_KEYS.COMPANY_INFO, company);
    salvarDados(STORAGE_KEYS.COUPON_CONFIG, couponConfig);
    salvarDados(STORAGE_KEYS.LABEL_CONFIG, labelConfig);
    salvarDados(STORAGE_KEYS.CASHIER_SESSION, cashierSession);
    salvarDados(STORAGE_KEYS.SELECTED_PRINTER, selectedPrinter);
    salvarDados(STORAGE_KEYS.SELECTED_LABEL_PRINTER, selectedLabelPrinter);
    salvarDados(STORAGE_KEYS.REVENUES, revenues);
    salvarDados(STORAGE_KEYS.PURCHASES, purchases);
    salvarDados(STORAGE_KEYS.EXPENSES, expenses);
    salvarDados(STORAGE_KEYS.RAW_MATERIALS, rawMaterialsStructured);
    salvarDados(STORAGE_KEYS.PRODUCT_RECIPES, productRecipes);

    // Salva Backup em Arquivo (Electron)
    const backupObj = {
      products, customers, sales, activities, categories, subcategories,
      delivery_channels: deliveryChannels, 
      delivery_methods: deliveryMethods,
      closed_sessions: closedSessions,
      users, roles, paymentMethods,
      customPaymentMethods, hiddenPaymentMethods, printers, company, couponConfig, labelConfig,
      cashierSession, openSessions, selectedPrinter, selectedLabelPrinter,
      revenues, purchases, expenses, rawMaterialsStructured, productRecipes
    };
    await salvarBackupArquivo(backupObj);
  };

  saveAll();
}, [
  isLoaded, products, customers, sales, activities, categories, subcategories, 
  deliveryChannels, deliveryMethods, closedSessions, users, roles, paymentMethods, customPaymentMethods, hiddenPaymentMethods,
  printers, company, couponConfig, labelConfig, cashierSession, openSessions, selectedPrinter, selectedLabelPrinter,
  revenues, purchases, expenses, rawMaterialsStructured, productRecipes
]);

  const calculateProductCost = (productId: string) => {
    const recipe = productRecipes.find(r => r.productId === productId);
    if (!recipe) {
      const product = products.find(p => p.id === productId);
      return product?.costPrice || 0;
    }

    return recipe.ingredients.reduce((total, ing) => {
      const material = rawMaterialsStructured.find(m => m.id === ing.rawMaterialId);
      if (!material) return total;
      return total + (ing.quantity * material.unitCost);
    }, 0);
  };

  const createRevenueForSale = (sale: Sale) => {
    const paymentGroups: Record<string, number> = {};
    const revenuesToCreate: Revenue[] = [];

    if (sale.payments && sale.payments.length > 0) {
      // Group to identify multiples of the same method
      sale.payments.forEach((p) => {
        paymentGroups[p.method] = (paymentGroups[p.method] || 0) + 1;
      });

      const currentCounts: Record<string, number> = {};
      
      sale.payments.forEach((p) => {
        currentCounts[p.method] = (currentCounts[p.method] || 0) + 1;
        
        let methodDisplayName = p.method;
        // Add index only if there are multiples and it's not cash
        if (p.method !== 'DINHEIRO' && paymentGroups[p.method] > 1) {
          methodDisplayName = `${p.method} ${currentCounts[p.method]}`;
        }

        revenuesToCreate.push({
          id: crypto.randomUUID(),
          saleId: sale.id,
          amount: p.amount,
          paymentMethod: methodDisplayName,
          status: 'pendente',
          date: new Date(sale.date).toISOString(),
          updatedAt: Date.now(),
          userId: currentUser?.id,
          userName: currentUser?.name
        });
      });
    } else {
      // Fallback for backward compatibility
      revenuesToCreate.push({
        id: crypto.randomUUID(),
        saleId: sale.id,
        amount: sale.total,
        paymentMethod: sale.paymentMethod,
        status: 'pendente',
        date: new Date(sale.date).toISOString(),
        updatedAt: Date.now(),
        userId: currentUser?.id,
        userName: currentUser?.name
      });
    }

    setRevenues(prev => [...prev, ...revenuesToCreate]);
  };

  const addSaleToCashier = (sale: Sale) => {
    if (cashierSession.isOpen) {
      const updated = {
        ...cashierSession,
        totalSales: cashierSession.totalSales + sale.total,
        salesCount: cashierSession.salesCount + 1,
        salesByMethod: {
          ...cashierSession.salesByMethod,
          [sale.paymentMethod]: (cashierSession.salesByMethod[sale.paymentMethod] || 0) + sale.total
        },
        updatedAt: Date.now()
      };
      setCashierSession(updated);
    }
  };

  const addCancellationToCashier = (amount: number) => {
    if (cashierSession.isOpen) {
      const updated = {
        ...cashierSession,
        totalCanceled: cashierSession.totalCanceled + amount,
        canceledCount: cashierSession.canceledCount + 1,
        updatedAt: Date.now()
      };
      setCashierSession(updated);
    }
  };

  const handleLogin = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

    try {
      // Pequeno delay artificial para evitar spam e mostrar feedback visual de carregamento
      await new Promise(resolve => setTimeout(resolve, 800));

      const admUser = users.find(u => u.id === 'admin');
      const isAdmAttempt = 
        loginUsername.toUpperCase() === 'ADM' || 
        loginUsername.toLowerCase() === 'admin' ||
        (admUser && admUser.username.toUpperCase() === loginUsername.toUpperCase());
      
      if (!isOnline && !isAdmAttempt) {
        setError('Conexão necessária para validar acesso deste usuário.');
        return;
      }

      const user = users.find(u => 
        (u.username && u.username.toUpperCase() === loginUsername.toUpperCase()) && 
        verifyPassword(loginPassword, u.password || '')
      );

      // Log de tentativa de login
      if (user) {
        logger.info(`Usuário encontrado: ${user.username}`, { id: user.id }, 'Auth');
        logger.info('Hash validado com sucesso.', null, 'Auth');
      } else {
        logger.warn(`Tentativa de login falhou: Usuário "${loginUsername}" não encontrado ou senha inválida.`, null, 'Auth');
        
        // --- FALLBACK DE EMERGÊNCIA ---
        // Se não houver usuários cadastrados no banco, permitir login com admin/ADM1234
        if (users.length === 0 && (loginUsername.toLowerCase() === 'admin' || loginUsername.toUpperCase() === 'ADM') && loginPassword === 'ADM1234') {
          logger.warn('EMERGÊNCIA: Entrando com admin padrão (Banco Vazio)', null, 'Auth');
          const emergencyAdmin: SystemUser = {
            id: 'admin',
            username: 'admin',
            name: 'Administrador Mestre (Fallback)',
            roleId: 'role-gerente',
            isActive: true,
            isFirstAccess: true
          };
          setCurrentUser(emergencyAdmin);
          setIsLogged(true);
          setView('first-access');
          return;
        }
      }

      if (user && user.isFirstAccess && isAdmAttempt && loginPassword === 'ADM1234') {
        logger.info('Primeiro acesso detectado para o administrador.', null, 'Auth');
        setView('first-access');
        return;
      }

      if (user) {
        if (user.isActive === false) {
          setError('Usuário inativo. Entre em contato com o administrador.');
          return;
        }
        
        if (isOnline || isAdmAttempt) {
          setCurrentUser(user);
          setIsLogged(true);
          addActivity('auth', 'Login Realizado', `O usuário ${user.name} acessou o sistema.`);

          const sessionInOpenSessions = openSessions[user.id];
          const isGlobalSessionForSameUser = cashierSession.isOpen && cashierSession.userId === user.id;

          if (sessionInOpenSessions && sessionInOpenSessions.isOpen) {
            setCashierSession(sessionInOpenSessions);
          } else if (isGlobalSessionForSameUser) {
            console.log("[Caixa] Mantendo sessão global ativa para usuário logado.");
          } else {
            setCashierSession({
              id: '', isOpen: false, openedAt: '', openingBalance: 0, totalSales: 0, totalCanceled: 0, salesCount: 0, canceledCount: 0, salesByMethod: {}
            });
          }
        } else {
          setError('Conexão necessária para validar acesso deste usuário.');
        }
      } else {
        setError('Credenciais incorretas! Verifique seu usuário e senha.');
      }
    } catch (err) {
      console.error("[Auth] Erro no login:", err);
      setError('Ocorreu um erro interno ao tentar realizar o login.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFirstAccessSetup = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

    try {
      await new Promise(resolve => setTimeout(resolve, 800));

      if (!newAdmUsername || newAdmUsername.trim().length < 3) {
        setError('O novo nome de usuário deve ter pelo menos 3 caracteres.');
        return;
      }
      if (!newAdmPassword || newAdmPassword.length < 4) {
        setError('A nova senha deve ter pelo menos 4 caracteres.');
        return;
      }
      if (newAdmPassword !== confirmAdmPassword) {
        setError('As senhas não coincidem!');
        return;
      }

      const masterCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      const masterCodeHash = secureHash(masterCode);
      setGeneratedMasterCode(masterCode);

      const newAdmin: SystemUser = {
        id: 'admin',
        username: newAdmUsername.toUpperCase(),
        name: 'Administrador',
        password: secureHash(newAdmPassword),
        roleId: 'role-gerente',
        isFirstAccess: false,
        masterCode: masterCodeHash,
        isActive: true
      };

      setUsers(prev => {
        const filtered = prev.filter(u => u.id !== 'admin');
        return [...filtered, newAdmin];
      });

      addActivity('security', 'Primeiro Acesso Concluído', `O administrador configurou novo login ${newAdmUsername.toUpperCase()} e senha.`);
      setView('master-code-display');
    } catch (err) {
      console.error("[Setup] Erro no primeiro acesso:", err);
      setError('Erro ao configurar primeiro acesso.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordRecovery = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      const adm = users.find(u => u.id === 'admin' || u.username.toUpperCase() === 'ADM');
      if (!adm || !adm.masterCode) {
        setError('Sistema não configurado para recuperação. Entre em contato com suporte.');
        return;
      }

      const inputHash = secureHash(recoveryMasterCodeInput.toUpperCase());
      if (inputHash !== adm.masterCode) {
        setError('Código Mestre Incorreto!');
        return;
      }

      if (!recoveryNewPassword || recoveryNewPassword.length < 4) {
        setError('A nova senha deve ter pelo menos 4 caracteres.');
        return;
      }

      if (recoveryNewPassword !== recoveryConfirmPassword) {
        setError('As senhas não coincidem!');
        return;
      }

    // Gerar NOVO Código Mestre conforme solicitação
    const newMasterCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    const newMasterCodeHash = secureHash(newMasterCode);
    setGeneratedMasterCode(newMasterCode);

    setUsers(prev => prev.map(u => {
      if (u.id === 'admin') {
        return { 
          ...u, 
          password: secureHash(recoveryNewPassword),
          masterCode: newMasterCodeHash
        };
      }
      return u;
    }));

    addActivity('security', 'Recuperação de Senha', 'A senha do administrador foi recuperada e um NOVO código mestre foi gerado.');
    setError('Senha redefinida com sucesso! Salve seu novo código mestre.');
    
    // Ir para tela de exibição do código mestre
    setView('master-code-display');
    
    // Limpar campos de recuperação
    setRecoveryMasterCodeInput('');
    setRecoveryNewPassword('');
    setRecoveryConfirmPassword('');
    } catch (err) {
      console.error("[Recovery] Erro na recuperação:", err);
      setError('Erro ao recuperar senha.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const downloadMasterCodePDF = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a6'
    });

    const companyName = company.name || 'SISTEMA DE GESTÃO';
    const dateStr = new Date().toLocaleString('pt-BR');

    // Header
    doc.setFillColor(255, 222, 46); // Yellow Primary
    doc.rect(0, 0, 105, 20, 'F');
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(String('CÓDIGO MESTRE DE RECUPERAÇÃO'), 52.5, 12, { align: 'center' });

    // Content
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(String('DETALHES DO SISTEMA:'), 10, 28);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(String(`Empresa: ${companyName}`), 10, 34);
    doc.text(String(`Usuário Principal: ADM`), 10, 39);
    doc.text(String(`Data/Hora de Geração: ${dateStr}`), 10, 44);
    doc.text(String(`Versão do Sistema: ${dynamicVersion}`), 10, 49);

    doc.setFillColor(0, 0, 0);
    doc.rect(10, 55, 85, 20, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('courier', 'bold');
    doc.text(String(generatedMasterCode || '---'), 52.5, 69, { align: 'center' });

    // Warning
    doc.setTextColor(200, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(String('⚠️ AVISO DE SEGURANÇA ⚠️'), 52.5, 85, { align: 'center' });
    
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    const securityWarning = [
      '1. Este código é ÚNICO e IRRECUPERÁVEL.',
      '2. Ele permite redefinir a senha do administrador ADM a qualquer momento.',
      '3. NUNCA compartilhe este código com ninguém, nem mesmo com o suporte.',
      '4. Guarde este PDF em um local seguro (pendrive offline ou impresso).',
      '5. O uso deste código será registrado no histórico de auditoria do sistema.'
    ];
    
    let currentY = 90;
    securityWarning.forEach(line => {
      doc.text(String(line), 10, currentY);
      currentY += 4;
    });

    const footerText = doc.splitTextToSize(
      'Ao utilizar este código, você assume total responsabilidade pela segurança dos dados da empresa.',
      85
    );
    doc.setFont('helvetica', 'italic');
    if (footerText) {
      doc.text(footerText, 10, 135);
    }

    doc.save(`CODIGO_MESTRE_ADM.pdf`);
  };

  const handleLogout = () => {
    setIsLogged(false);
    
    // Salva o estado do caixa atual na lista de sessões abertas antes de sair
    if (currentUser) {
      addActivity('auth', 'Logout Realizado', `O usuário ${currentUser.name} saiu do sistema.`);
      
      if (cashierSession.isOpen) {
        setOpenSessions(prev => ({
          ...prev,
          [currentUser.id]: { ...cashierSession, updatedAt: Date.now() }
        }));
      } else {
        setOpenSessions(prev => {
          const next = { ...prev };
          delete next[currentUser.id];
          return next;
        });
      }
    }

    setCurrentUser(null);
    setCashierSession({
      id: '', isOpen: false, openedAt: '', openingBalance: 0, totalSales: 0, totalCanceled: 0, salesCount: 0, canceledCount: 0, salesByMethod: {}
    });
    setLoginUsername('');
    setLoginPassword('');
    setView('dashboard');
  };

  const isUserAdminInternal = (user: SystemUser | null) => {
    return isUserAdmin(user, roles);
  };

  const getUserPermissions = () => {
    if (!currentUser) return DEFAULT_PERMISSIONS;
    
    // ADM/Dono tem acesso total automático a tudo
    if (isUserAdminInternal(currentUser)) {
      const fullPermissions = { ...DEFAULT_PERMISSIONS };
      (Object.keys(fullPermissions) as Array<keyof ModulePermissions>).forEach(key => {
        fullPermissions[key] = { ...ALL_ACTIONS };
      });
      return fullPermissions;
    }
    
    const role = (roles || INITIAL_ROLES).find(r => r.id === currentUser.roleId);
    return role ? role.permissions : DEFAULT_PERMISSIONS;
  };

  const canAccess = (module: keyof ModulePermissions) => {
    const permissions = getUserPermissions();
    return !!(permissions[module] as any)?.view;
  };

  const canEdit = (module: keyof ModulePermissions) => {
    const permissions = getUserPermissions();
    return !!(permissions[module] as any)?.edit;
  };

  const canCreate = (module: keyof ModulePermissions) => {
    const permissions = getUserPermissions();
    return !!(permissions[module] as any)?.create;
  };

  const canDelete = (module: keyof ModulePermissions) => {
    const permissions = getUserPermissions();
    return !!(permissions[module] as any)?.delete;
  };

  const canAdjust = (module: keyof ModulePermissions) => {
    const permissions = getUserPermissions();
    return !!(permissions[module] as any)?.adjust;
  };

  const canPrint = (module: keyof ModulePermissions) => {
    const permissions = getUserPermissions();
    return !!(permissions[module] as any)?.print;
  };

  const manualCheckForUpdates = async () => {
    if (checkingUpdates) return;
    setCheckingUpdates(true);
    try {
      // Pequeno delay para feedback visual
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Dispatch event for AppUpdater to handle the actual check and UI
      window.dispatchEvent(new CustomEvent('check-app-updates'));
      
      // Define um timeout para a verificação caso o IPC trave
      const checkWithTimeout = async () => {
        const timeout = new Promise<null>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout na verificação')), 12000)
        );
        return Promise.race([UpdateService.checkForUpdates(), timeout]);
      };

      const hasUpdate = await checkWithTimeout();
      if (!hasUpdate) {
        alert('Seu sistema já está na versão mais recente!');
      }
    } catch (err: any) {
      console.error('Erro ao verificar atualizações:', err);
      if (err.message !== 'Timeout na verificação') {
        alert('Seu sistema está atualizado ou o servidor está ocupado.');
      } else {
        alert('Tempo de resposta excedido. Tente novamente em instantes.');
      }
    } finally {
      setCheckingUpdates(false);
    }
  };

  useEffect(() => {
    // Buscar versão real se estiver no Electron
    const fetchVersion = async () => {
      try {
        const v = await UpdateService.getCurrentVersion();
        if (v && v !== '1.0.0') {
          setDynamicVersion(v);
        }
      } catch (err) {
        console.error('Erro ao buscar versão real:', err);
      }
    };
    fetchVersion();
  }, []);

  const menuItems = [
    { id: 'cashier', icon: Calculator, label: cashierSession.isOpen ? 'FECHAR CAIXA' : 'ABRIR CAIXA', description: cashierSession.isOpen ? 'Fechamento de caixa' : 'Abertura de caixa', theme: 'pink', module: 'pdv' },
    { id: 'pos', icon: ShoppingBag, label: 'PDV / VENDAS', description: 'Realize vendas no sistema PDV', theme: 'purple', module: 'pdv' },
    { id: 'separation', icon: Handshake, label: 'SEPARAÇÃO', description: 'Separação de pedidos e fluxo', theme: 'blue', module: 'separacao' },
    { id: 'payments', icon: CreditCard, label: 'PAGAMENTOS', description: 'Formas de pagamento e recebimentos', theme: 'purple', module: 'financeiro' },
    { id: 'customer-experience', icon: Star, label: 'EXP. CLIENTE', description: 'Experiência do cliente', theme: 'pink', module: 'customerExperience' },
    { id: 'add-product', icon: Boxes, label: 'ESTOQUE', description: 'Controle de estoque e produtos', theme: 'blue', module: 'estoque' },
    { id: 'lojistas', icon: Store, label: 'LOJISTAS', description: 'Gestão de lojistas', theme: 'pink', module: 'lojistas' },
    { id: 'central-producao', icon: Cpu, label: 'CENTRAL PRODUÇÃO', description: 'Dashboard de produção e fluxo', theme: 'purple', module: 'centralProducao' },
    { id: 'catalog', icon: LayoutGrid, label: 'CATÁLOGO', description: 'Consulte produtos e categorias', theme: 'purple', module: 'pdv' },
    { id: 'summary', icon: LayoutDashboard, label: 'DASHBOARD', description: 'Indicadores e relatórios', theme: 'blue', module: 'dashboard' },
    { id: 'sales-history', icon: History, label: 'HISTÓRICO', description: 'Histórico de operações', theme: 'pink', module: 'historico' },
    { id: 'pre-order', icon: ClipboardList, label: 'PRÉ-ENCOMENDA', description: 'Gestão de pré-encomendas', theme: 'blue', module: 'pdv' },
    { id: 'calculadora-custo', icon: Calculator, label: 'CALC. CUSTO', description: 'Calculadora de custo independente', theme: 'purple', module: 'calculadoraCosts' },
    { id: 'add-customer', icon: UserPlus, label: '+ CLIENTE', description: 'Cadastrar novo cliente', theme: 'purple', module: 'pdv' },
    { id: 'delivery', icon: Truck, label: '+ ENTREGA', description: 'Cadastrar nova entrega', theme: 'blue', module: 'pdv' },
    { id: 'historico_caixa', icon: History, label: 'HISTÓRICO CAIXA', description: 'Histórico de caixas', theme: 'purple', module: 'ajustes' },
    { id: 'auditoria', icon: ShieldCheck, label: 'AUDITORIA', description: 'Logs e auditoria do sistema', theme: 'blue', module: 'ajustes' },
    { id: 'returns', icon: RotateCcw, label: 'DEVOLUÇÃO', description: 'Gerenciar devoluções', theme: 'pink', module: 'devolucao' },
  ].filter(item => {
    if (item.id === 'historico_caixa' || item.id === 'auditoria') {
      return isUserAdmin(currentUser);
    }
    return canAccess(item.module as keyof ModulePermissions);
  });

  const permissions = getUserPermissions();

  const adjustItem = { id: 'adjust', icon: Store, label: 'AJUSTE', color: 'bg-zinc-800 text-orange-400', module: 'ajustes' };
  const financeItem = { id: 'finance', icon: BadgeDollarSign, label: 'FINANCEIRO', color: 'bg-zinc-800 text-green-400', module: 'financeiro' };
  const separationItem = { id: 'separation', icon: Handshake, label: 'SEPARAÇÃO', color: 'bg-zinc-800 text-orange-400', module: 'separacao' };

  return (
    <div className="w-full h-screen flex flex-col relative overflow-hidden bg-transparent">
      
      {/* Compact Dynamic Header */}
      {isLogged && view === 'dashboard' && (
        <div className="fixed top-0 left-0 right-0 z-[150] flex flex-col pointer-events-none transition-all duration-300">
          <div className="p-2 md:p-3 flex justify-between items-center w-full">
            {/* Logo Brand area - More compact, larger logo */}
            <motion.div 
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="flex items-center gap-2 md:gap-3 bg-[#12122b]/40 backdrop-blur-xl px-2 md:px-4 py-2 rounded-2xl border border-white/5 shadow-2xl pointer-events-auto group hover:bg-[#12122b]/60 transition-all"
            >
              {company.logo ? (
                 <div className="relative">
                   <img src={company.logo} className="w-10 h-10 md:w-16 md:h-16 object-contain" alt="Logo" />
                 </div>
              ) : (
                 <div className="w-10 h-10 md:w-16 md:h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center font-black text-xs md:text-xl italic text-white shadow-lg shrink-0">LF</div>
              )}
              <div className="flex flex-col min-w-0">
                <h1 className="text-[9px] md:text-[11px] font-black uppercase text-white leading-tight tracking-[0.1em] md:tracking-[0.15em] truncate max-w-[80px] xs:max-w-[120px] md:max-w-[200px]">{company.name || 'SISTEMA'}</h1>
                <div className="flex items-center gap-1 leading-none mt-0.5">
                   <div className="w-1 h-1 rounded-full bg-blue-400 animate-pulse shrink-0"></div>
                   <span className="text-[6px] md:text-[8px] font-bold text-blue-300/60 uppercase tracking-[0.05em] truncate">
                     {company.slogan || 'Soluções Inteligentes'}
                   </span>
                </div>
              </div>
            </motion.div>

            <motion.div 
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="flex items-center gap-1.5 pointer-events-auto"
            >
                {isUserAdmin(currentUser) && (
                  <div className="flex items-center gap-2 px-2 md:px-3 py-1.5 bg-[#12122b]/40 rounded-xl border border-white/5 backdrop-blur-xl shadow-lg mr-1 md:mr-2 shrink-0">
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      syncStatus === 'synced' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                      syncStatus === 'syncing' ? 'bg-blue-500 animate-pulse' :
                      syncStatus === 'error' ? 'bg-red-500' :
                      'bg-zinc-500'
                    }`} />
                    <span className="hidden xs:inline text-[8px] font-black uppercase tracking-widest text-white/60">
                      {syncStatus === 'synced' ? 'Sincronizado' :
                       syncStatus === 'syncing' ? 'Sincronizando...' :
                       syncStatus === 'error' ? 'Erro Sinc.' :
                       syncStatus === 'offline' ? 'Offline' : 'Online'}
                    </span>
                  </div>
                )}
                <button 
                  onClick={() => { setIsMobileMenuOpen(true); setIsRightDrawerOpen(false); }}
                  className="p-2 md:px-3 md:py-1.5 bg-[#12122b]/40 text-white border border-white/5 rounded-xl hover:bg-white/10 transition-all flex items-center gap-2 backdrop-blur-xl shadow-lg group active:scale-95"
                  title="Acesso Rápido"
                >
                  <Zap size={14} className="text-blue-400 group-hover:scale-110 transition-transform" />
                  <span className="hidden lg:inline text-[8px] font-black uppercase tracking-wider">Início</span>
                </button>
                <button 
                  onClick={() => { setIsRightDrawerOpen(true); setIsMobileMenuOpen(false); }}
                  className="p-2 md:px-3 md:py-1.5 bg-[#12122b]/40 text-white border border-white/5 rounded-xl hover:bg-white/10 transition-all flex items-center gap-2 backdrop-blur-xl shadow-lg group active:scale-95"
                  title="Controles"
                >
                  <Cpu size={14} className="text-purple-400 group-hover:scale-110 transition-transform" />
                  <span className="hidden lg:inline text-[8px] font-black uppercase tracking-wider">Ações</span>
                </button>
                <button 
                  className="p-2 md:px-3 md:py-1.5 bg-[#12122b]/40 text-white border border-white/5 rounded-xl hover:bg-white/10 transition-all flex items-center justify-center backdrop-blur-xl shadow-lg group active:scale-95"
                >
                  <div className="relative">
                    <Clock size={16} className="text-white/60" />
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-purple-500 rounded-full border border-[#12122b]" />
                  </div>
                </button>
              </motion.div>
          </div>

          {/* Fixed Search Bar below header */}
          <motion.div 
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="px-4 pb-2 pt-1 pointer-events-auto md:hidden"
          >
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search size={16} className="text-white/40 group-focus-within:text-purple-400 transition-colors" />
              </div>
              <input 
                type="text"
                value={homeSearchTerm}
                onChange={(e) => setHomeSearchTerm(e.target.value)}
                placeholder="Buscar no sistema..."
                className="w-full bg-[#1a1a3a]/60 backdrop-blur-3xl border border-white/5 rounded-2xl py-3.5 pl-12 pr-12 text-[11px] font-bold uppercase tracking-widest text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/40 focus:ring-1 focus:ring-purple-500/20 transition-all shadow-xl"
              />
              <button className="absolute inset-y-0 right-0 pr-4 flex items-center text-white/40 hover:text-white transition-colors">
                <SlidersHorizontal size={16} />
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Mobile Sidebar Menu Drawer (Main functionality) */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-[200] flex justify-end">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-[280px] bg-slate-900/40 backdrop-blur-3xl h-full border-l border-white/10 p-6 flex flex-col gap-6 overflow-y-auto no-scrollbar shadow-2xl"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white opacity-40">Menu Sistema</h3>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="flex flex-col gap-3">
                <button 
                   onClick={() => { setView('dashboard'); setIsMobileMenuOpen(false); }}
                   className={`flex items-center gap-4 p-5 rounded-[2rem] transition-all border border-white/10 ${view === 'dashboard' ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20' : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'}`}
                >
                  <LayoutDashboard size={22} />
                  <span className="text-[11px] font-black uppercase tracking-widest">Início</span>
                </button>

                <div className="h-0.5 bg-white/10 my-2 rounded-full" />

                {menuItems.map(item => (
                   <button 
                     key={item.id}
                     onClick={() => handleMenuClick(item.id as View)}
                     className={`flex items-center gap-4 p-5 rounded-[2rem] transition-all border border-white/10 ${view === item.id ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20' : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'}`}
                   >
                     <div className={`p-2 rounded-xl backdrop-blur-md ${
                       item.theme === 'purple' ? 'icon-bg-purple text-purple-400' : 
                       item.theme === 'blue' ? 'icon-bg-blue text-blue-400' : 
                       'icon-bg-pink text-pink-400'
                     }`}>
                       <item.icon size={20} />
                     </div>
                     <span className="text-[11px] font-black uppercase tracking-widest">{item.label}</span>
                   </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Right Drawer (Settings, Finance, Separation, Logout) */}
      <AnimatePresence>
        {isRightDrawerOpen && (
          <div className="fixed inset-0 z-[210] flex justify-end">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsRightDrawerOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-[320px] bg-slate-900/40 backdrop-blur-3xl h-full border-l border-white/10 p-6 md:p-8 flex flex-col gap-8 shadow-2xl overflow-y-auto no-scrollbar"
            >
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-white mb-1 leading-none">CONFIGURAÇÕES</h3>
                  <p className="text-[9px] font-black text-white/40 uppercase tracking-widest leading-none">MENU DE CONTROLE</p>
                </div>
                <button 
                  onClick={() => setIsRightDrawerOpen(false)} 
                  className="p-4 bg-white/5 text-white rounded-[1.5rem] transition-all hover:scale-110 active:scale-95 shadow-xl border border-white/10"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex flex-col gap-4">
                {canAccess('ajustes') && (
                  <button 
                    onClick={() => handleMenuClick('adjust')}
                    className={`flex items-center gap-5 p-5 rounded-[2.5rem] transition-all group border border-white/10 ${view === 'adjust' ? 'bg-blue-600 text-white shadow-xl' : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'}`}
                  >
                    <div className={`p-3 rounded-2xl transition-all ${view === 'adjust' ? 'bg-white/20 text-white' : 'bg-white/10 text-white/40 group-hover:bg-white/20 group-hover:text-white'}`}>
                      <adjustItem.icon size={22} />
                    </div>
                    <div className="flex flex-col items-start translate-y-[1px]">
                      <span className="text-[11px] font-black uppercase tracking-widest">Ajustes</span>
                      <span className="text-[8px] font-bold uppercase tracking-tight opacity-60">Configurações Gerais</span>
                    </div>
                  </button>
                )}

                {isUserAdmin(currentUser) && (
                  <button 
                    onClick={() => handleMenuClick('auditoria')}
                    className={`flex items-center gap-5 p-5 rounded-[2.5rem] transition-all group border border-white/10 ${view === 'auditoria' ? 'bg-blue-600 text-white shadow-xl' : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'}`}
                  >
                    <div className={`p-3 rounded-2xl transition-all ${view === 'auditoria' ? 'bg-white/20 text-white' : 'bg-white/10 text-white/40 group-hover:bg-white/20 group-hover:text-white'}`}>
                      <ShieldCheck size={22} />
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-[11px] font-black uppercase tracking-widest mb-1 leading-none">AUDITORIA</span>
                      <span className="text-[8px] font-bold opacity-60 uppercase tracking-tight">Gestão de Usuários</span>
                    </div>
                  </button>
                )}

                {canAccess('financeiro') && (
                  <button 
                    onClick={() => handleMenuClick('finance')}
                    className={`flex items-center gap-5 p-5 rounded-[2.5rem] transition-all group border border-white/10 ${view === 'finance' ? 'bg-blue-600 text-white shadow-xl' : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'}`}
                  >
                    <div className={`p-3 rounded-2xl transition-all ${view === 'finance' ? 'bg-white/20 text-white' : 'bg-white/10 text-white/40 group-hover:bg-white/20 group-hover:text-white'}`}>
                      <financeItem.icon size={22} />
                    </div>
                    <div className="flex flex-col items-start translate-y-[1px]">
                      <span className="text-[11px] font-black uppercase tracking-widest">Financeiro</span>
                      <span className="text-[8px] font-bold uppercase tracking-tight opacity-60">Caixa e Receitas</span>
                    </div>
                  </button>
                )}

                {canAccess('separacao') && (
                  <button 
                    onClick={() => handleMenuClick('separation')}
                    className={`flex items-center gap-5 p-5 rounded-[2.5rem] transition-all group border border-white/10 ${view === 'separation' ? 'bg-blue-600 text-white shadow-xl' : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'}`}
                  >
                    <div className={`p-3 rounded-2xl transition-all ${view === 'separation' ? 'bg-white/20 text-white' : 'bg-white/10 text-white/40 group-hover:bg-white/20 group-hover:text-white'}`}>
                      <separationItem.icon size={22} />
                    </div>
                    <div className="flex flex-col items-start translate-y-[1px]">
                      <span className="text-[11px] font-black uppercase tracking-widest">Separação</span>
                      <span className="text-[8px] font-bold uppercase tracking-tight opacity-60">Logística de Pedidos</span>
                    </div>
                  </button>
                )}

                <div className="h-0.5 bg-white/10 my-4 rounded-full" />

                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-5 p-6 rounded-[2.5rem] bg-red-600/20 text-red-100 border border-red-500/20 transition-all group shadow-xl hover:bg-red-600/40 hover:scale-105 active:scale-95"
                >
                  <div className="p-3 bg-red-500/20 text-red-100 rounded-2xl border border-red-500/40">
                    <Zap size={22} />
                  </div>
                  <div className="flex flex-col items-start translate-y-[1px]">
                    <span className="text-[12px] font-black uppercase tracking-widest">Encerrar</span>
                    <span className="text-[8px] font-bold uppercase tracking-tight opacity-60">Logout Seguro</span>
                  </div>
                </button>
              </div>

              <div className="mt-auto p-6 glass-panel text-center space-y-4">
                 <div className="space-y-1">
                   <p className="text-[10px] font-black text-white/40 uppercase tracking-widest leading-none">Versão do Sistema</p>
                   <p className="text-[12px] font-black text-blue-400 uppercase italic tracking-tighter bg-white/5 inline-block px-3 py-1 rounded-full border border-white/10 shadow-xl">V{dynamicVersion} • Estável</p>
                 </div>
                 
                 <button 
                   onClick={manualCheckForUpdates}
                   disabled={checkingUpdates}
                   className="w-full flex items-center justify-center gap-2 py-4 bg-white/5 text-white/70 text-[9px] font-black uppercase tracking-widest rounded-2xl transition-all border border-white/10 hover:bg-white/10 active:scale-95 disabled:opacity-50"
                 >
                   <RefreshCw size={12} className={checkingUpdates ? "animate-spin" : ""} />
                   {checkingUpdates ? 'Verificando...' : 'Procurar Atualização'}
                 </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {!isLogged ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <AnimatePresence mode="wait">
            {view === 'dashboard' && (
              <motion.div 
                key="login"
                initial={{ opacity: 0, scale: 0.9 }} 
                animate={{ opacity: 1, scale: 1 }} 
                exit={{ opacity: 0, scale: 0.9 }}
                className="glass-panel p-10 md:p-14 max-w-sm w-full space-y-10 flex flex-col items-center border-purple-500/20 shadow-[0_0_50px_rgba(168,85,247,0.15)]"
              >
                 {!isLoaded ? (
                   <div className="flex flex-col items-center gap-6 py-10">
                     <div className="w-16 h-16 border-4 border-purple-500/20 border-t-purple-600 rounded-full animate-spin shadow-lg" />
                     <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] animate-pulse">Carregando Sistema...</p>
                   </div>
                 ) : (
                 <>
                 <div className="relative">
                    <div className="relative w-40 h-40 bg-gradient-to-br from-purple-600/20 to-blue-600/20 backdrop-blur-3xl rounded-full flex items-center justify-center text-white border border-white/10 shadow-[0_0_30px_rgba(168,85,247,0.3)] overflow-hidden">
                       {company.logo ? (
                          <img src={company.logo} className="w-26 h-26 object-contain drop-shadow-[0_0_15px_rgba(168,85,247,0.4)]" alt="Logo" />
                       ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center">
                            <span className="text-4xl font-black italic tracking-tighter">LF</span>
                          </div>
                       )}
                    </div>
                 </div>
                 <div className="text-center space-y-2">
                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">{company.name || 'Acesso Seguro'}</h2>
                    <p className="text-[11px] font-black text-purple-400 uppercase tracking-[0.2em] opacity-80">
                      {company.slogan || 'Painel Administrativo'}
                    </p>
                 </div>
                 <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }} className="w-full space-y-6">
                    <Input 
                      label="USUÁRIO" 
                      value={loginUsername} 
                      onChange={setLoginUsername} 
                      placeholder="DIGITE SEU USUÁRIO" 
                      dark 
                      disabled={isSubmitting}
                    />
                    <div className="space-y-4">
                      <Input 
                        label="Senha" 
                        value={loginPassword} 
                        onChange={setLoginPassword} 
                        type="password" 
                        placeholder="****" 
                        dark 
                        disabled={isSubmitting}
                      />
                      <button 
                        type="submit"
                        disabled={isSubmitting}
                        className="glass-button-primary w-full p-6 text-[11px] tracking-[0.2em] flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-wait"
                      >
                        {isSubmitting ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Aguarde...</span>
                          </>
                        ) : (
                          'Desbloquear Sistema'
                        )}
                      </button>
                    </div>
                 </form>
                 <div className="flex flex-col items-center gap-6 w-full pt-4">
                    <button 
                      onClick={() => setView('forgot-password')}
                      className="text-[10px] font-black text-white/30 hover:text-purple-400 uppercase tracking-widest underline decoration-1 underline-offset-8 transition-colors"
                    >
                      Esqueceu as credenciais?
                    </button>
                 </div>
                 </>
                 )}
              </motion.div>
            )}

            {view === 'first-access' && (
              <motion.div 
                key="first-access"
                initial={{ opacity: 0, x: 20 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: -20 }}
                className="glass-panel p-10 max-w-md w-full space-y-8 flex flex-col items-center shadow-2xl"
              >
                 <div className="w-20 h-20 bg-blue-600/20 text-blue-400 rounded-full flex items-center justify-center border border-blue-500/20 shadow-xl">
                    <Lock size={32} />
                 </div>
                 <div className="text-center space-y-2">
                    <h2 className="text-xl font-black text-white uppercase tracking-tighter">Primeiro Acesso</h2>
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest px-4">Por segurança, você deve alterar a senha padrão do administrador.</p>
                 </div>
                 <form 
                   onSubmit={(e) => {
                     e.preventDefault();
                     handleFirstAccessSetup();
                   }}
                   className="w-full space-y-4"
                 >
                    <Input label="Novo Login ADM" value={newAdmUsername} onChange={(v) => setNewAdmUsername(v.toUpperCase())} placeholder="Ex: ADMIN_MASTER" disabled={isSubmitting} />
                    <Input label="Nova Senha" value={newAdmPassword} onChange={setNewAdmPassword} type="password" placeholder="Mínimo 4 caracteres" disabled={isSubmitting} />
                    <Input label="Confirmar Senha" value={confirmAdmPassword} onChange={setConfirmAdmPassword} type="password" placeholder="Repita a senha" disabled={isSubmitting} />
                    <button 
                      type="submit"
                      disabled={isSubmitting}
                      className="glass-button-primary w-full p-5 flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Salvando...</span>
                        </>
                      ) : (
                        'Salvar Alteração'
                      )}
                    </button>
                    <button 
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => setView('dashboard')}
                      className="w-full text-[10px] font-black text-white/40 uppercase tracking-widest pt-2 hover:text-white transition-colors disabled:opacity-30"
                    >
                      Cancelar e Sair
                    </button>
                 </form>
              </motion.div>
            )}

            {view === 'master-code-display' && (
              <motion.div 
                key="master-code"
                initial={{ opacity: 0, scale: 0.9 }} 
                animate={{ opacity: 1, scale: 1 }}
                className="glass-panel p-10 max-w-md w-full space-y-8 flex flex-col items-center shadow-2xl"
              >
                 <div className="w-20 h-20 bg-blue-600/20 text-blue-400 rounded-full flex items-center justify-center border border-blue-500/20 shadow-xl">
                    <Check size={42} />
                 </div>
                 <div className="text-center space-y-4">
                    <h2 className="text-xl font-black text-white uppercase tracking-tighter">Segurança Configurada!</h2>
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest leading-relaxed">
                      Geramos seu <span className="text-blue-400 font-black">CÓDIGO MESTRE</span> único. Ele é essencial para recuperar sua conta caso esqueça a senha.
                    </p>
                 </div>

                 <div className="w-full bg-white/5 p-8 rounded-3xl border border-white/10 text-center space-y-4 shadow-inner">
                    <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Código Gerado:</p>
                    <p className="text-4xl font-black text-white tracking-[0.3em] font-mono drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]">{generatedMasterCode}</p>
                 </div>

                 <div className="w-full space-y-4">
                    <button 
                      onClick={downloadMasterCodePDF}
                      className="glass-button-primary w-full p-5"
                    >
                      <Download size={18} />
                      Baixar PDF de Segurança
                    </button>
                    
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                      <p className="text-[8px] font-black text-red-400 uppercase text-center leading-tight">
                        Atenção: Este código será exibido apenas esta vez. Salve o arquivo ou anote o código.
                      </p>
                    </div>

                    <button 
                      onClick={() => {
                        alert('Certifique-se de que salvou seu código mestre!');
                        setView('dashboard');
                        setIsLogged(false);
                      }}
                      className="w-full bg-white/5 text-white/30 p-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] border border-white/10 hover:bg-white/10 transition-all active:scale-95"
                    >
                      Concluir e Voltar ao Login
                    </button>
                 </div>
              </motion.div>
            )}

            {view === 'forgot-password' && (
              <motion.div 
                key="recovery"
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: 20 }}
                className="glass-panel p-10 max-w-md w-full space-y-8 flex flex-col items-center shadow-2xl"
              >
                 <div className="w-20 h-20 bg-blue-600/20 text-blue-400 rounded-full flex items-center justify-center border border-blue-500/20 shadow-xl">
                    <RotateCcw size={32} />
                 </div>
                 <div className="text-center space-y-2">
                    <h2 className="text-xl font-black text-white uppercase tracking-tighter">Recuperar Senha</h2>
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest px-4">Utilize seu Código Mestre para definir uma nova senha para ADM.</p>
                 </div>
                 <div className="w-full space-y-4">
                    <Input label="Código Mestre" value={recoveryMasterCodeInput} onChange={(v) => setRecoveryMasterCodeInput(v.toUpperCase())} placeholder="Ex: XJ83K2" disabled={isSubmitting} />
                    <Input label="Nova Senha" value={recoveryNewPassword} onChange={setRecoveryNewPassword} type="password" placeholder="****" disabled={isSubmitting} />
                    <Input label="Confirmar Senha" value={recoveryConfirmPassword} onChange={setRecoveryConfirmPassword} type="password" placeholder="****" disabled={isSubmitting} />
                    <button 
                      onClick={handlePasswordRecovery}
                      disabled={isSubmitting}
                      className="glass-button-primary w-full p-5 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Redefinindo...</span>
                        </>
                      ) : (
                        'Redefinir Senha'
                      )}
                    </button>
                    <button 
                      onClick={() => setView('dashboard')}
                      className="w-full text-[10px] font-black text-white/40 uppercase tracking-widest pt-2 hover:text-white transition-colors"
                    >
                      Voltar ao Login
                    </button>
                  </div>
               </motion.div>
             )}
           </AnimatePresence>
         </div>
       ) : null}
      {/* Mobile Drawer Backdrop */}
      <AnimatePresence>
        {(isMobileMenuOpen || isRightDrawerOpen) && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { setIsMobileMenuOpen(false); setIsRightDrawerOpen(false); }}
            className="fixed inset-0 z-[190] bg-black/60 backdrop-blur-md md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Main Content Area: Fixed Height with Internal Scroll */}
      <main className={`flex-1 w-full h-full relative z-10 flex flex-col overflow-hidden ${view === 'separation' || view === 'pos' ? '' : isLogged ? (view === 'dashboard' ? 'pt-36 md:pt-20 pb-24 md:pb-2 px-2 md:px-4' : 'p-0') : 'justify-center items-center px-4 overflow-y-auto'}`}>
        <AnimatePresence mode="wait">
          {view === 'dashboard' ? (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4 w-full h-full max-w-full mx-auto overflow-y-auto no-scrollbar py-2 px-2 pb-24 lg:pb-0"
            >
              {menuItems
                .filter(item => 
                  item.label.toLowerCase().includes(homeSearchTerm.toLowerCase()) || 
                  (item.description && item.description.toLowerCase().includes(homeSearchTerm.toLowerCase()))
                )
                .map((item) => (
                <button
                  id={`menu-${item.id}`}
                  key={item.id}
                  onClick={() => handleMenuClick(item.id as View)}
                  className="group relative flex flex-col p-4 glass-card transition-all duration-300 active:scale-[0.98] h-full min-h-[160px] overflow-hidden text-left"
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform duration-500 group-hover:scale-110 ${
                    item.theme === 'purple' ? 'icon-bg-purple neon-purple text-purple-400' : 
                    item.theme === 'blue' ? 'icon-bg-blue neon-blue text-blue-400' : 
                    'icon-bg-pink neon-pink text-pink-400'
                  }`}>
                    <item.icon size={24} />
                  </div>
                  
                  <div className="flex-1 space-y-1.5">
                    <h3 className="text-[11px] font-black tracking-widest text-white uppercase leading-none truncate pr-4">
                      {item.label}
                    </h3>
                    <p className="text-[8px] font-bold text-white/30 uppercase leading-relaxed tracking-wider line-clamp-2 pr-4">
                      {item.description || 'Acessar módulo'}
                    </p>
                  </div>

                  {/* Access Button Icon (Image style) */}
                  <div className="absolute bottom-4 right-4 w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-purple-500 group-hover:border-purple-400 transition-all duration-300">
                    <ChevronRight size={12} className="text-white transition-transform group-hover:translate-x-0.5" />
                  </div>

                  {/* Aesthetic Background Glow */}
                  <div className={`absolute -top-10 -right-10 w-24 h-24 blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-700 ${
                    item.theme === 'purple' ? 'bg-purple-500' : 
                    item.theme === 'blue' ? 'bg-blue-500' : 
                    'bg-pink-500'
                  }`} />
                </button>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="sub-view"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="w-full h-full max-w-full glass-panel border-0 md:border md:border-white/5 flex flex-col overflow-hidden shadow-none md:shadow-[0_32px_64px_rgba(0,0,0,0.6)] md:rounded-[2.5rem] pb-20 md:pb-0"
            >
              {/* Internal header for subviews */}
              <div className={`px-4 py-2 border-b border-white/5 bg-white/[0.02] backdrop-blur-3xl flex items-center justify-between shrink-0 ${view === 'add-product' || view === 'payments' || view === 'lojistas' || view === 'add-customer' || view === 'adjust' ? 'hidden' : ''}`}>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setView('dashboard')}
                    className="p-1.5 bg-white/5 text-white rounded-lg transition-all hover:bg-white/10 flex items-center justify-center border border-white/10 shadow-xl group"
                  >
                    <ChevronLeft size={16} className="group-hover:text-purple-400 transition-colors" />
                  </button>
                  <div className="flex flex-col">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#E2E8F0] drop-shadow-[0_0_10px_rgba(168,85,247,0.3)]">
                      {menuItems.find(m => m.id === view)?.label || view.replace(/-/g, ' ')}
                    </h3>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setIsMobileMenuOpen(true)}
                    className="md:hidden p-2 bg-white/5 text-white rounded-xl border border-white/5"
                  >
                    <LayoutGrid size={16} className="text-blue-400" />
                  </button>
                </div>
              </div>

              {/* Internal View Container with Scroll */}
              <div className="flex-1 overflow-hidden relative">
                <div className={`absolute inset-0 ${view === 'pos' || view === 'calculadora-custo' ? 'overflow-hidden' : 'overflow-y-auto'} p-0 custom-scrollbar`}>
               {view === 'product-locations' && (
                <ProductLocationView
                  locations={productLocations}
                  setLocations={setProductLocations}
                  onBack={() => setView('add-product')}
                  canEdit={canEdit('estoque')}
                />
              )}

               {view === 'add-product' && permissions.estoque.view && (
                <ProductView 
                  products={products} 
                  setProducts={setProducts} 
                  setView={setView} 
                  categories={categories}
                  setCategories={setCategories}
                  subcategories={subcategories}
                  setSubcategories={setSubcategories}
                  productLocations={productLocations}
                  setProductLocations={setProductLocations}
                  addActivity={addActivity}
                  labelConfig={labelConfig}
                  imprimirEtiqueta={imprimirEtiqueta}
                  calculateProductCost={calculateProductCost}
                  currentUser={currentUser}
                  canEdit={permissions.estoque.edit}
                  catalogDescriptions={catalogDescriptions}
                  setCatalogDescriptions={setCatalogDescriptions}
                  selectedLabelProduct={selectedLabelProduct}
                  setSelectedLabelProduct={setSelectedLabelProduct}
                  addToLabelLot={addToLabelLot}
                />
              )}
              {view === 'movement' && permissions.historico.view && (
                <ActivityView 
                  roles={roles}
                  activities={activities}
                  sales={sales} 
                  products={products} 
                  customers={customers}
                  company={company}
                  couponConfig={couponConfig}
                  imprimirCupom={imprimirCupom}
                  imprimirPedidoPDV={imprimirPedidoPDV}
                  generateReceiptHTML={generateReceiptHTML}
                  generateSimpleReceiptHTML={generateSimpleReceiptHTML}
                  performUnifiedPrint={performUnifiedPrint}
                  onCancelSale={(saleId) => {
                    const sale = sales.find(s => s.id === saleId);
                    if (sale && confirm('Deseja realmente CANCELAR esta venda? Esta ação não pode ser desfeita.')) {
                      const updatedAt = Date.now();
                      setSales((prev: any) => prev.map((s: any) => s.id === saleId ? { ...s, status: 'cancelado', updatedAt } : s));
                      addCancellationToCashier(sale.total);
                      addActivity('sale', 'Venda Cancelada', `Venda #${sale.sequentialId || sale.id.substring(0, 8)} de R$ ${sale.total.toFixed(2)} foi cancelada.`);
                    }
                  }}
                  canEdit={permissions.historico.edit}
                  currentUser={currentUser}
                  couponPDVConfig={couponPDVConfig}
                  paymentIcons={paymentIcons}
                  onBack={() => setView('dashboard')}
                  setSelectedLabelProduct={setSelectedLabelProduct}
                />
              )}
              {view === 'sales-history' && permissions.historico.view && (
                <ActivityView 
                  activities={activities}
                  sales={sales} 
                  products={products} 
                  customers={customers}
                  company={company}
                  couponConfig={couponConfig}
                  imprimirCupom={imprimirCupom}
                  imprimirPedidoPDV={imprimirPedidoPDV}
                  generateReceiptHTML={generateReceiptHTML}
                  generateSimpleReceiptHTML={generateSimpleReceiptHTML}
                  performUnifiedPrint={performUnifiedPrint}
                  onCancelSale={(saleId) => {
                    const sale = sales.find(s => s.id === saleId);
                    if (sale && confirm('Deseja realmente CANCELAR esta venda?')) {
                      const updatedAt = Date.now();
                      setSales((prev: any) => prev.map((s: any) => s.id === saleId ? { ...s, status: 'cancelado', updatedAt } : s));
                      addCancellationToCashier(sale.total);
                      addActivity('sale', 'Venda Cancelada', `Venda #${sale.sequentialId || sale.id.substring(0, 8)} de R$ ${sale.total.toFixed(2)} foi cancelada.`);
                    }
                  }}
                  canEdit={permissions.historico.edit}
                  currentUser={currentUser}
                  couponPDVConfig={couponPDVConfig}
                  roles={roles}
                  paymentIcons={paymentIcons}
                  onBack={() => setView('dashboard')}
                  setSelectedLabelProduct={setSelectedLabelProduct}
                />
              )}
              {view === 'pos' && permissions.pdv.view && (
                <POSView 
                  view={view}
                  sales={sales}
                  products={products} 
                  setSales={setSales} 
                  setProducts={setProducts} 
                  paymentMethods={paymentMethods} 
                  paymentIcons={paymentIcons}
                  addActivity={addActivity}
                  cashierSession={cashierSession}
                  addSaleToCashier={addSaleToCashier}
                  customers={customers}
                  setCustomers={setCustomers}
                  deliveryChannels={deliveryChannels}
                  setDeliveryChannels={setDeliveryChannels}
                  deliveryMethods={deliveryMethods}
                  company={company}
                  couponConfig={couponConfig}
                  couponPDVConfig={couponPDVConfig}
                  setView={setView}
                  imprimirCupom={imprimirCupom}
                  imprimirPedidoPDV={imprimirPedidoPDV}
                  generateReceiptHTML={generateReceiptHTML}
                  generateSimpleReceiptHTML={generateSimpleReceiptHTML}
                  performUnifiedPrint={performUnifiedPrint}
                  calculateProductCost={calculateProductCost}
                  createRevenueForSale={createRevenueForSale}
                  goldCustomerIds={goldCustomerIds}
                  currentUser={currentUser}
                  canEdit={permissions.pdv.edit}
                  setRedirectAfterCashier={setRedirectAfterCashier}
                  setSelectedLabelProduct={setSelectedLabelProduct}
                  setIsMobileMenuOpen={setIsMobileMenuOpen}
                  setIsRightDrawerOpen={setIsRightDrawerOpen}
                  orderCounter={orderCounter}
                  setOrderCounter={setOrderCounter}
                />
              )}
              {view === 'separation' && permissions.separacao.view && (
                <SeparationView 
                  sales={sales.filter(s => s.status === 'em_separacao')}
                  setSales={setSales}
                  products={products}
                  setProducts={setProducts}
                  productLocations={productLocations}
                  addActivity={addActivity}
                  customers={customers}
                  setRevenues={setRevenues}
                  setView={setView}
                  company={company}
                  currentUser={currentUser}
                  couponConfig={couponConfig}
                  setSelectedLabelProduct={setSelectedLabelProduct}
                />
              )}
              {view === 'returns' && permissions.devolucao.view && (
                <ReturnsView 
                  sales={sales}
                  products={products}
                  customers={customers}
                  onConfirmReturn={handleConfirmReturn}
                  onBack={() => setView('dashboard')}
                />
              )}
              {view === 'lojistas' && permissions.lojistas.view && (
                <ShopkeeperView 
                  shopkeepers={shopkeepers}
                  setShopkeepers={setShopkeepers}
                  deliveries={shopkeeperDeliveries}
                  setDeliveries={setShopkeeperDeliveries}
                  products={products}
                  setProducts={setProducts}
                  addActivity={addActivity}
                  canEdit={permissions.lojistas.edit}
                  company={company}
                  sales={sales}
                  setSales={setSales}
                  revenues={revenues}
                  setRevenues={setRevenues}
                  addSaleToCashier={addSaleToCashier}
                  currentUser={currentUser}
                  setView={setView}
                  showGlobalError={showGlobalError}
                  performPrint={performUnifiedPrint}
                />
              )}
              {view === 'calculadora-custo' && permissions.calculadoraCosts.view && (
                <CostCalculatorView 
                  materials={calculatorMaterials}
                  setMaterials={setCalculatorMaterials}
                  projects={calculatorProjects}
                  setProjects={setCalculatorProjects}
                  setView={setView}
                />
              )}
              {view === 'finance' && permissions.financeiro.view && (
                <FinanceView 
                  sales={sales}
                  revenues={revenues}
                  setRevenues={setRevenues}
                  purchases={purchases}
                  setPurchases={setPurchases}
                  expenses={expenses}
                  setExpenses={setExpenses}
                  rawMaterials={rawMaterialsStructured}
                  setRawMaterials={setRawMaterialsStructured}
                  productRecipes={productRecipes}
                  setProductRecipes={setProductRecipes}
                  products={products}
                  addActivity={addActivity}
                  setView={setView}
                  canEdit={permissions.financeiro.edit}
                  currentUser={currentUser}
                  paymentIcons={paymentIcons}
                />
              )}
              {view === 'pre-order' && permissions.pdv.view && (
                <PreOrderView 
                  preOrders={preOrders}
                  setPreOrders={setPreOrders}
                  addActivity={addActivity}
                  sales={sales}
                  setSales={setSales}
                  products={products}
                  customers={customers}
                />
              )}
               {view === 'delivery' && permissions.pdv.view && (
                <DeliveryView 
                  sales={sales}
                  deliveryChannels={deliveryChannels}
                  deliveryMethods={deliveryMethods}
                  setDeliveryMethods={setDeliveryMethods}
                  products={products}
                  customers={customers}
                  company={company}
                  couponConfig={couponConfig}
                  generateReceiptHTML={generateReceiptHTML}
                  generateSimpleReceiptHTML={generateSimpleReceiptHTML}
                  performUnifiedPrint={performUnifiedPrint}
                  addActivity={addActivity}
                  setSales={setSales}
                  imprimirCupom={imprimirCupom}
                  imprimirPedidoPDV={imprimirPedidoPDV}
                  canEdit={permissions.pdv.edit}
                  currentUser={currentUser}
                  couponPDVConfig={couponPDVConfig}
                  paymentIcons={paymentIcons}
                  setView={setView}
                />
              )}
              {view === 'cashier' && permissions.pdv.view && (
                <CashierView 
                  cashierSession={cashierSession}
                  setCashierSession={setCashierSession}
                  sales={sales}
                  closedSessions={closedSessions}
                  setClosedSessions={setClosedSessions}
                  addActivity={addActivity}
                  users={users}
                  couponConfig={couponConfig}
                  imprimirCupom={imprimirCupom}
                  canEdit={permissions.pdv.edit}
                  currentUser={currentUser}
                  setView={setView}
                  redirectAfterCashier={redirectAfterCashier}
                  setRedirectAfterCashier={setRedirectAfterCashier}
                />
              )}
              {view === 'historico_caixa' && (
                <CashierHistoryView 
                  closedSessions={closedSessions}
                  imprimirCupom={imprimirCupom}
                  couponConfig={couponConfig}
                  canEdit={permissions.pdv.edit}
                  onBack={() => setView('dashboard')}
                />
              )}
              {view === 'auditoria' && (
                <AuditoriaView 
                  activities={activities} 
                  users={users} 
                  roles={roles} 
                  sales={sales} 
                  closedSessions={closedSessions} 
                  onBack={() => setView('dashboard')}
                />
              )}
              {view === 'summary' && permissions.dashboard.view && (
                <DashboardView 
                  sales={sales} 
                  products={products} 
                  customers={customers}
                  expenses={expenses}
                  purchases={purchases}
                  revenues={revenues}
                  paymentMethods={paymentMethods} 
                  paymentIcons={paymentIcons}
                  goldCustomerIds={goldCustomerIds}
                  currentUser={currentUser}
                  onGoToProduct={(productId) => {
                    if (permissions.estoque.view) {
                      setView('add-product');
                      setTimeout(() => {
                        const element = document.getElementById(`product-${productId}`);
                        if (element) {
                          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          element.classList.add('ring-4', 'ring-blue-400', 'ring-offset-2');
                          setTimeout(() => element.classList.remove('ring-4', 'ring-blue-400', 'ring-offset-2'), 3000);
                        }
                      }, 500);
                    }
                  }}
                />
              )}
              {view === 'add-customer' && permissions.pdv.view && (
                <CustomerView 
                  customers={customers} 
                  setCustomers={setCustomers} 
                  addActivity={addActivity} 
                  sales={sales}
                  imprimirCupom={imprimirCupom as any}
                  company={company}
                  couponConfig={couponConfig}
                  products={products}
                  goldCustomerIds={goldCustomerIds}
                  canEdit={permissions.pdv.edit}
                  currentUser={currentUser}
                  paymentIcons={paymentIcons}
                  generateCustomerPDF={generateCustomerPDF}
                  onBackToDashboard={() => setView('dashboard')}
                  setSelectedLabelProduct={setSelectedLabelProduct}
                />
              )}
              {view === 'payments' && permissions.financeiro.view && (
                <PaymentsView 
                  paymentMethods={paymentMethods} 
                  setPaymentMethods={setPaymentMethods} 
                  paymentIcons={paymentIcons}
                  setPaymentIcons={setPaymentIcons}
                  customPaymentMethods={customPaymentMethods} 
                  setCustomPaymentMethods={setCustomPaymentMethods} 
                  hiddenPaymentMethods={hiddenPaymentMethods}
                  setHiddenPaymentMethods={setHiddenPaymentMethods}
                  sales={sales} 
                  addActivity={addActivity}
                  canEdit={permissions.financeiro.edit}
                  currentUser={currentUser}
                  setView={setView}
                />
              )}
              {view === 'adjust' && permissions.ajustes.view && (
                <SettingsView 
                  isRestoringRef={isRestoringRef}
                  currentUser={currentUser}
                  addActivity={addActivity}
                  company={company} 
                  setCompany={setCompany} 
                  couponConfig={couponConfig}
                  setCouponConfig={setCouponConfig}
                  couponPDVConfig={couponPDVConfig}
                  setCouponPDVConfig={setCouponPDVConfig}
                  pdvTestSale={pdvTestSale}
                  setPdvTestSale={setPdvTestSale}
                  users={users}
                  setUsers={setUsers}
                  setCurrentUser={setCurrentUser}
                  roles={roles}
                  setRoles={setRoles}
                  labelConfig={labelConfig}
                  setLabelConfig={setLabelConfig}
                  labelLotConfig={labelLotConfig}
                  setLabelLotConfig={setLabelLotConfig}
                  paymentIcons={paymentIcons}
                  greetingCouponConfig={greetingCouponConfig}
                  setGreetingCouponConfig={setGreetingCouponConfig}
                  onBack={() => setView('dashboard')} 
                  setView={setView}
                  printers={printers}
                  setPrinters={setPrinters}
                  selectedPrinter={selectedPrinter}
                  setSelectedPrinter={setSelectedPrinter}
                  selectedLabelPrinter={selectedLabelPrinter}
                  setSelectedLabelPrinter={setSelectedLabelPrinter}
                  hardwarePrinters={hardwarePrinters}
                  setHardwarePrinters={setHardwarePrinters}
                  registeredPrinters={registeredPrinters}
                  setRegisteredPrinters={setRegisteredPrinters}
                  products={products}
                  customers={customers}
                  sales={sales}
                  activities={activities}
                  categories={categories}
                  subcategories={subcategories}
                  deliveryChannels={deliveryChannels}
                  deliveryMethods={deliveryMethods}
                  setDeliveryMethods={setDeliveryMethods}
                  paymentMethods={paymentMethods}
                  customPaymentMethods={customPaymentMethods}
                  cashierSession={cashierSession}
                  revenues={revenues}
                  purchases={purchases}
                  expenses={expenses}
                  rawMaterials={[]}
                  rawMaterialsStructured={rawMaterialsStructured}
                  productRecipes={productRecipes}
                  shopkeepers={shopkeepers}
                  shopkeeperDeliveries={shopkeeperDeliveries}
                  catalogDescriptions={catalogDescriptions}
                  canEdit={permissions.ajustes.edit}
                  imprimirCupom={imprimirCupom}
                  imprimirPedidoPDV={imprimirPedidoPDV}
                  performUnifiedPrint={performUnifiedPrint}
                  generateReceiptHTML={generateReceiptHTML}
                  generateSimpleReceiptHTML={generateSimpleReceiptHTML}
                  hiddenPaymentMethods={hiddenPaymentMethods}
                  closedSessions={closedSessions}
                  openSessions={openSessions}
                  generateGreetingCupomHTML={generateGreetingCupomHTML}
                  setProducts={setProducts}
                  setCustomers={setCustomers}
                  setSales={setSales}
                  setActivities={setActivities}
                  setCategories={setCategories}
                  setSubcategories={setSubcategories}
                  setClosedSessions={setClosedSessions}
                  setCashierSession={setCashierSession}
                  setRevenues={setRevenues}
                  setPurchases={setPurchases}
                  setExpenses={setExpenses}
                  setRawMaterialsStructured={setRawMaterialsStructured}
                  setProductRecipes={setProductRecipes}
                  setShopkeepers={setShopkeepers}
                  setShopkeeperDeliveries={setShopkeeperDeliveries}
                  setCatalogDescriptions={setCatalogDescriptions}
                  setPreOrders={setPreOrders}
                  preOrders={preOrders}
                  setOpenSessions={setOpenSessions}
                  verifyPassword={verifyPassword}
                  secureHash={secureHash}
                  isHashed={isHashed}
                  setOrderCounter={setOrderCounter}
                  labelLot={labelLot}
                  setLabelLot={setLabelLot}
                  clearLabelLot={clearLabelLot}
                  removeFromLabelLot={removeFromLabelLot}
                  updateLabelLotItem={updateLabelLotItem}
                  generateProgrammaticLabelPDF={generateProgrammaticLabelPDF}
                  imprimirEtiqueta={imprimirEtiqueta}
                />
              )}
              {view === 'results' && (
                <ResultsView 
                  sales={sales}
                  products={products}
                  customers={customers}
                  cashierSession={cashierSession}
                  canEdit={permissions.dashboard.edit}
                  currentUser={currentUser}
                />
              )}
              {view === 'consultar-pedido' && (
                <ConsultarPedidoView 
                  sales={sales}
                  setSales={setSales}
                  products={products}
                  customers={customers}
                  currentUser={currentUser}
                  addActivity={addActivity}
                  setView={setView}
                  imprimirCupom={imprimirCupom}
                  imprimirGreetingCupom={imprimirGreetingCupom}
                  couponConfig={couponConfig}
                  setSelectedLabelProduct={setSelectedLabelProduct}
                />
              )}

              {view === 'customer-experience' && (
                <CustomerExperienceView 
                  sales={sales}
                  customers={customers}
                  company={company}
                  greetingCouponConfig={greetingCouponConfig}
                  onUpdateSale={(id, data) => {
                    const updatedAt = Date.now();
                    setSales(prev => prev.map(s => s.id === id ? { ...s, ...data, updatedAt } : s));
                  }}
                  onPrintGreeting={imprimirGreetingCupom}
                  setView={setView}
                />
              )}
              {view === 'catalog' && (
                <CatalogView 
                  products={products}
                  categories={categories}
                  subcategories={subcategories}
                  company={company}
                  catalogDescriptions={catalogDescriptions}
                  setCatalogDescriptions={setCatalogDescriptions}
                  setProducts={setProducts}
                  setCategories={setCategories}
                  setSubcategories={setSubcategories}
                  canEdit={permissions.pdv.edit}
                  onBack={() => setView('dashboard')}
                />
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </main>
      <AppUpdater />

      {view === 'central-producao' && permissions.centralProducao.view && (
        <ProductionHubView 
          sales={sales}
          setSales={setSales}
          products={products}
          customers={customers}
          addActivity={addActivity}
          setView={setView}
          currentUser={currentUser}
          setSelectedLabelProduct={setSelectedLabelProduct}
          couponConfig={couponConfig}
          couponPDVConfig={couponPDVConfig}
          imprimirCupom={imprimirCupom}
          imprimirPedidoPDV={imprimirPedidoPDV}
          generateReceiptHTML={generateReceiptHTML}
          generateSimpleReceiptHTML={generateSimpleReceiptHTML}
          performUnifiedPrint={performUnifiedPrint}
          company={company}
          selectedPrinter={selectedPrinter}
        />
      )}

      {/* Mobile Navigation Bar */}
      {isLogged && (
        <nav className="fixed bottom-0 left-0 right-0 h-24 bg-[#080c16]/90 backdrop-blur-3xl border-t border-white/5 z-[180] flex items-center justify-around px-4 md:hidden pb-4">
          <button 
            onClick={() => setView('dashboard')}
            className={`flex flex-col items-center gap-2 transition-all ${view === 'dashboard' ? 'text-blue-500' : 'text-gray-500'}`}
          >
            <div className={`p-2 rounded-xl transition-all ${view === 'dashboard' ? 'bg-blue-500/10' : ''}`}>
              <LayoutDashboard size={22} className={view === 'dashboard' ? 'scale-110' : ''} />
            </div>
            <span className="text-[9px] font-black uppercase tracking-[0.1em]">Início</span>
          </button>
          
          <button 
            onClick={() => handleMenuClick('pos')}
            className={`flex flex-col items-center gap-2 transition-all ${view === 'pos' ? 'text-purple-500' : 'text-gray-500'}`}
          >
            <div className={`p-2 rounded-xl transition-all ${view === 'pos' ? 'bg-purple-500/10' : ''}`}>
              <ShoppingBag size={22} className={view === 'pos' ? 'scale-110' : ''} />
            </div>
            <span className="text-[9px] font-black uppercase tracking-[0.1em]">Vendas</span>
          </button>

          <div className="relative -mt-14">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="w-18 h-18 bg-[#5b21ff] rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(91,33,255,0.4)] border-8 border-[#080c16] active:scale-90 transition-all z-20 group"
            >
              <div className="p-3 bg-white/10 rounded-2xl group-hover:bg-white/20 transition-all">
                <LayoutGrid size={28} className="text-white" />
              </div>
            </button>
            <div className="absolute inset-0 bg-[#5b21ff]/20 blur-2xl rounded-full -z-10 animate-pulse" />
          </div>

          <button 
            onClick={() => handleMenuClick('separation')}
            className={`flex flex-col items-center gap-2 transition-all ${view === 'separation' ? 'text-blue-500' : 'text-gray-500'}`}
          >
            <div className={`p-2 rounded-xl transition-all ${view === 'separation' ? 'bg-blue-500/10' : ''}`}>
              <Handshake size={22} className={view === 'separation' ? 'scale-110' : ''} />
            </div>
            <span className="text-[9px] font-black uppercase tracking-[0.1em]">Separação</span>
          </button>

          <button 
            onClick={() => setIsRightDrawerOpen(true)}
            className={`flex flex-col items-center gap-2 transition-all ${isRightDrawerOpen ? 'text-purple-500' : 'text-gray-500'}`}
          >
            <div className={`p-2 rounded-xl transition-all ${isRightDrawerOpen ? 'bg-purple-500/10' : ''}`}>
              <Cpu size={22} className={isRightDrawerOpen ? 'scale-110' : ''} />
            </div>
            <span className="text-[9px] font-black uppercase tracking-[0.1em]">Ações</span>
          </button>
        </nav>
      )}

      {/* Error Toast */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-10 right-10 z-[1000] bg-red-600 px-8 py-5 rounded-2xl shadow-2xl flex items-center gap-4 border border-white/10"
          >
            <AlertCircle size={24} className="text-white" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/50 leading-none mb-1">Aviso</p>
              <p className="font-bold text-sm text-white uppercase tracking-wider">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="ml-4 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Sub Components ---

interface ActivityViewProps { 
  activities: Activity[];
  sales: Sale[];
  products: Product[];
  customers: Customer[];
  company: CompanyInfo;
  couponConfig: CouponConfig;
  imprimirCupom: (sale: Sale) => Promise<boolean>;
  imprimirPedidoPDV: (sale: Sale) => Promise<boolean>;
  couponPDVConfig: CouponPDVConfig;
  onCancelSale: (id: string) => void;
  canEdit: boolean;
  currentUser: SystemUser | null;
  paymentIcons: Record<string, string>;
  onBack?: () => void;
  setSelectedLabelProduct: (p: Product | null) => void;
}

function ActivityView({ 
  roles,
  activities,
  sales,
  products,
  customers,
  company,
  couponConfig,
  imprimirCupom,
  imprimirPedidoPDV,
  generateReceiptHTML,
  generateSimpleReceiptHTML,
  performUnifiedPrint,
  onCancelSale,
  canEdit,
  currentUser,
  paymentIcons,
  onBack,
  setSelectedLabelProduct
}: ActivityViewProps & {
  roles: Role[];
  generateReceiptHTML: any;
  generateSimpleReceiptHTML: any;
  performUnifiedPrint: any;
}) {
  const [activeTab, setActiveTab] = useState<'all' | 'modifications' | 'vendas'>('vendas');
  const [userFilter, setUserFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<'todos' | Activity['type']>('todos');
  const [dateFilter, setDateFilter] = useState('');

  const filteredActivities = useMemo(() => {
    let list = [...activities];

    const isAdminUser = isUserAdmin(currentUser, roles);

    if (!isAdminUser) {
      list = list.filter(a => a.user === currentUser?.name);
    }

    if (activeTab === 'modifications') {
      list = list.filter(a => a.type === 'product_edit');
    }

    if (userFilter) {
      list = list.filter(a => a.user.toLowerCase().includes(userFilter.toLowerCase()));
    }

    if (typeFilter !== 'todos') {
      list = list.filter(a => a.type === typeFilter);
    }

    if (dateFilter) {
      const [year, month, day] = dateFilter.split('-').map(Number);
      list = list.filter(a => {
        const cleanTimestamp = a.timestamp.replace(',', '');
        const [datePart] = cleanTimestamp.split(' ');
        const [d, m, y] = datePart.split('/').map(Number);
        return d === day && m === month && y === year;
      });
    }

    return list;
  }, [activities, activeTab, userFilter, typeFilter, dateFilter]);

  const getActivityTypeLabel = (type: Activity['type']) => {
    switch (type) {
      case 'customer': return 'Cliente';
      case 'product': return 'Produto';
      case 'product_edit': return 'Edição';
      case 'sale': return 'Venda';
      case 'auth': return 'Acesso';
      case 'security': return 'Segurança';
      case 'system': return 'Sistema';
      default: return 'Geral';
    }
  };

  const getActivityTypeColor = (type: Activity['type']) => {
    switch (type) {
      case 'customer': return 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20';
      case 'product': return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'product_edit': return 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
      case 'sale': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'auth': return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      case 'security': return 'bg-red-500/10 text-red-400 border border-red-500/20';
      default: return 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20';
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-[#0a1628] text-white p-2 md:p-4 font-sans flex flex-col overflow-hidden animate-in fade-in duration-500">
      {/* Header Padrao */}
      <div className="flex items-center justify-between mb-2 shrink-0 px-2 md:px-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack || (() => window.history.back())}
            className="w-10 h-10 rounded-xl bg-[#1a2744] flex items-center justify-center border border-white/5 hover:bg-[#1a2744]/80 transition-all cursor-pointer group"
          >
            <ChevronLeft className="w-5 h-5 text-[#64748b] group-hover:text-white" />
          </button>
          <div>
            <h2 className="text-lg md:text-xl font-black text-white uppercase italic leading-none">
              {activeTab === 'vendas' ? 'Histórico de Vendas' : activeTab === 'modifications' ? 'Alterações' : 'Log de Ações'}
            </h2>
            <p className="text-[9px] font-black text-pink-500 uppercase tracking-widest mt-1">
              Auditória & Histórico do Sistema
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 border-b border-white/5 pb-4 mb-4 shrink-0 px-2 md:px-0">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          <button 
            onClick={() => setActiveTab('all')}
            className={`px-6 py-3 rounded-xl border transition-all text-[10px] font-black uppercase tracking-widest whitespace-nowrap ${
              activeTab === 'all' ? 'bg-[#5d5dff] text-white shadow-lg shadow-blue-600/20 border-blue-400/50' : 'bg-[#1a2744] text-white/40 hover:text-white border-white/5'
            }`}
          >
            Log De Ações
          </button>
          <button 
            onClick={() => setActiveTab('vendas')}
            className={`px-6 py-3 rounded-xl border transition-all text-[10px] font-black uppercase tracking-widest whitespace-nowrap ${
              activeTab === 'vendas' ? 'bg-[#5d5dff] text-white shadow-lg shadow-blue-600/20 border-blue-400/50' : 'bg-[#1a2744] text-white/40 hover:text-white border-white/5'
            }`}
          >
            Vendas (Histórico)
          </button>
          <button 
            onClick={() => setActiveTab('modifications')}
            className={`px-6 py-3 rounded-xl border transition-all text-[10px] font-black uppercase tracking-widest whitespace-nowrap ${
              activeTab === 'modifications' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 border-blue-500/50' : 'bg-[#1a2744] text-white/40 hover:text-white border-white/5'
            }`}
          >
            Alterações
          </button>
        </div>

        {activeTab !== 'vendas' && (
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5 flex-1 min-w-[140px]">
              <label className="text-[8px] font-black text-[#64748b] uppercase tracking-widest ml-1">Filtrar por Data</label>
              <input 
                type="date"
                value={dateFilter}
                onChange={e => setDateFilter(e.target.value)}
                className="w-full bg-[#0d1c30] border border-white/5 rounded-xl p-3 text-[10px] font-black text-white uppercase outline-none focus:ring-1 ring-pink-500/30 transition-all"
              />
            </div>
            <div className="flex flex-col gap-1.5 flex-1 min-w-[140px]">
              <label className="text-[8px] font-black text-[#64748b] uppercase tracking-widest ml-1">Segmento</label>
              <div className="relative">
                <select
                  value={typeFilter}
                  onChange={e => setTypeFilter(e.target.value as any)}
                  className="w-full bg-[#0d1c30] border border-white/5 rounded-xl p-3 text-[10px] font-black text-white uppercase outline-none focus:ring-1 ring-pink-500/30 transition-all appearance-none pr-10"
                >
                  <option value="todos">Todos</option>
                  <option value="sale">Vendas</option>
                  <option value="product">Produtos</option>
                  <option value="customer">Clientes</option>
                  <option value="auth">Acesso</option>
                  <option value="security">Segurança</option>
                  <option value="system">Sistema</option>
                </select>
                <ChevronRight size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#334155] rotate-90 pointer-events-none" />
              </div>
            </div>
            <div className="flex flex-col gap-1.5 flex-1 min-w-[180px]">
              <label className="text-[8px] font-black text-[#64748b] uppercase tracking-widest ml-1">Usuário Responsável</label>
              <div className="relative">
                <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#334155]" />
                <input 
                  placeholder="BUSCAR USUÁRIO..."
                  value={userFilter}
                  onChange={e => setUserFilter(e.target.value)}
                  className="w-full bg-[#0d1c30] border border-white/5 rounded-xl py-3 pl-11 pr-4 text-[10px] font-black text-white uppercase outline-none focus:ring-1 ring-pink-500/30 transition-all placeholder:text-[#334155]"
                />
              </div>
            </div>
            { (dateFilter || userFilter || typeFilter !== 'todos') && (
              <button 
                onClick={() => { setDateFilter(''); setUserFilter(''); setTypeFilter('todos'); }}
                className="p-3 bg-red-600/10 text-red-500 border border-red-500/20 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-lg"
                title="Limpar Filtros"
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 min-w-0 overflow-hidden flex flex-col">
        {activeTab === 'vendas' ? (
          <SalesHistoryView 
            sales={sales}
            products={products}
            customers={customers}
            company={company}
            couponConfig={couponConfig}
            imprimirCupom={imprimirCupom}
            imprimirPedidoPDV={imprimirPedidoPDV}
            generateReceiptHTML={generateReceiptHTML}
            generateSimpleReceiptHTML={generateSimpleReceiptHTML}
            performUnifiedPrint={performUnifiedPrint}
            onCancel={onCancelSale}
            canEdit={canEdit}
            currentUser={currentUser}
            roles={roles}
            paymentIcons={paymentIcons}
            setSelectedLabelProduct={setSelectedLabelProduct}
          />
        ) : (
          <div className="flex-1 min-h-0 bg-[#0d1c30] rounded-2xl border border-white/5 shadow-inner overflow-hidden flex flex-col">
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-hidden flex flex-col flex-1">
              <div className="overflow-x-auto no-scrollbar overflow-y-auto flex-1">
                <table className="w-full text-left order-collapse">
                  <thead className="sticky top-0 z-20">
                    <tr className="bg-black/40 text-[9px] font-black text-white/40 uppercase tracking-[0.2em] border-b border-white/5">
                      <th className="px-6 py-4">Data/Hora</th>
                      <th className="px-6 py-4">Usuário</th>
                      <th className="px-6 py-4">Função</th>
                      <th className="px-6 py-4">Ação</th>
                      <th className="px-6 py-4">Detalhes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03]">
                    {filteredActivities.length > 0 ? (
                      filteredActivities.map((activity) => (
                        <tr key={activity.id} className="hover:bg-white/[0.02] transition-colors group">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <p className="text-[10px] font-black text-white">{activity.timestamp}</p>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center font-black text-[10px]">
                                {activity.user.charAt(0).toUpperCase()}
                              </div>
                              <p className="text-[10px] font-black text-white uppercase tracking-tight group-hover:text-blue-400 transition-colors">{activity.user}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-[8px] font-black text-[#64748b] uppercase tracking-widest bg-[#1a2744] border border-white/5 px-2 py-0.5 rounded">
                              {activity.userRole || 'SISTEMA'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              <span className={`w-fit text-[7px] font-black uppercase px-2 py-0.5 rounded-full ${getActivityTypeColor(activity.type)}`}>
                                {getActivityTypeLabel(activity.type)}
                              </span>
                              <p className="text-[10px] font-black text-white uppercase italic leading-none group-hover:text-pink-400 transition-colors">
                                {activity.action}
                              </p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {activity.type === 'product_edit' ? (
                              <div className="flex flex-col gap-1.5 bg-[#1a2744]/40 p-2.5 rounded-xl border border-white/5">
                                <p className="text-[7px] font-black text-[#64748b] uppercase tracking-widest leading-none italic">
                                  Campo: {activity.field}
                                </p>
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] font-black text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded border border-red-400/20 line-through">{activity.oldValue}</span>
                                  <ChevronRight size={10} className="text-[#334155]" />
                                  <span className="text-[9px] font-black text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded border border-emerald-400/20">{activity.newValue}</span>
                                </div>
                              </div>
                            ) : (
                              <p className="text-[10px] font-black text-[#64748b] italic leading-relaxed max-w-md truncate">"{activity.details}"</p>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-20 text-center">
                          <History size={48} className="mx-auto text-[#1a2744] mb-4" strokeWidth={1} />
                          <p className="text-[10px] font-black text-[#334155] uppercase tracking-[0.3em] italic">Nenhuma atividade registrada</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden p-4 overflow-y-auto no-scrollbar space-y-3">
              {filteredActivities.length > 0 ? (
                filteredActivities.map((activity) => (
                  <div key={activity.id} className="bg-[#1a2744] p-5 rounded-2xl border border-white/5 space-y-4 relative overflow-hidden group">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-black text-sm">
                          {activity.user.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-[11px] font-black text-white uppercase tracking-tight">{activity.user}</p>
                          <p className="text-[9px] font-black text-[#64748b]">{activity.timestamp}</p>
                        </div>
                      </div>
                      <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-lg ${getActivityTypeColor(activity.type)}`}>
                        {getActivityTypeLabel(activity.type)}
                      </span>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-[10px] font-black text-white uppercase italic leading-snug bg-blue-600/20 px-3 py-1.5 rounded-lg border border-blue-500/20 inline-block">{activity.action}</h4>
                      {activity.type === 'product_edit' ? (
                        <div className="bg-[#0d1c30] p-3 rounded-xl border border-white/10 space-y-2">
                          <p className="text-[8px] font-black text-[#64748b] uppercase tracking-widest italic">Campo: {activity.field}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[9px] font-black text-red-400 bg-red-400/10 border border-red-400/20 px-2 py-0.5 rounded line-through">{activity.oldValue}</span>
                            <ChevronRight size={10} className="text-[#334155]" />
                            <span className="text-[9px] font-black text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded">{activity.newValue}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-[10px] font-black text-[#64748b] leading-relaxed italic border-l-2 border-white/5 pl-3">"{activity.details}"</p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-[#1a2744] rounded-2xl border border-white/5 border-dashed p-12 text-center">
                  <History size={48} className="mx-auto text-[#0d1c30] mb-4" strokeWidth={1} />
                  <p className="text-[10px] font-black text-[#334155] uppercase tracking-[0.2em] italic">Vazio</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer / Stats Compacto */}
      <div className="shrink-0 mt-3 px-4 flex justify-between items-center text-[9px] font-black text-[#64748b] uppercase tracking-widest">
         <span>{activeTab === 'vendas' ? sales.length : filteredActivities.length} REGISTROS LOCALIZADOS</span>
         <span className="flex items-center gap-2">
           <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
           AUDITORIA ATIVA
         </span>
      </div>
    </div>
  );
}

function AuditoriaView({ 
  activities, 
  users, 
  roles,
  sales,
  closedSessions,
  onBack
}: { 
  activities: Activity[], 
  users: SystemUser[], 
  roles: Role[],
  sales: Sale[],
  closedSessions: CashierSession[],
  onBack: () => void
}) {
  const [selectedRole, setSelectedRole] = useState<string | null>(roles.length > 0 ? roles[0].id : null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const getRoleUsers = (roleId: string) => users.filter(u => u.roleId === roleId);
  const getUserActivities = (userName: string) => activities.filter(a => a.user === userName);

  return (
    <div className="fixed inset-0 z-[200] bg-[#0a1628] text-white p-2 md:p-4 font-sans flex flex-col overflow-hidden animate-in fade-in duration-500">
      {/* Header Padrao */}
      <div className="flex items-center justify-between mb-4 shrink-0 px-2 md:px-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="w-10 h-10 rounded-xl bg-[#1a2744] flex items-center justify-center border border-white/5 hover:bg-[#1a2744]/80 transition-all cursor-pointer group"
          >
            <ChevronLeft className="w-5 h-5 text-[#64748b] group-hover:text-white" />
          </button>
          <div>
            <h2 className="text-lg md:text-xl font-black text-white uppercase italic leading-none">
              Auditoria do Sistema
            </h2>
            <p className="text-[9px] font-black text-purple-500 uppercase tracking-widest mt-1">
              Controle de Acessos e Logs por Função
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-4 overflow-hidden min-h-0">
        {/* Sidebar - Lista de Funções */}
        <aside className="hidden lg:flex flex-col gap-2 w-[240px] shrink-0 overflow-y-auto no-scrollbar pb-10">
          {roles.map(role => (
            <button
              key={role.id}
              onClick={() => {
                setSelectedRole(role.id);
                setSelectedUserId(null);
              }}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all text-left group border whitespace-nowrap ${
                selectedRole === role.id 
                ? 'bg-[#5d5dff] border-blue-400/50 text-white shadow-lg shadow-blue-600/20' 
                : 'bg-[#1a2744] border-white/5 text-[#64748b] hover:text-white hover:bg-[#1a2744]/80'
              }`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${selectedRole === role.id ? 'bg-white/20 text-white' : 'bg-black/20 text-[#64748b]'}`}>
                <Users className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest truncate">{role.name}</span>
            </button>
          ))}
        </aside>

        {/* Área Principal */}
        <main className="flex-1 rounded-[2rem] bg-[#0d1c30] border border-white/5 flex flex-col overflow-hidden shadow-inner">
          {!selectedRole ? (
             <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8 opacity-40">
              <div className="w-24 h-24 rounded-full border border-white/10 flex items-center justify-center bg-[#1a2744]">
                <ShieldCheck className="w-10 h-10 text-white" />
              </div>
              <div className="text-center max-w-xs">
                <h2 className="text-sm font-black tracking-widest mb-2 uppercase">SELECIONE UMA FUNÇÃO</h2>
                <p className="text-[10px] text-[#64748b] font-black uppercase tracking-tight leading-relaxed italic">
                  Escolha uma função na barra lateral para iniciar a auditoria de acessos.
                </p>
              </div>
            </div>
          ) : !selectedUserId ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-4 md:p-6 border-b border-white/5 bg-black/20 flex items-center justify-between">
                <div>
                  <h2 className="text-[9px] font-black tracking-[0.2em] text-[#64748b] uppercase mb-1">Membros da Função</h2>
                  <p className="text-[11px] text-white uppercase font-black tracking-tight">{roles.find(r => r.id === selectedRole)?.name}</p>
                </div>
              </div>
              
              <div className="p-4 md:p-6 overflow-y-auto no-scrollbar grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {getRoleUsers(selectedRole).length > 0 ? (
                  getRoleUsers(selectedRole).map(user => (
                    <button 
                      key={user.id}
                      onClick={() => setSelectedUserId(user.id)}
                      className="p-4 flex items-center gap-4 bg-[#1a2744] border border-white/5 rounded-2xl hover:border-blue-500/20 transition-all text-left group active:scale-[0.98]"
                    >
                      <div className="w-10 h-10 rounded-xl bg-purple-600/10 text-purple-400 border border-purple-500/20 flex items-center justify-center font-black group-hover:bg-purple-600 group-hover:text-white transition-all uppercase text-sm">
                        {user.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="block text-[11px] font-black text-white uppercase truncate">{user.name}</span>
                        <span className="block text-[9px] text-[#64748b] font-black uppercase tracking-widest leading-none mt-1">@{user.username}</span>
                      </div>
                      <ChevronRight size={14} className="text-[#334155] group-hover:text-white transition-colors" />
                    </button>
                  ))
                ) : (
                  <div className="col-span-full h-full flex flex-col items-center justify-center py-20 gap-4 opacity-30">
                    <History size={48} className="mx-auto text-white" strokeWidth={1} />
                    <p className="text-[10px] font-black tracking-widest text-[#64748b] uppercase italic">Nenhum membro encontrado</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
               <div className="p-4 md:p-6 border-b border-white/5 bg-black/20 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setSelectedUserId(null)}
                    className="w-10 h-10 bg-[#1a2744] text-[#64748b] rounded-xl hover:text-white transition-all flex items-center justify-center shrink-0 border border-white/5"
                  >
                    <ArrowLeft size={16} />
                  </button>
                  <div>
                    <h2 className="text-[9px] font-black tracking-[0.2em] text-[#64748b] uppercase mb-1">Registros de Auditoria</h2>
                    <p className="text-[11px] text-white uppercase font-black tracking-tight italic">
                      Usuario: {users.find(u => u.id === selectedUserId)?.name}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar p-4 md:p-6 space-y-2">
                {getUserActivities(users.find(u => u.id === selectedUserId)?.name || '').length > 0 ? (
                  getUserActivities(users.find(u => u.id === selectedUserId)?.name || '').slice().reverse().map((activity, idx) => (
                    <div key={idx} className="p-4 bg-[#1a2744] border border-white/5 rounded-xl flex items-start gap-4 hover:bg-[#1a2744]/80 transition-all group">
                      <div className="mt-1 w-2 h-2 rounded-full bg-blue-500 shrink-0 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-[8px] font-black uppercase text-blue-400 tracking-widest bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">{activity.type}</span>
                          <span className="text-[9px] font-black text-[#64748b] uppercase font-mono">{activity.timestamp}</span>
                        </div>
                        <h4 className="text-[11px] font-black text-white uppercase tracking-tight mb-1 group-hover:text-blue-400 transition-colors">{activity.action}</h4>
                        <p className="text-[10px] text-[#64748b] font-black uppercase tracking-tight leading-relaxed italic border-l border-white/5 pl-3 mt-2">"{activity.details}"</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center py-20 gap-4 opacity-20">
                    <History size={64} className="mx-auto" strokeWidth={1} />
                    <p className="text-[10px] font-black tracking-widest text-center uppercase">Nenhuma atividade registrada</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}














function ReturnsView({ 
  sales, 
  products, 
  onConfirmReturn,
  customers,
  onBack
}: { 
  sales: Sale[], 
  products: Product[], 
  onConfirmReturn: (saleId: string, items: { productId: string, quantity: number }[], reason: string) => void,
  customers: Customer[],
  onBack: () => void
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});
  const [reason, setReason] = useState('');

  const filteredSales = useMemo(() => {
    if (!searchTerm) return [];
    return sales.filter(s => {
      const customer = customers.find(c => c.id === s.customerId);
      const customerName = (customer?.name || s.customerId || '').toLowerCase();
      const term = searchTerm.toLowerCase();
      return (s.sequentialId && s.sequentialId.includes(searchTerm)) || 
             customerName.includes(term);
    }).slice(0, 5);
  }, [sales, searchTerm, customers]);

  const handleSelectSale = (sale: Sale) => {
    setSelectedSale(sale);
    // Reset return quantities
    const initialQtys: Record<string, number> = {};
    sale.items.forEach(item => {
      initialQtys[item.productId] = 0;
    });
    setReturnQuantities(initialQtys);
    setReason('');
  };

  const handleQtyChange = (productId: string, val: number, max: number) => {
    const qty = Math.max(0, Math.min(max, val));
    setReturnQuantities(prev => ({ ...prev, [productId]: qty }));
  };

  const totalReturnItems = Object.values(returnQuantities).reduce((acc: number, q: number) => acc + q, 0);

  const handleSubmit = () => {
    if (!selectedSale) return;
    if (totalReturnItems === 0) {
      alert('Selecione ao menos um item para devolver.');
      return;
    }
    const itemsToReturn = Object.entries(returnQuantities)
      .filter(([_, qty]) => Number(qty) > 0)
      .map(([productId, quantity]) => ({ productId, quantity: Number(quantity) }));
    
    if (window.confirm('Deseja confirmar esta devolução? Os itens retornarão ao estoque.')) {
      onConfirmReturn(selectedSale.id, itemsToReturn, reason);
      setSelectedSale(null);
      setReturnQuantities({});
      setReason('');
      setSearchTerm('');
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-[#0a1628] text-white p-2 md:p-4 font-sans flex flex-col overflow-hidden animate-in fade-in duration-500">
      {/* Header Padrao */}
      <div className="flex items-center justify-between mb-4 shrink-0 px-2 md:px-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="w-10 h-10 rounded-xl bg-[#1a2744] flex items-center justify-center border border-white/5 hover:bg-[#1a2744]/80 transition-all cursor-pointer group"
          >
            <ChevronLeft className="w-5 h-5 text-[#64748b] group-hover:text-white" />
          </button>
          <div>
            <h2 className="text-lg md:text-xl font-black text-white uppercase italic leading-none">
              Devolução de Pedidos
            </h2>
            <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mt-1">
              Processamento de Estorno e Retorno ao Estoque
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 min-w-0 overflow-hidden flex flex-col">
        {!selectedSale ? (
          <div className="max-w-4xl mx-auto w-full space-y-4 px-2 md:px-4 py-4 md:py-8 overflow-y-auto no-scrollbar">
            <div className="relative group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-[#334155] group-focus-within:text-blue-400 transition-colors" size={20} />
              <input 
                type="text"
                placeholder="BUSCAR POR Nº DO PEDIDO OU NOME DO CLIENTE..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#1a2744] border border-white/5 rounded-2xl py-4 pl-14 pr-6 text-sm font-black text-white uppercase placeholder:text-[#334155] outline-none focus:ring-1 ring-blue-500/30 transition-all shadow-xl"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredSales.map((sale) => {
                const customer = customers.find(c => c.id === sale.customerId);
                return (
                  <button 
                    key={sale.id}
                    onClick={() => handleSelectSale(sale)}
                    className="bg-[#1a2744] border border-white/5 p-4 rounded-2xl flex items-center justify-between hover:border-blue-500/30 hover:bg-[#1a2744]/80 transition-all group active:scale-[0.98]"
                  >
                    <div className="flex flex-col items-start">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500/50" />
                        <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest leading-none">PEDIDO #{sale.sequentialId}</span>
                      </div>
                      <span className="text-[11px] font-black text-white uppercase truncate max-w-[150px] md:max-w-none">{customer?.name || 'Venda Local'}</span>
                      <span className="text-[8px] font-black text-[#64748b] uppercase mt-1 italic">{new Date(sale.date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-black text-white tracking-tighter">R$ {sale.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        <p className="text-[8px] font-black text-[#64748b] uppercase leading-none">Total Pedido</p>
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-black/20 flex items-center justify-center border border-white/5 group-hover:text-blue-400">
                        <ChevronRight size={16} />
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
            
            {searchTerm && filteredSales.length === 0 && (
              <div className="bg-[#1a2744]/50 border border-white/5 border-dashed py-12 rounded-3xl text-center">
                <Package size={48} className="mx-auto text-white/5 mb-4" strokeWidth={1} />
                <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] italic">Nenhum pedido encontrado</p>
              </div>
            )}

            {!searchTerm && filteredSales.length === 0 && (
              <div className="py-20 text-center opacity-30">
                <Search size={64} className="mx-auto text-white mb-4" strokeWidth={1} />
                <p className="text-[10px] font-black text-white uppercase tracking-widest italic">Digite para pesquisar uma venda</p>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full">
            <div className="lg:col-span-8 flex flex-col h-full bg-[#0d1c30] rounded-3xl border border-white/5 shadow-inner overflow-hidden">
              <div className="p-4 md:p-6 border-b border-white/5 flex justify-between items-center bg-black/20">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setSelectedSale(null)} 
                    className="w-10 h-10 bg-[#1a2744] text-[#64748b] rounded-xl hover:text-white transition-all flex items-center justify-center shrink-0 border border-white/5"
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <div>
                    <h5 className="text-[11px] font-black text-white uppercase tracking-tighter italic">Itens para Devolução</h5>
                    <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest">PEDIDO #{selectedSale.sequentialId}</p>
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto no-scrollbar p-4 md:p-6 space-y-3">
                {selectedSale.items.map(item => {
                  const product = products.find(p => p.id === item.productId);
                  return (
                    <div key={item.productId} className="flex items-center justify-between p-3 md:p-4 bg-[#1a2744] rounded-2xl border border-white/5 hover:border-blue-500/20 transition-all group gap-4">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-12 h-12 rounded-xl bg-black/40 border border-white/5 flex items-center justify-center overflow-hidden shrink-0">
                           {product?.imageUrl ? <img src={product.imageUrl} className="w-full h-full object-cover" /> : <Package size={24} className="opacity-10" />}
                        </div>
                        <div className="min-w-0">
                           <p className="text-[11px] font-black text-white uppercase truncate leading-tight mb-1">{product?.name || 'Produto Removido'}</p>
                           <p className="text-[9px] font-black text-blue-400 uppercase leading-none italic">Original: {item.quantity} unidades</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => handleQtyChange(item.productId, (returnQuantities[item.productId] || 0) - 1, item.quantity)}
                          className="w-8 h-8 rounded-lg bg-black/20 text-[#64748b] flex items-center justify-center hover:bg-red-500/20 hover:text-red-400 transition-all border border-white/5"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-8 text-center font-black text-lg text-white">{(returnQuantities[item.productId] || 0)}</span>
                        <button 
                          onClick={() => handleQtyChange(item.productId, (returnQuantities[item.productId] || 0) + 1, item.quantity)}
                          className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all border border-blue-500/20 shadow-lg"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="p-4 bg-black/30 border-t border-white/5 shrink-0">
                 <div className="flex flex-col gap-2 max-w-xl mx-auto">
                    <label className="text-[9px] font-black text-[#64748b] uppercase tracking-widest ml-1 italic">Observações / Motivo</label>
                    <textarea 
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="DETALHE O MOTIVO DA DEVOLUÇÃO..."
                      className="w-full bg-[#1a2744] border border-white/5 rounded-2xl p-4 text-[10px] font-black text-white uppercase placeholder:text-[#334155] outline-none focus:ring-1 ring-blue-500/30 transition-all min-h-[60px]"
                    />
                 </div>
              </div>
            </div>

            <div className="lg:col-span-4 h-full">
              <div className="bg-[#1a2744] rounded-[2rem] p-6 border border-white/5 shadow-2xl h-full flex flex-col">
                 <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/5 shrink-0">
                   <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20">
                     <History size={18} />
                   </div>
                   <h5 className="text-[10px] font-black text-white uppercase tracking-widest italic">Resumo Final</h5>
                 </div>
                 
                 <div className="flex-1 space-y-4">
                    <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5">
                       <span className="text-[9px] font-black text-[#64748b] uppercase">Itens Selecionados:</span>
                       <span className="text-xl font-black text-white">{totalReturnItems}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5">
                       <span className="text-[9px] font-black text-[#64748b] uppercase">Pedido:</span>
                       <span className="text-sm font-black text-blue-400">#{selectedSale.sequentialId}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5">
                       <span className="text-[9px] font-black text-[#64748b] uppercase">Cliente:</span>
                       <span className="text-[11px] font-black text-white uppercase text-right max-w-[120px] truncate">
                         {customers.find(c => c.id === selectedSale.customerId)?.name || 'Local'}
                       </span>
                    </div>
                 </div>

                 <div className="mt-auto pt-6 space-y-4 shrink-0">
                    <button 
                      onClick={handleSubmit}
                      disabled={totalReturnItems === 0}
                      className="w-full bg-red-600 hover:bg-red-700 text-white rounded-2xl py-4 font-black text-[11px] uppercase tracking-widest disabled:opacity-30 disabled:grayscale transition-all shadow-lg active:scale-95"
                    >
                      Confirmar Devolução
                    </button>
                    <div className="flex items-center gap-3 p-3 bg-blue-500/5 rounded-xl border border-blue-500/10">
                      <Lightbulb size={16} className="text-blue-500 shrink-0" />
                      <p className="text-[8px] text-[#64748b] font-black text-center uppercase leading-tight italic">
                        Os itens retornarão automaticamente ao estoque.
                      </p>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Geração de PDF dinâmico para Clientes
 * Inclui apenas campos preenchidos
 */
export async function generateCustomerPDF(customer: Customer, company: CompanyInfo) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Configurações de Design
  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = 25;

  // Cabeçalho Empresa
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(40, 40, 40);
  doc.text(String(company.name.toUpperCase()), margin, currentY);
  
  currentY += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  const companyAddrStr = company.address ? `${company.address.logradouro}, ${company.address.numero} - ${company.address.bairro}` : '';
  doc.text(String(`${companyAddrStr} | ${company.phone}`), margin, currentY);

  currentY += 15;
  doc.setDrawColor(230, 230, 230);
  doc.line(margin, currentY, pageWidth - margin, currentY);

  // Título do Documento
  currentY += 15;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(String('FICHA CADASTRAL DO CLIENTE'), margin, currentY);

  currentY += 10;
  
  // Imagem do Cliente (se houver)
  if (customer.image) {
    try {
      doc.addImage(customer.image, 'JPEG', margin, currentY, 35, 42);
      currentY += 50;
    } catch (e) {
      console.error('Erro ao adicionar imagem ao PDF do cliente:', e);
      currentY += 10;
    }
  }

  // Lista de campos a exibir (apenas se preenchidos)
  const formatAddress = (addr: any) => {
    if (!addr) return '';
    const parts = [addr.street, addr.number, addr.neighborhood, addr.city, addr.state].filter(Boolean);
    return parts.join(', ');
  };

  const fields = [
    { label: 'NOME COMPLETO', value: customer.name },
    { label: 'WHATSAPP / TELEFONE', value: customer.whatsapp },
    { label: 'E-MAIL', value: customer.email },
    { label: 'DATA DE NASCIMENTO', value: customer.dob },
    { label: 'CPF / CNPJ', value: customer.taxId },
    { label: 'ENDEREÇO COMPLETO', value: formatAddress(customer.address) },
    { label: 'OBSERVAÇÕES', value: customer.notes }
  ].filter(f => f.value && typeof f.value === 'string' && f.value.trim() !== '');

  // Renderizar campos
  fields.forEach(field => {
    if (currentY > 260) {
      doc.addPage();
      currentY = 25;
    }

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(150, 150, 150);
    doc.text(String(field.label), margin, currentY);

    currentY += 5;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(20, 20, 20);
    
    // Suporte a múltiplas linhas para textos longos (endereço/notas)
    const splitValue = doc.splitTextToSize(String(field.value || ''), pageWidth - (margin * 2));
    if (splitValue && splitValue.length > 0) {
      doc.text(splitValue, margin, currentY);
    }
    
    currentY += (splitValue.length * 6) + 4;
  });

  // Rodapé
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  const footerText = `Gerado em ${new Date().toLocaleString('pt-BR')} | Sistema Gestão Pro`;
  doc.text(String(footerText), pageWidth / 2, 285, { align: 'center' });

  // Salvar/Abrir
  const fileName = `CLIENTE_${customer.name.replace(/\s+/g, '_').toUpperCase()}.pdf`;
  doc.save(fileName);
}

function SettingsView({ 
  currentUser,
  addActivity,
  company, 
  setCompany, 
  couponConfig, 
  setCouponConfig, 
  couponPDVConfig,
  setCouponPDVConfig,
  users, 
  setUsers, 
  setCurrentUser,
  roles,
  setRoles,
  labelConfig,
  setLabelConfig,
  labelLotConfig,
  setLabelLotConfig,
  paymentIcons,
  pdvTestSale,
  setPdvTestSale,
  onBack,
  setView,
  printers,
  setPrinters,
  selectedPrinter,
  setSelectedPrinter,
  selectedLabelPrinter,
  setSelectedLabelPrinter,
  products,
  customers,
  sales,
  activities,
  categories,
  subcategories,
  deliveryChannels,
  deliveryMethods,
  setDeliveryMethods,
  paymentMethods,
  customPaymentMethods,
  hiddenPaymentMethods,
  cashierSession,
  revenues,
  purchases,
  expenses,
  rawMaterials,
  rawMaterialsStructured,
  productRecipes,
  shopkeepers,
  shopkeeperDeliveries,
  catalogDescriptions,
  canEdit,
  imprimirCupom,
  imprimirPedidoPDV,
  performUnifiedPrint,
  greetingCouponConfig,
  setGreetingCouponConfig,
  hardwarePrinters,
  setHardwarePrinters,
  registeredPrinters,
  setRegisteredPrinters,
  generateReceiptHTML,
  generateSimpleReceiptHTML,
  closedSessions,
  openSessions,
  generateGreetingCupomHTML,
  setProducts,
  setCustomers,
  setSales,
  setActivities,
  setCategories,
  setSubcategories,
  setClosedSessions,
  setCashierSession,
  setRevenues,
  setPurchases,
  setExpenses,
  setRawMaterialsStructured,
  setProductRecipes,
  setShopkeepers,
  setShopkeeperDeliveries,
  setCatalogDescriptions,
  setPreOrders,
  preOrders,
  setOpenSessions,
  verifyPassword,
  secureHash,
  isHashed,
  setOrderCounter,
  labelLot,
  setLabelLot,
  clearLabelLot,
  removeFromLabelLot,
  updateLabelLotItem,
  labelLotConfig: LabelConfig,
  setLabelLotConfig: any,
  generateProgrammaticLabelPDF,
  isRestoringRef,
  imprimirEtiqueta
}: { 
  currentUser: SystemUser | null,
  addActivity: (type: Activity['type'], action: string, details: string) => void,
  company: CompanyInfo, 
  setCompany: any, 
  couponConfig: CouponConfig, 
  setCouponConfig: any, 
  couponPDVConfig: CouponPDVConfig,
  setCouponPDVConfig: any,
  users: SystemUser[], 
  setUsers: any, 
  setCurrentUser: (u: SystemUser | null) => void,
  roles: Role[],
  setRoles: any,
  labelConfig: LabelConfig,
  setLabelConfig: any,
  labelLotConfig: LabelConfig,
  setLabelLotConfig: any,
  paymentIcons: Record<string, string>,
  pdvTestSale: Sale | null,
  setPdvTestSale: (sale: Sale | null) => void,
  onBack: () => void,
  setView: any,
  printers: PrinterConfig[],
  setPrinters: any,
  selectedPrinter: string,
  setSelectedPrinter: any,
  selectedLabelPrinter: string,
  setSelectedLabelPrinter: any,
  products: Product[],
  customers: Customer[],
  sales: Sale[],
  activities: Activity[],
  categories: Category[],
  subcategories: Subcategory[],
  deliveryChannels: DeliveryChannel[],
  deliveryMethods: DeliveryMethod[],
  setDeliveryMethods: any,
  paymentMethods: string[],
  customPaymentMethods: string[],
  hiddenPaymentMethods: string[],
  cashierSession: CashierSession,
  closedSessions: CashierSession[],
  openSessions: Record<string, CashierSession>,
  revenues: Revenue[],
  purchases: Purchase[],
  expenses: Expense[],
  rawMaterials: RawMaterial[],
  rawMaterialsStructured: RawMaterial[],
  productRecipes: ProductRecipe[],
  shopkeepers: Shopkeeper[],
  shopkeeperDeliveries: ShopkeeperDelivery[],
  catalogDescriptions: Record<string, string>,
  canEdit: boolean,
  imprimirCupom: (saleOrHtml: Sale | string, customTitle?: string) => Promise<boolean>,
  imprimirPedidoPDV: (sale: Sale) => Promise<boolean>,
  performUnifiedPrint: (type: string, content: string, printer: string, mode: string, dims?: any, target?: 'print' | 'download') => Promise<boolean>,
  greetingCouponConfig: GreetingCouponConfig,
  setGreetingCouponConfig: any,
  hardwarePrinters: any[],
  setHardwarePrinters: (p: any[]) => void,
  registeredPrinters: any[],
  setRegisteredPrinters: (p: any[]) => void,
  generateReceiptHTML: any,
  generateSimpleReceiptHTML: any,
  generateGreetingCupomHTML: any,
  setProducts: (p: any[]) => void,
  setCustomers: (c: any[]) => void,
  setSales: (s: any[]) => void,
  setActivities: (a: any[]) => void,
  setCategories: (c: any[]) => void,
  setSubcategories: (s: any[]) => void,
  setClosedSessions: (s: any[]) => void,
  setCashierSession: (s: any) => void,
  setRevenues: (r: any[]) => void,
  setPurchases: (p: any[]) => void,
  setExpenses: (e: any[]) => void,
  setRawMaterialsStructured: (r: any[]) => void,
  setProductRecipes: (r: any[]) => void,
  setShopkeepers: (s: any[]) => void,
  setShopkeeperDeliveries: (s: any[]) => void,
  imprimirEtiqueta: (product: Product, quantity: number, customConfig?: LabelConfig) => Promise<boolean>,
  setCatalogDescriptions: (d: any) => void,
  setPreOrders: (p: any[]) => void,
  preOrders: any[],
  setOpenSessions: (s: any) => void,
  verifyPassword: (input: string, stored: string) => boolean,
  secureHash: (str: string) => string,
  isHashed: (str: string) => boolean,
  setOrderCounter: (val: number) => void,
  labelLot: {product: Product, quantity: number, selected: boolean}[],
  setLabelLot: (l: any[]) => void,
  clearLabelLot: () => void,
  removeFromLabelLot: (index: number) => void,
  updateLabelLotItem: (index: number, updates: Partial<{quantity: number, selected: boolean}>) => void,
  generateProgrammaticLabelPDF: any,
  isRestoringRef: any
}) {
  const [activeTab, setActiveTab] = useState('empresa');
  const [localCompany, setLocalCompany] = useState<CompanyInfo>(company);
  const [localCoupon, setLocalCoupon] = useState<CouponConfig>(couponConfig);
  const [localCouponPDV, setLocalCouponPDV] = useState<CouponPDVConfig>(couponPDVConfig);
  const [localRoles, setLocalRoles] = useState<Role[]>(roles);
  const [localLabel, setLocalLabel] = useState<LabelConfig>(labelConfig);
  const [localLabelLot, setLocalLabelLot] = useState<LabelConfig>(labelLotConfig);
  const [localGreeting, setLocalGreeting] = useState<GreetingCouponConfig>(greetingCouponConfig);
  const [localDeliveryMethods, setLocalDeliveryMethods] = useState<DeliveryMethod[]>(deliveryMethods);
  const [localPrinters, setLocalPrinters] = useState<PrinterConfig[]>(printers);
  const [localSelectedPrinter, setLocalSelectedPrinter] = useState<string>(selectedPrinter);
  const [localHardwarePrinters, setLocalHardwarePrinters] = useState<any[]>(hardwarePrinters);

  // Removido reset automático para A4 para permitir persistência da escolha do usuário

  useEffect(() => {
    if (printers) {
      setLocalPrinters(printers);
    }
  }, [printers]);

  useEffect(() => {
    if (hardwarePrinters) {
      setLocalHardwarePrinters(hardwarePrinters);
    }
  }, [hardwarePrinters]);

  useEffect(() => {
    const fetchSystemPrinters = async () => {
      if ((window as any).electronAPI) {
        try {
          const sysPrinters = await (window as any).electronAPI.getPrinters();
          if (sysPrinters && Array.isArray(sysPrinters)) {
            setLocalHardwarePrinters(sysPrinters);
            
            // Define a primeira impressora como padrão se nenhuma estiver selecionada
            if (!selectedPrinter && sysPrinters.length > 0) {
              setSelectedPrinter(sysPrinters[0].name);
              setLocalSelectedPrinter(sysPrinters[0].name);
            }
          }
        } catch (err) {
          console.error("Erro ao carregar impressoras do sistema:", err);
        }
      }
    };
    fetchSystemPrinters();
  }, []);
  
  // User Management Extension States
  const [securitySubTab, setSecuritySubTab] = useState<'usuarios' | 'funcoes' | 'permissoes' | 'historico' | 'reset'>('usuarios');
  const [userTab, setUserTab] = useState<'ativos' | 'inativos'>('ativos');
  const [showNewUserForm, setShowNewUserForm] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showResetSystemModal, setShowResetSystemModal] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [resettingUser, setResettingUser] = useState<SystemUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [deactivatingUser, setDeactivatingUser] = useState<SystemUser | null>(null);
  const [showRoleEditModal, setShowRoleEditModal] = useState(false);
  const [editingRoleUser, setEditingRoleUser] = useState<SystemUser | null>(null);
  const [selectedEditRoleId, setSelectedEditRoleId] = useState('');

  const [newUser, setNewUser] = useState({ name: '', username: '', password: '', roleId: '' });
  const [selectedPermissionRoleId, setSelectedPermissionRoleId] = useState<string>(INITIAL_ROLES[0].id);
  const [showDeleteRolePasswordModal, setShowDeleteRolePasswordModal] = useState(false);
  const [roleToDeleteId, setRoleToDeleteId] = useState<string | null>(null);
  const [deleteRolePasswordValue, setDeleteRolePasswordValue] = useState('');
  const [printSubTab, setPrintSubTab] = useState<'pdv' | 'cliente' | 'etiquetas' | 'saudacao' | 'lote'>('etiquetas');

  const [qrBulkConfig, setQrBulkConfig] = useState({ quantity: 1, prefix: '', startNumber: 1000 });
  const [reprintSubTab, setReprintSubTab] = useState<'inicial' | 'final'>('inicial');
  const [newRole, setNewRole] = useState({ name: '' });
  const [showSuccess, setShowSuccess] = useState(false);
  const [isFetchingCEP, setIsFetchingCEP] = useState(false);
  
  const [localBackups, setLocalBackups] = useState<LocalBackup[]>(() => carregarDados(STORAGE_KEYS.LOCAL_BACKUPS, []));

  const PaperCard = ({ 
    label, 
    sublabel, 
    isSelected, 
    onClick,
    activeColor = "blue"
  }: { 
    label: string, 
    sublabel: string, 
    isSelected: boolean, 
    onClick: () => void,
    activeColor?: "blue" | "orange" | "green" | "purple"
  }) => {
    const colors = {
      blue: "bg-blue-600/20 border-blue-500/50 text-blue-400",
      orange: "bg-orange-600/20 border-orange-500/50 text-orange-400",
      green: "bg-green-600/20 border-green-500/50 text-green-400",
      purple: "bg-purple-600/20 border-purple-500/50 text-purple-400"
    };
    
    return (
      <button 
        onClick={onClick} 
        className={`p-2 rounded-lg border flex flex-col items-center transition-all ${isSelected ? colors[activeColor] : 'bg-white/5 border-white/5 text-zinc-400 hover:bg-white/10'}`}
      >
        <span className="text-[9px] font-black">{label}</span>
        <span className="text-[6px] opacity-50 uppercase tracking-tighter">{sublabel}</span>
      </button>
    );
  };

  const modulesLables: Record<keyof ModulePermissions, string> = {
    dashboard: 'Dashboard',
    pdv: 'PDV',
    separacao: 'Separação',
    estoque: 'Estoque',
    financeiro: 'Financeiro',
    historico: 'Histórico',
    consultarPedido: 'Consultar Pedido',
    customerExperience: 'Customer Experience',
    ajustes: 'Ajustes',
    lojistas: 'Lojistas',
    devolucao: 'Devolução',
    calculadoraCosts: 'Calculadora de Custos',
    centralProducao: 'Central de Produção'
  };
  const [pendingAction, setPendingAction] = useState<{ id: string; type: 'restore' | 'delete' } | null>(null);

  const confirmSystemReset = async () => {
    // 1. Verify admin password
    const adminUser = users.find(u => u.id === 'admin' || u.username.toUpperCase() === 'ADM');
    const isAdmSetupDone = adminUser && isHashed(adminUser.password || '') && !adminUser.isFirstAccess;
    const isPasswordCorrect = isAdmSetupDone 
      ? verifyPassword(adminPasswordInput, adminUser!.password || '') 
      : adminPasswordInput === 'ADM1234';

    if (!isPasswordCorrect) {
      alert('Senha do administrador inválida.');
      return;
    }

    if (!confirm('ATENÇÃO: ESTA AÇÃO É IRREVERSÍVEL. TEM CERTEZA QUE DESEJA LIMPAR TODOS OS DADOS DO SISTEMA?')) {
      return;
    }

    try {
      // 2. Auto backup
      const dataToBackup = {
        products, catalogDescriptions, customers, sales, activities, categories, subcategories,
        delivery_channels: deliveryChannels, delivery_methods: deliveryMethods, closed_sessions: closedSessions,
        openSessions, users, roles, paymentMethods, customPaymentMethods, hiddenPaymentMethods,
        printers, registeredPrinters, company, couponConfig, couponPDVConfig, greetingCouponConfig,
        labelConfig, cashierSession, selectedPrinter, selectedLabelPrinter, revenues, purchases, expenses,
        rawMaterialsStructured, productRecipes, shopkeepers, shopkeeperDeliveries, preOrders: (preOrders || [])
      };
      
      console.log('[Reset] Iniciando backup automático...');
      await exportarBackup(dataToBackup);

      // 3. Clear data
      const keysToClear = [
        STORAGE_KEYS.PRODUCTS, STORAGE_KEYS.SALES, STORAGE_KEYS.CUSTOMERS, STORAGE_KEYS.CATEGORIES, 
        STORAGE_KEYS.SUBCATEGORIES, STORAGE_KEYS.CLOSED_SESSIONS, STORAGE_KEYS.CASHIER_SESSION, 
        STORAGE_KEYS.OPEN_SESSIONS, STORAGE_KEYS.ACTIVITIES, STORAGE_KEYS.REVENUES, STORAGE_KEYS.PURCHASES, 
        STORAGE_KEYS.EXPENSES, STORAGE_KEYS.INVENTORIES, STORAGE_KEYS.PRODUCT_RECIPES, 
        STORAGE_KEYS.RAW_MATERIALS, STORAGE_KEYS.CATALOG_DESCRIPTIONS, STORAGE_KEYS.SHOPKEEPERS, 
        STORAGE_KEYS.SHOPKEEPER_DELIVERIES, STORAGE_KEYS.CALCULATOR_MATERIALS, STORAGE_KEYS.CALCULATOR_PROJECTS, 
        STORAGE_KEYS.PRE_ORDERS, STORAGE_KEYS.ORDER_COUNTER
      ];

      keysToClear.forEach(key => localStorage.removeItem(key));
      
      // Clear IndexedDB
      await Promise.all([
        db.products.clear(), db.customers.clear(), db.sales.clear(), db.categories.clear(),
        db.subcategories.clear(), db.expenses.clear(), db.revenues.clear(), db.purchases.clear(), 
        db.raw_materials.clear(), db.product_recipes.clear(), db.stock_moves.clear(), db.deliveries.clear(), 
        db.payment_methods.clear(), db.shopkeepers.clear(), db.shopkeeper_deliveries.clear(), 
        db.calculator_materials.clear(), db.calculator_projects.clear(), db.cashier_sessions.clear(), 
        db.delivery_methods.clear()
      ]);

      // 4. Update states
      setProducts([]);
      setCustomers([]);
      setSales([]);
      setActivities([]);
      setCategories([]);
      setSubcategories([]);
      setClosedSessions([]);
      setCashierSession({
        id: '',
        isOpen: false,
        openedAt: '',
        openingBalance: 0,
        totalSales: 0,
        totalCanceled: 0,
        salesCount: 0,
        canceledCount: 0,
        salesByMethod: {}
      });
      setOpenSessions({});
      setRevenues([]);
      setPurchases([]);
      setExpenses([]);
      setRawMaterialsStructured([]);
      setProductRecipes([]);
      setShopkeepers([]);
      setShopkeeperDeliveries([]);
      setPreOrders([]);
      setOrderCounter(0);

      // 5. Reset Users (Keep Admin)
      if (adminUser) {
        setUsers([adminUser]);
        salvarDados(STORAGE_KEYS.USERS, [adminUser]);
      }

      setShowResetSystemModal(false);
      setAdminPasswordInput('');
      
      addActivity('security', 'Limpeza do Sistema', 'O sistema foi resetado para o estado de fábrica.');
      alert('SISTEMA RESETADO COM SUCESSO! O backup foi gerado e os dados locais foram removidos.');
      window.location.reload();
    } catch (err) {
      console.error('Erro ao resetar sistema:', err);
      alert('Ocorreu um erro ao resetar o sistema.');
    }
  };

  useEffect(() => {
    const lastBackupDate = carregarDados(STORAGE_KEYS.LAST_AUTO_BACKUP, '');
    const today = new Date().toISOString().split('T')[0];

    if (lastBackupDate !== today) {
      const dataToBackup = {
        products, catalogDescriptions, customers, sales, activities, categories, subcategories,
        delivery_channels: deliveryChannels, delivery_methods: deliveryMethods, closed_sessions: closedSessions,
        openSessions, users, roles, paymentMethods, customPaymentMethods, hiddenPaymentMethods,
        printers, registeredPrinters, company, couponConfig, couponPDVConfig, greetingCouponConfig,
        labelConfig, cashierSession, selectedPrinter, selectedLabelPrinter, revenues, purchases, expenses,
        rawMaterialsStructured, productRecipes, shopkeepers, shopkeeperDeliveries
      };

      const newBackup: LocalBackup = {
        id: Date.now().toString() + Math.random().toString(36).substring(2),
        date: new Date().toISOString(),
        data: dataToBackup,
        size: JSON.stringify(dataToBackup).length
      };

      setLocalBackups(prev => {
        const updated = [newBackup, ...prev].slice(0, 10);
        salvarDados(STORAGE_KEYS.LOCAL_BACKUPS, updated);
        return updated;
      });
      salvarDados(STORAGE_KEYS.LAST_AUTO_BACKUP, today);
      console.log('[Backup] Backup automático realizado.');
    }
  }, []);
  
  const handleRestoreFromData = async (imported: any) => {
    try {
      logger.warn('Iniciando restauração de dados a partir de backup.', null, 'Backup');
      // 1. Garantir leitura correta e validar se o conteúdo não está vazio
      if (!imported || typeof imported !== 'object') {
        throw new Error('Arquivo de backup inválido ou vazio.');
      }

      // 2. Mapeamento Inteligente (Suporta Inglês e Português)
      // Extrai dados das chaves possíveis, priorizando as do sistema mas aceitando as sugeridas pelo usuário
      const restoreData: Record<string, any> = {};
      
      // Mapeamento de chaves
      const mapping = [
        { internal: 'products', keys: ['products', 'produtos'] },
        { internal: 'customers', keys: ['customers', 'clientes'] },
        { internal: 'sales', keys: ['sales', 'pedidos', 'vendas'] },
        { internal: 'activities', keys: ['activities', 'atividades', 'historico_atividades'] },
        { internal: 'categories', keys: ['categories', 'categorias'] },
        { internal: 'subcategories', keys: ['subcategories', 'subcategorias'] },
        { internal: 'delivery_channels', keys: ['delivery_channels', 'deliveryChannels', 'canais_entrega'] },
        { internal: 'delivery_methods', keys: ['delivery_methods', 'deliveryMethods', 'metodos_entrega'] },
        { internal: 'closed_sessions', keys: ['closed_sessions', 'closedSessions', 'sessoes_fechadas'] },
        { internal: 'users', keys: ['users', 'usuarios'] },
        { internal: 'roles', keys: ['roles', 'cargos', 'permissoes'] },
        { internal: 'paymentMethods', keys: ['paymentMethods', 'metodos_pagamento'] },
        { internal: 'customPaymentMethods', keys: ['customPaymentMethods', 'metodos_pagamento_personalizados'] },
        { internal: 'hiddenPaymentMethods', keys: ['hiddenPaymentMethods', 'metodos_pagamento_ocultos'] },
        { internal: 'printers', keys: ['printers', 'impressoras'] },
        { internal: 'registeredPrinters', keys: ['registeredPrinters'] },
        { internal: 'company', keys: ['company', 'empresa', 'dados_empresa'] },
        { internal: 'couponConfig', keys: ['couponConfig', 'configuracao_cupom'] },
        { internal: 'couponPDVConfig', keys: ['couponPDVConfig', 'configuracao_pdv'] },
        { internal: 'greetingCouponConfig', keys: ['greetingCouponConfig', 'configuracao_saudacao'] },
        { internal: 'labelConfig', keys: ['labelConfig', 'configuracao_etiqueta'] },
        { internal: 'cashierSession', keys: ['cashierSession', 'sessao_caixa'] },
        { internal: 'revenues', keys: ['revenues', 'receitas'] },
        { internal: 'purchases', keys: ['purchases', 'compras'] },
        { internal: 'expenses', keys: ['expenses', 'despesas'] },
        { internal: 'rawMaterialsStructured', keys: ['rawMaterialsStructured', 'rawMaterials', 'materias_primas'] },
        { internal: 'productRecipes', keys: ['productRecipes', 'receitas_produtos'] },
        { internal: 'shopkeepers', keys: ['shopkeepers', 'lojistas'] },
        { internal: 'shopkeeperDeliveries', keys: ['shopkeeperDeliveries', 'entregas_lojistas'] },
        { internal: 'catalogDescriptions', keys: ['catalogDescriptions', 'descricoes_catalogo'] },
        { internal: 'openSessions', keys: ['openSessions', 'sessoes_abertas'] },
        { internal: 'selectedPrinter', keys: ['selectedPrinter'] },
        { internal: 'selectedLabelPrinter', keys: ['selectedLabelPrinter'] },
        { internal: 'calculator_materials', keys: ['calculator_materials', 'calculatorMaterials'] },
        { internal: 'calculator_projects', keys: ['calculator_projects', 'calculatorProjects'] },
        { internal: 'label_lot', keys: ['label_lot', 'labelLot'] },
        { internal: 'product_locations', keys: ['product_locations', 'productLocations'] },
        { internal: 'pre_orders', keys: ['pre_orders', 'preOrders'] }
      ];

      // Busca dados nas chaves diretas
      mapping.forEach(m => {
        for (const k of m.keys) {
          if (imported[k] !== undefined) {
            restoreData[m.internal] = imported[k];
            break;
          }
        }
      });

      // Trata a chave especial 'configuracoes' se existir (pode conter sub-objetos)
      if (imported.configuracoes && typeof imported.configuracoes === 'object' && !Array.isArray(imported.configuracoes)) {
        if (restoreData.company === undefined && imported.configuracoes.empresa) restoreData.company = imported.configuracoes.empresa;
        if (restoreData.couponConfig === undefined && imported.configuracoes.cupom) restoreData.couponConfig = imported.configuracoes.cupom;
        if (restoreData.couponPDVConfig === undefined && imported.configuracoes.pdv) restoreData.couponPDVConfig = imported.configuracoes.pdv;
        if (restoreData.labelConfig === undefined && imported.configuracoes.etiqueta) restoreData.labelConfig = imported.configuracoes.etiqueta;
      }

      // 3. Validar estrutura mínima para evitar importação acidental de lixo
      const hasMinData = restoreData.products || restoreData.customers || restoreData.sales;
      if (!hasMinData) {
        throw new Error('Estrutura do JSON incorreta: Não foram encontrados produtos, clientes ou pedidos. O backup pode ser de outro sistema ou estar corrompido.');
      }

      // 4. Preparar lista para restauração no Storage
      const keysToRestore = [
        { key: STORAGE_KEYS.PRODUCTS, data: restoreData.products },
        { key: STORAGE_KEYS.CATALOG_DESCRIPTIONS, data: restoreData.catalogDescriptions },
        { key: STORAGE_KEYS.CUSTOMERS, data: restoreData.customers },
        { key: STORAGE_KEYS.SALES, data: restoreData.sales },
        { key: STORAGE_KEYS.ACTIVITIES, data: restoreData.activities },
        { key: STORAGE_KEYS.CATEGORIES, data: restoreData.categories },
        { key: STORAGE_KEYS.SUBCATEGORIES, data: restoreData.subcategories },
        { key: STORAGE_KEYS.DELIVERY_CHANNELS, data: restoreData.delivery_channels },
        { key: STORAGE_KEYS.DELIVERY_METHODS, data: restoreData.delivery_methods },
        { key: STORAGE_KEYS.CLOSED_SESSIONS, data: restoreData.closed_sessions },
        { key: STORAGE_KEYS.OPEN_SESSIONS, data: restoreData.openSessions },
        { key: STORAGE_KEYS.USERS, data: restoreData.users },
        { key: STORAGE_KEYS.ROLES, data: restoreData.roles },
        { key: STORAGE_KEYS.PAYMENT_METHODS, data: restoreData.paymentMethods },
        { key: STORAGE_KEYS.CUSTOM_PAYMENT_METHODS, data: restoreData.customPaymentMethods },
        { key: STORAGE_KEYS.HIDDEN_PAYMENT_METHODS, data: restoreData.hiddenPaymentMethods },
        { key: STORAGE_KEYS.PRINTERS, data: restoreData.printers },
        { key: STORAGE_KEYS.REGISTERED_PRINTERS, data: restoreData.registeredPrinters },
        { key: STORAGE_KEYS.COMPANY_INFO, data: restoreData.company },
        { key: STORAGE_KEYS.COUPON_CONFIG, data: restoreData.couponConfig },
        { key: STORAGE_KEYS.COUPON_PDV_CONFIG, data: restoreData.couponPDVConfig },
        { key: STORAGE_KEYS.GREETING_COUPON_CONFIG, data: restoreData.greetingCouponConfig },
        { key: STORAGE_KEYS.LABEL_CONFIG, data: restoreData.labelConfig },
        { key: STORAGE_KEYS.CASHIER_SESSION, data: restoreData.cashierSession },
        { key: STORAGE_KEYS.SELECTED_PRINTER, data: restoreData.selectedPrinter },
        { key: STORAGE_KEYS.SELECTED_LABEL_PRINTER, data: restoreData.selectedLabelPrinter },
        { key: STORAGE_KEYS.REVENUES, data: restoreData.revenues },
        { key: STORAGE_KEYS.PURCHASES, data: restoreData.purchases },
        { key: STORAGE_KEYS.EXPENSES, data: restoreData.expenses },
        { key: STORAGE_KEYS.RAW_MATERIALS, data: restoreData.rawMaterialsStructured },
        { key: STORAGE_KEYS.PRODUCT_RECIPES, data: restoreData.productRecipes },
        { key: STORAGE_KEYS.SHOPKEEPERS, data: restoreData.shopkeepers },
        { key: STORAGE_KEYS.SHOPKEEPER_DELIVERIES, data: restoreData.shopkeeperDeliveries },
        { key: STORAGE_KEYS.CALCULATOR_MATERIALS, data: restoreData.calculator_materials },
        { key: STORAGE_KEYS.CALCULATOR_PROJECTS, data: restoreData.calculator_projects },
        { key: STORAGE_KEYS.PRE_ORDERS, data: restoreData.pre_orders },
        { key: 'label_lot', data: restoreData.label_lot },
        { key: 'product_locations', data: restoreData.product_locations }
      ];

      console.log('[Backup] Iniciando restauração profunda de dados...');
      isRestoringRef.current = true; // Bloqueia salvamentos automáticos durante o processo
      setRestoringFlag(true); // Bloqueia persistência global
      syncService.pauseSync(); // Bloqueia sincronização
      
      try {
        const success = await backupService.restoreFromData(restoreData);
        if (!success) {
          throw new Error('Falha técnica interna durante a restauração do banco de dados.');
        }

        // --- ATUALIZAÇÃO EXPLÍCITA DOS ESTADOS REACT ---
        // Isso garante que a UI reflita os dados antes mesmo do reload ou caso o reload falhe
        console.log('[Backup] Atualizando estados React com novos dados...');
        
        if (restoreData.products) setProducts(restoreData.products);
        if (restoreData.customers) setCustomers(restoreData.customers);
        if (restoreData.sales) setSales(restoreData.sales);
        if (restoreData.categories) setCategories(restoreData.categories);
        if (restoreData.subcategories) setSubcategories(restoreData.subcategories);
        if (restoreData.expenses) setExpenses(restoreData.expenses);
        if (restoreData.revenues) setRevenues(restoreData.revenues);
        if (restoreData.purchases) setPurchases(restoreData.purchases);
        if (restoreData.raw_materials || restoreData.rawMaterialsStructured) 
          setRawMaterialsStructured(restoreData.raw_materials || restoreData.rawMaterialsStructured);
        if (restoreData.product_recipes || restoreData.productRecipes)
          setProductRecipes(restoreData.product_recipes || restoreData.productRecipes);
        if (restoreData.shopkeepers) setShopkeepers(restoreData.shopkeepers);
        if (restoreData.shopkeeper_deliveries || restoreData.shopkeeperDeliveries)
          setShopkeeperDeliveries(restoreData.shopkeeper_deliveries || restoreData.shopkeeperDeliveries);
        if (restoreData.activities) setActivities(restoreData.activities);
        if (restoreData.users) setUsers(restoreData.users);
        if (restoreData.roles) setRoles(restoreData.roles);
        if (restoreData.pre_orders || restoreData.preOrders)
          setPreOrders(restoreData.pre_orders || restoreData.preOrders);
        if (restoreData.closed_sessions || restoreData.closedSessions)
          setClosedSessions(restoreData.closed_sessions || restoreData.closedSessions);
        if (restoreData.label_lot || restoreData.labelLot) 
          setLabelLot((restoreData.label_lot || restoreData.labelLot).map((i: any) => ({ ...i, selected: true })));

        setShowSuccess(true);
        alert('BACKUP RESTAURADO COM SUCESSO!\n\nOs dados foram validados e o banco de dados IndexedDB foi atualizado.\n\nO sistema será reiniciado em instantes para carregar as novas configurações.');
        logger.info('Dados restaurados com sucesso a partir do backup.', null, 'Backup');
        
        // Pausa maior para garantir que o IndexedDB do Electron finalize o commit e os dados sejam persistidos
        setTimeout(() => {
          setRestoringFlag(false);
          window.location.reload();
        }, 3000);
      } catch (restoreErr: any) {
        logger.error('Falha técnica durante o commit da restauração:', restoreErr, 'Backup');
        isRestoringRef.current = false;
        setRestoringFlag(false);
        syncService.resumeSync();
        throw restoreErr;
      }
    } catch (err: any) {
      logger.error('Erro crítico ao restaurar dados:', err, 'Backup');
      alert('Erro ao importar backup: ' + err.message);
    }
  };

  const handleCreateManualBackup = async () => {
    try {
      const newBackupMetadata = await backupService.createAutoBackup('manual');
      
      if (!newBackupMetadata) {
        alert('Falha ao criar ponto de restauração. Tente novamente.');
        return;
      }
      
      // Update local state with the metadata returned by the service
      setLocalBackups(prev => {
        const updated = [newBackupMetadata, ...prev].slice(0, 30);
        return updated;
      });
      
      // Feedback visual
      const notify = document.createElement('div');
      notify.className = 'fixed bottom-10 right-10 bg-emerald-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-2xl z-[200] animate-in fade-in slide-in-from-bottom-2';
      notify.innerText = 'Ponto de restauração criado!';
      document.body.appendChild(notify);
      setTimeout(() => {
        notify.classList.add('animate-out', 'fade-out', 'slide-out-to-bottom-2');
        setTimeout(() => notify.remove(), 500);
      }, 3000);
      
    } catch (err: any) {
      console.error('Erro ao criar backup local:', err);
      alert('Erro ao criar backup: ' + err.message);
    }
  };

  const handleDeleteBackup = (id: string) => {
    logger.info('Solicitada exclusão de ponto de restauração.', { backupId: id }, 'Backup');
    setLocalBackups(prev => {
      const updated = prev.filter(b => b.id !== id);
      salvarDados(STORAGE_KEYS.LOCAL_BACKUPS, updated);
      return updated;
    });
  };

  const [newPrinter, setNewPrinter] = useState<{ name: string; type: 'thermal' | 'desktop' }>({
    name: '',
    type: 'thermal'
  });

  const handleSave = () => {
    if (localCompany.email && !validateEmail(localCompany.email)) {
      alert('E-mail inválido!');
      return;
    }
    
    // Atualiza estados do App
    setCompany(localCompany);
    setCouponConfig(localCoupon);
    setCouponPDVConfig(localCouponPDV);
    setRoles(localRoles);
    setLabelConfig(localLabel);
    setGreetingCouponConfig(localGreeting);
    setDeliveryMethods(localDeliveryMethods);
    setPrinters(localPrinters);
    setSelectedPrinter(localSelectedPrinter);

    // Persiste no banco local
    salvarDados(STORAGE_KEYS.COMPANY_INFO, localCompany);
    salvarDados(STORAGE_KEYS.COUPON_CONFIG, localCoupon);
    salvarDados(STORAGE_KEYS.COUPON_PDV_CONFIG, localCouponPDV);
    salvarDados(STORAGE_KEYS.ROLES, localRoles);
    salvarDados(STORAGE_KEYS.LABEL_CONFIG, localLabel);
    salvarDados(STORAGE_KEYS.GREETING_COUPON_CONFIG, localGreeting);
    salvarDados(STORAGE_KEYS.DELIVERY_METHODS, localDeliveryMethods);
    salvarDados(STORAGE_KEYS.PRINTERS, localPrinters);
    salvarDados(STORAGE_KEYS.SELECTED_PRINTER, localSelectedPrinter);
    
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
    }, 2000);
  };

  const handleCancel = () => {
    onBack();
  };

  const handleLogoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLocalCompany({ ...localCompany, logo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const addUser = () => {
    if (!newUser.username || !newUser.name) return;
    const user: SystemUser = {
      id: crypto.randomUUID(),
      username: newUser.username,
      name: newUser.name,
      password: newUser.password ? secureHash(newUser.password) : undefined,
      roleId: newUser.roleId,
      isActive: true
    };
    setUsers([...users, user]);
    addActivity('security', 'Cadastro de Usuário', `Novo usuário ${user.name} (@${user.username}) cadastrado.`);
    setNewUser({ name: '', username: '', password: '', roleId: '' });
  };

  const addRole = () => {
    if (!newRole.name) return;
    const role: Role = {
      id: crypto.randomUUID(),
      name: newRole.name,
      permissions: { ...DEFAULT_PERMISSIONS }
    };
    setLocalRoles([...localRoles, role]);
    setNewRole({ name: '' });
  };

  const togglePermissionAction = (roleId: string, module: keyof ModulePermissions, action: keyof ModuleActions) => {
    setLocalRoles(localRoles.map(r => {
      if (r.id === roleId) {
        const currentModule = r.permissions[module] || { ...DEFAULT_ACTIONS };
        return {
          ...r,
          permissions: {
            ...r.permissions,
            [module]: {
              ...currentModule,
              [action]: !currentModule[action]
            }
          }
        };
      }
      return r;
    }));
  };

  const confirmDeleteRole = () => {
    if (!roleToDeleteId) return;
    
    const adminUser = users.find(u => u.id === 'admin' || u.username.toUpperCase() === 'ADM');
    const isAdmSetupDone = adminUser && isHashed(adminUser.password || '') && !adminUser.isFirstAccess;
    
    const isUserPassword = currentUser && verifyPassword(deleteRolePasswordValue, currentUser.password || '');
    const isMasterPassword = !isAdmSetupDone && deleteRolePasswordValue === 'ADM1234';

    if (!isUserPassword && !isMasterPassword) {
       alert('Senha incorreta!');
       return;
    }

    const role = localRoles.find(r => r.id === roleToDeleteId);
    if (!role) return;

    setLocalRoles(localRoles.filter(r => r.id !== roleToDeleteId));
    addActivity('security', 'Exclusão de Função', `Função "${role.name}" excluída.`);
    
    setShowDeleteRolePasswordModal(false);
    setRoleToDeleteId(null);
    setDeleteRolePasswordValue('');
    setShowSuccess(true);
  };

  const handleCEPChange = async (cep: string) => {
    const masked = maskCEP(cep);
    setLocalCompany(prev => ({ ...prev, address: { ...prev.address, cep: masked } }));

    if (masked.length === 9) {
      const cleanCEP = masked.replace(/\D/g, '');
      setIsFetchingCEP(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
        const data = await response.json();
        
        if (data.erro) {
          alert('CEP não encontrado!');
        } else {
          setLocalCompany(prev => ({
            ...prev,
            address: {
              ...prev.address,
              logradouro: data.logradouro || prev.address.logradouro,
              bairro: data.bairro || prev.address.bairro,
              cidade: data.localidade || prev.address.cidade,
              estado: data.uf || prev.address.estado
            }
          }));
        }
      } catch (error) {
        console.error('Erro ao buscar CEP:', error);
        alert('Erro ao buscar CEP. Verifique sua conexão.');
      } finally {
        setIsFetchingCEP(false);
      }
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-full w-full bg-[#0a0e1a] text-white overflow-hidden rounded-[2rem] border border-white/5">
      <AnimatePresence>
        {pdvTestSale && (
          <ReceiptModal 
            sale={pdvTestSale} 
            products={products} 
            customers={customers}
            company={company}
            couponConfig={couponConfig}
            couponPDVConfig={localCouponPDV}
            onClose={() => setPdvTestSale(null)} 
            isFinalized={true}
            imprimirCupom={imprimirCupom}
            imprimirPedidoPDV={imprimirPedidoPDV}
            generateReceiptHTML={generateReceiptHTML}
            generateSimpleReceiptHTML={generateSimpleReceiptHTML}
            performUnifiedPrint={performUnifiedPrint}
            paymentIcons={paymentIcons}
          />
        )}
      </AnimatePresence>
      {/* Sidebar - Tabs Vertical (Responsive) */}
      <aside className="w-full lg:w-64 bg-[#0d1224] border-b lg:border-b-0 lg:border-r border-white/5 flex flex-col lg:flex-col shrink-0">
        <div className="p-4 lg:p-6 flex items-center gap-3 border-b lg:border-b-0 border-white/5 lg:border-none">
          <button 
            onClick={onBack}
            className="w-8 h-8 shrink-0 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-all active:scale-95"
          >
            <ArrowLeft size={14} />
          </button>
          <div className="min-w-0">
            <h2 className="text-[9px] font-black tracking-[0.2em] text-white/30 uppercase leading-none mb-1">Ajustes</h2>
            <p className="text-[11px] text-white font-black uppercase tracking-tight truncate leading-none">{localCompany.name}</p>
          </div>
        </div>

        <div className="flex lg:flex-col px-3 gap-1 lg:gap-0.5 overflow-x-auto lg:overflow-y-auto no-scrollbar py-3 lg:py-0">
          {[
            { id: 'empresa', label: 'Empresa', icon: Store },
            { id: 'cupons-etiquetas', label: 'Cupons e Etiquetas', icon: Tag },
            { id: 'entrega', label: 'Entrega', icon: Truck },
            { id: 'impressao', label: 'Impressão', icon: Printer },
            { id: 'seguranca', label: 'Segurança', icon: Lock },
            { id: 'cotas', label: 'Cotas', icon: BarChart3 },
            { id: 'backup', label: 'Backup', icon: Database },
            ...((isUserAdmin(currentUser) || canEdit) ? [{ id: 'reimpressao', label: 'Reimpressão', icon: RotateCcw }] : [])
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all group shrink-0 w-auto lg:w-full ${
                activeTab === tab.id 
                ? 'bg-blue-600/10 border border-blue-500/20 text-blue-400' 
                : 'text-white/40 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <div className={`transition-transform duration-300 ${activeTab === tab.id ? 'scale-110' : 'group-hover:scale-110'}`}>
                <tab.icon size={16} />
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest leading-none whitespace-nowrap">{tab.label}</span>
              {activeTab === tab.id && <div className="hidden lg:block ml-auto w-1 h-1 rounded-full bg-blue-400" />}
            </button>
          ))}
        </div>

        <div className="hidden lg:block p-4 border-t border-white/5 space-y-3 mt-auto">
          {showSuccess && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-emerald-500/10 text-emerald-500 p-2.5 rounded-xl flex items-center justify-center gap-2 border border-emerald-500/20 mb-2"
            >
              <CheckCircle size={12} />
              <span className="font-black text-[8px] uppercase tracking-widest text-center">Salvo com Sucesso!</span>
            </motion.div>
          )}
          <div className="flex gap-2">
            <button 
              onClick={handleCancel}
              className="flex-1 bg-white/5 text-white py-3 rounded-xl font-black text-[9px] tracking-widest uppercase border border-white/10 hover:bg-white/10 transition-all active:scale-95 px-2"
            >
              Cancelar
            </button>
            {canEdit && (
              <button 
                onClick={handleSave}
                className="flex-[2] bg-blue-600 text-white py-3 rounded-xl font-black text-[9px] tracking-widest uppercase hover:bg-blue-700 transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2"
              >
                <Save size={14} /> Salvar
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto no-scrollbar p-4 lg:p-10 bg-[#0a0e1a]/50">
        {/* Mobile Save Action Bar */}
        <div className="lg:hidden flex gap-2 mb-6 sticky top-0 z-10 bg-[#0a0e1a]/80 backdrop-blur-md p-2 -mx-2 rounded-xl">
           <button 
            onClick={handleCancel}
            className="flex-1 bg-white/5 text-white py-3 rounded-xl font-black text-[8px] tracking-widest uppercase border border-white/10 hover:bg-white/10 transition-all active:scale-95"
          >
            Sair
          </button>
          {canEdit && (
            <button 
              onClick={handleSave}
              className="flex-[2] bg-blue-600 text-white py-3 rounded-xl font-black text-[8px] tracking-widest uppercase shadow-xl flex items-center justify-center gap-2"
            >
              <Save size={12} /> Salvar Alterações
            </button>
          )}
        </div>
        {activeTab === 'empresa' && (
          <div className="max-w-6xl mx-auto space-y-3 animate-in fade-in duration-500">
            {/* Seção Principal: Logo + Dados Básicos */}
            <div className="glass-panel p-4 shrink-0">
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Logo à Esquerda */}
                <div className="w-full lg:w-32 shrink-0 flex flex-col items-center justify-start pt-1">
                  <UniversalImageSelector 
                    label="LOGO"
                    value={localCompany.logo}
                    onChange={(url) => setLocalCompany({ ...localCompany, logo: url })}
                    category="logo"
                  />
                  <p className="text-[7px] font-black text-white/20 uppercase mt-2 tracking-widest text-center">PNG/JPG Quadrado</p>
                </div>

                {/* Dados à Direita */}
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                    <div className="w-6 h-6 bg-blue-600/10 text-blue-400 rounded-lg border border-blue-500/20 flex items-center justify-center">
                      <Store size={12} />
                    </div>
                    <h3 className="text-[9px] font-black text-white uppercase tracking-[0.2em]">Identificação da Empresa</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input 
                      label="RAZÃO SOCIAL / NOME" 
                      value={localCompany.name} 
                      onChange={v => setLocalCompany({...localCompany, name: v})} 
                      placeholder="Nome oficial"
                      compact={true}
                    />
                    <Input 
                      label="NOME FANTASIA (OPCIONAL)" 
                      value={localCompany.tradeName || ''} 
                      onChange={v => setLocalCompany({...localCompany, tradeName: v})} 
                      placeholder="Nome comercial"
                      compact={true}
                    />
                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-3">
                      <Input 
                        label="CPF / CNPJ" 
                        value={localCompany.idNumber} 
                        onChange={v => setLocalCompany({...localCompany, idNumber: maskCPF_CNPJ(v)})} 
                        placeholder="00.000.000/0001-00"
                        compact={true}
                      />
                      <Input 
                        label="SLOGAN" 
                        value={localCompany.slogan || ''} 
                        onChange={v => setLocalCompany({...localCompany, slogan: v})} 
                        placeholder="Frase curta"
                        compact={true}
                      />
                      <Input 
                        label="INSCR. ESTADUAL" 
                        value={localCompany.stateRegistration || ''} 
                        onChange={v => setLocalCompany({...localCompany, stateRegistration: v})} 
                        placeholder="Isento ou Nº"
                        compact={true}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {/* Section: Endereço */}
              <div className="glass-panel p-4 space-y-3">
                <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                  <div className="w-6 h-6 bg-amber-600/10 text-amber-400 rounded-lg border border-amber-500/20 flex items-center justify-center">
                    <MapPin size={12} />
                  </div>
                  <h3 className="text-[9px] font-black text-white uppercase tracking-[0.2em]">Endereço Matriz</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-3 gap-y-2">
                  <div className="relative">
                    <Input 
                      label="CEP" 
                      value={localCompany.address.cep} 
                      onChange={handleCEPChange} 
                      placeholder="00000-000"
                      compact={true}
                    />
                    {isFetchingCEP && (
                      <div className="absolute right-3 bottom-2.5">
                        <Loader2 size={10} className="text-blue-500 animate-spin" />
                      </div>
                    )}
                  </div>
                  <Input 
                    label="ESTADO (UF)" 
                    value={localCompany.address.estado} 
                    onChange={v => setLocalCompany({...localCompany, address: {...localCompany.address, estado: v.toUpperCase().substring(0, 2)}})} 
                    placeholder="UF"
                    compact={true}
                  />
                  <div className="md:col-span-2">
                    <Input 
                      label="RUA / LOGRADOURO" 
                      value={localCompany.address.logradouro} 
                      onChange={v => setLocalCompany({...localCompany, address: {...localCompany.address, logradouro: v}})} 
                      placeholder="Nome da rua..."
                      compact={true}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3 md:col-span-2">
                    <Input 
                      label="NÚMERO" 
                      value={localCompany.address.numero} 
                      onChange={v => setLocalCompany({...localCompany, address: {...localCompany.address, numero: v}})} 
                      placeholder="S/N"
                      compact={true}
                    />
                    <Input 
                      label="BAIRRO" 
                      value={localCompany.address.bairro} 
                      onChange={v => setLocalCompany({...localCompany, address: {...localCompany.address, bairro: v}})} 
                      placeholder="Bairro"
                      compact={true}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Input 
                      label="CIDADE" 
                      value={localCompany.address.cidade} 
                      onChange={v => setLocalCompany({...localCompany, address: {...localCompany.address, cidade: v}})} 
                      placeholder="Cidade"
                      compact={true}
                    />
                  </div>
                </div>
              </div>

              {/* Section: Contato & Pagamento */}
              <div className="glass-panel p-4 space-y-3 flex flex-col">
                <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                  <div className="w-6 h-6 bg-emerald-600/10 text-emerald-400 rounded-lg border border-emerald-500/20 flex items-center justify-center">
                    <Contact size={12} />
                  </div>
                  <h3 className="text-[9px] font-black text-white uppercase tracking-[0.2em]">Contato & Finanças</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1">
                  <Input 
                    label="E-MAIL" 
                    value={localCompany.email} 
                    onChange={v => setLocalCompany({...localCompany, email: v})} 
                    placeholder="contato@empresa.com"
                    compact={true}
                  />
                  <Input 
                    label="TELEFONE / WHATSAPP" 
                    value={localCompany.phone} 
                    onChange={v => setLocalCompany({...localCompany, phone: maskPhone(v)})} 
                    placeholder="(00) 00000-0000"
                    compact={true}
                  />
                  <Input 
                    label="CHAVE PIX" 
                    value={localCompany.pix} 
                    onChange={v => setLocalCompany({...localCompany, pix: v})} 
                    placeholder="CPF, CNPJ, Email ou Celular"
                    compact={true}
                  />
                  <Input 
                    label="WEBSITE (URL)" 
                    value={localCompany.website} 
                    onChange={v => setLocalCompany({...localCompany, website: v})} 
                    placeholder="ex: www.loja.com"
                    compact={true}
                  />
                </div>

                <div className="mt-2 p-2 bg-blue-500/5 rounded-xl border border-blue-500/10">
                   <p className="text-[7.5px] font-black text-[#64748b] uppercase text-center leading-tight">
                     Confira os dados antes de salvar. Eles aparecem nos cupons.
                   </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'cupons-etiquetas' && (
          <div className="max-w-6xl mx-auto space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Sub-abas de Navegação - Compacta */}
            <div className="flex overflow-x-auto no-scrollbar gap-1 p-1 w-full md:w-fit snap-x items-center bg-[#1a2744]/40 rounded-xl border border-white/5">
               {[
                 { id: 'pdv', label: 'Cupom Pedido', icon: <FileText size={12} /> },
                 { id: 'cliente', label: 'Cupom Cliente', icon: <Printer size={12} /> },
                 { id: 'saudacao', label: 'Cupom Saudação', icon: <Star size={12} /> },
                 { id: 'etiquetas', label: 'Etiquetas', icon: <Tag size={12} /> },
                 { id: 'lote', label: 'Lote de Etiquetas', icon: <Boxes size={12} className="text-orange-400" /> }
               ].map(sub => (
                 <button
                   key={sub.id}
                   onClick={() => {
                     setPrintSubTab(sub.id as any);
                   }}
                   className={`px-3 py-2 rounded-lg text-[8px] whitespace-nowrap font-black uppercase tracking-widest transition-all flex items-center gap-1.5 snap-center border ${
                    printSubTab === sub.id 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 border-blue-400/30' 
                    : 'bg-transparent text-[#64748b] hover:text-white border-transparent hover:bg-white/5'
                   }`}
                 >
                   {sub.icon} {sub.label}
                 </button>
               ))}
            </div>

            <div className={`grid grid-cols-1 ${printSubTab === 'saudacao' ? '' : 'lg:grid-cols-2'} gap-3`}>
              {/* Lado Esquerdo: Configurações */}
              <div className="space-y-3">
                
                {printSubTab === 'pdv' && (
                  <div className="space-y-3 animate-in fade-in duration-300">
                    <div className="glass-panel p-4 space-y-2">
                      <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                        <Monitor size={10} className="text-blue-400" />
                        <h4 className="text-[8px] font-black text-white tracking-[0.2em] uppercase">Hardware & Formato</h4>
                      </div>
                      
                      <div className="space-y-1">
                        <label className="text-[6px] font-black text-[#64748b] tracking-widest uppercase ml-1">Formato do Papel</label>
                        <div className="grid grid-cols-6 gap-1.5">
                          <PaperCard label="58mm" sublabel="Térmico" isSelected={localCouponPDV.format === '58mm'} onClick={() => setLocalCouponPDV({...localCouponPDV, format: '58mm'})} />
                          <PaperCard label="80mm" sublabel="Térmico" isSelected={localCouponPDV.format === '80mm'} onClick={() => setLocalCouponPDV({...localCouponPDV, format: '80mm'})} />
                          <PaperCard label="A4" sublabel="Folha" isSelected={localCouponPDV.format === 'a4'} onClick={() => setLocalCouponPDV({...localCouponPDV, format: 'a4'})} />
                          <PaperCard label="A5" sublabel="Folha" isSelected={localCouponPDV.format === 'a5'} onClick={() => setLocalCouponPDV({...localCouponPDV, format: 'a5'})} />
                          <PaperCard label="A6" sublabel="Folha" isSelected={localCouponPDV.format === 'a6'} onClick={() => setLocalCouponPDV({...localCouponPDV, format: 'a6'})} />
                          <PaperCard label="Custom" sublabel="Personaliz." isSelected={localCouponPDV.format === 'custom'} onClick={() => setLocalCouponPDV({...localCouponPDV, format: 'custom'})} />
                        </div>
                      </div>

                      {localCouponPDV.format === 'custom' && (
                        <div className="grid grid-cols-2 gap-2 pb-2 border-b border-white/5 animate-in slide-in-from-top-1 duration-200">
                          <Input label="Largura (mm)" type="number" value={localCouponPDV.customWidth} onChange={v => setLocalCouponPDV({...localCouponPDV, customWidth: Number(v)})} compact />
                          <Input label="Altura (mm)" type="number" value={localCouponPDV.customHeight} onChange={v => setLocalCouponPDV({...localCouponPDV, customHeight: Number(v)})} compact />
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
                        <div className="space-y-0.5">
                          <label className="text-[6px] font-black text-[#64748b] tracking-widest uppercase ml-1">Orientação</label>
                          <select 
                            value={localCouponPDV.orientation || 'portrait'}
                            onChange={e => setLocalCouponPDV({...localCouponPDV, orientation: e.target.value as any})}
                            className="w-full p-2 bg-[#1a2744] border border-white/10 rounded-lg outline-none text-[8px] font-black uppercase text-white cursor-pointer focus:border-blue-500/50 transition-all shadow-lg"
                          >
                            <option value="portrait">Vertical</option>
                            <option value="landscape">Horizontal</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="glass-panel p-4 space-y-2">
                      <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                        <LayoutDashboard size={10} className="text-purple-400" />
                        <h4 className="text-[8px] font-black text-white tracking-[0.2em] uppercase">Conteúdo do PDV</h4>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-1.5 px-1">
                        <Checkbox label="Ver Logo" checked={localCouponPDV.showLogo} onChange={v => setLocalCouponPDV({...localCouponPDV, showLogo: v})} compact />
                        <Checkbox label="Ver Data/Hora" checked={localCouponPDV.showDateTime} onChange={v => setLocalCouponPDV({...localCouponPDV, showDateTime: v})} compact />
                        <Checkbox label="Ver Vendedor" checked={localCouponPDV.showSoldBy} onChange={v => setLocalCouponPDV({...localCouponPDV, showSoldBy: v})} compact />
                        <Checkbox label="Ver QR Code" checked={localCouponPDV.showQrCode} onChange={v => setLocalCouponPDV({...localCouponPDV, showQrCode: v})} compact />
                      </div>

                      <Input label="Texto no Topo" value={localCouponPDV.headerMessage} onChange={v => setLocalCouponPDV({...localCouponPDV, headerMessage: v})} compact />

                      <div className="pt-2 flex gap-2">
                        <button 
                          onClick={async () => {
                            const mockSale: Sale = { id: 'test', sequentialId: '0001', date: Date.now(), total: 0, totalCost: 0, totalProfit: 0, items: [], status: 'pendente', updatedAt: Date.now(), paymentMethod: 'pix', soldByUserName: 'OPERADOR TESTE' };
                            const testHtml = await generateSimpleReceiptHTML(mockSale, company, localCouponPDV);
                            performUnifiedPrint('Teste PDV', testHtml, selectedPrinter, 'browser', localCouponPDV, 'download');
                          }}
                          className="flex-1 py-3 bg-white/5 text-white border border-white/10 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 group active:scale-95"
                        >
                          <FileDown size={14} className="text-zinc-400 group-hover:text-white transition-colors" />
                          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Gerar PDF</span>
                        </button>
                        <button 
                          onClick={async () => {
                            const mockSale: Sale = { id: 'test', sequentialId: '0001', date: Date.now(), total: 0, totalCost: 0, totalProfit: 0, items: [], status: 'pendente', updatedAt: Date.now(), paymentMethod: 'pix', soldByUserName: 'OPERADOR TESTE' };
                            const testHtml = await generateSimpleReceiptHTML(mockSale, company, localCouponPDV);
                            performUnifiedPrint('Teste PDV', testHtml, selectedPrinter, localCouponPDV.printMode === 'auto' ? 'auto' : 'browser', localCouponPDV, 'print');
                          }}
                          className="flex-1 py-3 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 group"
                        >
                          <Printer size={14} className="group-hover:rotate-12 transition-transform" />
                          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Imprimir</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {printSubTab === 'cliente' && (
                  <div className="space-y-3 animate-in fade-in duration-300">
                    <div className="glass-panel p-4 space-y-2">
                      <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                        <Monitor size={10} className="text-blue-400" />
                        <h4 className="text-[8px] font-black text-white tracking-[0.2em] uppercase">Layout do Cupom</h4>
                      </div>
                      
                      <div className="space-y-1">
                        <label className="text-[6px] font-black text-[#64748b] tracking-widest uppercase ml-1">Formato do Papel</label>
                        <div className="grid grid-cols-6 gap-1.5">
                          <PaperCard label="58mm" sublabel="Térmico" isSelected={localCoupon.format === '58mm'} onClick={() => setLocalCoupon({...localCoupon, format: '58mm'})} />
                          <PaperCard label="80mm" sublabel="Térmico" isSelected={localCoupon.format === '80mm'} onClick={() => setLocalCoupon({...localCoupon, format: '80mm'})} />
                          <PaperCard label="A4" sublabel="Folha" isSelected={localCoupon.format === 'a4'} onClick={() => setLocalCoupon({...localCoupon, format: 'a4'})} />
                          <PaperCard label="A5" sublabel="Folha" isSelected={localCoupon.format === 'a5'} onClick={() => setLocalCoupon({...localCoupon, format: 'a5'})} />
                          <PaperCard label="A6" sublabel="Folha" isSelected={localCoupon.format === 'a6'} onClick={() => setLocalCoupon({...localCoupon, format: 'a6'})} />
                          <PaperCard label="Custom" sublabel="Personaliz." isSelected={localCoupon.format === 'custom'} onClick={() => setLocalCoupon({...localCoupon, format: 'custom'})} />
                        </div>
                      </div>

                      {localCoupon.format === 'custom' && (
                        <div className="grid grid-cols-2 gap-2 pb-2 border-b border-white/5 animate-in slide-in-from-top-1 duration-200">
                          <Input label="Largura (mm)" type="number" value={localCoupon.customWidth} onChange={v => setLocalCoupon({...localCoupon, customWidth: Number(v)})} compact />
                          <Input label="Altura (mm)" type="number" value={localCoupon.customHeight} onChange={v => setLocalCoupon({...localCoupon, customHeight: Number(v)})} compact />
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
                        <div className="space-y-0.5">
                          <label className="text-[6px] font-black text-[#64748b] tracking-widest uppercase ml-1">Orientação</label>
                          <select value={localCoupon.orientation || 'portrait'} onChange={e => setLocalCoupon({...localCoupon, orientation: e.target.value as any})} className="w-full p-2 bg-[#1a2744] border border-white/10 rounded-lg outline-none text-[8px] font-black uppercase text-white cursor-pointer focus:border-blue-500/50 transition-all shadow-lg">
                            <option value="portrait">Vertical</option>
                            <option value="landscape">Horizontal</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="glass-panel p-4 space-y-2">
                      <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                        <LayoutDashboard size={10} className="text-emerald-400" />
                        <h4 className="text-[8px] font-black text-white tracking-[0.2em] uppercase">Dados Visíveis</h4>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-1.5 px-1">
                        <Checkbox label="Ver Logo" checked={localCoupon.showLogo} onChange={v => setLocalCoupon({...localCoupon, showLogo: v})} compact />
                        <Checkbox label="Empresa" checked={localCoupon.showCompanyName} onChange={v => setLocalCoupon({...localCoupon, showCompanyName: v})} compact />
                        <Checkbox label="Endereço" checked={localCoupon.showAddress} onChange={v => setLocalCoupon({...localCoupon, showAddress: v})} compact />
                        <Checkbox label="Cliente" checked={localCoupon.showCustomerData} onChange={v => setLocalCoupon({...localCoupon, showCustomerData: v})} compact />
                        <Checkbox label="Preço Unit." checked={localCoupon.showItemUnitPrice} onChange={v => setLocalCoupon({...localCoupon, showItemUnitPrice: v})} compact />
                        <Checkbox label="Data/Hora" checked={localCoupon.showDateTime} onChange={v => setLocalCoupon({...localCoupon, showDateTime: v})} compact />
                        <Checkbox label="Pagamento" checked={localCoupon.showPaymentMethod} onChange={v => setLocalCoupon({...localCoupon, showPaymentMethod: v})} compact />
                        <Checkbox label="Total Final" checked={localCoupon.showFinalTotal} onChange={v => setLocalCoupon({...localCoupon, showFinalTotal: v})} compact />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 border-t border-white/5 mt-1">
                        <Input label="Cabeçalho" value={localCoupon.headerMessage} onChange={v => setLocalCoupon({...localCoupon, headerMessage: v})} compact />
                        <Input label="Rodapé" value={localCoupon.footerMessage} onChange={v => setLocalCoupon({...localCoupon, footerMessage: v})} compact />
                      </div>

                      <div className="pt-2 flex gap-2">
                        <button 
                          onClick={async () => {
                            const mockSale: Sale = { 
                              id: 'test', 
                              sequentialId: '0001', 
                              date: Date.now(), 
                              total: 100.0, 
                              totalCost: 60, 
                              totalProfit: 40, 
                              items: [
                                { productId: 'p1', quantity: 2, price: 35.0, cost: 20, profit: 15 },
                                { productId: 'p2', quantity: 1, price: 30.0, cost: 20, profit: 10 }
                              ], 
                              status: 'pendente', 
                              updatedAt: Date.now(), 
                              paymentMethod: 'pix' 
                            };
                            const mockProducts: Product[] = [
                              { id: 'p1', name: 'ITEM EXEMPLO 1', price: 35.0, costPrice: 20, categoryId: '', stock: 10, minStock: 2, createdAt: 0, updatedAt: 0 },
                              { id: 'p2', name: 'ITEM EXEMPLO 2', price: 30.0, costPrice: 20, categoryId: '', stock: 10, minStock: 2, createdAt: 0, updatedAt: 0 }
                            ];
                            const testHtml = await generateReceiptHTML(mockSale, mockProducts, [], company, localCoupon, 'CUPOM DE TESTE');
                            performUnifiedPrint('Teste Cliente', testHtml, selectedPrinter, 'browser', localCoupon, 'download');
                          }}
                          className="flex-1 py-3 bg-white/5 text-white border border-white/10 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 group active:scale-95"
                        >
                           <FileDown size={14} className="text-zinc-400 group-hover:text-white transition-colors" />
                           <span className="text-[10px] font-black uppercase tracking-[0.2em]">Gerar PDF</span>
                        </button>
                        <button 
                          onClick={async () => {
                            const mockSale: Sale = { 
                              id: 'test', 
                              sequentialId: '0001', 
                              date: Date.now(), 
                              total: 100.0, 
                              totalCost: 60, 
                              totalProfit: 40, 
                              items: [
                                { productId: 'p1', quantity: 2, price: 35.0, cost: 20, profit: 15 },
                                { productId: 'p2', quantity: 1, price: 30.0, cost: 20, profit: 10 }
                              ], 
                              status: 'pendente', 
                              updatedAt: Date.now(), 
                              paymentMethod: 'pix' 
                            };
                            const mockProducts: Product[] = [
                              { id: 'p1', name: 'ITEM EXEMPLO 1', price: 35.0, costPrice: 20, categoryId: '', stock: 10, minStock: 2, createdAt: 0, updatedAt: 0 },
                              { id: 'p2', name: 'ITEM EXEMPLO 2', price: 30.0, costPrice: 20, categoryId: '', stock: 10, minStock: 2, createdAt: 0, updatedAt: 0 }
                            ];
                            const testHtml = await generateReceiptHTML(mockSale, mockProducts, [], company, localCoupon, 'CUPOM DE TESTE');
                            performUnifiedPrint('Teste Cliente', testHtml, selectedPrinter, localCoupon.printMode === 'auto' ? 'auto' : 'browser', localCoupon, 'print');
                          }}
                          className="flex-1 py-3 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 group"
                        >
                           <Printer size={14} className="group-hover:rotate-12 transition-transform" />
                           <span className="text-[10px] font-black uppercase tracking-[0.2em]">Imprimir</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {printSubTab === 'saudacao' && (
                  <div className="animate-in fade-in duration-300 space-y-4">
                    <div className="glass-panel p-4 space-y-3">
                      <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                        <Monitor size={12} className="text-blue-400" />
                        <h4 className="text-[9px] font-black text-white tracking-[0.2em] uppercase">Layout do Cupom</h4>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[7px] font-black text-[#64748b] tracking-widest uppercase ml-1">Formato do Papel</label>
                        <div className="grid grid-cols-6 gap-2">
                          <PaperCard label="58mm" sublabel="Térmico" isSelected={localGreeting.format === '58mm'} onClick={() => setLocalGreeting({...localGreeting, format: '58mm'})} />
                          <PaperCard label="80mm" sublabel="Térmico" isSelected={localGreeting.format === '80mm'} onClick={() => setLocalGreeting({...localGreeting, format: '80mm'})} />
                          <PaperCard label="A4" sublabel="Folha" isSelected={localGreeting.format === 'a4'} onClick={() => setLocalGreeting({...localGreeting, format: 'a4'})} />
                          <PaperCard label="A5" sublabel="Folha" isSelected={localGreeting.format === 'a5'} onClick={() => setLocalGreeting({...localGreeting, format: 'a5'})} />
                          <PaperCard label="A6" sublabel="Folha" isSelected={localGreeting.format === 'a6'} onClick={() => setLocalGreeting({...localGreeting, format: 'a6'})} />
                          <PaperCard label="Custom" sublabel="Personaliz." isSelected={localGreeting.format === 'custom'} onClick={() => setLocalGreeting({...localGreeting, format: 'custom'})} />
                        </div>
                      </div>

                      {localGreeting.format === 'custom' && (
                        <div className="grid grid-cols-2 gap-3 pb-2 border-b border-white/5 animate-in slide-in-from-top-1 duration-200">
                          <div className="space-y-1">
                            <label className="text-[7px] font-black text-[#64748b] tracking-widest uppercase ml-1">Largura (mm)</label>
                            <input 
                              type="number" 
                              value={localGreeting.customWidth || 80}
                              onChange={e => setLocalGreeting({...localGreeting, customWidth: Number(e.target.value)})}
                              className="w-full p-2.5 bg-[#1a2744] border border-white/10 rounded-lg outline-none text-[10px] font-black uppercase text-white focus:border-blue-500/50 transition-all shadow-lg"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[7px] font-black text-[#64748b] tracking-widest uppercase ml-1">Altura (mm)</label>
                            <input 
                              type="number" 
                              value={localGreeting.customHeight || 150}
                              onChange={e => setLocalGreeting({...localGreeting, customHeight: Number(e.target.value)})}
                              className="w-full p-2.5 bg-[#1a2744] border border-white/10 rounded-lg outline-none text-[10px] font-black uppercase text-white focus:border-blue-500/50 transition-all shadow-lg"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <CouponVisualEditor 
                      config={localGreeting}
                      onChange={setLocalGreeting}
                      onExportPDF={async () => {
                        const mockSale: Sale = { id: 'test', sequentialId: '0001', date: Date.now(), total: 0, totalCost: 0, totalProfit: 0, items: [], status: 'pendente', updatedAt: Date.now(), paymentMethod: 'pix', youtubeLink: 'https://youtube.com' };
                        const testHtml = await generateGreetingCupomHTML(mockSale, [], localGreeting);
                        performUnifiedPrint('Teste Saudação', testHtml, selectedPrinter, 'browser', localGreeting, 'download');
                      }}
                      onPrint={async () => {
                        const mockSale: Sale = { id: 'test', sequentialId: '0001', date: Date.now(), total: 0, totalCost: 0, totalProfit: 0, items: [], status: 'pendente', updatedAt: Date.now(), paymentMethod: 'pix', youtubeLink: 'https://youtube.com' };
                        const testHtml = await generateGreetingCupomHTML(mockSale, [], localGreeting);
                        performUnifiedPrint('Teste Saudação', testHtml, selectedPrinter, localGreeting.printMode === 'auto' ? 'auto' : 'browser', localGreeting, 'print');
                      }}
                      company={company}
                      previewContent={null}
                    />
                  </div>
                )}


                {printSubTab === 'lote' && (
                  <div className="space-y-3 animate-in fade-in duration-300">
                    <div className="glass-panel p-4 space-y-3">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <div className="flex items-center gap-2">
                          <Boxes size={12} className="text-orange-400" />
                          <h4 className="text-[9px] font-black text-white tracking-[0.2em] uppercase">Itens no Lote</h4>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">
                            {labelLot.filter(i => i.selected).reduce((acc, curr) => acc + curr.quantity, 0)} Selecionadas
                          </span>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              clearLabelLot();
                            }}
                            disabled={labelLot.length === 0}
                            className="px-2 py-1 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg text-[7px] font-black hover:bg-red-500 hover:text-white transition-all uppercase disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                             Limpar Lote
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                        {labelLot.length === 0 ? (
                          <div className="py-8 text-center space-y-3 bg-white/2 rounded-2xl border-2 border-dashed border-white/5">
                            <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center mx-auto text-white/10">
                              <Boxes size={20} />
                            </div>
                            <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em]">O lote está vazio.<br/>Adicione produtos na aba de Produtos.</p>
                          </div>
                        ) : (
                          labelLot.map((item, idx) => (
                            <div key={item.product.id || idx} className={`group flex items-center justify-between p-3 bg-white/2 rounded-xl border transition-all hover:bg-white/[0.04] ${item.selected ? 'border-blue-500/30 bg-blue-600/5' : 'border-white/5 opacity-60'}`}>
                              <div className="flex items-center gap-3">
                                <button 
                                  onClick={() => updateLabelLotItem(idx, { selected: !item.selected })}
                                  className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${item.selected ? 'bg-blue-600 border-blue-500 text-white' : 'border-white/20 hover:border-white/40'}`}
                                >
                                  {item.selected && <Check size={10} strokeWidth={4} />}
                                </button>
                                <div>
                                  <h5 className="text-[9px] font-black text-white uppercase tracking-tight truncate max-w-[130px]">{item.product.name}</h5>
                                  <p className="text-[7px] font-bold text-white/20 uppercase tracking-widest">R$ {item.product.price.toFixed(2)}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="flex flex-col items-center">
                                  <input 
                                    type="number" 
                                    min="1"
                                    value={item.quantity}
                                    onChange={(e) => updateLabelLotItem(idx, { quantity: parseInt(e.target.value) || 1 })}
                                    className="w-10 bg-zinc-900 border border-white/10 rounded-lg p-1 text-[9px] text-center font-black text-white focus:border-blue-500"
                                  />
                                </div>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeFromLabelLot(idx);
                                  }}
                                  className="p-1.5 rounded-lg bg-white/5 text-white/40 hover:bg-red-500/20 hover:text-red-500 transition-all opacity-100"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {labelLot.length > 0 && (
                        <div className="space-y-4 pt-3 border-t border-white/5">
                          {/* Configurações Rápidas no Lote */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h5 className="text-[8px] font-black text-orange-400 uppercase tracking-widest">Ajustes do Lote</h5>
                              <button 
                                onClick={() => {
                                  setLabelLotConfig(localLabelLot);
                                  salvarDados(STORAGE_KEYS.LABEL_LOT_CONFIG, localLabelLot);
                                }}
                                className="flex items-center gap-1.5 px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[7px] font-black text-zinc-400 hover:bg-orange-600 hover:text-white transition-all uppercase"
                              >
                                <Save size={10} /> Salvar Config
                              </button>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[7px] font-black text-[#64748b] tracking-widest uppercase ml-1">Configuração do Papel</label>
                              <div className="grid grid-cols-6 gap-2">
                                <PaperCard label="A4" sublabel="210x297" isSelected={localLabelLot.sheetType === 'a4'} onClick={() => setLocalLabelLot({...localLabelLot, sheetType: 'a4', paperWidth: 210, paperHeight: 297, width: 50, height: 30, format: 'a4'})} activeColor="orange" />
                                <PaperCard label="A5" sublabel="148x210" isSelected={localLabelLot.sheetType === 'a5'} onClick={() => setLocalLabelLot({...localLabelLot, sheetType: 'a5', paperWidth: 148, paperHeight: 210, width: 50, height: 30, format: 'a5'})} activeColor="orange" />
                                <PaperCard label="A6" sublabel="105x148" isSelected={localLabelLot.sheetType === 'a6'} onClick={() => setLocalLabelLot({...localLabelLot, sheetType: 'a6', paperWidth: 105, paperHeight: 148, width: 50, height: 30, format: 'a6'})} activeColor="orange" />
                                <PaperCard label="58mm" sublabel="Térmico" isSelected={localLabelLot.sheetType === 'thermal' && localLabelLot.paperWidth === 58} onClick={() => setLocalLabelLot({...localLabelLot, sheetType: 'thermal', paperWidth: 58, paperHeight: 0, width: 50, height: 30, format: 'thermal'})} activeColor="orange" />
                                <PaperCard label="80mm" sublabel="Térmico" isSelected={localLabelLot.sheetType === 'thermal' && localLabelLot.paperWidth === 80} onClick={() => setLocalLabelLot({...localLabelLot, sheetType: 'thermal', paperWidth: 80, paperHeight: 0, width: 50, height: 30, format: 'thermal'})} activeColor="orange" />
                                <PaperCard label="Custom" sublabel="Livre" isSelected={localLabelLot.sheetType === 'custom'} onClick={() => setLocalLabelLot({...localLabelLot, sheetType: 'custom', width: 50, height: 30, paperWidth: 50, paperHeight: 30, format: 'custom'})} activeColor="orange" />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-white/2 p-2 rounded-lg border border-white/5">
                              <Checkbox label="Preço" checked={localLabelLot.showPrice} onChange={v => setLocalLabelLot({...localLabelLot, showPrice: v})} compact />
                              <Checkbox label="QR Code" checked={localLabelLot.showQRCode} onChange={v => setLocalLabelLot({...localLabelLot, showQRCode: v})} compact />
                              <Checkbox label="Números" checked={localLabelLot.showCodeNumber} onChange={v => setLocalLabelLot({...localLabelLot, showCodeNumber: v})} compact />
                              <Checkbox label="Corte" checked={localLabelLot.showCutLines} onChange={v => setLocalLabelLot({...localLabelLot, showCutLines: v})} compact />
                            </div>

                            {/* Dimensões e Espaçamento da Etiqueta no Lote */}
                            <div className="grid grid-cols-2 gap-3 pb-2">
                                <Input label="Larg. Etiqueta (mm)" value={localLabelLot.width || 30} onChange={v => setLocalLabelLot({...localLabelLot, width: parseInt(v) || 0})} compact />
                                <Input label="Alt. Etiqueta (mm)" value={localLabelLot.height || 30} onChange={v => setLocalLabelLot({...localLabelLot, height: parseInt(v) || 0})} compact />
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                               <Input label="Margem H (mm)" type="number" value={localLabelLot.marginLeft || 0} onChange={v => setLocalLabelLot({...localLabelLot, marginLeft: parseInt(v) || 0, marginRight: parseInt(v) || 0})} compact />
                               <Input label="Margem V (mm)" type="number" value={localLabelLot.marginTop || 0} onChange={v => setLocalLabelLot({...localLabelLot, marginTop: parseInt(v) || 0, marginBottom: parseInt(v) || 0})} compact />
                               <Input label="Espaç. H (mm)" type="number" value={localLabelLot.hGap || 0} onChange={v => setLocalLabelLot({...localLabelLot, hGap: parseInt(v) || 0})} compact />
                               <Input label="Espaç. V (mm)" type="number" value={localLabelLot.vGap || 0} onChange={v => setLocalLabelLot({...localLabelLot, vGap: parseInt(v) || 0})} compact />
                               <Input label="Padding H (mm)" type="number" value={localLabelLot.paddingLeft || 0} onChange={v => setLocalLabelLot({...localLabelLot, paddingLeft: parseInt(v) || 0, paddingRight: parseInt(v) || 0})} compact />
                               <Input label="Padding V (mm)" type="number" value={localLabelLot.paddingTop || 0} onChange={v => setLocalLabelLot({...localLabelLot, paddingTop: parseInt(v) || 0, paddingBottom: parseInt(v) || 0})} compact />
                            </div>
                          </div>

                          <div className="flex flex-col gap-3 pt-1">
                           <div className="flex gap-2">
                            <button 
                              disabled={labelLot.filter(i => i.selected).length === 0}
                              onClick={() => {
                                generateProgrammaticLabelPDF(
                                  labelLot.filter(i => i.selected),
                                  localLabelLot,
                                  'download'
                                );
                              }}
                              className="flex-1 py-2.5 bg-white/5 text-white border border-white/10 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-1.5 shadow-lg disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                               <FileText size={12} className="text-zinc-500" /> Exportar PDF
                            </button>
                            <button 
                              disabled={labelLot.filter(i => i.selected).length === 0}
                              onClick={() => {
                                const selectedItems = labelLot.filter(i => i.selected);
                                if (localLabelLot.printMode === 'browser') {
                                  generateProgrammaticLabelPDF(
                                    selectedItems,
                                    localLabelLot,
                                    'preview'
                                  );
                                } else {
                                  generateProgrammaticLabelPDF(
                                    selectedItems,
                                    localLabelLot,
                                    'download'
                                  );
                                }
                              }}
                              className="flex-1 py-2.5 bg-orange-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-orange-500 transition-all shadow-lg flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              {getPrintIcon(localLabelLot.printMode, 12)} {getPrintLabel(localLabelLot.printMode, "Imprimir")}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                    </div>
                  </div>
                )}

                {printSubTab === 'etiquetas' && (
                  <div className="space-y-3 animate-in fade-in duration-300">
                    <div className="glass-panel p-4 space-y-3">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <div className="flex items-center gap-2">
                          <Tag size={12} className="text-blue-400" />
                          <h4 className="text-[9px] font-black text-white tracking-[0.2em] uppercase">Configuração de Etiquetas</h4>
                        </div>
                        <button 
                          onClick={() => {
                            setLabelConfig(localLabel);
                            salvarDados(STORAGE_KEYS.LABEL_CONFIG, localLabel);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/10 text-blue-400 border border-blue-500/20 rounded-lg text-[8px] font-black hover:bg-blue-600 hover:text-white transition-all uppercase"
                        >
                          <Save size={10} /> Salvar Config
                        </button>
                      </div>

                      {/* Seção QUANTIDADE E CONTEÚDO */}
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <Input label="Quantidade" type="number" value={localLabel.quantity || 1} onChange={v => setLocalLabel({...localLabel, quantity: parseInt(v) || 1})} compact />
                          <Input label="Parcelas (Opcional)" type="number" placeholder="Ex: 10" value={localLabel.installments || ''} onChange={v => setLocalLabel({...localLabel, installments: parseInt(v) || 0, showInstallments: !!v})} compact />
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 bg-white/5 p-2 rounded-lg border border-white/5">
                          <Checkbox label="Preço" checked={localLabel.showPrice} onChange={v => setLocalLabel({...localLabel, showPrice: v})} compact />
                          <Checkbox label="QR Code" checked={localLabel.showQRCode} onChange={v => setLocalLabel({...localLabel, showQRCode: v})} compact />
                          <Checkbox label="Números" checked={localLabel.showCodeNumber} onChange={v => setLocalLabel({...localLabel, showCodeNumber: v})} compact />
                          <Checkbox label="Kit" checked={localLabel.showKit} onChange={v => setLocalLabel({...localLabel, showKit: v})} compact />
                          <Checkbox label="Parc." checked={localLabel.showInstallments} onChange={v => setLocalLabel({...localLabel, showInstallments: v})} compact />
                          <Checkbox label="Corte" checked={localLabel.showCutLines} onChange={v => setLocalLabel({...localLabel, showCutLines: v})} compact />
                        </div>
                      </div>

                      {/* Seção PAPEL */}
                      <div className="space-y-2 pt-1 border-t border-white/5">
                        <label className="text-[7px] font-black text-[#64748b] tracking-widest uppercase ml-1">Configuração do Papel</label>
                        <div className="grid grid-cols-6 gap-2">
                          <PaperCard label="A4" sublabel="210x297" isSelected={localLabel.sheetType === 'a4'} onClick={() => setLocalLabel({...localLabel, sheetType: 'a4', paperWidth: 210, paperHeight: 297, width: 50, height: 30, format: 'a4'})} />
                          <PaperCard label="A5" sublabel="148x210" isSelected={localLabel.sheetType === 'a5'} onClick={() => setLocalLabel({...localLabel, sheetType: 'a5', paperWidth: 148, paperHeight: 210, width: 50, height: 30, format: 'a5'})} />
                          <PaperCard label="A6" sublabel="105x148" isSelected={localLabel.sheetType === 'a6'} onClick={() => setLocalLabel({...localLabel, sheetType: 'a6', paperWidth: 105, paperHeight: 148, width: 50, height: 30, format: 'a6'})} />
                          <PaperCard label="58mm" sublabel="Térmico" isSelected={localLabel.sheetType === 'thermal' && localLabel.paperWidth === 58} onClick={() => setLocalLabel({...localLabel, sheetType: 'thermal', paperWidth: 58, paperHeight: 0, width: 50, height: 30, format: 'thermal'})} />
                          <PaperCard label="80mm" sublabel="Térmico" isSelected={localLabel.sheetType === 'thermal' && localLabel.paperWidth === 80} onClick={() => setLocalLabel({...localLabel, sheetType: 'thermal', paperWidth: 80, paperHeight: 0, width: 50, height: 30, format: 'thermal'})} />
                          <PaperCard label="Custom" sublabel="Livre" isSelected={localLabel.sheetType === 'custom'} onClick={() => setLocalLabel({...localLabel, sheetType: 'custom', width: 50, height: 30, paperWidth: 50, paperHeight: 30, format: 'custom'})} />
                        </div>

                        {localLabel.sheetType === 'custom' && (
                          <div className="grid grid-cols-2 gap-2 animate-in slide-in-from-top-2 duration-300">
                             <Input label="Larg. Papel (mm)" type="number" value={localLabel.paperWidth || 0} onChange={v => setLocalLabel({...localLabel, paperWidth: parseInt(v) || 0})} compact />
                             <Input label="Alt. Papel (mm)" type="number" value={localLabel.paperHeight || 0} onChange={v => setLocalLabel({...localLabel, paperHeight: parseInt(v) || 0})} compact />
                          </div>
                        )}
                      </div>

                      {/* Seção ETIQUETA */}
                      <div className="space-y-2 pt-1 border-t border-white/5">
                        <div className="grid grid-cols-2 gap-3">
                          <Input label="Larg. Etiqueta (mm)" type="number" value={localLabel.width || 30} onChange={v => setLocalLabel({...localLabel, width: parseInt(v) || 0})} compact />
                          <Input label="Alt. Etiqueta (mm)" type="number" value={localLabel.height || 30} onChange={v => setLocalLabel({...localLabel, height: parseInt(v) || 0})} compact />
                        </div>

                        {/* MARGENS E ESPAÇAMENTO */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                           <Input label="Margem H (mm)" type="number" value={localLabel.marginLeft || 0} onChange={v => setLocalLabel({...localLabel, marginLeft: parseInt(v) || 0, marginRight: parseInt(v) || 0})} compact />
                           <Input label="Margem V (mm)" type="number" value={localLabel.marginTop || 0} onChange={v => setLocalLabel({...localLabel, marginTop: parseInt(v) || 0, marginBottom: parseInt(v) || 0})} compact />
                           <Input label="Espaç. H (mm)" type="number" value={localLabel.hGap || 0} onChange={v => setLocalLabel({...localLabel, hGap: parseInt(v) || 0})} compact />
                           <Input label="Espaç. V (mm)" type="number" value={localLabel.vGap || 0} onChange={v => setLocalLabel({...localLabel, vGap: parseInt(v) || 0})} compact />
                           <Input label="Padding H (mm)" type="number" value={localLabel.paddingLeft || 0} onChange={v => setLocalLabel({...localLabel, paddingLeft: parseInt(v) || 0, paddingRight: parseInt(v) || 0})} compact />
                           <Input label="Padding V (mm)" type="number" value={localLabel.paddingTop || 0} onChange={v => setLocalLabel({...localLabel, paddingTop: parseInt(v) || 0, paddingBottom: parseInt(v) || 0})} compact />
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2 border-t border-white/5">
                        <button className="px-3 py-2.5 bg-zinc-800 text-zinc-400 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-zinc-700 transition-all active:scale-95">
                          Cancelar
                        </button>
                        <button 
                          onClick={() => {
                            generateProgrammaticLabelPDF(
                              [{ product: { name: 'PRODUTO TESTE EXEMPLO', price: 99.90, sku: '789123456789' }, quantity: localLabel.quantity || 1 }],
                              localLabel,
                              'download'
                            );
                          }}
                          className="flex-1 py-2.5 bg-white/5 text-white border border-white/10 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-1.5"
                        >
                           <FileText size={12} className="text-zinc-500" /> Exportar
                        </button>
                        <button 
                          onClick={() => {
                            generateProgrammaticLabelPDF(
                              [{ product: { name: 'PRODUTO TESTE EXEMPLO', price: 99.90, sku: '789123456789' }, quantity: localLabel.quantity || 1 }],
                              localLabel,
                              'print'
                            );
                          }}
                          className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-blue-500 transition-all shadow-lg flex items-center justify-center gap-1.5 active:scale-95"
                        >
                          <Printer size={12} /> Imprimir
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Lado Direito: Prévia Visual */}
              {printSubTab !== 'saudacao' && (
                <div className="sticky top-6 h-fit hidden lg:block overflow-auto max-h-[calc(100vh-4rem)]">
                <div className="bg-zinc-950 rounded-[3rem] p-12 border border-zinc-800 shadow-inner flex flex-col items-center min-h-[400px]">
                  <div className="flex items-center gap-3 mb-10 bg-zinc-900 px-6 py-2.5 rounded-full border border-zinc-800 shadow-sm">
                     <div className="animate-pulse w-2 h-2 rounded-full bg-blue-500" />
                     <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Simulação Visual</span>
                  </div>

                   {(() => {
                    const isEtiqueta = printSubTab === 'etiquetas';
                    const isLote = printSubTab === 'lote';
                    const config = printSubTab === 'pdv' ? localCouponPDV : 
                                  printSubTab === 'cliente' ? localCoupon : 
                                  printSubTab === 'saudacao' ? localGreeting : 
                                  isLote ? localLabelLot :
                                  localLabel;
                    
                    const labelCfg = isLote ? localLabelLot : localLabel;
                    const isThermal = (isEtiqueta || isLote) 
                      ? (labelCfg.sheetType === 'thermal') 
                      : (config.format === '58mm' || config.format === '80mm');

                    const dims = getPaperDimensions(config as any);
                    let w_val = dims.widthMm;
                    let h_val = dims.heightMm === 'auto' ? (isThermal ? 400 : 297) : (dims.heightMm as number);

                    if (isEtiqueta) {
                      w_val = localLabel.paperWidth || 105;
                      h_val = localLabel.paperHeight || (localLabel.sheetType === 'thermal' ? 400 : 148.5);
                    } else if (isLote) {
                      w_val = localLabelLot.paperWidth || 210;
                      h_val = localLabelLot.paperHeight || (localLabelLot.sheetType === 'thermal' ? 400 : 297);
                    }
                    
                    const MAX_PREVIEW_W = (isEtiqueta || isLote) ? 800 : 400; 
                    const MAX_PREVIEW_H = (isEtiqueta || isLote) ? 800 : 600;
                    let scaleValue = 3.78; 
                    
                    if (isThermal) {
                      // For thermal, prioritize width to make it look representative
                      // We want it visible but narrower than A4
                      const targetWidth = (isEtiqueta || isLote) ? 350 : 280;
                      scaleValue = targetWidth / w_val;
                      if (scaleValue > 5) scaleValue = 5;
                    } else {
                      if (w_val * scaleValue > MAX_PREVIEW_W) scaleValue = MAX_PREVIEW_W / w_val;
                      if (h_val * scaleValue > MAX_PREVIEW_H) scaleValue = Math.min(scaleValue, MAX_PREVIEW_H / h_val);
                    }
                    
                    scaleValue = Math.max(scaleValue, 0.5);
                    const scale = scaleValue;
                    
                      const renderEtiquetas = () => {
                        const selectedLot = labelLot.filter(i => i && i.selected);
                        
                        const itemsToDraw: { product: any, quantity: number }[] = 
                          isLote ? selectedLot :
                          [{ product: { name: 'PRODUTO TESTE EXEMPLO', price: 99.90, sku: '123456789' }, quantity: localLabel.quantity || 1 }];
                        
                        const labelsArr = [];
                        let totalCount = 0;
                        
                        if (itemsToDraw.length === 0 && isLote) {
                          return (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-300 opacity-20">
                              <Boxes size={48} className="mb-4" />
                              <p className="text-xs font-black uppercase tracking-widest text-center px-10">
                                Nenhum item selecionado no lote para visualização
                              </p>
                            </div>
                          );
                        }

                        // Cálculo de Escala de Conteúdo
                        // Referência: Etiqueta de 50mm x 30mm
                        const refW = 50;
                        const refH = 30;
                        const labelW = labelCfg.width || 50;
                        const labelH = labelCfg.height || 30;
                        const contentScaleX = labelW / refW;
                        const contentScaleY = labelH / refH;
                        // Usamos a menor escala para garantir que caiba em ambas as dimensões
                        const contentScale = Math.min(contentScaleX, contentScaleY);

                        for (let itemIdx = 0; itemIdx < itemsToDraw.length; itemIdx++) {
                          const item = itemsToDraw[itemIdx];
                          const qty = Number(item.quantity) || 0;
                          
                          for (let i = 0; i < qty; i++) {
                            totalCount++;
                            if (totalCount > 100) break;
                            
                            labelsArr.push(
                              <div key={`label-${itemIdx}-${i}`} 
                                className="bg-white flex-shrink-0 relative overflow-hidden" 
                                style={{ 
                                  width: `${labelW * scale}px`, 
                                  height: `${labelH * scale}px`,
                                  marginRight: `${(labelCfg.hGap || 0) * scale}px`,
                                  marginBottom: `${(labelCfg.vGap || 0) * scale}px`,
                                  padding: `${(labelCfg.paddingTop || 2) * scale}px ${(labelCfg.paddingRight || 2) * scale}px ${(labelCfg.paddingBottom || 2) * scale}px ${(labelCfg.paddingLeft || 2) * scale}px`,
                                  boxSizing: 'border-box',
                                  border: labelCfg.showLabelBorder ? '1px solid #e2e8f0' : (labelCfg.showCutLines || labelCfg.showCutLine ? `1px solid rgba(0,0,0,${(labelCfg.cutLineOpacity || 20) / 100})` : 'none')
                                }}
                              >
                                {labelCfg.showCutLine && (
                                  <>
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1px] h-2 bg-zinc-200" />
                                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[1px] h-2 bg-zinc-200" />
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-[1px] w-2 bg-zinc-200" />
                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 h-[1px] w-2 bg-zinc-200" />
                                  </>
                                )}

                                 <div className="h-full flex flex-col items-center justify-between pointer-events-none text-black py-0.5 overflow-hidden">
                                    {(labelCfg as any).showProductName !== false && item.product.name && (
                                      <p className="font-bold text-center leading-tight uppercase w-full break-words line-clamp-2" 
                                         style={{ 
                                           fontSize: `${Math.max(6.5 * contentScale * (scale / 3.78), 4)}px`,
                                           maxHeight: `${7 * contentScale * 2.5 * (scale / 3.78)}px` 
                                         }}>
                                        {item.product.name}
                                      </p>
                                    )}
                                    
                                    <div className="flex flex-col items-center justify-center w-full gap-0">
                                       {labelCfg.showPrice && item.product.price >= 0 && (
                                         <p className="font-black text-center leading-none" style={{ fontSize: `${Math.max(11 * contentScale * (scale/3.78), 7)}px` }}>
                                           R$ {(Number(item.product.price) || 0).toFixed(2)}
                                         </p>
                                       )}
                                       {(labelCfg as any).showInstallments && (Number((labelCfg as any).installments) || 0) > 1 && (
                                         <p className="font-bold text-center mt-0.5" style={{ fontSize: `${Math.max(5.5 * contentScale * (scale/3.78), 3.5)}px` }}>
                                           {(labelCfg as any).installments}x R$ {((Number(item.product.price) || 0) / Number((labelCfg as any).installments)).toFixed(2)}
                                         </p>
                                       )}
                                    </div>

                                    {labelCfg.showQRCode ? (
                                      <div className="w-full flex-grow flex flex-col items-center justify-center mt-auto min-h-0">
                                         <div className="flex-shrink-0" style={{ transform: `scale(${Math.max(0.7, contentScale)})`, transformOrigin: 'center center' }}>
                                            <QRCodePreview 
                                              value={item.product.sku || item.product.id || '123456789'} 
                                              design={(labelCfg as any).qrCodeDesign || INITIAL_QR_DESIGN} 
                                              size={Math.max(38 * (scale/3.78), 24)} 
                                            />
                                         </div>
                                         {labelCfg.showCodeNumber && (
                                           <p className="font-mono text-center mt-0.5 tracking-tight" style={{ fontSize: `${Math.max(5.5 * contentScale * (scale/3.78), 3.5)}px` }}>
                                             {item.product.sku || item.product.id}
                                           </p>
                                         )}
                                      </div>
                                    ) : labelCfg.showBarcode ? (
                                      <div className="w-full flex flex-col items-center mt-auto opacity-30">
                                        <div className="w-4/5 h-4 bg-zinc-400" />
                                        <p className="text-[5px]">BARCODE</p>
                                      </div>
                                    ) : null}

                                    {labelCfg.showKit && (
                                      <div className="border border-black px-1.5 py-0.5 mt-0.5" style={{ borderWidth: `${0.3 * (scale/3.78)}px` }}>
                                        <p className="font-black text-center uppercase" style={{ fontSize: `${Math.max(5 * contentScale * (scale/3.78), 3)}px` }}>KIT</p>
                                      </div>
                                    )}

                                    {labelCfg.showDate && item.product.observation && (
                                      <p className="text-center font-bold opacity-50 w-full truncate px-1 mt-0.5" style={{ fontSize: `${Math.max(4 * contentScale * (scale/3.78), 2.5)}px` }}>
                                        {item.product.observation}
                                      </p>
                                    )}

                                    {labelCfg.showPrintDate && (
                                      <p className="text-[4px] opacity-30 mt-auto" style={{ fontSize: `${Math.max(4 * (scale/3.78), 2.5)}px` }}>
                                        {new Date().toLocaleDateString('pt-BR')}
                                      </p>
                                    )}
                                 </div>
                              </div>
                            );
                          }
                          if (totalCount > 100) break;
                        }
                        return labelsArr;
                      };
                    
                      const paperMargins = {
                        marginTop: (labelCfg.marginTop || 0),
                        marginRight: (labelCfg.marginRight || 0),
                        marginBottom: (labelCfg.marginBottom || 0),
                        marginLeft: (labelCfg.marginLeft || 0),
                        hGap: (labelCfg.hGap || 0)
                      };

                      const availWidthSim = w_val - paperMargins.marginLeft - paperMargins.marginRight;
                      const labelsPerRowSim = Math.max(1, Math.floor((availWidthSim + paperMargins.hGap) / ((labelCfg.width || 50) + paperMargins.hGap)));
                      const totalRowWidthSim = (labelsPerRowSim * (labelCfg.width || 50)) + ((labelsPerRowSim - 1) * paperMargins.hGap);
                      
                      // Só centralizamos horizontalmente se for folha (A4/A6 ou Custom com dimensões de folha)
                      const centeringOffsetSim = (labelCfg.sheetType !== 'thermal' && w_val > 100) ? (availWidthSim - totalRowWidthSim) / 2 : 0;

                    return (
                      <div 
                        style={{ 
                          width: `${w_val * scale}px`, 
                          height: isThermal ? 'auto' : `${h_val * scale}px`,
                          minHeight: isThermal ? '500px' : (isEtiqueta || isLote) ? '100px' : '400px'
                        }}
                        className="bg-white rounded-sm shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] relative overflow-hidden transition-all duration-500 border border-zinc-200"
                      >
                         {/* Conteúdo Simulado */}
                         {!(isEtiqueta || isLote) ? (
                           <div className="text-black font-sans select-none h-full" style={{ zoom: scale / 3.78, padding: config.format === 'a4' ? '10mm' : config.format === 'a5' ? '8mm' : config.format === 'a6' ? '4mm' : '5mm' }}>
                            {printSubTab === 'pdv' && (
                              <div className="w-full flex-1 flex flex-col items-center p-4 min-h-[400px]">
                                <h1 className="text-black text-2xl font-black tracking-tighter text-center uppercase">
                                  {localCouponPDV.headerMessage || 'Pedido Criado'}
                                </h1>
                                <div className="w-8 h-1 bg-[#16d45f] rounded-full my-4"></div>
                                <div className="bg-[#16d45f]/10 text-[#16d45f] px-4 py-1.5 rounded-full font-black text-[8px] tracking-widest border border-[#16d45f]/20 uppercase mb-8">
                                  OPERAÇÃO FINALIZADA
                                </div>

                                <div className="w-full bg-white rounded-3xl p-8 flex flex-col items-center border border-zinc-100 shadow-2xl text-black">
                                  <span className="text-[#888] text-[8px] font-black tracking-widest uppercase mb-1">
                                    NÚMERO DO PEDIDO
                                  </span>
                                  <h2 className="text-3xl font-black leading-none mb-6">
                                    #9999
                                  </h2>
                                  
                                  <div className="w-full h-px bg-zinc-100 mb-6"></div>
                                  
                                  {localCouponPDV.showQrCode && (
                                    <div className="w-28 h-28 bg-zinc-50 rounded-2xl flex items-center justify-center border border-zinc-100 mb-8">
                                      <QrCode size={40} className="text-zinc-200" />
                                    </div>
                                  )}

                                  <div className="w-full space-y-5">
                                    {localCouponPDV.showDateTime && (
                                      <>
                                        <div className="flex items-center gap-4">
                                          <div className="w-10 h-10 rounded-2xl bg-[#16d45f]/10 text-[#16d45f] flex items-center justify-center">
                                            <Calendar size={18} />
                                          </div>
                                          <div className="min-w-0">
                                            <span className="text-[#8b8b8b] text-[8px] font-bold uppercase block tracking-wider leading-none mb-1">FINALIZADO EM</span>
                                            <p className="text-[12px] font-black text-black">
                                              10/05/2026 22:50
                                            </p>
                                          </div>
                                        </div>
                                        <div className="w-full h-px bg-zinc-100"></div>
                                      </>
                                    )}

                                    {localCouponPDV.showSoldBy && (
                                      <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-2xl bg-[#16d45f]/10 text-[#16d45f] flex items-center justify-center">
                                          <User size={18} />
                                        </div>
                                        <div className="min-w-0">
                                          <span className="text-[#8b8b8b] text-[8px] font-bold uppercase block tracking-wider leading-none mb-1">VENDEDOR</span>
                                          <p className="text-[12px] font-black text-black">
                                            OPERADOR TESTE
                                          </p>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                            {printSubTab === 'cliente' && (
                              <div className="p-4 space-y-6">
                                 <div className="text-center border-b border-black pb-6 flex flex-col items-center">
                                    {localCoupon.showLogo && company.logo && (
                                      <img src={company.logo} className="h-12 object-contain mb-3" alt="Logo" />
                                    )}
                                    {localCoupon.showCompanyName && (
                                      <h3 className="font-extrabold uppercase text-xl leading-tight text-black">{company.tradeName || company.name || 'Sua Empresa'}</h3>
                                    )}
                                    {localCoupon.showAddress && (
                                      <div className="text-[9px] uppercase font-bold text-zinc-600 mt-2 leading-relaxed">
                                        {company.address.logradouro}, {company.address.numero} - {company.address.bairro}<br />
                                        {company.address.cidade}/{company.address.estado}
                                      </div>
                                    )}
                                    <p className="text-[10px] uppercase font-bold tracking-tight mt-4 text-black">{localCoupon.headerMessage}</p>
                                 </div>
                                 <div className="space-y-3 py-4">
                                    <div className="flex justify-between text-xs font-black text-black uppercase"><span>ITEM EXEMPLO 1</span> <span>R$ 50,00</span></div>
                                    <div className="flex justify-between text-xs font-black text-black uppercase"><span>ITEM EXEMPLO 2</span> <span>R$ 50,00</span></div>
                                 </div>
                                 {localCoupon.showFinalTotal && (
                                   <div className="text-right font-black text-2xl pt-4 border-t-2 border-black text-black">
                                     TOTAL: R$ 100,00
                                   </div>
                                 )}
                                 <div className="text-center pt-8 border-t border-dashed border-zinc-300">
                                    <p className="text-[11px] font-bold text-black italic mb-6">{localCoupon.footerMessage}</p>
                                    <div className="w-20 h-20 bg-zinc-50 border border-zinc-100 mx-auto rounded-2xl flex items-center justify-center">
                                       <QrCode size={24} className="text-zinc-200" />
                                    </div>
                                 </div>
                              </div>
                            )}
                            {printSubTab === 'saudacao' && (
                               <div className="w-full h-full flex items-center justify-center bg-zinc-950 p-10 overflow-hidden relative min-h-[500px]">
                                 <div style={{ transform: `scale(${scale * 0.7})`, transformOrigin: 'center' }}>
                                   <UnifiedCouponRenderer 
                                     config={localGreeting}
                                     company={company}
                                     scale={1}
                                   />
                                 </div>
                               </div>
                            )}
                          </div>
                         ) : (
                           <div 
                             className="flex flex-row flex-wrap justify-start items-start content-start overflow-hidden"
                             style={{ 
                               width: '100%',
                               height: isThermal ? 'auto' : '100%',
                               paddingTop: `${paperMargins.marginTop * scale}px`,
                               paddingRight: `${paperMargins.marginRight * scale}px`,
                               paddingBottom: `${paperMargins.marginBottom * scale}px`,
                               paddingLeft: `${(paperMargins.marginLeft + centeringOffsetSim) * scale}px`,
                               boxSizing: 'border-box'
                             }}
                           >
                              {renderEtiquetas()}
                           </div>
                         )}
                         
                         <div className="absolute inset-x-0 -bottom-8 pointer-events-none flex justify-center">
                            <div className="bg-zinc-800 text-[8px] text-zinc-400 px-3 py-1 rounded-full font-black uppercase tracking-widest border border-white/5">
                               <Maximize2 size={8} /> {w_val}mm x {localLabel.sheetType === 'thermal' && (printSubTab === 'etiquetas') ? 'AUTO' : `${h_val}mm`}
                            </div>
                         </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
            </div>
          </div>
        )}

        {activeTab === 'seguranca' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Nav Sub-Abas Horizontal */}
            <div className="flex items-center gap-2 p-2 bg-white/5 rounded-[2.5rem] border border-white/10 w-fit">
              {[
                { id: 'usuarios', label: 'Usuários', icon: <Users size={14} /> },
                { id: 'funcoes', label: 'Funções', icon: <ShieldCheck size={14} /> },
                { id: 'permissoes', label: 'Permissões (Função)', icon: <Lock size={14} /> },
                { id: 'historico', label: 'Histórico de Acesso', icon: <History size={14} /> },
                { id: 'reset', label: 'Limpar Dados', icon: <Trash2 size={14} /> },
              ].map(sub => (
                <button
                  key={sub.id}
                  onClick={() => setSecuritySubTab(sub.id as any)}
                  className={`px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 ${
                    securitySubTab === sub.id 
                      ? 'bg-blue-600 text-white shadow-lg' 
                      : 'text-white/40 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {sub.icon}
                  {sub.label}
                </button>
              ))}
            </div>

            {/* Conteúdo das Sub-Abas */}
            <div className="min-h-[500px]">
              {securitySubTab === 'usuarios' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                  {/* Header Seção Usuários */}
                  <div className="flex items-end justify-between">
                    <div>
                      <h4 className="text-[13px] font-black text-white tracking-[0.2em] uppercase leading-none">Controle de Usuários</h4>
                      <p className="text-[10px] text-white/30 font-bold uppercase tracking-tight mt-2">Master Database of Operators</p>
                    </div>
                    <button 
                      onClick={() => setShowNewUserForm(!showNewUserForm)}
                      className="bg-[#0f172a] text-white px-8 py-4 rounded-2xl border border-white/10 text-[11px] font-black uppercase tracking-widest flex items-center gap-4 hover:bg-blue-600 transition-all shadow-2xl group"
                    >
                      <Plus size={18} className="group-hover:rotate-90 transition-transform" /> Novo Usuário
                    </button>
                  </div>

                  {/* Filtro Ativo/Inativo */}
                  <div className="flex items-center gap-2 p-1.5 bg-white/5 rounded-2xl border border-white/10 w-fit">
                    <button 
                      onClick={() => setUserTab('ativos')}
                      className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                        userTab === 'ativos' 
                          ? 'bg-emerald-600/20 text-emerald-500 border border-emerald-500/30 shadow-lg' 
                          : 'text-white/30 hover:text-white hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <CheckCircle size={12} /> Ativos
                    </button>
                    <button 
                      onClick={() => setUserTab('inativos')}
                      className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                        userTab === 'inativos' 
                          ? 'bg-red-600/20 text-red-500 border border-red-600/30 shadow-lg' 
                          : 'text-white/30 hover:text-white hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <AlertCircle size={12} /> Inativos
                    </button>
                  </div>

                  {/* Formulário Novo Usuário (Condicional) */}
                  <AnimatePresence>
                    {showNewUserForm && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 bg-white/5 rounded-[2rem] p-8 border border-white/10 mb-8">
                          <Input dark label="NOME COMPLETO" value={newUser.name} onChange={v => setNewUser({...newUser, name: v})} placeholder="Ex: João Silva" />
                          <Input dark label="LOGIN DE ACESSO" value={newUser.username} onChange={v => setNewUser({...newUser, username: v})} placeholder="Ex: joao.vendas" />
                          <Input dark label="SENHA" value={newUser.password} onChange={v => setNewUser({...newUser, password: v})} type="password" placeholder="****" />
                          <div className="space-y-2 flex flex-col">
                            <label className="text-[9px] font-black text-white/40 tracking-widest uppercase ml-1 block">Função / Cargo</label>
                            <select 
                              value={newUser.roleId ?? ''} 
                              onChange={e => setNewUser({...newUser, roleId: e.target.value})}
                              className="w-full p-4 bg-[#1a2744] rounded-xl border border-white/10 outline-none focus:ring-4 focus:ring-blue-500/20 text-xs font-black transition-all uppercase text-white shadow-lg"
                            >
                              <option value="">Sem Função</option>
                              {localRoles.map(r => (
                                <option key={r.id} value={r.id}>{r.name}</option>
                              ))}
                            </select>
                          </div>
                          <button 
                            onClick={async () => {
                              await addUser();
                              setShowNewUserForm(false);
                            }}
                            className="md:col-span-2 lg:col-span-4 glass-button-primary p-5 text-[11px] font-black"
                          >
                            <UserPlus size={18} /> Salvar Cadastro
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Tabela de Usuários Estilo Imagem de Referência */}
                  <div className="glass-panel overflow-hidden border-white/5 rounded-[2.5rem]">
                    <div className="p-8 pb-4 grid grid-cols-5 text-[10px] font-black text-white/20 uppercase tracking-[0.2em] px-12 border-b border-white/5">
                      <div className="col-span-1">Operador</div>
                      <div className="col-span-1 ml-10">Login</div>
                      <div className="col-span-1 text-center">Função</div>
                      <div className="col-span-1 text-center">Status</div>
                      <div className="col-span-1 text-right pr-20">Último Acesso</div>
                    </div>

                    <div className="p-4 space-y-3">
                      {users.filter(u => userTab === 'ativos' ? u.isActive !== false : u.isActive === false).map(u => {
                        const role = localRoles.find(r => r.id === u.roleId);
                        return (
                          <div key={u.id} className="grid grid-cols-5 items-center p-6 px-8 bg-white/5 border border-white/10 rounded-[1.8rem] hover:bg-white/10 transition-all group">
                            <div className="col-span-1 flex items-center gap-5">
                              <div className={`w-12 h-12 ${u.isActive === false ? 'bg-zinc-800' : 'bg-black'} rounded-2xl flex items-center justify-center font-black text-lg text-white`}>
                                {u.name.charAt(0)}
                              </div>
                              <div>
                                <p className={`text-xs font-black ${u.isActive === false ? 'text-white/40' : 'text-white'} uppercase tracking-tight`}>{u.name}</p>
                                <p className="text-[8px] font-bold text-white/20 uppercase tracking-tighter mt-1">{u.username}@empresa.com</p>
                              </div>
                            </div>

                            <div className="col-span-1 ml-10">
                               <p className="text-[10px] font-black text-white/40 italic uppercase">{u.username}.admin</p>
                            </div>

                            <div className="col-span-1 flex justify-center">
                               <span className={`px-4 py-1.5 ${u.isActive === false ? 'bg-white/5 text-white/20 border-white/5' : 'bg-blue-600/5 text-blue-400 border-blue-500/10'} border rounded-full text-[8px] font-black uppercase tracking-widest`}>
                                  {role?.name || 'OPERADOR'}
                               </span>
                            </div>

                            <div className="col-span-1 flex justify-center">
                               <span className={`px-3 py-1 ${u.isActive === false ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'} border rounded-full text-[7px] font-black uppercase tracking-widest`}>
                                  {u.isActive === false ? 'INATIVO' : 'ATIVO'}
                               </span>
                            </div>

                            <div className="col-span-1 flex items-center justify-end gap-3">
                               <div className="text-right mr-7">
                                  <p className="text-[10px] font-black text-white/30 uppercase italic leading-none mb-1">
                                    {new Date().toLocaleDateString('pt-BR')} 10:30
                                  </p>
                                  {u.deactivatedAt && (
                                    <p className="text-[7px] font-black text-red-500/40 uppercase tracking-widest leading-none">
                                      Inativo desde {new Date(u.deactivatedAt).toLocaleDateString('pt-BR')}
                                    </p>
                                  )}
                               </div>
                               {(() => {
                                 const isRoot = isUserAdmin(currentUser);
                                 const isUserGerente = currentUser?.roleId === 'role-gerente' && !isRoot;
                                 
                                 const targetIsRoot = isUserAdmin(u);
                                 const targetIsGerente = u.roleId === 'role-gerente' && !targetIsRoot;
                                 
                                 const canManage = isRoot || (isUserGerente && !targetIsRoot && !targetIsGerente);
                                 
                                 return (
                                   <div className="flex items-center gap-2">
                                     {canManage && (
                                       <button 
                                         onClick={() => {
                                           setResettingUser(u);
                                           setShowResetModal(true);
                                         }}
                                         className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                                         title="Redefinir Senha"
                                       >
                                          <RotateCcw size={16} />
                                       </button>
                                     )}
                                     
                                     {canManage && (
                                       <button 
                                         onClick={() => {
                                            setEditingRoleUser(u);
                                            setSelectedEditRoleId(u.roleId || '');
                                            setShowRoleEditModal(true);
                                         }}
                                         className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 text-blue-400 border border-blue-500/20 hover:bg-blue-600 hover:text-white hover:border-blue-500/50 transition-all opacity-0 group-hover:opacity-100"
                                         title="Editar Função"
                                       >
                                          <Edit3 size={16} />
                                       </button>
                                     )}

                                     {canManage && !targetIsRoot && (
                                       <button 
                                         onClick={() => {
                                            setDeactivatingUser(u);
                                            setShowDeactivateModal(true);
                                         }}
                                         className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 text-red-500 border border-red-500/20 hover:bg-red-600 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                                         title={u.isActive === false ? "Reativar Usuário" : "Desativar Usuário"}
                                       >
                                          <UserX size={16} />
                                       </button>
                                     )}
                                   </div>
                                 );
                               })()}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {securitySubTab === 'funcoes' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {localRoles.map(role => (
                      <div key={role.id} className="p-6 glass-panel flex items-center justify-between group hover:border-blue-500/30 transition-all">
                        <div className="flex items-center gap-4">
                           <div className={`w-12 h-12 ${role.id === 'role-gerente' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-white/5 text-white/40 border-white/10'} rounded-2xl flex items-center justify-center group-hover:bg-blue-600/20 group-hover:text-blue-400 transition-all border`}>
                              <ShieldCheck size={20} />
                           </div>
                           <div>
                              <h5 className="text-[11px] font-black text-white uppercase tracking-tight">{role.name}</h5>
                              <div className="flex items-center gap-2 mt-1">
                                <Users size={10} className="text-white/20" />
                                <p className="text-[8px] font-bold text-white/20 uppercase tracking-widest leading-none">
                                  {users.filter(u => u.roleId === role.id && u.isActive !== false).length} usuários ativos
                                </p>
                              </div>
                           </div>
                        </div>
                        <div className="flex items-center gap-2">
                           <button 
                             onClick={() => {
                               setSelectedPermissionRoleId(role.id);
                               setSecuritySubTab('permissoes');
                             }}
                            className="p-3 rounded-xl bg-white/5 text-white/20 hover:bg-blue-500/20 hover:text-blue-400 transition-all"
                            title="Configurar Permissões"
                           >
                              <Settings size={16} />
                           </button>
                           {!role.isDefault && (
                             <button 
                               onClick={() => {
                                 setRoleToDeleteId(role.id);
                                 setShowDeleteRolePasswordModal(true);
                               }}
                               className="p-3 rounded-xl bg-white/5 text-white/20 hover:bg-red-500/20 hover:text-red-500 transition-all"
                             >
                                <Trash2 size={16} />
                             </button>
                           )}
                        </div>
                      </div>
                    ))}
                    
                    <div className="p-6 border-2 border-dashed border-white/10 rounded-[2rem] flex items-center gap-3 group focus-within:border-blue-500/50 transition-all bg-white/2">
                       <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-white/20 group-focus-within:text-blue-400 border border-white/5">
                          <Plus size={18} />
                       </div>
                       <input 
                          type="text"
                          placeholder="NOME DA NOVA FUNÇÃO..."
                          value={newRole.name}
                          onChange={(e) => setNewRole({ name: e.target.value.toUpperCase() })}
                          onKeyDown={(e) => e.key === 'Enter' && addRole()}
                          className="bg-transparent border-none outline-none text-[10px] font-black uppercase tracking-widest text-white placeholder:text-white/10 flex-1 h-full min-h-[40px]"
                       />
                       {newRole.name.trim() && (
                         <button 
                           onClick={addRole}
                           className="p-3 rounded-xl bg-blue-600 shadow-lg shadow-blue-600/20 text-white hover:bg-blue-500 transition-all animate-in fade-in scale-in"
                         >
                            <Check size={16} />
                         </button>
                       )}
                    </div>
                  </div>
                </div>
              )}

              {securitySubTab === 'permissoes' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                  {/* Header com Seletor */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-6">
                     <div>
                        <h4 className="text-sm font-black text-white uppercase tracking-tight">Configurar Permissões da Função</h4>
                        <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mt-1">Defina o acesso padrão para todos os usuários desta categoria</p>
                     </div>
                     <div className="relative min-w-[200px]">
                        <select 
                           value={selectedPermissionRoleId}
                           onChange={(e) => setSelectedPermissionRoleId(e.target.value)}
                           className="w-full bg-[#0f172a] border border-white/10 rounded-xl px-4 py-3 text-[10px] font-black text-white uppercase appearance-none focus:border-blue-500/50 outline-none transition-all cursor-pointer"
                        >
                           {localRoles.map(role => (
                              <option key={role.id} value={role.id}>{role.name}</option>
                           ))}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" size={14} />
                     </div>
                  </div>

                  {/* Grid de Módulos */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto max-h-[800px] pr-2 custom-scrollbar">
                     {(Object.keys(modulesLables) as Array<keyof ModulePermissions>).map(module => {
                        const role = localRoles.find(r => r.id === selectedPermissionRoleId);
                        if (!role) return null;
                        const perms = role.permissions[module] || { ...DEFAULT_ACTIONS };
                        
                        return (
                           <div key={module} className="glass-panel overflow-hidden border-white/5 hover:border-white/10 transition-all flex flex-col group">
                              <div className="p-4 border-b border-white/5 bg-white/2 flex items-center justify-between group-hover:bg-blue-600/5 transition-colors">
                                 <span className="text-[11px] font-black text-white uppercase tracking-tight">{modulesLables[module]}</span>
                                 <span className="text-[8px] font-bold text-white/10 uppercase tracking-widest">Módulo #{module}</span>
                              </div>
                              <div className="p-6 grid grid-cols-2 gap-y-6 gap-x-4">
                                 {[
                                    { id: 'view', label: 'Visualizar' },
                                    { id: 'create', label: 'Criar' },
                                    { id: 'edit', label: 'Editar' },
                                    { id: 'delete', label: 'Excluir' },
                                    { id: 'adjust', label: 'Ajuste' },
                                    { id: 'print', label: 'Imprimir' }
                                 ].map(action => (
                                    <div key={action.id} className="flex items-center justify-between group/action">
                                       <span className="text-[9px] font-black text-white/40 uppercase group-hover/action:text-white transition-colors">{action.label}</span>
                                       <button 
                                          onClick={() => togglePermissionAction(selectedPermissionRoleId, module, action.id as keyof ModuleActions)}
                                          className={`w-10 h-5 rounded-full relative transition-all duration-300 ${perms[action.id as keyof ModuleActions] ? 'bg-blue-600' : 'bg-white/10'}`}
                                       >
                                          <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all duration-300 ${perms[action.id as keyof ModuleActions] ? 'left-6 shadow-lg shadow-white/20' : 'left-1 opacity-40'}`} />
                                       </button>
                                    </div>
                                 ))}
                              </div>
                           </div>
                        );
                     })}
                  </div>

                  {/* Botão Salvar Removido - Usar Salvar Global na Barra Lateral */}
                </div>
              )}

              {securitySubTab === 'historico' && (
                <div className="glass-panel overflow-hidden border-white/5 animate-in fade-in slide-in-from-bottom-4">
                   <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                      <table className="w-full text-left">
                        <thead className="sticky top-0 bg-[#0f172a] border-b border-white/10">
                          <tr>
                            <th className="p-6 px-10 text-[9px] font-black text-white/20 uppercase tracking-widest">Operação</th>
                            <th className="p-6 text-[9px] font-black text-white/20 uppercase tracking-widest">Detalhes</th>
                            <th className="p-6 text-right px-10 text-[9px] font-black text-white/20 uppercase tracking-widest">Data</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                           {activities.filter(a => a.type === 'security').reverse().map(act => (
                             <tr key={act.id} className="hover:bg-white/5 transition-colors">
                               <td className="p-6 px-10">
                                  <span className="px-3 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-full text-[8px] font-black uppercase tracking-widest">
                                     {act.action}
                                  </span>
                               </td>
                               <td className="p-6 text-[11px] font-bold text-white/60 uppercase">{act.details}</td>
                               <td className="p-6 text-right px-10 text-[10px] font-black text-white/20 uppercase italic">
                                  {new Date(act.timestamp).toLocaleString()}
                               </td>
                             </tr>
                           ))}
                        </tbody>
                      </table>
                   </div>
                </div>
              )}

              {securitySubTab === 'reset' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                  <div className="glass-panel p-10 border-red-500/20 bg-red-500/5">
                    <div className="flex flex-col items-center text-center space-y-6 max-w-2xl mx-auto">
                      <div className="w-24 h-24 bg-red-600/20 text-red-500 rounded-3xl border border-red-500/30 flex items-center justify-center shadow-2xl animate-pulse">
                        <AlertTriangle size={48} />
                      </div>
                      <div className="space-y-3">
                        <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Zona de Perigo: Limpar Dados de Teste</h3>
                        <p className="text-[11px] text-white/60 font-medium leading-relaxed uppercase tracking-widest">
                          Esta ação irá remover permanentemente todos os registros de teste criados durante o desenvolvimento. 
                          O sistema retornará ao estado original, pronto para uso em produção.
                        </p>
                      </div>

                      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                        <div className="p-6 bg-black/40 rounded-2xl border border-white/5 space-y-3">
                          <p className="text-[9px] font-black text-red-400 uppercase tracking-widest">Serão Excluídos:</p>
                          <ul className="space-y-1.5">
                            {['Clientes e Fornecedores', 'Produtos e Receitas', 'Vendas e Pedidos', 'Financeiro e Caixa', 'Histórico de Atividades', 'Movimentações de Estoque', 'Imagens de Produtos', 'Usuários de Teste (exceto ADM)'].map((item, idx) => (
                              <li key={idx} className="flex items-center gap-2 text-[10px] font-bold text-white/40 uppercase">
                                <div className="w-1 h-1 bg-red-500 rounded-full" /> {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="p-6 bg-black/40 rounded-2xl border border-white/5 space-y-3">
                          <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Serão Preservados:</p>
                          <ul className="space-y-1.5">
                            {['Estrutura do Sistema', 'Código e Componentes', 'Configurações de Impressão', 'Configurações da Empresa', 'Funções e Permissões', 'Usuário Administrador principal', 'Logotipo e Identidade'].map((item, idx) => (
                              <li key={idx} className="flex items-center gap-2 text-[10px] font-bold text-white/40 uppercase">
                                <div className="w-1 h-1 bg-emerald-500 rounded-full" /> {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="pt-6 w-full flex flex-col items-center gap-4">
                        <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl w-full">
                          <ShieldCheck size={20} className="text-amber-500 shrink-0" />
                          <p className="text-[10px] text-amber-500/80 font-black uppercase leading-tight italic">
                            PROTEÇÃO AUTOMÁTICA: O sistema gerará um backup completo antes de prosseguir com a limpeza.
                          </p>
                        </div>
                        
                        <button 
                          onClick={() => setShowResetSystemModal(true)}
                          className="w-full py-6 bg-red-600 hover:bg-red-700 text-white rounded-[2rem] text-xs font-black uppercase tracking-[0.2em] shadow-2xl shadow-red-600/30 transition-all active:scale-95 flex items-center justify-center gap-4"
                        >
                          <Trash2 size={20} /> Resetar Todo o Sistema
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

             {/* Modais fixos da Gestão de Segurança */}
            <AnimatePresence>
              {showResetSystemModal && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[200] flex items-center justify-center p-4">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 40 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 40 }}
                    className="glass-panel w-full max-w-xl p-12 border-red-500/30 bg-black relative"
                  >
                    <div className="flex flex-col items-center text-center space-y-6">
                      <div className="w-24 h-24 bg-red-600/20 text-red-500 rounded-[2rem] border border-red-500/30 flex items-center justify-center shadow-3xl mb-2">
                        <Lock size={48} />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-3xl font-black text-white uppercase tracking-tighter">Confirmação de Segurança</h3>
                        <p className="text-[10px] text-white/40 font-black uppercase tracking-[0.3em]">Ambiente Restrito / Acesso Administrador</p>
                      </div>
                      
                      <div className="w-full p-6 bg-white/5 rounded-3xl border border-white/10 space-y-6">
                        <p className="text-[11px] text-white font-bold leading-relaxed uppercase">
                          Para confirmar o reset completo do sistema, digite a senha atual do administrador para confirmar a limpeza dos dados. 
                          Esta ação criará um arquivo de backup (.json) no seu computador antes de limpar o banco de dados.
                        </p>
                        <Input dark
                          label="SENHA DO ADMINISTRADOR" 
                          type="password"
                          value={adminPasswordInput} 
                          onChange={setAdminPasswordInput} 
                          placeholder="••••••••" 
                          autoFocus
                          onKeyDown={(e: any) => e.key === 'Enter' && confirmSystemReset()}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-6 w-full mt-4">
                        <button 
                          onClick={() => {
                            setShowResetSystemModal(false);
                            setAdminPasswordInput('');
                          }}
                          className="py-5 bg-white/5 text-white/40 border border-white/10 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                        >
                          Cancelar Operação
                        </button>
                        <button 
                          onClick={confirmSystemReset}
                          className="py-5 bg-red-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-red-600/40 hover:bg-red-500 transition-all"
                        >
                          Confirmar e Resetar
                        </button>
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}
              {showResetModal && resettingUser && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="glass-panel w-full max-w-md p-10 relative overflow-hidden"
                  >
                     <div className="flex flex-col items-center text-center space-y-4 mb-8">
                        <div className="w-20 h-20 bg-blue-600/20 text-blue-400 rounded-3xl border border-blue-500/20 flex items-center justify-center shadow-2xl mb-2">
                          <Lock size={40} />
                        </div>
                        <h3 className="text-2xl font-black text-white uppercase tracking-tight">Redefinir Senha</h3>
                        <p className="text-[10px] text-white/40 font-black uppercase tracking-[0.2em]">Usuário: {resettingUser.name}</p>
                     </div>

                     <div className="space-y-6">
                        <Input dark
                          label="NOVA SENHA" 
                          type="password"
                          value={newPassword} 
                          onChange={setNewPassword} 
                          placeholder="Mínimo 6 caracteres" 
                        />
                        <Input dark
                          label="CONFIRMAR NOVA SENHA" 
                          type="password"
                          value={confirmPassword} 
                          onChange={setConfirmPassword} 
                          placeholder="Digite novamente" 
                        />
                     </div>

                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-10">
                        <button 
                          onClick={() => {
                            setShowResetModal(false);
                            setResettingUser(null);
                            setNewPassword('');
                            setConfirmPassword('');
                          }}
                          className="p-5 rounded-[1.5rem] bg-white/5 text-white text-[11px] font-black uppercase tracking-widest border border-white/10 hover:bg-white/10 transition-all flex items-center justify-center shadow-lg"
                        >
                          Cancelar
                        </button>
                        <button 
                          onClick={() => {
                            if (newPassword !== confirmPassword) {
                              alert('As senhas não coincidem!');
                              return;
                            }
                            if (newPassword.length < 4) {
                              alert('Senha muito curta!');
                              return;
                            }
                            setUsers(users.map(u => u.id === resettingUser.id ? { ...u, password: secureHash(newPassword) } : u));
                            addActivity('security', 'Senha Redefinida', `Senha do usuário ${resettingUser.name} foi redefinida manualmente.`);
                            alert('Senha redefinida com sucesso');
                            setShowResetModal(false);
                            setResettingUser(null);
                            setNewPassword('');
                            setConfirmPassword('');
                          }}
                          className="p-5 rounded-[1.5rem] bg-blue-600 text-white text-[11px] font-black uppercase tracking-widest shadow-xl hover:bg-blue-700 transition-all flex items-center justify-center active:scale-95"
                        >
                          Salvar Nova Senha
                        </button>
                     </div>
                  </motion.div>
                </div>
              )}

              {showDeleteRolePasswordModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[110] flex items-center justify-center p-4">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="glass-panel w-full max-w-sm p-10 relative overflow-hidden"
                  >
                     <div className="flex flex-col items-center text-center space-y-4 mb-8">
                        <div className="w-20 h-20 bg-red-600/20 text-red-500 rounded-3xl border border-red-500/20 flex items-center justify-center shadow-2xl mb-2">
                          <Lock size={40} />
                        </div>
                        <h3 className="text-xl font-black text-white uppercase tracking-tight">Solicitar Senha</h3>
                        <p className="text-[10px] text-white/40 font-black uppercase tracking-widest leading-relaxed">
                          Para excluir esta função, é necessário confirmar sua senha de administrador.
                        </p>
                     </div>

                     <div className="space-y-6">
                        <Input dark
                          label="DIGITE SUA SENHA" 
                          type="password"
                          value={deleteRolePasswordValue} 
                          onChange={(val) => setDeleteRolePasswordValue(val)} 
                          placeholder="••••••••" 
                          autoFocus
                          onKeyDown={(e: any) => e.key === 'Enter' && confirmDeleteRole()}
                        />
                     </div>

                     <div className="grid grid-cols-2 gap-4 mt-10">
                        <button 
                          onClick={() => {
                            setShowDeleteRolePasswordModal(false);
                            setRoleToDeleteId(null);
                            setDeleteRolePasswordValue('');
                          }}
                          className="p-4 rounded-2xl bg-white/5 text-white/40 text-[10px] font-black uppercase tracking-widest border border-white/10 hover:bg-white/10 hover:text-white transition-all flex items-center justify-center"
                        >
                          Cancelar
                        </button>
                        <button 
                          onClick={confirmDeleteRole}
                          className="p-4 rounded-2xl bg-red-600 text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-red-600/20 hover:bg-red-500 transition-all flex items-center justify-center active:scale-95"
                        >
                          Confirmar
                        </button>
                     </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* Role Edit Modal */}
            {showRoleEditModal && editingRoleUser && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="glass-panel w-full max-w-md p-10"
                >
                   <div className="flex flex-col items-center text-center space-y-4 mb-8">
                      <div className="w-20 h-20 bg-blue-600/10 text-blue-400 rounded-3xl border border-blue-500/20 flex items-center justify-center shadow-lg mb-2">
                        <ShieldCheck size={40} />
                      </div>
                      <h3 className="text-2xl font-black text-white uppercase tracking-tight">Editar Função</h3>
                      <p className="text-[10px] text-white/40 font-black uppercase tracking-[0.2em]">Usuário: {editingRoleUser.name}</p>
                   </div>

                   <div className="space-y-6">
                      <div className="space-y-2 flex flex-col">
                        <label className="text-[9px] font-black text-white/40 tracking-widest uppercase ml-1 block">Nova Função / Cargo</label>
                        <select 
                          value={selectedEditRoleId} 
                          onChange={e => setSelectedEditRoleId(e.target.value)}
                          className="w-full p-5 bg-white/5 rounded-2xl border border-white/10 outline-none focus:ring-4 focus:ring-blue-500/20 text-sm font-black transition-all uppercase text-white shadow-lg"
                        >
                          <option value="" className="bg-zinc-900 text-white">Sem Função</option>
                          {localRoles.map(r => (
                            <option key={r.id} value={r.id} className="bg-zinc-900 text-white">{r.name}</option>
                          ))}
                        </select>
                      </div>
                   </div>

                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-10">
                      <button 
                        onClick={() => {
                          setShowRoleEditModal(false);
                          setEditingRoleUser(null);
                        }}
                        className="p-5 rounded-[1.5rem] bg-white/5 text-white text-[11px] font-black uppercase tracking-widest border border-white/10 hover:bg-white/10 transition-all flex items-center justify-center shadow-lg"
                      >
                        Cancelar
                      </button>
                      <button 
                        onClick={() => {
                          const updatedUsers = users.map(u => u.id === editingRoleUser.id ? { ...u, roleId: selectedEditRoleId } : u);
                          setUsers(updatedUsers);

                          if (currentUser && editingRoleUser.id === currentUser.id) {
                            const updatedMe = updatedUsers.find(u => u.id === currentUser.id);
                            if (updatedMe) setCurrentUser(updatedMe);
                          }

                          const newRoleName = localRoles.find(r => r.id === selectedEditRoleId)?.name || 'Sem Função';
                          addActivity('security', 'Função Alterada', `Função do usuário ${editingRoleUser.name} alterada para ${newRoleName}.`);
                          alert('Função atualizada com sucesso');
                          setShowRoleEditModal(false);
                          setEditingRoleUser(null);
                        }}
                        className="p-5 rounded-[1.5rem] bg-blue-600 text-white text-[11px] font-black uppercase tracking-widest shadow-xl hover:bg-blue-700 transition-all flex items-center justify-center active:scale-95"
                      >
                        Salvar Alteração
                      </button>
                   </div>
                </motion.div>
              </div>
            )}

            {/* Deactivation Modal */}
            <AnimatePresence>
              {showDeactivateModal && deactivatingUser && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="glass-panel w-full max-w-md p-10"
                  >
                     <div className="flex flex-col items-center text-center space-y-4 mb-8">
                        <div className="w-20 h-20 bg-red-600/20 text-red-400 rounded-3xl border border-red-500/20 flex items-center justify-center shadow-2xl mb-2">
                          <UserX size={40} />
                        </div>
                        <h3 className="text-2xl font-black text-white uppercase tracking-tight">
                          {deactivatingUser.isActive === false ? 'Ativar Usuário?' : 'Desativar Usuário?'}
                        </h3>
                        <p className="text-[11px] text-white/40 font-bold uppercase tracking-widest leading-relaxed">
                          {deactivatingUser.isActive === false 
                            ? 'ESTE USUÁRIO VOLTARÁ A TER ACESSO AO SISTEMA.' 
                            : 'TEM CERTEZA QUE DESEJA DESATIVAR ESTE USUÁRIO?'}
                        </p>
                     </div>

                      <div className="bg-white/5 p-8 rounded-[2rem] border border-white/10 mb-8 shadow-inner">
                        <div className="flex items-center gap-5">
                          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center font-black text-white border border-white/10">
                             {deactivatingUser.name.charAt(0)}
                           </div>
                           <div className="text-left">
                              <p className="text-xl font-black text-white uppercase leading-none">{deactivatingUser.name}</p>
                              <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mt-1">
                                 {localRoles.find(r => r.id === deactivatingUser.roleId)?.name || 'Sem Função'}
                              </p>
                           </div>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <button 
                          onClick={() => {
                            setShowDeactivateModal(false);
                            setDeactivatingUser(null);
                          }}
                          className="p-5 rounded-[1.5rem] bg-white/5 text-white text-[11px] font-black uppercase tracking-widest border border-white/10 hover:bg-white/10 transition-all flex items-center justify-center shadow-lg"
                        >
                          Cancelar
                        </button>
                        <button 
                          onClick={() => {
                            const newStatus = !deactivatingUser.isActive;
                            setUsers(users.map(u => u.id === deactivatingUser.id ? { 
                              ...u, 
                              isActive: newStatus, 
                              deactivatedAt: newStatus ? undefined : new Date().toISOString() 
                            } : u));
                            
                            addActivity('security', newStatus ? 'Usuário Ativado' : 'Usuário Desativado', `O usuário ${deactivatingUser.name} foi ${newStatus ? 'ativado' : 'desativado'}.`);
                            alert(`Usuário ${newStatus ? 'ativado' : 'desativado'} com sucesso`);
                            setShowDeactivateModal(false);
                            setDeactivatingUser(null);
                          }}
                          className={`p-5 rounded-[1.5rem] text-white text-[11px] font-black uppercase tracking-widest shadow-xl transition-all flex items-center justify-center active:scale-95 ${deactivatingUser.isActive === false ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}
                        >
                          {deactivatingUser.isActive === false ? 'Ativar' : 'Desativar'}
                        </button>
                     </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

        {activeTab === 'cotas' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300 text-white">
            <div className="glass-panel p-6 md:p-10 space-y-8">
               <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-blue-600/10 text-blue-400 rounded-2xl border border-blue-500/20 flex items-center justify-center shadow-lg">
                    <Database size={32} />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-black uppercase tracking-[0.2em]">Gestão de Cotas</h3>
                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-tight">Limite de processamento e armazenamento</p>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {[
                   { label: 'Cota de Impressão', used: 154, total: 5000, icon: <Printer size={20} />, color: 'bg-blue-500' },
                   { label: 'Cota de Backup', used: 2.1, total: 50, unit: 'MB', icon: <Cloud size={20} />, color: 'bg-indigo-500' },
                   { label: 'Cota de Atividades', used: 850, total: 2000, icon: <History size={20} />, color: 'bg-emerald-500' }
                 ].map((cota, idx) => (
                   <div key={idx} className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-4">
                      <div className="flex items-center justify-between">
                         <div className="p-3 bg-white/5 rounded-xl text-white/40">{cota.icon}</div>
                         <span className="text-[10px] font-black uppercase text-white/20 tracking-widest">{cota.label}</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-end">
                           <p className="text-xl font-black text-white">{cota.used}<span className="text-xs text-white/20 ml-1">{cota.unit || 'UN'}</span></p>
                           <p className="text-[10px] font-black text-white/40 uppercase">Limite: {cota.total}</p>
                        </div>
                        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                           <div 
                             className={`h-full ${cota.color} shadow-lg transition-all duration-1000`} 
                             style={{ width: `${(cota.used / cota.total) * 100}%` }}
                           />
                        </div>
                      </div>
                   </div>
                 ))}
               </div>

               <div className="p-6 bg-blue-600/10 border border-blue-500/20 rounded-2xl flex items-start gap-4">
                  <div className="shrink-0 mt-1 text-blue-400">
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-white tracking-widest">Aviso de Exclusão</p>
                    <p className="text-[11px] text-white/60 font-bold leading-relaxed mt-1 uppercase">
                      QUANDO UMA COTA ATINGE 100%, O SISTEMA PODE AUTOMATICAMENTE EXPURGAR REGISTROS ANTIGOS (LOGS/ATIVIDADES) PARA MANTER A OPERAÇÃO.
                    </p>
                  </div>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'entrega' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300 text-white">
            <div className="glass-panel p-6 md:p-10 space-y-8">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-blue-600/10 text-blue-400 rounded-2xl border border-blue-500/20 flex items-center justify-center shadow-lg">
                  <Truck size={32} />
                </div>
                <div>
                   <h3 className="text-[14px] font-black uppercase tracking-[0.2em]">Configuração de Entrega</h3>
                   <p className="text-[10px] text-white/40 font-bold uppercase tracking-tight">Gerencie tipos e taxas de entrega</p>
                </div>
              </div>
              
              <div className="space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-1 gap-8">
                  <div className="space-y-4">
                    <label className="text-[9px] font-black text-white/40 tracking-widest uppercase ml-1">Adicionar Novo Tipo de Entrega</label>
                    <div className="flex flex-col sm:flex-row gap-4">
                       <input 
                         type="text" 
                         id="new-delivery-method"
                         placeholder="NOME DO TIPO (EX: MOTOBOY)" 
                         className="flex-1 p-5 bg-white/5 rounded-2xl border border-white/10 outline-none focus:ring-4 focus:ring-blue-500/20 text-sm font-black transition-all uppercase text-white shadow-lg placeholder:text-white/20"
                       />
                       <button 
                         onClick={() => {
                           const input = document.getElementById('new-delivery-method') as HTMLInputElement;
                           if (input.value.trim()) {
                             setLocalDeliveryMethods([...localDeliveryMethods, { id: crypto.randomUUID(), name: input.value.trim(), isActive: true }]);
                             input.value = '';
                           }
                         }}
                         className="glass-button-primary px-10 py-5 text-xs font-black"
                       >
                         <Plus size={20} /> Cadastrar
                       </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  {localDeliveryMethods.map(method => (
                    <div key={method.id} className="p-6 bg-white/5 rounded-3xl border border-white/10 shadow-lg flex items-center justify-between group hover:bg-white/10 transition-all">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg uppercase border ${method.isActive ? 'bg-blue-600/10 text-blue-400 border-blue-500/20' : 'bg-white/5 text-white/20 border-white/10'}`}>
                          <Truck size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-white uppercase tracking-tight">{method.name}</p>
                          <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${method.isActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                            {method.isActive ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                         <button 
                           onClick={() => setLocalDeliveryMethods(localDeliveryMethods.map(m => m.id === method.id ? {...m, isActive: !m.isActive} : m))}
                           className={`p-3 rounded-xl border transition-all ${method.isActive ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500 hover:text-black shadow-lg' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500 hover:text-white shadow-lg'}`}
                         >
                           {method.isActive ? <Unlock size={18} /> : <Lock size={18} />}
                         </button>
                         <button 
                           onClick={() => {
                             if(confirm('Excluir este método?')) {
                               setLocalDeliveryMethods(localDeliveryMethods.filter(m => m.id !== method.id));
                             }
                           }}
                           className="p-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-lg"
                         >
                           <Trash2 size={18} />
                         </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'impressao' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 text-white">
            {/* Top Row: Modo de Operação and Hardware */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Modo de Impressão Global */}
              <div className="glass-panel p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600/10 text-blue-400 rounded-xl border border-blue-500/20 flex items-center justify-center shadow-md">
                    <Printer size={20} />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-black text-white tracking-[0.1em] uppercase leading-none">Modo de Operação</h4>
                    <p className="text-[8px] text-white/30 font-bold uppercase tracking-tight mt-1">Disparo de impressões</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  {[
                    { id: 'browser', label: 'Web', icon: <Monitor size={14} /> },
                    { id: 'auto', label: 'Desktop', icon: <Cpu size={14} /> }
                  ].map(mode => (
                    <button 
                      key={mode.id}
                      onClick={() => {
                        setLocalCoupon({ ...localCoupon, printMode: mode.id as any });
                        setLocalCouponPDV({ ...localCouponPDV, printMode: mode.id as any });
                        setLocalLabel({ ...localLabel, printMode: mode.id as any });
                      }}
                      className={`flex-1 py-4 px-2 rounded-xl border transition-all flex flex-col items-center gap-2 shadow-lg ${
                        localCoupon.printMode === mode.id ? 'border-blue-500/20 bg-blue-600/20 text-white' : 'border-white/10 bg-white/5 text-white/20 hover:bg-white/10'
                      }`}
                    >
                      <div className={localCoupon.printMode === mode.id ? 'text-blue-400' : 'text-white/10'}>{mode.icon}</div>
                      <span className="text-[9px] font-black uppercase tracking-[0.1em]">{mode.label}</span>
                    </button>
                  ))}
                </div>
                {localCoupon.printMode === 'auto' && (
                  <div className={`p-4 rounded-xl border flex gap-3 ${
                    (window as any).electronAPI 
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                      : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                  }`}>
                    <div className="shrink-0">
                      {(window as any).electronAPI ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
                    </div>
                    <p className="text-[8px] font-black uppercase leading-tight tracking-tight">
                      {(window as any).electronAPI 
                        ? 'Engine Desktop Ativa'
                        : 'Recomendado Versão Desktop'
                      }
                    </p>
                  </div>
                )}
              </div>

              {/* Hardware & Dispositivos Compact */}
              <div className="glass-panel p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-500/10 text-amber-500 rounded-xl border border-amber-500/20 flex items-center justify-center shadow-md">
                      <Cpu size={20} />
                    </div>
                    <div>
                      <h4 className="text-[11px] font-black text-white tracking-[0.1em] uppercase leading-none">Equipamento</h4>
                      <p className="text-[8px] text-white/30 font-bold uppercase tracking-tight mt-1">Status do Spooler Local</p>
                    </div>
                  </div>
                  <button 
                    disabled={!(window as any).electronAPI}
                    onClick={async () => {
                      try {
                        const sysPrinters = await (window as any).electronAPI.getPrinters();
                        if (sysPrinters && Array.isArray(sysPrinters)) {
                          setLocalHardwarePrinters(sysPrinters);
                          setHardwarePrinters(sysPrinters); 
                        }
                      } catch (err) {
                        console.error('[Hardware] Erro:', err);
                      }
                    }}
                    className={`h-10 w-10 rounded-xl transition-all flex items-center justify-center border shadow-lg active:scale-95 ${
                      (window as any).electronAPI 
                        ? 'bg-blue-600/10 text-blue-400 border-blue-500/20 hover:bg-blue-600 hover:text-white' 
                        : 'bg-white/5 text-white/10 border-white/5 cursor-not-allowed opacity-50 shadow-none'
                    }`}
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>

                {/* Lista de Impressoras Encontradas (Sistema) */}
                {localHardwarePrinters.length > 0 && (
                  <div className="space-y-3 py-2 border-t border-white/5 animate-in fade-in slide-in-from-top-2">
                    <h5 className="text-[8px] font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
                       Impressoras sistema:
                    </h5>
                    <div className="grid grid-cols-1 gap-2 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                      {localHardwarePrinters.map((p: any) => {
                        const isRegistered = registeredPrinters.some(r => r.name === p.name);
                        return (
                          <div key={p.name} className="p-3 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between group hover:bg-white/10 transition-all shadow-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white">
                                <Printer size={14} />
                              </div>
                              <div className="max-w-[150px]">
                                <p className="text-[10px] font-black text-white uppercase truncate tracking-tight leading-none">{p.displayName || p.name}</p>
                                <p className="text-[7px] font-bold text-white/20 uppercase truncate tracking-tighter mt-1">{p.name}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                if (isRegistered) return;
                                setRegisteredPrinters([...registeredPrinters, {
                                  id: p.name,
                                  name: p.name,
                                  displayName: p.displayName || p.name,
                                  type: 'thermal',
                                  connection: 'usb'
                                }]);
                              }}
                              disabled={isRegistered}
                              className={`h-8 w-8 rounded-lg flex items-center justify-center border transition-all ${
                                isRegistered 
                                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20' 
                                  : 'bg-blue-600 text-white border-blue-500/20 active:scale-95'
                              }`}
                            >
                              {isRegistered ? <Check size={12} /> : <Plus size={12} />}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center border border-white/10 ${registeredPrinters.length > 0 ? 'bg-blue-500/10 text-blue-400' : 'bg-white/5 text-white/20'}`}>
                    <Printer size={16} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[9px] font-black text-white uppercase tracking-tight">
                      {registeredPrinters.length > 0 ? `${registeredPrinters.length} Impressora(s) Ativa(s)` : 'Nenhuma Configurada'}
                    </p>
                    <p className="text-[8px] font-bold text-white/20 uppercase tracking-widest leading-none mt-1">
                      {registeredPrinters.length > 0 ? registeredPrinters[0].displayName : 'Aguardando Sinc'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Perfis de Impressão Grid 4x1 */}
            <div className="glass-panel p-8 space-y-8">
              <div className="border-b border-white/10 pb-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-600/10 text-indigo-400 rounded-2xl border border-indigo-500/20 flex items-center justify-center shadow-lg">
                    <LayoutGrid size={24} />
                  </div>
                  <div>
                    <h4 className="text-[13px] font-black text-white tracking-[0.2em] uppercase">Perfis de Impressão</h4>
                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-tight">Workflows e destinos de saída</p>
                  </div>
                </div>
                <div className="text-[9px] font-black text-indigo-400/60 uppercase tracking-widest px-4 py-2 bg-indigo-500/5 border border-indigo-500/10 rounded-full">
                  Gerenciamento de Fluxos
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* 1. Fluxo Cupom */}
                <div className="space-y-4 p-5 bg-white/5 rounded-[1.5rem] border border-white/10 text-white relative group overflow-hidden">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shadow-md">
                      <FileText size={20} />
                    </div>
                    <h5 className="text-[10px] font-black text-white uppercase tracking-[0.1em]">PDV / Cupom Fiscal</h5>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[7px] font-black text-white/40 uppercase tracking-widest ml-1">Hardware</label>
                      <select 
                        value={localCouponPDV.printerName || ''}
                        onChange={e => {
                          setLocalCouponPDV({...localCouponPDV, printerName: e.target.value});
                          setLocalCoupon({...localCoupon, printerName: e.target.value});
                          setLocalSelectedPrinter(e.target.value);
                          setSelectedPrinter(e.target.value);
                        }}
                        className="w-full p-3 bg-white/5 rounded-xl border border-white/10 outline-none focus:ring-2 focus:ring-blue-500/20 text-[9px] font-black uppercase text-white cursor-pointer shadow-lg"
                      >
                        <option value="">Nenhuma</option>
                        {registeredPrinters.map((p) => (
                          <option key={p.id} value={p.name}>{p.displayName}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[7px] font-black text-white/40 uppercase tracking-widest ml-1">Modo</label>
                      <select 
                        value={localCouponPDV.printMode || 'browser'}
                        onChange={e => {
                          setLocalCouponPDV({...localCouponPDV, printMode: e.target.value as any});
                          setLocalCoupon({...localCoupon, printMode: e.target.value as any});
                        }}
                        className="w-full p-3 bg-white/5 rounded-xl border border-white/10 outline-none focus:ring-2 focus:ring-blue-500/20 text-[9px] font-black uppercase text-white cursor-pointer shadow-lg"
                      >
                        <option value="browser">Web</option>
                        <option value="auto">Direct</option>
                      </select>
                    </div>
                  </div>

                  <button 
                    onClick={() => performUnifiedPrint('Teste Cupom', '<h2>TESTE PDV</h2>', localCouponPDV.printerName, localCouponPDV.printMode)}
                    className="w-full py-3 bg-white/5 hover:bg-blue-600 transition-all rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 border border-white/5 hover:border-blue-500/50"
                  >
                    <Printer size={14} /> Testar
                  </button>
                </div>

                {/* 2. Fluxo Etiquetas */}
                <div className="space-y-4 p-5 bg-white/5 rounded-[1.5rem] border border-white/10 text-white relative group overflow-hidden">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-md">
                      <Tag size={20} />
                    </div>
                    <h5 className="text-[10px] font-black text-white uppercase tracking-[0.1em]">Etiquetas de Gôndola</h5>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[7px] font-black text-white/40 uppercase tracking-widest ml-1">Hardware</label>
                      <select 
                        value={localLabel.printerName || selectedLabelPrinter}
                        onChange={e => {
                          setSelectedLabelPrinter(e.target.value);
                          setLocalLabel({...localLabel, printerName: e.target.value});
                        }}
                        className="w-full p-3 bg-white/5 rounded-xl border border-white/10 outline-none focus:ring-2 focus:ring-blue-500/20 text-[9px] font-black uppercase text-white cursor-pointer shadow-lg"
                      >
                        <option value="">Nenhuma</option>
                        {registeredPrinters.map((p) => (
                          <option key={p.id} value={p.name}>{p.displayName}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[7px] font-black text-white/40 uppercase tracking-widest ml-1">Modo</label>
                      <select 
                        value={localLabel.printMode || 'browser'}
                        onChange={e => setLocalLabel({...localLabel, printMode: e.target.value as any})}
                        className="w-full p-3 bg-white/5 rounded-xl border border-white/10 outline-none focus:ring-2 focus:ring-blue-500/20 text-[9px] font-black uppercase text-white cursor-pointer shadow-lg"
                      >
                        <option value="browser">Web</option>
                        <option value="auto">Direct</option>
                      </select>
                    </div>
                  </div>

                  <button 
                    onClick={() => performUnifiedPrint('Teste Etiqueta', '<h3>ETIQUETA TESTE</h3>', localLabel.printerName || selectedLabelPrinter, localLabel.printMode)}
                    className="w-full py-3 bg-white/5 hover:bg-indigo-600 transition-all rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-3 border border-white/5 hover:border-indigo-500/50"
                  >
                    <Printer size={14} /> Testar
                  </button>
                </div>

                {/* 3. Fluxo Cozinha (Dev) */}
                <div className="space-y-4 p-5 bg-white/5 rounded-[1.5rem] border border-white/5 text-white/40 relative group overflow-hidden grayscale">
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-10 flex items-center justify-center">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] bg-white text-black px-4 py-2 rounded-full rotate-[-5deg] shadow-2xl">Em Desenvolvimento</p>
                  </div>
                  <div className="flex items-center gap-3 opacity-50">
                    <div className="w-10 h-10 rounded-xl bg-orange-600/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
                      <ChefHat size={20} />
                    </div>
                    <h5 className="text-[10px] font-black uppercase tracking-[0.1em]">Produção / Cozinha</h5>
                  </div>
                  <div className="grid grid-cols-2 gap-3 opacity-20">
                    <div className="h-10 bg-white/5 rounded-xl border border-white/10" />
                    <div className="h-10 bg-white/5 rounded-xl border border-white/10" />
                  </div>
                </div>

                {/* 4. Fluxo Separação (Dev) */}
                <div className="space-y-4 p-5 bg-white/5 rounded-[1.5rem] border border-white/5 text-white/40 relative group overflow-hidden grayscale">
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-10 flex items-center justify-center">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] bg-indigo-600 text-white px-4 py-2 rounded-full rotate-[5deg] shadow-2xl">Em Desenvolvimento</p>
                  </div>
                  <div className="flex items-center gap-3 opacity-50">
                    <div className="w-10 h-10 rounded-xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                      <ClipboardList size={20} />
                    </div>
                    <h5 className="text-[10px] font-black uppercase tracking-[0.1em]">Conferência / Separação</h5>
                  </div>
                  <div className="grid grid-cols-2 gap-3 opacity-20">
                    <div className="h-10 bg-white/5 rounded-xl border border-white/10" />
                    <div className="h-10 bg-white/5 rounded-xl border border-white/10" />
                  </div>
                </div>
              </div>

              {/* Hardware Registrado */}
              {registeredPrinters.length > 0 && (
                <div className="pt-8 border-t border-white/10 border-dashed space-y-4">
                  <h5 className="text-[10px] font-black text-white tracking-[0.2em] uppercase">Hardware Ativo para Uso</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {registeredPrinters.map(p => (
                      <div key={p.id} className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between hover:bg-white/10 transition-all shadow-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shadow-md">
                            <Printer size={18} />
                          </div>
                          <div>
                            <p className="text-[11px] font-black text-white uppercase tracking-tight">{p.displayName}</p>
                            <p className="text-[8px] font-bold text-white/20 uppercase tracking-tighter mt-0.5">{p.name}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            if (confirm('Remover esta impressora?')) {
                              setRegisteredPrinters(registeredPrinters.filter(r => r.id !== p.id));
                            }
                          }}
                          className="p-2.5 bg-red-500/10 text-red-500 border border-red-500/10 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-lg"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Status Section Bottom */}
              <div className="pt-6 border-t border-white/10 border-dashed">
                <div className="flex items-center gap-6 bg-white/5 p-5 border border-white/10 rounded-[2rem]">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border border-white/10 shadow-lg ${localCouponPDV.printMode === 'auto' && (window as any).electronAPI ? 'bg-emerald-500 text-black' : 'bg-blue-600 text-white'}`}>
                    <Monitor size={24} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black uppercase text-white tracking-[0.1em]">
                      Endpoint: {(window as any).electronAPI ? 'Desktop Engine Active' : 'Navegador Web standard'}
                    </p>
                    <p className="text-[9px] font-bold text-white/20 uppercase mt-0.5 leading-none">
                      {localCouponPDV.printMode === 'auto' && (window as any).electronAPI ? 'Conectado. Sincronização direta com o spooler local ativa.' : 'Interação via visualizador nativo do navegador.'}
                    </p>
                  </div>
                  {registeredPrinters.length > 0 && (
                    <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Hardware OK</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'backup' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="glass-panel p-8 md:p-10 space-y-6 text-white">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-blue-600/10 text-blue-400 border border-blue-500/20 rounded-2xl flex items-center justify-center shadow-lg">
                   <ShieldCheck size={32} />
                </div>
                <div>
                  <h4 className="text-xl font-black uppercase tracking-widest">Segurança de Dados</h4>
                  <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mt-1">Proteção e restauração do sistema</p>
                </div>
              </div>
              <p className="text-sm text-white/80 font-bold border-l-4 border-blue-500/50 pl-4 py-2 bg-white/5 rounded-r-xl">
                Backups automáticos realizados diariamente. Recomendamos exportar cópias manuais para armazenamento externo regularmente.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                <button 
                  id="btn-export-backup"
                  onClick={() => exportarBackup({
                    products, catalogDescriptions, customers, sales, activities, categories, subcategories,
                    delivery_channels: deliveryChannels, delivery_methods: deliveryMethods, closed_sessions: closedSessions,
                    openSessions, users, roles, paymentMethods, customPaymentMethods, hiddenPaymentMethods,
                    printers, registeredPrinters, company, couponConfig, couponPDVConfig, greetingCouponConfig,
                    labelConfig, cashierSession, selectedPrinter, selectedLabelPrinter, revenues, purchases, expenses,
                    rawMaterialsStructured, productRecipes, shopkeepers, shopkeeperDeliveries
                  })}
                  className="glass-button-primary p-6 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 group"
                >
                  <Download size={24} className="group-hover:translate-y-1 transition-transform" /> Exportar Backup (.json)
                </button>
                <button 
                  id="btn-import-backup"
                  onClick={async () => {
                    const imported = await importarBackup();
                    if (imported) {
                      if (confirm('Importar backup? Isso apagará os dados atuais.')) {
                        handleRestoreFromData(imported);
                      }
                    }
                  }}
                  className="glass-button-secondary p-6 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 group"
                >
                  <Upload size={24} className="group-hover:-translate-y-1 transition-transform" /> Importar de Arquivo
                </button>
              </div>
            </div>

            <div className="glass-panel p-8 md:p-10 space-y-8 text-white">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-white/10 pb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-white">
                    <History size={24} />
                  </div>
                  <div>
                    <h4 className="text-[12px] font-black uppercase tracking-widest">Pontos de Restauração</h4>
                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider mt-1">Últimos snapshots salvos localmente</p>
                  </div>
                </div>
                <button 
                  onClick={handleCreateManualBackup}
                  className="px-8 py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg flex items-center gap-3 active:scale-95"
                >
                  <Database size={16} /> Criar snapshot
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {localBackups.length === 0 ? (
                  <div className="p-20 border border-dashed border-white/10 rounded-[3rem] flex flex-col items-center justify-center text-white/10">
                    <Database size={64} className="mb-4 opacity-10" />
                    <p className="text-[12px] font-black uppercase tracking-widest">Nenhum backup local</p>
                  </div>
                ) : (
                  localBackups.map((bak) => (
                    <div key={bak.id} className="group p-6 bg-white/5 border border-white/10 rounded-[2rem] hover:bg-white/10 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-white shadow-md group-hover:bg-blue-600/20 transition-colors">
                          <Database size={24} />
                        </div>
                        <div>
                          <p className="text-xs font-black text-white uppercase">
                            {new Date(bak.date).toLocaleDateString('pt-BR')} • {new Date(bak.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                             <span className="text-[9px] px-3 py-0.5 bg-white/10 text-white rounded-full font-black uppercase">
                               {(bak.size / 1024).toFixed(1)} KB
                             </span>
                             <span className="text-[9px] text-white/40 font-bold uppercase">LocalStorage</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 self-end sm:self-center">
                        {pendingAction?.id === bak.id ? (
                           <div className="flex items-center gap-3 animate-in fade-in zoom-in-95 duration-200">
                             <span className="text-[10px] font-black uppercase text-red-500 tracking-widest">Confirmar?</span>
                             <button 
                               onClick={async () => {
                                 if (pendingAction.type === 'restore') {
                                    try {
                                      const fullData = await backupService.loadBackupData(bak);
                                      handleRestoreFromData(fullData);
                                    } catch (err: any) {
                                      alert(err.message);
                                    }
                                 }
                                 if (pendingAction.type === 'delete') handleDeleteBackup(bak.id);
                                 setPendingAction(null);
                               }}
                               className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-white border border-white/10 shadow-lg active:scale-95 ${pendingAction.type === 'restore' ? 'bg-emerald-500' : 'bg-red-500'}`}
                             >
                               SOU EU
                             </button>
                             <button 
                               onClick={() => setPendingAction(null)}
                               className="px-6 py-2 bg-white/5 text-white border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10"
                             >
                               CANCELAR
                             </button>
                          </div>
                        ) : (
                          <>
                            <button 
                              onClick={async () => {
                                try {
                                  const fullData = await backupService.loadBackupData(bak);
                                  exportarBackup(fullData);
                                } catch (err: any) {
                                  alert(err.message);
                                }
                              }}
                              className="p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-blue-600/20 transition-all shadow-lg text-white"
                              title="Download"
                            >
                              <Download size={18} />
                            </button>
                            <button 
                              onClick={() => setPendingAction({ id: bak.id, type: 'restore' })}
                              className="p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-emerald-500/20 transition-all shadow-lg text-white"
                              title="Restaurar"
                            >
                              <RefreshCw size={18} />
                            </button>
                            <button 
                              onClick={() => setPendingAction({ id: bak.id, type: 'delete' })}
                              className="p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-red-500/20 transition-all shadow-lg text-white"
                              title="Excluir"
                            >
                              <Trash2 size={18} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            <div className="glass-panel p-8 rounded-[2.5rem] bg-white/5 border border-white/10">
              <h5 className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-4">Metadados Técnicos</h5>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-white/20 uppercase">Localização</span>
                  <span className="text-[10px] font-black text-white">{(window as any).electronAPI ? 'AppData / Documentos' : 'Navegador Local'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-white/20 uppercase">Snapshotting</span>
                  <span className="text-[10px] font-black text-white">Sincronizado</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-white/20 uppercase">Integridade</span>
                  <span className="text-[10px] font-black text-white">Verificado</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'reimpressao' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="flex glass-panel p-1.5 w-fit gap-1.5 backdrop-blur-xl border-white/5 shadow-2xl">
                {[
                  { id: 'inicial', label: 'Venda Geral', icon: <FileText size={14} /> },
                  { id: 'final', label: 'Venda Final', icon: <CheckCircle size={14} /> }
                ].map(sub => (
                  <button
                    key={sub.id}
                    onClick={() => setReprintSubTab(sub.id as any)}
                    className={`px-6 py-3 rounded-xl text-[10px] whitespace-nowrap font-black uppercase tracking-widest transition-all flex items-center gap-2.5 ${
                      reprintSubTab === sub.id 
                        ? 'bg-blue-600 text-white shadow-lg scale-100' 
                        : 'text-white/30 hover:text-white/60 hover:bg-white/5'
                    }`}
                  >
                    {sub.icon} {sub.label}
                  </button>
                ))}
             </div>

             <div className="glass-panel overflow-hidden border-white/5 shadow-2xl">
                <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left border-collapse font-sans min-w-[700px]">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/10">
                                <th className="px-6 py-4 text-[9px] font-black text-white/30 uppercase tracking-[0.2em] w-[150px]">Nº Pedido</th>
                                <th className="px-6 py-4 text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">Cliente / Identificação</th>
                                <th className="px-6 py-4 text-[9px] font-black text-white/30 uppercase tracking-[0.2em] w-[200px]">Data & Horário</th>
                                <th className="px-6 py-4 text-[9px] font-black text-white/30 uppercase tracking-[0.2em] w-[150px]">Registrado</th>
                                <th className="px-6 py-4 text-[9px] font-black text-white/30 uppercase tracking-[0.2em] text-right w-[100px]">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {sales
                              .filter(sale => {
                                if (reprintSubTab === 'inicial') return sale.status !== 'cancelado';
                                return ['separado', 'embalado', 'enviado', 'em_transporte', 'entregue'].includes(sale.status || '');
                              })
                              .sort((a, b) => b.date - a.date)
                              .map(sale => {
                                const customer = customers.find(c => c.id === sale.customerId);
                                const userName = reprintSubTab === 'inicial' ? sale.soldByUserName : sale.separatedByUserName;
                                return (
                                    <tr key={sale.id} className="hover:bg-white/[0.02] transition-all group">
                                        <td className="px-6 py-3 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="px-3 py-1.5 rounded-lg bg-blue-600/10 text-blue-400 flex items-center justify-center font-black border border-blue-500/20 text-[10px] tracking-widest shadow-inner whitespace-nowrap">
                                                    #{sale.sequentialId || sale.id.slice(-6).toUpperCase()}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3">
                                            <div className="flex flex-col gap-0.5">
                                               <p className="font-black text-[11px] uppercase text-white tracking-widest truncate max-w-[250px]">{customer?.name || 'Venda Rápida'}</p>
                                               <span className="text-[7px] text-white/20 font-bold uppercase tracking-tighter font-mono">ID: {sale.id.slice(-8).toUpperCase()}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 whitespace-nowrap">
                                            <div className="flex flex-col">
                                               <p className="text-[10px] font-black uppercase text-white/60 tracking-wider font-mono">{new Date(sale.date).toLocaleDateString('pt-BR')}</p>
                                               <p className="text-[9px] font-bold text-white/20 uppercase font-mono">{new Date(sale.date).toLocaleTimeString('pt-BR')}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 whitespace-nowrap">
                                            <p className="text-[10px] font-black uppercase text-blue-400/50 tracking-widest flex items-center gap-2">
                                               <span className="w-1.5 h-1.5 rounded-full bg-blue-500/30 animate-pulse"></span>
                                               @{userName || 'SISTEMA'}
                                            </p>
                                        </td>
                                        <td className="px-6 py-3 text-right">
                                            <button 
                                                onClick={() => reprintSubTab === 'inicial' ? imprimirPedidoPDV(sale) : imprimirCupom(sale)}
                                                className="p-2.5 bg-white/5 text-white/40 border border-white/10 rounded-xl hover:bg-blue-600 hover:text-white hover:border-blue-500 hover:shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all active:scale-90"
                                                title={getPrintLabel(couponConfig.printMode, "Reimprimir Cupom")}
                                            >
                                                {getPrintIcon(couponConfig.printMode, 16)}
                                            </button>
                                        </td>
                                    </tr>
                                );
                              })}
                            {sales.filter(sale => {
                                 if (reprintSubTab === 'inicial') return sale.status !== 'cancelado';
                                 return ['separado', 'embalado', 'enviado', 'em_transporte', 'entregue'].includes(sale.status || '');
                            }).length === 0 && (
                                <tr>
                                    <td colSpan={5} className="py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                           <RotateCcw size={32} className="text-white/5 animate-spin-slow" />
                                           <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Nenhum cupom encontrado para esta categoria</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
             </div>
          </div>
        )}
      </main>

    </div>
  );
}

function Checkbox({ label, checked, onChange, compact = false }: { label: string, checked: boolean, onChange: (v: boolean) => void, compact?: boolean }) {
  return (
    <button 
      onClick={() => onChange(!checked)}
      className={`flex items-center ${compact ? 'gap-2' : 'gap-3'} cursor-pointer group transition-all`}
    >
      <div 
        className={`${compact ? 'w-8 h-8 rounded-lg' : 'w-10 h-10 rounded-xl'} flex items-center justify-center transition-all border border-white/20 backdrop-blur-md ${checked ? 'bg-blue-600 shadow-lg shadow-blue-500/20' : 'bg-white/5 hover:bg-white/10'}`}
      >
        <Check size={compact ? 14 : 18} className={`transition-all ${checked ? 'text-white opacity-100 scale-110' : 'text-white opacity-10 scale-50'}`} strokeWidth={4} />
      </div>
      <span className={`${compact ? 'text-[9px]' : 'text-[10px]'} font-black text-white uppercase tracking-widest select-none group-hover:translate-x-0.5 transition-transform`}>{label}</span>
    </button>
  );
}

function QRCodePreview({ 
  value, 
  design, 
  size = 120 
}: { 
  value: string, 
  design: QRCodeDesignConfig, 
  size?: number 
}) {
  return (
    <div 
      className="p-2 bg-white rounded-lg inline-block shadow-sm"
      style={{ opacity: (design.opacity ?? 100) / 100 }}
    >
      <QRCodeCanvas
        value={value}
        size={size}
        level="H"
        fgColor={design.color || '#000000'}
        bgColor={design.backgroundColor || '#FFFFFF'}
        imageSettings={design.style === 'logo' && design.logoUrl ? {
          src: design.logoUrl,
          x: undefined,
          y: undefined,
          height: size * 0.2,
          width: size * 0.2,
          excavate: true,
        } : undefined}
      />
    </div>
  );
}

function QRCodeDesignSettings({ 
  config, 
  onChange 
}: { 
  config: QRCodeDesignConfig, 
  onChange: (c: QRCodeDesignConfig) => void 
}) {
  return (
    <div className="space-y-6 bg-zinc-900/50 p-6 rounded-[2rem] border border-zinc-800/50">
       <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500">
             <QrCode size={18} />
          </div>
          <div>
            <h4 className="text-[10px] font-black text-zinc-100 tracking-[0.2em] uppercase">Design do QR Code</h4>
            <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-tight">Estilize o código de resposta rápida</p>
          </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[9px] font-black text-zinc-500 tracking-wider uppercase ml-1">Estilo Visual</label>
            <select 
              value={config.style}
              onChange={e => onChange({...config, style: e.target.value as any})}
              className="w-full p-4 bg-zinc-800 rounded-2xl border border-zinc-700 outline-none text-sm font-bold uppercase text-zinc-100 transition-all focus:ring-2 focus:ring-blue-500"
            >
              <option value="standard">Padrão (Nítido)</option>
              <option value="suave">Suave (Arredondado)</option>
              <option value="moderno">Moderno (Pontilhado)</option>
              <option value="elegante">Elegante (Minimalista)</option>
              <option value="logo">Com Logotipo Central</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-black text-zinc-500 tracking-wider uppercase ml-1">Formato dos Pontos</label>
            <div className="grid grid-cols-2 gap-2">
               <button 
                 onClick={() => onChange({...config, dotType: 'square'})}
                 className={`p-3 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all ${config.dotType === 'square' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:text-zinc-300'}`}
               >
                 Quadrado
               </button>
               <button 
                 onClick={() => onChange({...config, dotType: 'rounded'})}
                 className={`p-3 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all ${config.dotType === 'rounded' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:text-zinc-300'}`}
               >
                 Redondo
               </button>
            </div>
          </div>
       </div>

       <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-[9px] font-black text-zinc-500 tracking-wider uppercase ml-1">Cor do Código</label>
            <div className="flex items-center gap-2 bg-zinc-800 p-3 rounded-2xl border border-zinc-700">
               <input 
                 type="color" 
                 value={config.color} 
                 onChange={e => onChange({...config, color: e.target.value})}
                 className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-none p-0"
               />
               <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">{config.color}</span>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[9px] font-black text-zinc-500 tracking-wider uppercase ml-1">Cor de Fundo</label>
            <div className="flex items-center gap-2 bg-zinc-800 p-3 rounded-2xl border border-zinc-700">
               <input 
                 type="color" 
                 value={config.backgroundColor} 
                 onChange={e => onChange({...config, backgroundColor: e.target.value})}
                 className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-none p-0"
               />
               <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">{config.backgroundColor}</span>
            </div>
          </div>
          <div className="space-y-2 col-span-2 lg:col-span-1">
            <label className="text-[9px] font-black text-zinc-500 tracking-wider uppercase ml-1 block mb-1">Opacidade ({config.opacity}%)</label>
            <input 
              type="range" 
              min="0" max="100" 
              value={config.opacity} 
              onChange={e => onChange({...config, opacity: parseInt(e.target.value)})}
              className="w-full accent-blue-500 h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>
       </div>

       {config.style === 'logo' && (
          <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
            <label className="text-[9px] font-black text-zinc-500 tracking-wider uppercase ml-1">Logo do QR Code (URL ou Upload)</label>
            <div className="flex gap-2">
               <input 
                 type="text" 
                 placeholder="https://sua-logo.com/imagem.png"
                 value={config.logoUrl || ''} 
                 onChange={e => onChange({...config, logoUrl: e.target.value})}
                 className="flex-1 p-4 bg-zinc-800 rounded-2xl border border-zinc-700 outline-none text-xs font-bold text-zinc-100 placeholder:text-zinc-600 focus:ring-2 focus:ring-blue-500"
               />
               <label className="p-4 bg-zinc-800 hover:bg-zinc-700 rounded-2xl border border-zinc-700 cursor-pointer text-zinc-400 transition-all hover:text-white flex items-center justify-center">
                  <Upload size={18} />
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*" 
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (ev) => onChange({...config, logoUrl: ev.target?.result as string});
                        reader.readAsDataURL(file);
                      }
                    }} 
                  />
               </label>
            </div>
          </div>
       )}
    </div>
  );
}

function PaymentsView({ 
  paymentMethods, 
  setPaymentMethods, 
  paymentIcons,
  setPaymentIcons,
  customPaymentMethods, 
  setCustomPaymentMethods,
  hiddenPaymentMethods,
  setHiddenPaymentMethods,
  sales,
  addActivity,
  canEdit,
  currentUser,
  setView
}: { 
  paymentMethods: string[], 
  setPaymentMethods: any, 
  paymentIcons: Record<string, string>,
  setPaymentIcons: any,
  customPaymentMethods: string[], 
  setCustomPaymentMethods: any,
  hiddenPaymentMethods: string[],
  setHiddenPaymentMethods: any,
  sales: Sale[],
  addActivity: (type: Activity['type'], action: string, details: string, extra?: Partial<Activity>) => void,
  canEdit: boolean,
  currentUser: any | null,
  setView: (v: string) => void
}) {
  const [newMethodName, setNewMethodName] = useState('');
  const [newMethodIcon, setNewMethodIcon] = useState('📦');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [methodToDelete, setMethodToDelete] = useState<{id: string, name: string} | null>(null);
  const [showIconLibrary, setShowIconLibrary] = useState(false);
  const [editingIconMethod, setEditingIconMethod] = useState<string | null>(null);
  const [showIconLibraryForList, setShowIconLibraryForList] = useState(false);
  
  const staticMethods = [
    { id: 'DINHEIRO', label: 'DINHEIRO', defaultIcon: '💵', color: 'text-green-400 bg-green-500/10' },
    { id: 'PIX', label: 'PIX', defaultIcon: '📲', color: 'text-teal-400 bg-teal-500/10' },
    { id: 'CARTÃO DE CRÉDITO', label: 'CARTÃO DE CRÉDITO', defaultIcon: '💳', color: 'text-blue-400 bg-blue-500/10' },
    { id: 'CARTÃO DE DÉBITO', label: 'CARTÃO DE DÉBITO', defaultIcon: '🏧', color: 'text-indigo-400 bg-indigo-500/10' },
  ];

  // Compute the full list of manageable payment methods
  const allMethodsList = useMemo(() => {
    const list = [
      ...staticMethods.map(m => ({
        id: m.id,
        name: m.label,
        icon: paymentIcons[m.id] || m.defaultIcon,
        color: m.color,
        isCustom: false,
        isHidden: hiddenPaymentMethods.includes(m.id),
        isActive: paymentMethods.includes(m.id)
      })),
      ...customPaymentMethods.map(name => ({
        id: name,
        name: name,
        icon: paymentIcons[name] || '📦',
        color: 'text-blue-400 bg-blue-500/10',
        isCustom: true,
        isHidden: false,
        isActive: paymentMethods.includes(name)
      }))
    ];
    // Filter out hidden static ones to keep the list clean
    return list.filter(item => !item.isHidden);
  }, [paymentMethods, customPaymentMethods, hiddenPaymentMethods, paymentIcons]);

  const toggleMethod = (methodId: string) => {
    setPaymentMethods((prev: string[]) => {
      const active = prev.includes(methodId);
      if (active) {
        if (prev.length <= 1) {
          alert('Mantenha pelo menos um meio de pagamento ativo para o PDV.');
          return prev;
        }
        return prev.filter(m => m !== methodId);
      }
      return [...prev, methodId];
    });
  };

  const handleAdd = () => {
    const name = newMethodName.trim().toUpperCase();
    if (!name) return;

    // Check duplicates
    const alreadyExists = allMethodsList.some(m => m.name === name);
    if (alreadyExists) {
      alert('Este meio de pagamento já está na lista.');
      return;
    }

    // Check if it's a hidden static method being "restored"
    if (hiddenPaymentMethods.includes(name)) {
      setHiddenPaymentMethods((prev: string[]) => prev.filter(id => id !== name));
      setPaymentMethods((prev: string[]) => prev.includes(name) ? prev : [...prev, name]);
    } else {
      setCustomPaymentMethods((prev: string[]) => prev.includes(name) ? prev : [...prev, name]);
      setPaymentMethods((prev: string[]) => prev.includes(name) ? prev : [...prev, name]);
    }

    // Save Icon
    setPaymentIcons((prev: Record<string, string>) => ({
      ...prev,
      [name]: newMethodIcon
    }));

    setNewMethodName('');
    setNewMethodIcon('📦');
    setShowAddForm(false);
    addActivity('system', 'Pagamento Adicionado', `Meio de pagamento "${name}" criado com ícone ${newMethodIcon}.`);
  };

  const confirmDelete = () => {
    if (!methodToDelete) return;

    const { id } = methodToDelete;
    
    // 1. Remove from the active payment methods (PDV list)
    setPaymentMethods((prev: string[]) => prev.filter(m => m !== id));
    
    // 2. Remove from custom list
    setCustomPaymentMethods((prev: string[]) => prev.filter(m => m !== id));
    
    if (addActivity) {
      addActivity('system', 'Pagamento Excluído', `Meio de pagamento "${id}" removido.`);
    }

    setShowDeleteModal(false);
    setMethodToDelete(null);
  };

  const handleDeleteClick = (e: MouseEvent, method: any) => {
    e.stopPropagation();
    if (!method.isCustom) {
      alert('Não é permitido excluir meios de pagamento padrão.');
      return;
    }
    setMethodToDelete({ id: method.id, name: method.name });
    setShowDeleteModal(true);
  };

  const monthlyStats = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const currentMonthSales = sales.filter(s => s.date >= startOfMonth);
    const volume = currentMonthSales.reduce((acc, s) => acc + s.total, 0);
    return {
      volume,
      count: currentMonthSales.length
    };
  }, [sales]);

  const getMethodIcon = (method: any) => {
    if (typeof method.icon === 'string') {
      if (method.icon.startsWith('http') || method.icon.startsWith('data:')) {
        return <img src={method.icon} className="w-6 h-6 object-contain" alt="" />;
      }
      return <span className="text-xl">{method.icon}</span>;
    }
    // Se por algum motivo for um componente Lucide
    if (method.icon && typeof method.icon !== 'string') {
      const Icon = method.icon;
      return <Icon className="w-5 h-5 text-indigo-400" />;
    }
    return <span className="text-xl">📦</span>;
  };

  const [showIconSelector, setShowIconSelector] = useState<{ open: boolean, methodId?: string }>({ open: false });

  const handleSelectIcon = (url: string) => {
    if (showIconSelector.methodId) {
      const methodId = showIconSelector.methodId;
      setPaymentIcons((prev: Record<string, string>) => ({
        ...prev,
        [methodId]: url
      }));
    } else {
      setNewMethodIcon(url);
    }
    setShowIconSelector({ open: false });
  };

  const getMethodColorClass = (method: any) => {
    const name = method.name.toUpperCase();
    if (name.includes('DINHEIRO')) return 'bg-green-900/30 border-green-700/50';
    if (name.includes('PIX')) return 'bg-yellow-900/30 border-yellow-700/50';
    if (name.includes('CARTÃO DE CRÉDITO')) return 'bg-cyan-900/30 border-cyan-700/50';
    if (name.includes('CARTÃO DE DÉBITO')) return 'bg-blue-900/30 border-blue-700/50';
    if (name.includes('BOLETO')) return 'bg-orange-900/30 border-orange-700/50';
    if (name.includes('CHEQUE')) return 'bg-emerald-900/30 border-emerald-700/50';
    return 'bg-indigo-900/30 border-indigo-700/50';
  };

  return (
    <div className="fixed inset-0 z-[200] bg-[#0a1628] text-white p-2 md:p-4 font-sans flex flex-col overflow-hidden animate-in fade-in duration-500">
      {/* Header Padrao */}
      <div className="flex items-center justify-between mb-4 shrink-0 px-2 md:px-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setView('dashboard')}
            className="w-10 h-10 rounded-xl bg-[#1a2744] flex items-center justify-center border border-white/5 hover:bg-[#1a2744]/80 transition-all cursor-pointer group"
          >
            <ChevronLeft className="w-5 h-5 text-[#64748b] group-hover:text-white" />
          </button>
          <div>
            <h2 className="text-lg md:text-xl font-black text-white uppercase italic leading-none">
              Pagamentos
            </h2>
            <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mt-1">
              Configuração de Meios de Recebimento
            </p>
          </div>
        </div>

        {canEdit && (
          <button 
            onClick={() => setShowAddForm(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg active:scale-95"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">Novo Meio</span>
            <span className="sm:hidden">Novo</span>
          </button>
        )}
      </div>

      {showAddForm && canEdit && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#0f1628] rounded-2xl p-4 border border-slate-800 shadow-2xl relative overflow-hidden mb-4 shrink-0"
        >
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-[10px] font-black uppercase text-white/40 tracking-widest">Novo Meio de Pagamento</h4>
            <button 
              onClick={() => { setShowAddForm(false); setNewMethodName(''); setShowIconLibrary(false); }}
              className="text-white/20 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setShowIconSelector({ open: true })}
                  className="w-14 h-14 bg-white/5 rounded-xl border border-white/10 flex items-center justify-center text-2xl hover:bg-white/10 transition-all relative group shadow-xl overflow-hidden"
                >
                  {newMethodIcon.startsWith('http') || newMethodIcon.startsWith('data:') ? (
                    <img src={newMethodIcon} className="w-full h-full object-cover" alt="" />
                  ) : (
                    newMethodIcon
                  )}
                  <div className="absolute -top-1 -right-1 bg-indigo-600 rounded-full p-1 border border-white/10 shadow-sm">
                    <Edit size={10} className="text-white" />
                  </div>
                </button>
                <div className="flex-1">
                  <label className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1 block">Nome do Método</label>
                  <input 
                    autoFocus
                    value={newMethodName}
                    onChange={e => setNewMethodName(e.target.value)}
                    placeholder="EX: VALE ALIMENTAÇÃO"
                    className="w-full bg-[#0d1c30] border border-white/5 rounded-xl px-4 py-2 text-[11px] font-black text-white uppercase placeholder:text-white/10 focus:ring-1 ring-indigo-500/30 outline-none transition-all"
                    onKeyDown={e => e.key === 'Enter' && handleAdd()}
                  />
                </div>
              </div>

              {showIconSelector.open && (
                <div className="fixed inset-0 z-[400] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
                  <div className="bg-[#0f1629] border border-white/10 rounded-[2rem] w-full max-w-2xl max-h-[70vh] flex flex-col overflow-hidden">
                    <div className="p-6 border-b border-white/5 flex items-center justify-between font-sans">
                      <h3 className="text-[12px] font-black text-white uppercase italic tracking-widest">Selecionar Ícone</h3>
                      <button onClick={() => setShowIconSelector({ open: false })} className="p-2 hover:bg-white/10 rounded-xl">
                        <X size={18} />
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6">
                       <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
                          {PAYMENT_ICON_LIBRARY.map(icon => (
                            <button 
                              key={icon.char}
                              onClick={() => handleSelectIcon(icon.char)}
                              className="aspect-square bg-white/5 rounded-xl border border-white/5 flex items-center justify-center text-2xl hover:bg-indigo-600/40 hover:border-indigo-500 transition-all"
                            >
                              {icon.char}
                            </button>
                          ))}
                       </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col justify-end">
              <button 
                onClick={handleAdd}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-3 font-black text-[10px] uppercase tracking-widest transition-all shadow-lg active:scale-95"
              >
                Salvar Configuração
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* KPI Cards Compactos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4 shrink-0 px-2 md:px-0">
        {/* Meios Ativos */}
        <div className="bg-[#1a2744] rounded-xl p-3 border border-white/5 hover:border-indigo-500/30 transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-900/30 border border-indigo-700/50 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <p className="text-[#64748b] text-[8px] font-black tracking-wider uppercase mb-0.5">Meios Ativos</p>
              <p className="text-lg font-black text-white leading-none">{paymentMethods.length}</p>
            </div>
          </div>
        </div>

        {/* Transações */}
        <div className="bg-[#1a2744] rounded-xl p-3 border border-white/5 hover:border-yellow-500/30 transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-900/30 border border-yellow-700/50 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-[#64748b] text-[8px] font-black tracking-wider uppercase mb-0.5">Transações (Mês)</p>
              <p className="text-lg font-black text-white leading-none">{monthlyStats.count}</p>
            </div>
          </div>
        </div>

        {/* Volume */}
        <div className="bg-[#1a2744] rounded-xl p-3 border border-white/5 hover:border-green-500/30 transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-900/30 border border-green-700/50 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-[#64748b] text-[8px] font-black tracking-wider uppercase mb-0.5">Volume (Mês)</p>
              <p className="text-[14px] font-black text-white leading-none">
                {monthlyStats.volume.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </div>
          </div>
        </div>

        {/* Taxa Média */}
        <div className="bg-[#1a2744] rounded-xl p-3 border border-white/5 hover:border-purple-500/30 transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-900/30 border border-purple-700/50 flex items-center justify-center">
              <Percent className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-[#64748b] text-[8px] font-black tracking-wider uppercase mb-0.5">Taxa Média</p>
              <p className="text-lg font-black text-white leading-none">0,00%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabela de Meios */}
      <div className="flex-1 min-h-0 bg-[#0d1c30] rounded-2xl border border-white/5 shadow-inner overflow-hidden flex flex-col">
          <div className="overflow-x-auto no-scrollbar overflow-y-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-black/40 border-b border-white/5 text-[9px] font-black text-white/40 uppercase tracking-widest sticky top-0 z-20">
                  <th className="px-6 py-4 hidden lg:table-cell w-16">#</th>
                  <th className="px-6 py-4">Meio de Pagamento</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-center hidden lg:table-cell">Taxa</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {allMethodsList.map((method, idx) => (
                  <tr key={method.id} className={`hover:bg-white/[0.02] transition-colors group ${!method.isActive ? 'opacity-40 grayscale-[0.5]' : ''}`}>
                    <td className="px-6 py-4 hidden lg:table-cell text-[10px] font-bold text-[#64748b]">
                       {(idx + 1).toString().padStart(2, '0')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => {
                            if (canEdit) {
                              setShowIconSelector({ open: true, methodId: method.id });
                            }
                          }}
                          className={`w-9 h-9 rounded-xl border flex items-center justify-center shadow-lg transition-all hover:scale-105 active:scale-95 relative group/icon overflow-hidden bg-black/20 ${getMethodColorClass(method)}`}
                        >
                          {getMethodIcon(method)}
                          {canEdit && (
                            <div className="absolute inset-0 bg-indigo-600/80 flex items-center justify-center opacity-0 group-hover/icon:opacity-100 transition-opacity">
                              <Edit size={10} className="text-white" />
                            </div>
                          )}
                        </button>
                        <div>
                          <p className="font-black text-[11px] text-white uppercase tracking-tight leading-none mb-1">{method.name}</p>
                          <p className="text-[8px] font-black text-[#64748b] uppercase tracking-widest leading-none">
                            {method.isCustom ? 'Personalizado' : 'Sistema'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-3 py-1 rounded-lg text-[8px] font-black tracking-widest border uppercase leading-none ${
                        method.isActive 
                          ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                          : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}>
                        {method.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center hidden lg:table-cell text-[10px] font-bold text-[#64748b]">
                      0,00%
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        {canEdit && (
                          <>
                            <button 
                              onClick={() => toggleMethod(method.id)}
                              className={`p-2 rounded-lg border text-[9px] font-black uppercase tracking-widest transition-all ${
                                method.isActive 
                                  ? 'border-red-500/20 text-red-400 hover:bg-red-500/10' 
                                  : 'border-green-500/20 text-green-400 hover:bg-green-500/10'
                              }`}
                              title={method.isActive ? 'Desativar' : 'Ativar'}
                            >
                              {method.isActive ? <Trash2 className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            </button>
                            {method.isCustom && (
                              <button 
                                onClick={(e) => handleDeleteClick(e as any, method)}
                                className="p-2 rounded-lg border border-red-500/20 text-red-500 hover:bg-red-500/20 transition-colors"
                                title="Excluir Definitivamente"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
      </div>

      {/* Dica Rápida Compacta */}
      <div className="bg-[#1a2744] rounded-2xl border border-white/5 px-4 py-3 flex items-center justify-between shadow-lg mt-4 shrink-0 px-2 md:px-0 mx-2 md:mx-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-900/30 border border-indigo-700/50 flex items-center justify-center shrink-0">
            <Lightbulb className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <p className="font-black text-[10px] text-white uppercase tracking-tight leading-none mb-1">Dica rápida</p>
            <p className="text-[#64748b] text-[9px] leading-tight max-w-xl">
              Ative apenas os meios de pagamento realmente utilizados para agilizar o PDV.
            </p>
          </div>
        </div>
        <button className="hidden sm:flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition-all text-[9px] font-black uppercase tracking-widest group">
          Saiba mais
          <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
}
export const Input = forwardRef<HTMLInputElement, { label: string, value: any, onChange: (v: string) => void, placeholder?: string, type?: string, onKeyDown?: (e: any) => void, autoFocus?: boolean, dark?: boolean, required?: boolean, disabled?: boolean, compact?: boolean }>(
  ({ label, value, onChange, placeholder = "", type = 'text', onKeyDown, autoFocus, dark = false, required = false, disabled = false, compact = false }, ref) => {
    const handleKeyDown = (e: any) => {
      if (e.key === 'Enter' && !onKeyDown) {
        // Se estiver dentro de um form, tenta submeter
        const form = e.currentTarget.form;
        if (form) {
          form.requestSubmit();
        }
      }
      if (onKeyDown) onKeyDown(e);
    };

    return (
      <div className={`flex flex-col ${compact ? 'gap-1' : 'gap-2'} w-full`}>
        <label className={`${compact ? 'text-[8px] tracking-[0.1em]' : 'text-[10px] tracking-[0.2em]'} font-black uppercase ml-2 ${dark ? 'text-zinc-500' : 'text-white/40'}`}>{label}</label>
        <div className="relative group">
          <input 
            ref={ref}
            type={type}
            autoFocus={autoFocus}
            required={required}
            disabled={disabled}
            value={value ?? ''}
            onChange={e => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={`relative w-full ${compact ? 'p-2.5 rounded-xl' : 'p-4 md:p-5 rounded-2xl'} border transition-all ${dark ? 'glass-input' : 'glass-panel border-white/20 focus:ring-4 focus:ring-purple-500/30' } text-sm font-black uppercase placeholder:text-white/10 bg-black/20 text-white disabled:opacity-50 disabled:cursor-not-allowed`}
          />
        </div>
      </div>
    );
  }
);

function LabelPrintModal({ product, labelConfig, onClose, imprimirEtiqueta, addToLabelLot }: { product: Product, labelConfig: LabelConfig, onClose: () => void, imprimirEtiqueta: (product: Product, qty: number) => Promise<boolean>, addToLabelLot: (product: Product, qty: number) => void }) {
  const [quantity, setQuantity] = useState('1');

  const handlePrint = async () => {
    const qty = parseInt(quantity) || 1;
    await imprimirEtiqueta(product, qty);
    onClose();
  };

  const handleAddToLot = () => {
    const qty = parseInt(quantity) || 1;
    addToLabelLot(product, qty);
    onClose();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-zinc-900 p-8 rounded-[3rem] max-w-sm w-full space-y-8 shadow-2xl relative border border-zinc-800">
        <button onClick={onClose} className="absolute top-8 right-8 p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all">
          <X size={20} />
        </button>
        
        <div className="text-center space-y-3">
          <div className="w-20 h-20 bg-blue-500/10 text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-zinc-950 shadow-xl">
            <Tag size={32} />
          </div>
          <h4 className="text-xl font-black text-zinc-100 uppercase tracking-tighter">Gerar Etiquetas</h4>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest leading-relaxed">
            {product.name}<br/>
            <span className="text-blue-400">{labelConfig.width}x{labelConfig.height}mm • {labelConfig.sheetType === 'a4' ? 'Folha A4' : labelConfig.sheetType === 'a6' ? 'Folha A6' : labelConfig.sheetType === 'custom' ? 'Personalizado' : 'Térmica'}</span>
          </p>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Quantidade de Etiquetas</label>
            <input 
              type="number"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              className="w-full p-5 bg-zinc-950 rounded-2xl border border-zinc-800 outline-none focus:ring-4 focus:ring-blue-500/20 text-lg font-black text-center transition-all text-zinc-100"
              placeholder="1"
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-3">
            <button 
              onClick={handlePrint} 
              className="w-full p-5 rounded-2xl bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-3"
            >
              {getPrintIcon(labelConfig.printMode, 18)} {getPrintLabel(labelConfig.printMode)}
            </button>
            
            <button 
              onClick={handleAddToLot} 
              className="w-full p-4 rounded-2xl bg-zinc-800 text-zinc-300 font-black text-[10px] uppercase tracking-widest hover:bg-zinc-700 transition-all flex items-center justify-center gap-3 border border-white/5"
            >
              <Boxes size={18} className="text-orange-400" /> Adicionar ao Lote
            </button>

            <button onClick={onClose} className="w-full p-3 text-zinc-500 font-black text-[9px] uppercase tracking-[0.2em] hover:text-zinc-300 transition-all">
              Fechar
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ProductView({ 
  products, 
  setProducts, 
  setView, 
  categories,
  setCategories,
  subcategories,
  setSubcategories,
  productLocations,
  setProductLocations,
  addActivity,
  labelConfig,
  imprimirEtiqueta,
  calculateProductCost,
  currentUser,
  canEdit,
  catalogDescriptions,
  setCatalogDescriptions,
  selectedLabelProduct,
  setSelectedLabelProduct,
  addToLabelLot
}: { 
  products: Product[], 
  setProducts: any, 
  setView: (v: View) => void, 
  categories: Category[],
  setCategories: any,
  subcategories: Subcategory[],
  setSubcategories: any,
  productLocations: ProductLocation[],
  setProductLocations: any,
  addActivity: (type: Activity['type'], action: string, details: string, extra?: Partial<Activity>) => void,
  labelConfig: LabelConfig,
  imprimirEtiqueta: (product: Product, qty: number) => Promise<boolean>,
  calculateProductCost: (productId: string) => number,
  currentUser: SystemUser | null,
  canEdit: boolean,
  catalogDescriptions: Record<string, string>,
  setCatalogDescriptions: any,
  selectedLabelProduct: Product | null,
  setSelectedLabelProduct: (p: Product | null) => void,
  addToLabelLot: (product: Product, qty: number) => void
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showWholesaleFields, setShowWholesaleFields] = useState(false);
  const [newProduct, setNewProduct] = useState({ 
    name: '', 
    price: '', 
    costPrice: '', 
    stock: '', 
    minStock: '',
    supplier: '',
    wholesalePrice: '',
    wholesaleMinQty: '',
    categoryId: '', 
    subcategoryId: '', 
    sku: '', 
    imageUrl: '',
    showInCatalog: true,
    locationRow: '',
    locationShelf: '',
    locationDrawer: '',
    shopkeeperPrice: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryTab, setSelectedCategoryTab] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  
  // Category management state
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newSubCatName, setNewSubCatName] = useState('');
  const [selectedCatId, setSelectedCatId] = useState('');

  const metrics = useMemo(() => {
    const totalProducts = products.length;
    const totalStock = products.reduce((acc, p) => acc + (Number(p.stock) || 0), 0);
    const totalStockValue = products.reduce((acc, p) => acc + (calculateProductCost(p.id) * (Number(p.stock) || 0)), 0);
    const outOfStock = products.filter(p => (Number(p.stock) || 0) <= 0).length;
    return { totalProducts, totalStock, totalStockValue, outOfStock };
  }, [products, calculateProductCost]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (p.sku || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (categories.find(c => c.id === p.categoryId)?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesTab = selectedCategoryTab === 'ALL' || p.categoryId === selectedCategoryTab;
      
      return matchesSearch && matchesTab;
    }).sort((a, b) => (b.id > a.id ? 1 : -1)); // Recent first
  }, [products, searchTerm, selectedCategoryTab, categories]);

  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredProducts, currentPage]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  const addCategory = () => {
    if (!newCatName) return;
      const cat: Category = { 
        id: generateUniqueId('cat'), 
        name: newCatName, 
        createdAt: Date.now(),
        updatedAt: Date.now(),
        syncStatus: 'pending',
        deviceId: getDeviceId()
      };
    setCategories([...categories, cat]);
    setNewCatName('');
  };

  const removeCategory = (id: string) => {
    if (confirm('Remover esta categoria removerá também todas as suas subcategorias. Continuar?')) {
      setCategories(categories.filter(c => c.id !== id));
      setSubcategories(subcategories.filter(s => s.categoryId !== id));
    }
  };

  const addSubcategory = () => {
    if (!newSubCatName || !selectedCatId) return;
    const sub: Subcategory = { 
      id: generateUniqueId('sub'), 
      categoryId: selectedCatId, 
      name: newSubCatName, 
      createdAt: Date.now(),
      updatedAt: Date.now(),
      syncStatus: 'pending',
      deviceId: getDeviceId()
    };
    setSubcategories([...subcategories, sub]);
    setNewSubCatName('');
  };

  const removeSubcategory = (id: string) => {
    setSubcategories(subcategories.filter(s => s.id !== id));
  };

  const normalizeBarcode = (code: string) => {
    if (!code) return '';
    // Remove leading zeros and trim spaces
    return code.trim().replace(/^0+/, '') || '0';
  };

  const generateQRCode = () => {
    // Requirements: 8 digits total, always starts with 789
    // That means 789 + 5 digits
    const prefix = "789";
    
    // Find numeric codes that match this pattern
    const numericCodes = products
      .map(p => {
        const normalized = p.sku?.trim() || '';
        if (normalized.startsWith(prefix) && normalized.length === 8) {
          const num = parseInt(normalized.substring(3), 10);
          return isNaN(num) ? null : num;
        }
        return null;
      })
      .filter((n): n is number => n !== null);

    const maxCodeSuffix = numericCodes.length > 0 ? Math.max(...numericCodes) : 0;
    
    let nextNumSuffix = maxCodeSuffix + 1;
    let nextCode = prefix + nextNumSuffix.toString().padStart(5, '0');
    
    // Safety check for uniqueness
    while (products.some(p => p.sku === nextCode)) {
      nextNumSuffix++;
      nextCode = prefix + nextNumSuffix.toString().padStart(5, '0');
    }
    
    setNewProduct({ ...newProduct, sku: nextCode });
    addActivity('product', 'Gerar Código', `Código QR ${nextCode} gerado para novo produto.`);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setNewProduct({ 
      name: '', 
      price: '', 
      costPrice: '', 
      stock: '', 
      minStock: '',
      supplier: '',
      wholesalePrice: '', 
      wholesaleMinQty: '', 
      categoryId: '', 
      subcategoryId: '', 
      sku: '', 
      imageUrl: '', 
      showInCatalog: true, 
      locationId: '',
      shopkeeperPrice: '' 
    });
    setEditingId(null);
  };

  const saveProduct = async () => {
    if (!newProduct.name || !newProduct.price || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      if (!newProduct.sku) {
        alert('⚠️ CÓDIGO DE BARRAS OBRIGATÓRIO! Por favor, gere ou insira um código de barras antes de salvar.');
        return;
      }

      // Barcode uniqueness validation
      const currentNormalized = normalizeBarcode(newProduct.sku);
      const isDuplicate = products.some(p => {
        // If editing, skip the current product
        if (editingId && p.id === editingId) return false;
        return normalizeBarcode(p.sku || '') === currentNormalized;
      });

      if (isDuplicate) {
        alert('⚠️ CÓDIGO DE BARRAS JÁ CADASTRADO PARA OUTRO PRODUTO!');
        return;
      }
      
      // Delay artificial para feedback
      await new Promise(resolve => setTimeout(resolve, 600));

      if (editingId) {
        const oldProduct = products.find(p => p.id === editingId);
        if (oldProduct) {
        const fields = [
          { key: 'name', label: 'Nome' },
          { key: 'price', label: 'Preço' },
          { key: 'costPrice', label: 'Custo' },
          { key: 'stock', label: 'Estoque' },
          { key: 'minStock', label: 'Estoque Mínimo' },
          { key: 'supplier', label: 'Fornecedor' },
          { key: 'categoryId', label: 'Categoria' },
          { key: 'subcategoryId', label: 'Subcategoria' },
          { key: 'sku', label: 'SKU' },
          { key: 'wholesalePrice', label: 'Preço Atacado' },
          { key: 'wholesaleMinQty', label: 'Qtd Mín. Atacado' },
          { key: 'locationId', label: 'Localização' },
        ];

        fields.forEach(field => {
          const newVal = newProduct[field.key as keyof typeof newProduct];
          const oldVal = String(oldProduct[field.key as keyof Product] || '');
          const compareVal = String(newVal || '');
          
          if (compareVal !== oldVal) {
            addActivity('product_edit', 'Edição de Produto', `Alterado ${field.label} de "${oldProduct.name}"`, {
              productId: editingId,
              productName: oldProduct.name,
              field: field.label,
              oldValue: oldVal,
              newValue: compareVal
            });
          }
        });
      }

      setProducts(products.map(p => p.id === editingId ? {
        ...p,
        name: newProduct.name,
        price: parseFloat(newProduct.price),
        costPrice: parseFloat(newProduct.costPrice) || 0,
        stock: parseInt(newProduct.stock) || 0,
        minStock: parseInt(newProduct.minStock) || 0,
        supplier: newProduct.supplier,
        wholesalePrice: parseFloat(newProduct.wholesalePrice) || undefined,
        wholesaleMinQty: parseInt(newProduct.wholesaleMinQty) || undefined,
        categoryId: newProduct.categoryId,
        subcategoryId: newProduct.subcategoryId,
        sku: newProduct.sku,
        imageUrl: newProduct.imageUrl,
        showInCatalog: newProduct.showInCatalog,
        locationId: newProduct.locationId,
        shopkeeperPrice: newProduct.shopkeeperPrice ? parseFloat(String(newProduct.shopkeeperPrice)) : undefined,
        updatedByUserId: currentUser?.id,
        updatedByUserName: currentUser?.name,
      } : p));

      setEditingId(null);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setShowForm(false);
      }, 1500);
    } else {
      const product: Product = {
        id: generateUniqueId('prod'),
        name: newProduct.name,
        price: parseFloat(newProduct.price),
        costPrice: parseFloat(newProduct.costPrice) || 0,
        stock: parseInt(newProduct.stock) || 0,
        minStock: parseInt(newProduct.minStock) || 0,
        supplier: newProduct.supplier,
        wholesalePrice: parseFloat(newProduct.wholesalePrice) || undefined,
        wholesaleMinQty: parseInt(newProduct.wholesaleMinQty) || undefined,
        categoryId: newProduct.categoryId,
        subcategoryId: newProduct.subcategoryId,
        sku: newProduct.sku,
        imageUrl: newProduct.imageUrl,
        showInCatalog: newProduct.showInCatalog,
        locationId: newProduct.locationId,
        shopkeeperPrice: newProduct.shopkeeperPrice ? parseFloat(String(newProduct.shopkeeperPrice)) : undefined,
        updatedByUserId: currentUser?.id,
        updatedByUserName: currentUser?.name,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        syncStatus: 'pending',
        deviceId: getDeviceId()
      };
      setProducts([...products, product]);
      
      addActivity('product', 'Novo Produto', `O produto ${product.name} foi cadastrado.`);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setShowForm(false);
      }, 1500);
    }
    resetForm();
  } catch (err) {
    console.error(err);
    alert('Erro ao salvar produto.');
  } finally {
    setIsSubmitting(false);
  }
};

  const editProduct = (p: Product) => {
    setEditingId(p.id);
    setNewProduct({
      name: p.name,
      price: p.price.toString(),
      costPrice: p.costPrice?.toString() || '',
      stock: p.stock.toString(),
      minStock: p.minStock?.toString() || '',
      supplier: p.supplier || '',
      wholesalePrice: p.wholesalePrice?.toString() || '',
      wholesaleMinQty: p.wholesaleMinQty?.toString() || '',
      categoryId: p.categoryId || '',
      subcategoryId: p.subcategoryId || '',
      sku: p.sku || '',
      imageUrl: p.imageUrl || '',
      showInCatalog: p.showInCatalog ?? true,
      locationId: p.locationId || '',
      shopkeeperPrice: p.shopkeeperPrice || ''
    });
    setShowForm(true);
  };

  const removeProduct = (id: string) => {
    setProducts((prev: Product[]) => {
      const product = prev.find(p => p.id === id);
      if (product) {
        addActivity('product', 'Produto Excluído', `O produto ${product.name} foi removido do estoque.`);
      }
      return prev.filter(p => p.id !== id);
    });
    setDeleteConfirmId(null);
  };

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = await uploadToServer(file, 'product');
      setNewProduct({ ...newProduct, imageUrl: url });
    }
  };


  return (
    <div className="fixed inset-0 z-[200] bg-[#0a1628] text-white p-2 md:p-4 font-sans flex flex-col overflow-hidden">
      <style>{noScrollbarStyle}</style>

      {/* Modal de Confirmação de Exclusão */}
      <AnimatePresence>
        {deleteConfirmId && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1a2332] w-full max-w-sm rounded-[3rem] border border-white/10 shadow-2xl overflow-hidden p-10 text-center space-y-6"
            >
              <div className="w-20 h-20 bg-red-600/20 text-red-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-lg">
                <Trash2 size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-white uppercase tracking-tighter">Excluir Produto?</h3>
                <p className="text-gray-400 text-xs font-medium leading-relaxed">
                  Esta ação removerá permanentemente o produto do estoque. Esta ação não pode ser desfeita.
                </p>
              </div>
              <div className="flex flex-col gap-3 pt-2">
                <button 
                  onClick={() => removeProduct(deleteConfirmId)}
                  className="w-full py-5 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-red-600/30 transition-all active:scale-95"
                >
                  Confirmar Exclusão
                </button>
                <button 
                  onClick={() => setDeleteConfirmId(null)}
                  className="w-full py-5 bg-[#0d1c30] text-gray-400 hover:text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Padrao */}
      <div className="flex items-center justify-between mb-4 md:mb-2 shrink-0 px-2 md:px-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setView('dashboard')}
            className="w-10 h-10 md:w-8 md:h-8 rounded-xl bg-[#0f172a] flex items-center justify-center border border-white/10 hover:bg-white/5 transition-all cursor-pointer group shadow-lg"
          >
            <ChevronLeft className="w-5 h-5 md:w-4 md:h-4 text-white" />
          </button>
          <div>
            <h2 className="text-xl md:text-lg font-black text-white uppercase italic leading-none tracking-tighter">Estoque</h2>
            <p className="text-[10px] md:text-[8px] font-black text-purple-500 uppercase tracking-widest mt-1">Gestão de Produtos & Saldos</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <button 
              onClick={() => setView('product-locations')}
              title="Gerenciar Localizações"
              className="w-10 h-10 md:w-8 md:h-8 flex items-center justify-center bg-[#0f172a] hover:bg-white/5 text-white rounded-xl transition-all border border-white/10 shadow-lg"
            >
              <MapPin size={16} />
            </button>
          )}
          {canEdit && (
            <button 
              onClick={() => setShowCategoryManager(!showCategoryManager)}
              className="w-10 h-10 md:w-8 md:h-8 flex items-center justify-center bg-[#0f172a] hover:bg-white/5 text-white rounded-xl transition-all border border-white/10 shadow-lg"
            >
              <LayoutGrid size={16} />
            </button>
          )}
          {canEdit && (
            <button 
              onClick={() => { resetForm(); setShowForm(true); }}
              className="h-10 md:h-8 bg-[#5b21ff] hover:bg-[#4c16e5] text-white px-4 md:px-3 rounded-xl font-black text-[10px] md:text-[9px] uppercase tracking-widest transition-all shadow-xl shadow-purple-600/30 active:scale-95 flex items-center gap-2"
            >
              <Plus size={14} />
              <span className="hidden sm:inline">Novo Produto</span>
              <span className="inline sm:hidden">Novo</span>
            </button>
          )}
        </div>
      </div>

      {/* Cards de Métricas Estilizados (Mobile-first Grid) */}
      <div className="shrink-0 grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-1.5 mb-4 md:mb-2 px-2 md:px-0">
        {[
          { label: 'CADASTRADOS', value: metrics.totalProducts, icon: Package, color: 'text-indigo-400', bg: 'bg-indigo-400/10' },
          { label: 'ESTOQUE TOTAL', value: metrics.totalStock, icon: LayoutGrid, color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
          { label: 'VALOR TOTAL', value: `R$ ${metrics.totalStockValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: DollarSign, color: 'text-orange-400', bg: 'bg-orange-400/10' },
          { label: 'SEM SALDO', value: metrics.outOfStock, icon: X, color: 'text-red-400', bg: 'bg-red-400/10' }
        ].map((stat, idx) => (
          <div key={idx} className="bg-[#0f172a] p-3 md:p-2 rounded-xl border border-white/5 shadow-md flex items-center gap-3 md:gap-2">
            <div className={`w-8 h-8 md:w-7 md:h-7 rounded-lg ${stat.bg} ${stat.color} flex items-center justify-center shrink-0 shadow-inner`}>
              <stat.icon size={14} />
            </div>
            <div className="truncate">
              <p className="text-[7px] md:text-[6px] font-black text-gray-500 uppercase tracking-widest mb-0.5">{stat.label}</p>
              <p className="text-xs md:text-[10px] font-black text-white uppercase leading-none truncate">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Busca e Filtros Estilizados */}
      <div className="shrink-0 space-y-2 md:space-y-1.5 mb-4 md:mb-2 px-2 md:px-0">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-white transition-colors" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="BUSCAR POR NOME, CATEGORIA OU CÓDIGO..."
            className="w-full bg-[#0d1626] border border-white/10 rounded-xl py-3 md:py-2 pl-12 pr-10 text-[10px] md:text-[9px] font-bold text-white uppercase placeholder:text-gray-600 focus:border-cyan-500/30 focus:ring-4 focus:ring-cyan-500/5 transition-all outline-none shadow-inner"
          />
        </div>

        <div className="flex overflow-x-auto no-scrollbar gap-1.5 pb-1">
          <button 
            onClick={() => setSelectedCategoryTab('ALL')}
            className={`px-4 md:px-3 h-8 md:h-7 text-[9px] font-black rounded-lg transition-all flex items-center uppercase tracking-widest shrink-0 shadow-md ${
              selectedCategoryTab === 'ALL' ? 'bg-[#5b21ff] text-white' : 'bg-[#0f172a] text-gray-500 border border-white/10'
            }`}
          >
            TUDO
          </button>
          {categories.map((cat) => (
            <button 
              key={cat.id} 
              onClick={() => setSelectedCategoryTab(cat.id)}
              className={`px-4 md:px-3 h-8 md:h-7 rounded-lg flex items-center justify-center text-[9px] font-black transition-all shrink-0 uppercase tracking-widest shadow-md ${
                selectedCategoryTab === cat.id ? 'bg-[#5b21ff] text-white' : 'bg-[#0f172a] text-gray-500 border border-white/10 hover:text-white'
              }`}
            >
              {cat.name}
            </button>
          ))}
          <button 
            onClick={() => setSelectedCategoryTab('OUT_OF_STOCK')}
            className={`px-4 md:px-3 h-8 md:h-7 rounded-lg flex items-center justify-center text-[9px] font-black transition-all shrink-0 uppercase tracking-widest shadow-md ${
              selectedCategoryTab === 'OUT_OF_STOCK' ? 'bg-red-500 text-white' : 'bg-[#0f172a] text-gray-500 border border-white/10 hover:text-white'
            }`}
          >
            SEM SALDO
          </button>
        </div>
      </div>

      {/* Grid de Produtos Estilizado */}
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar pb-20 px-2 md:px-0 relative">
        {/* Header de Identificação - Sticky and Aligned */}
        <div className="hidden md:flex items-center gap-4 px-4 py-2 md:py-1.5 bg-[#0a0f1e] sticky top-0 z-20 border-b border-white/10 select-none shadow-xl">
          <div className="flex items-center gap-4 flex-1">
            <div className="w-14 md:w-10 shrink-0" /> {/* Placeholder para IMG */}
            <div className="w-10 md:w-8 shrink-0" /> {/* Placeholder para EDIT */}
            <div className="flex-1 min-w-[200px]">
              <p className="text-[9px] md:text-[8px] font-black text-white/20 uppercase tracking-[0.2em]">Identificação do Produto / Tags</p>
            </div>
          </div>
          <div className="flex items-center gap-8 md:gap-6 px-6 md:px-4">
            <div className="w-20 md:w-16 text-right">
              <p className="text-[9px] md:text-[8px] font-black text-white/20 uppercase tracking-[0.2em]">Custo</p>
            </div>
            <div className="w-20 md:w-16 text-right">
              <p className="text-[9px] md:text-[8px] font-black text-white/20 uppercase tracking-[0.2em]">Varejo</p>
            </div>
          </div>
          <div className="flex items-center gap-6 md:gap-4">
            <div className="w-10 md:w-8 shrink-0" /> {/* Small Edit */}
            <div className="w-1.5 shrink-0" /> {/* Dot */}
            <div className="w-10 md:w-8 shrink-0" /> {/* History */}
            <div className="min-w-[100px] md:min-w-[80px] text-right">
              <p className="text-[9px] md:text-[8px] font-black text-white/20 uppercase tracking-[0.2em]">Estoque</p>
            </div>
            <div className="w-12 md:w-10 shrink-0" /> {/* Tag */}
          </div>
        </div>

        {paginatedProducts.length > 0 ? paginatedProducts.map((p) => {
          const category = categories.find(c => c.id === p.categoryId);
          const subcat = subcategories.find(s => s.id === p.subcategoryId);
          const isOutOfStock = (p.stock || 0) <= 0;
          const isLowStock = !isOutOfStock && (p.stock || 0) <= (p.minStock || 2);
          
          return (
            <div 
              key={p.id}
              className="bg-[#0f172a]/40 border-b border-white/5 p-4 md:p-1.5 flex flex-wrap md:flex-nowrap items-center gap-4 md:gap-3 hover:bg-white/5 transition-all group"
            >
              <div className="flex items-center gap-4 md:gap-3 flex-1">
                {/* Image and Alert */}
                <div className="relative shrink-0">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} className="w-14 h-14 md:w-10 md:h-10 rounded-xl md:rounded-lg object-cover border border-white/10 shadow-lg" alt={p.name} />
                  ) : (
                    <div className="w-14 h-14 md:w-10 md:h-10 rounded-xl md:rounded-lg bg-white/5 text-gray-700 flex items-center justify-center text-lg md:text-sm font-black uppercase border border-white/5">
                      {p.name.substring(0, 2)}
                    </div>
                  )}
                  {(isOutOfStock || isLowStock) && (
                    <div className={`absolute -top-1.5 -right-1.5 w-5 h-5 md:w-4 md:h-4 rounded-full border-2 border-[#0a1628] flex items-center justify-center text-white shadow-lg ${isOutOfStock ? 'bg-red-600' : 'bg-orange-600'}`}>
                      <AlertTriangle size={10} className="md:w-2 md:h-2" fill="currentColor" />
                    </div>
                  )}
                </div>

                {/* Left Action Button (Blue Square) */}
                <button 
                  onClick={() => editProduct(p)}
                  className="shrink-0 w-10 h-10 md:w-8 md:h-8 rounded-xl md:rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center hover:bg-blue-500 hover:text-white transition-all border border-blue-500/20 shadow-inner"
                >
                  <Edit size={18} className="md:w-4 md:h-4" />
                </button>
                
                {/* Product Main Info */}
                <div className="flex-1 min-w-[200px]">
                  <h3 className="text-[12px] md:text-[11px] font-black text-white uppercase truncate tracking-tight">{p.name}</h3>
                  <div className="flex flex-wrap items-center gap-2 md:gap-1.5 mt-2 md:mt-1">
                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] md:text-[8px] font-black uppercase tracking-wider rounded-lg md:rounded border border-emerald-500/20 shadow-sm">
                      {p.sku || '---'}
                    </span>
                    <span className="px-2 py-0.5 bg-white/5 text-white/40 text-[10px] md:text-[8px] font-black uppercase tracking-widest rounded-lg md:rounded border border-white/5">
                      {p.supplier || 'ESTOQUE'}
                    </span>
                    <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] md:text-[8px] font-black uppercase tracking-widest rounded-lg md:rounded border border-blue-500/10">
                      {category?.name || 'GERAL'} {subcat ? `/ ${subcat.name}` : ''}
                    </span>
                  </div>
                </div>
              </div>

              {/* Prices Section */}
              <div className="flex items-center gap-8 md:gap-6 px-6 md:px-4">
                <div className="w-20 md:w-16 text-right">
                  <p className="text-[12px] md:text-[10px] font-black text-white/20 italic tracking-tighter">{(p.costPrice || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="w-20 md:w-16 text-right">
                  <p className="text-[14px] md:text-[12px] font-black text-emerald-500 italic tracking-widest">{(p.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>

                <div className="flex items-center gap-6 md:gap-4">
                  {/* Small Edit Icon */}
                  <button 
                    onClick={() => editProduct(p)}
                    className="w-10 h-10 md:w-8 md:h-8 rounded-xl md:rounded-lg bg-cyan-400/10 text-cyan-400 flex items-center justify-center hover:bg-cyan-400 hover:text-black transition-all border border-cyan-400/20"
                    title="Editar Produto"
                  >
                    <Pencil size={18} className="md:w-4 md:h-4" />
                  </button>

                  {/* Delete Icon */}
                  {canEdit && (
                    <button 
                      onClick={() => setDeleteConfirmId(p.id)}
                      className="w-10 h-10 md:w-8 md:h-8 rounded-xl md:rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all border border-red-500/20"
                      title="Excluir Produto"
                    >
                      <Trash2 size={18} className="md:w-4 md:h-4" />
                    </button>
                  )}
                  
                  {/* Dot Separator */}
                <div className="w-1.5 h-1.5 bg-white/10 rounded-full" />

                {/* Stock Movement Icon */}
                <button className="w-10 h-10 md:w-8 md:h-8 bg-white/5 text-white/20 rounded-xl md:rounded-lg flex items-center justify-center hover:bg-white/10 hover:text-white transition-all border border-white/5">
                  <History size={20} className="md:w-4 md:h-4" />
                </button>

                {/* Stock Info */}
                <div className="min-w-[100px] md:min-w-[80px] text-right">
                  <p className="text-[14px] md:text-[12px] font-black text-white leading-none">{(p.stock || 0).toFixed(2)} un</p>
                  <p className="text-[10px] md:text-[8px] font-bold text-white/20 uppercase tracking-tighter mt-1 md:mt-0.5">mín.: {(p.minStock || 0).toFixed(2)} un</p>
                </div>

                {/* Label Print Tag */}
                <button 
                  onClick={(e) => { e.stopPropagation(); setSelectedLabelProduct(p); }}
                  className="w-12 h-12 md:w-10 md:h-10 bg-blue-600/10 text-blue-400 rounded-xl md:rounded-lg flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all border border-blue-500/20 shadow-xl shadow-blue-600/10 animate-in fade-in zoom-in duration-300"
                  title="Imprimir Etiquetas"
                >
                  <Tag size={20} className="md:w-5 md:h-5" />
                </button>
              </div>
            </div>
          );
        }) : (
          <div className="py-20 text-center opacity-20">
            <Package size={64} className="mx-auto" strokeWidth={1} />
            <p className="mt-4 text-[9px] font-black uppercase tracking-[0.3em]">Nenhum produto encontrado</p>
          </div>
        )}
      </div>

      {/* Paginação Fixa no Rodapé */}
      <div className="flex flex-col sm:flex-row items-center justify-between mt-3 shrink-0 gap-3 px-2">
        <span className="text-[9px] font-black text-[#64748b] uppercase tracking-widest">
          {filteredProducts.length.toLocaleString()} ITENS NO ESTOQUE
        </span>
        <div className="flex items-center gap-1.5 pb-2 sm:pb-0">
          <button 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => p - 1)}
            className="w-8 h-8 rounded-lg bg-[#0d1c30] flex items-center justify-center disabled:opacity-20 hover:bg-[#1a2744] transition-all border border-white/5"
          >
            <ChevronLeft className="w-4 h-4 text-[#64748b]" />
          </button>
          
          <div className="flex items-center gap-1">
            {[...Array(totalPages)].map((_, i) => (
              <button 
                key={i + 1}
                onClick={() => setCurrentPage(i + 1)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-[9px] font-black transition-all ${
                  currentPage === i + 1 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'bg-[#0d1c30] text-[#64748b] border border-white/5'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <button 
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(p => p + 1)}
            className="w-8 h-8 rounded-lg bg-[#0d1c30] flex items-center justify-center disabled:opacity-20 hover:bg-[#1a2744] transition-all border border-white/5"
          >
            <ChevronRight className="w-4 h-4 text-[#64748b]" />
          </button>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showCategoryManager && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0f1629] border border-[#1e2a3a] w-full max-w-4xl max-h-[90vh] overflow-y-auto p-10 rounded-3xl"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold tracking-tight text-cyan-400 uppercase">Gerenciar Categorias</h2>
                <button onClick={() => setShowCategoryManager(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                  <X size={24} />
                </button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div className="space-y-6">
                  <label className="text-[10px] font-black text-white/40 tracking-[0.2em] uppercase ml-2">Categorias Principais</label>
                  <div className="flex gap-3">
                    <input 
                      placeholder="Nome da categoria..." 
                      className="flex-1 bg-[#1e2a3a] border border-white/10 rounded-xl px-4 py-3 text-sm font-bold uppercase focus:border-cyan-500 transition-colors outline-none"
                      value={newCatName}
                      onChange={e => setNewCatName(e.target.value)}
                    />
                    <button 
                      onClick={addCategory}
                      className="bg-cyan-500 text-black px-6 rounded-xl font-bold hover:bg-cyan-400 transition-all active:scale-95"
                    >
                      ADD
                    </button>
                  </div>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {categories.map(c => (
                      <div key={c.id} className={`flex items-center justify-between p-5 rounded-2xl border transition-all cursor-pointer ${selectedCatId === c.id ? 'border-blue-500/50 bg-blue-600/20' : 'bg-white/5 border-white/5 hover:border-white/20'}`} onClick={() => setSelectedCatId(c.id)}>
                        <span className="text-[12px] font-black uppercase text-white">{c.name}</span>
                        <button onClick={(e) => { e.stopPropagation(); removeCategory(c.id); }} className="text-white/40 hover:text-red-400 transition-colors">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                    {categories.length === 0 && <p className="text-[10px] text-white/20 italic text-center py-4 uppercase font-black">Nenhuma categoria criada.</p>}
                  </div>
                </div>

                <div className="space-y-6">
                  <label className="text-[10px] font-black text-white/40 tracking-[0.2em] uppercase ml-2">
                    Subcategorias {selectedCatId ? `de ${categories.find(c => c.id === selectedCatId)?.name}` : ''}
                  </label>
                  <div className="flex gap-3">
                    <input 
                      placeholder="Nome da subcategoria..." 
                      className="flex-1 bg-[#1e2a3a] border border-white/10 rounded-xl px-4 py-3 text-sm font-bold uppercase disabled:opacity-30 outline-none focus:border-cyan-500"
                      value={newSubCatName}
                      onChange={e => setNewSubCatName(e.target.value)}
                      disabled={!selectedCatId}
                    />
                    <button onClick={addSubcategory} disabled={!selectedCatId} className="bg-cyan-500 text-black px-6 rounded-xl font-bold hover:bg-cyan-400 transition-all active:scale-95 disabled:opacity-30">
                      ADD
                    </button>
                  </div>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {subcategories.filter(s => s.categoryId === selectedCatId).map(s => {
                      const cat = categories.find(c => c.id === selectedCatId);
                      return (
                        <div key={s.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                          <span className="text-[10px] font-bold uppercase text-white/60">{cat?.name} &gt; {s.name}</span>
                          <button onClick={() => removeSubcategory(s.id)} className="text-white/20 hover:text-red-400 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      );
                    })}
                    {!selectedCatId && <p className="text-[10px] text-white/20 italic text-center py-4 uppercase font-black">Selecione uma categoria para gerenciar subcategorias.</p>}
                    {selectedCatId && subcategories.filter(s => s.categoryId === selectedCatId).length === 0 && <p className="text-[10px] text-white/20 italic text-center py-4 uppercase font-black">Nenhuma subcategoria para esta categoria.</p>}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showForm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0f1629] border border-[#1e2a3a] w-full max-w-4xl max-h-[95vh] md:max-h-[90vh] overflow-y-auto p-5 md:p-8 lg:p-12 no-scrollbar relative rounded-[2rem] md:rounded-3xl"
            >
              <button 
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="absolute top-4 right-4 md:top-8 md:right-8 p-2 md:p-3 bg-white/5 border border-white/10 text-white rounded-xl md:rounded-2xl hover:bg-red-500/20 hover:text-red-400 transition-all active:scale-95 z-10"
              >
                <X size={20} className="md:w-6 md:h-6" />
              </button>

              <div className="mb-6 md:mb-10 text-center md:text-left">
                <h4 className="text-xl md:text-3xl font-black text-white uppercase tracking-tighter">
                  {editingId ? 'Editar Produto' : 'Cadastrar Produto'}
                </h4>
                <p className="text-[9px] md:text-[11px] font-black text-white/40 uppercase tracking-[0.2em] mt-2">
                  Gestão de Inventário e Estoque
                </p>
                <div className="h-1 md:h-1.5 w-12 md:w-20 bg-cyan-500 mt-3 md:mt-4 rounded-full mx-auto md:mx-0" />
              </div>

              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  saveProduct();
                }}
                className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-10"
              >
                <div className="md:col-span-1">
                   <UniversalImageSelector 
                     label="FOTO DO PRODUTO"
                     value={newProduct.imageUrl}
                     onChange={(url) => {
                       setNewProduct({ ...newProduct, imageUrl: url });
                     }}
                     category="product"
                   />
                </div>

                <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  <div className="sm:col-span-2 lg:col-span-2">
                    <Input label="NOME DO PRODUTO" value={newProduct.name} onChange={v => setNewProduct({...newProduct, name: v})} placeholder="Ex: Camiseta Oversized" />
                  </div>
                  <div className="col-span-1">
                    <Input label="FORNECEDOR" value={newProduct.supplier} onChange={v => setNewProduct({...newProduct, supplier: v})} placeholder="Nome do fornecedor" />
                  </div>
                  <div className="col-span-1">
                    <Input label="CUSTO (R$)" value={newProduct.costPrice} onChange={v => setNewProduct({...newProduct, costPrice: v})} placeholder="0.00" type="number" />
                  </div>
                  <div className="col-span-1">
                    <Input label="VENDA VAREJO (R$)" value={newProduct.price} onChange={v => setNewProduct({...newProduct, price: v})} placeholder="0.00" type="number" />
                  </div>
                  <div className="sm:col-span-1 lg:col-span-1">
                    <label className="text-[10px] font-black text-white/40 tracking-[0.2em] uppercase mb-2 block ml-1">QR CODE / SKU *</label>
                    <div className="relative group">
                      <input 
                         placeholder="DIGITE OU BIPE" 
                        className="bg-[#1e2a3a] border border-white/10 w-full pr-12 text-sm font-black uppercase rounded-xl py-3 px-4 text-white focus:border-cyan-500 outline-none"
                        value={newProduct.sku || ''}
                        onChange={e => setNewProduct({...newProduct, sku: e.target.value})}
                      />
                      <button 
                        onClick={generateQRCode} 
                        type="button"
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-cyan-400 hover:bg-cyan-500 hover:text-white transition-all active:scale-95 group/btn"
                        title="Gerar QR Code automático"
                      >
                        <RefreshCw size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="col-span-1">
                    <Input label="ESTOQUE ATUAL" value={newProduct.stock} onChange={v => setNewProduct({...newProduct, stock: v})} placeholder="0" type="number" />
                  </div>
                  <div className="col-span-1">
                    <Input label="ESTOQUE MÍNIMO" value={newProduct.minStock} onChange={v => setNewProduct({...newProduct, minStock: v})} placeholder="0" type="number" />
                  </div>
                  <div className="sm:col-span-1">
                    <label className="text-[10px] font-black text-cyan-400 tracking-[0.2em] uppercase mb-2 block ml-1 text-center font-bold">Catálogo</label>
                    <button 
                       type="button"
                       onClick={() => setNewProduct({...newProduct, showInCatalog: !newProduct.showInCatalog})}
                       className={`w-full py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 border ${newProduct.showInCatalog ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : 'bg-white/5 text-white/40 border-white/10'}`}
                    >
                      {newProduct.showInCatalog ? 'EXIBIR' : 'OCULTAR'}
                    </button>
                  </div>
                   <div className="sm:col-span-1 text-black">
                    <label className="text-[10px] font-black text-white/40 tracking-[0.2em] uppercase mb-2 block ml-1">Localização</label>
                    <select 
                      value={newProduct.locationId || ''} 
                      onChange={e => setNewProduct({...newProduct, locationId: e.target.value})}
                      className="w-full bg-[#1e2a3a] border border-white/10 text-white text-sm font-bold uppercase rounded-xl py-3 px-4 focus:border-cyan-500 outline-none"
                    >
                      <option value="" className="bg-[#1a2744]">Não informada</option>
                      {productLocations.map(loc => <option key={loc.id} value={loc.id} className="bg-[#1a2744] text-white font-bold">{loc.description}</option>)}
                    </select>
                  </div>
                  <div className="sm:col-span-1 text-black">
                    <label className="text-[10px] font-black text-white/40 tracking-[0.2em] uppercase mb-2 block ml-1">Categoria</label>
                    <select 
                      value={newProduct.categoryId || ''} 
                      onChange={e => setNewProduct({...newProduct, categoryId: e.target.value, subcategoryId: ''})}
                      className="w-full bg-[#1e2a3a] border border-white/10 text-white text-sm font-bold uppercase rounded-xl py-3 px-4 focus:border-cyan-500 outline-none"
                    >
                      <option value="" className="bg-[#1a2744]">Sem Categoria</option>
                      {categories.map(c => <option key={c.id} value={c.id} className="bg-[#1a2744] text-white font-bold">{c.name}</option>)}
                    </select>
                  </div>
                  <div className="sm:col-span-1 text-black">
                    <label className="text-[10px] font-black text-white/40 tracking-[0.2em] uppercase mb-2 block ml-1">Subcategoria</label>
                    <select 
                      value={newProduct.subcategoryId || ''} 
                      onChange={e => setNewProduct({...newProduct, subcategoryId: e.target.value})}
                      disabled={!newProduct.categoryId}
                      className="w-full bg-[#1e2a3a] border border-white/10 text-white text-sm font-bold uppercase rounded-xl py-3 px-4 disabled:opacity-30 focus:border-cyan-500 outline-none"
                    >
                      <option value="" className="bg-[#1a2744]">Sem Subcategoria</option>
                      {subcategories.filter(s => s.categoryId === newProduct.categoryId).map(s => <option key={s.id} value={s.id} className="bg-[#1a2744] text-white font-bold">{s.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="md:col-span-4 mt-6 md:mt-12 flex flex-col sm:flex-row justify-end gap-3 md:gap-4 border-t border-white/10 pt-6 md:pt-8 text-black">
                  <button 
                    type="button"
                    onClick={() => { setShowForm(false); setEditingId(null); }}
                    className="w-full sm:w-auto px-8 py-4 rounded-xl text-sm font-bold uppercase tracking-widest bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors order-2 sm:order-1"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto px-8 py-4 rounded-xl text-sm font-bold uppercase tracking-widest bg-cyan-500 text-black hover:bg-cyan-400 transition-colors disabled:opacity-50 disabled:cursor-wait flex items-center justify-center gap-3 order-1 sm:order-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                        <span>Salvando...</span>
                      </>
                    ) : (
                      editingId ? 'Salvar Alterações' : 'Finalizar Cadastro'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedLabelProduct && (
          <LabelPrintModal 
            product={selectedLabelProduct} 
            labelConfig={labelConfig} 
            onClose={() => setSelectedLabelProduct(null)} 
            imprimirEtiqueta={imprimirEtiqueta}
            addToLabelLot={addToLabelLot}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function QuickCustomerForm({ 
  onSubmit, 
  onCancel 
}: { 
  onSubmit: (data: any) => void, 
  onCancel: () => void 
}) {
  const [data, setData] = useState({ 
    name: '', 
    whatsapp: '', 
    taxId: '',
    address: { street: '', number: '', neighborhood: '', city: '', state: '', cep: '', complement: '' } 
  });

  const handleSave = () => {
    if (!data.name.trim()) return alert('O nome é obrigatório');
    onSubmit({
      ...data,
      email: '', dob: '', image: '',
    });
  };

  return (
    <form 
      onSubmit={(e) => {
        e.preventDefault();
        handleSave();
      }}
      className="space-y-6"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5 md:col-span-2">
          <label className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Nome Completo *</label>
          <input 
            className="glass-input w-full px-5 py-4 rounded-2xl outline-none font-bold text-sm text-white placeholder:text-white/10 uppercase"
            value={data.name} 
            onChange={e => setData({...data, name: e.target.value})} 
            placeholder="Ex: João Silva" 
            autoFocus 
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">WhatsApp / Telefone</label>
          <input 
            className="glass-input w-full px-5 py-4 rounded-2xl outline-none font-bold text-sm text-white placeholder:text-white/10 uppercase"
            value={data.whatsapp} 
            onChange={e => setData({...data, whatsapp: e.target.value})} 
            placeholder="(00) 00000-0000" 
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Número</label>
          <input 
            className="glass-input w-full px-5 py-4 rounded-2xl outline-none font-bold text-sm text-white placeholder:text-white/10 uppercase"
            value={data.address.number} 
            onChange={e => setData({...data, address: {...data.address, number: e.target.value}})} 
            placeholder="123"
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          />
        </div>

        <div className="space-y-1.5 md:col-span-2">
          <label className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Rua / Logradouro</label>
          <input 
            className="glass-input w-full px-5 py-4 rounded-2xl outline-none font-bold text-sm text-white placeholder:text-white/10 uppercase"
            value={data.address.street} 
            onChange={e => setData({...data, address: {...data.address, street: e.target.value}})} 
            placeholder="Av. Principal" 
          />
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <button 
          type="button"
          onClick={onCancel} 
          className="flex-1 py-4 bg-white/5 border border-white/10 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all active:scale-95"
        >
          Cancelar
        </button>
        <button 
          type="submit"
          className="flex-[2] py-4 bg-purple-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-purple-500 shadow-xl shadow-purple-600/20 transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <Check size={16} /> Salvar e Selecionar
        </button>
      </div>
    </form>
  );
}

function OrderDetailsModal({ 
  sale, 
  onClose, 
  company, 
  couponConfig, 
  imprimirCupom, 
  generateReceiptHTML,
  performUnifiedPrint,
  products,
  customers,
  paymentIcons,
  setSelectedLabelProduct
}: { 
  sale: Sale, 
  onClose: () => void, 
  company: any, 
  couponConfig: CouponConfig, 
  imprimirCupom: (sale: Sale | string) => Promise<boolean>,
  generateReceiptHTML: any,
  performUnifiedPrint: any,
  products: Product[],
  customers: Customer[],
  paymentIcons: Record<string, string>,
  setSelectedLabelProduct: (p: Product | null) => void
}) {
  const customer = customers.find(c => c.id === sale.customerId);

  const handlePrintAction = async (type: 'pdf' | 'print') => {
    const isPDF = type === 'pdf' || (type === 'print' && (couponConfig.outputType === 'pdf' || couponConfig.printMode === 'browser'));

    if (isPDF) {
      const html = await generateReceiptHTML(sale, products, customers, company, couponConfig);
      const dims = getPaperDimensions(couponConfig);
      return performUnifiedPrint('cupom', html, couponConfig.printerName || '', 'browser', {
        width: dims.widthMm,
        height: dims.heightMm,
        format: couponConfig.format,
        orientation: couponConfig.orientation,
        outputType: 'pdf'
      }, type === 'pdf' ? 'download' : 'print');
    } else {
      return await imprimirCupom(sale);
    }
  };

  const getStatusLabel = (status: Sale['status']) => {
    switch (status) {
      case 'pendente': return 'Pendente';
      case 'em_separacao': return 'Em Separação';
      case 'separado': return 'Separado';
      case 'falta_confirmada': return 'Falta Confirmada';
      case 'embalado': return 'Embalado';
      case 'enviado': return 'Enviado';
      case 'entregue': return 'Entregue';
      case 'cancelado': return 'Cancelado';
      default: return 'Pendente';
    }
  };

  const getStatusColor = (status: Sale['status']) => {
    switch (status) {
      case 'pendente': return 'bg-orange-950/30 text-orange-400 border-orange-900/50';
      case 'em_separacao': return 'bg-indigo-950/30 text-indigo-400 border-indigo-900/50';
      case 'separado': return 'bg-blue-950/30 text-blue-400 border-blue-900/50';
      case 'falta_confirmada': return 'bg-amber-950/30 text-amber-400 border-amber-900/50';
      case 'embalado': return 'bg-purple-950/30 text-purple-400 border-purple-900/50';
      case 'enviado': return 'bg-emerald-950/30 text-emerald-400 border-emerald-900/50';
      case 'entregue': return 'bg-zinc-800 text-zinc-100 border-transparent';
      case 'cancelado': return 'bg-red-950/30 text-red-400 border-red-900/50';
      default: return 'bg-orange-950/30 text-orange-400 border-orange-900/50';
    }
  };

  const originalTotal = (sale.originalItems || sale.items).reduce((acc, i) => acc + (i.price * i.quantity), 0);
  const diffTotal = originalTotal - sale.total;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-zinc-900 w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden relative border border-zinc-800 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-8 border-b border-zinc-800 shrink-0">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="text-xl font-black text-zinc-100 uppercase tracking-widest flex items-center gap-2">
                <ShoppingBag className="text-[#5d5dff]" size={24} />
                Pedido #{sale.sequentialId || sale.id.substring(0,8)}
              </h4>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">
                {new Date(sale.date).toLocaleString('pt-BR')}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-xl border ${getStatusColor(sale.status)}`}>
                {getStatusLabel(sale.status)}
              </span>
              <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-500 transition-all">
                <X size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto space-y-8 no-scrollbar">
          {/* Section: Dados Gerais */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h5 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <User size={12} /> Cliente
              </h5>
              <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800">
                <p className="text-sm font-black text-zinc-100 uppercase">{customer?.name || 'Cliente de Balcão'}</p>
                {customer?.whatsapp && <p className="text-[10px] text-zinc-500 font-bold mt-1">{customer.whatsapp}</p>}
                {sale.notes && (
                  <div className="mt-3 pt-3 border-t border-zinc-900">
                    <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-tighter mb-1">Observações:</p>
                    <p className="text-[10px] text-zinc-400 italic font-medium">{sale.notes}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h5 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <Info size={12} /> Origem da Venda
              </h5>
              <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800">
                <p className="text-[10px] text-zinc-500 font-bold uppercase mb-1">Vendedor (PDV):</p>
                <p className="text-xs font-black text-zinc-100 uppercase">{sale.soldByUserName || 'Automático'}</p>
                <p className="text-[9px] text-zinc-600 font-bold mt-2 uppercase">Canal:</p>
                <p className="text-xs font-black text-[#5d5dff] uppercase">Venda Presencial / Balcão</p>
              </div>
            </div>
          </div>

          {/* Section: Fluxo do Pedido */}
          <div className="space-y-4">
            <h5 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
              <Clock size={12} /> Linha do Tempo / Fluxo
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Venda Realizada */}
              <div className="bg-zinc-950/50 p-3 rounded-xl border border-zinc-800/50 space-y-1">
                <p className="text-[8px] font-black text-zinc-600 uppercase">1. Venda</p>
                <p className="text-[9px] font-black text-zinc-300 uppercase truncate">{sale.soldByUserName || 'Sistema'}</p>
                <p className="text-[8px] text-emerald-500 font-bold">{new Date(sale.date).toLocaleTimeString('pt-BR')}</p>
              </div>

              {/* Início de Separação */}
              {sale.startedSeparationByUserName && (
                <div className="bg-zinc-950/50 p-3 rounded-xl border border-zinc-800/50 space-y-1">
                  <p className="text-[8px] font-black text-zinc-600 uppercase">2. Iniciou Sep.</p>
                  <p className="text-[9px] font-black text-indigo-400 uppercase truncate">{sale.startedSeparationByUserName}</p>
                  {sale.startedSeparationAt && (
                    <p className="text-[8px] text-zinc-500 font-bold">{new Date(sale.startedSeparationAt).toLocaleTimeString('pt-BR')}</p>
                  )}
                </div>
              )}

              {/* Finalização de Separação / Conferência */}
              {sale.separatedByUserName && (
                <div className="bg-zinc-950/50 p-3 rounded-xl border border-zinc-800/50 space-y-1">
                  <p className="text-[8px] font-black text-zinc-600 uppercase">3. Finalizou Sep.</p>
                  <p className="text-[9px] font-black text-blue-400 uppercase truncate">{sale.separatedByUserName}</p>
                  {sale.separatedByAt && (
                    <p className="text-[8px] text-zinc-500 font-bold uppercase">{new Date(sale.separatedByAt).toLocaleTimeString('pt-BR')}</p>
                  )}
                  {sale.status === 'falta_confirmada' && (
                    <div className="mt-1">
                      <div className="text-[7px] bg-amber-500/10 text-amber-500 px-1 py-0.5 rounded font-black uppercase text-center">Falta Confirmada</div>
                      {sale.missingConfirmedByUserName && sale.missingConfirmedByUserName !== sale.separatedByUserName && (
                        <p className="text-[6px] text-zinc-600 font-bold uppercase text-center mt-0.5">Por: {sale.missingConfirmedByUserName}</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Embalagem */}
              {sale.packedByUserName && (
                <div className="bg-zinc-950/50 p-3 rounded-xl border border-zinc-800/50 space-y-1">
                  <p className="text-[8px] font-black text-zinc-600 uppercase">4. Embalou</p>
                  <p className="text-[9px] font-black text-purple-400 uppercase truncate">{sale.packedByUserName}</p>
                  <p className="text-[8px] text-zinc-500 font-bold uppercase">Status: {getStatusLabel(sale.status)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Section: Itens */}
          <div className="space-y-4">
            <h5 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
              <Package size={12} /> Itens do Pedido
            </h5>
            <div className="bg-zinc-950 rounded-2xl border border-zinc-800 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-black/40 border-b border-zinc-800 text-[8px] font-black text-zinc-600 uppercase tracking-tighter">
                    <th className="px-4 py-3">Produto</th>
                    <th className="px-4 py-3 text-center">Pedida</th>
                    <th className="px-4 py-3 text-center">Enviada</th>
                    <th className="px-4 py-3 text-center">Falta</th>
                    <th className="px-4 py-3 text-right">Preço</th>
                    <th className="px-4 py-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {/* All items from original requested list */}
                  {(sale.originalItems || sale.items).map((oi, idx) => {
                    const si = sale.items.find(i => i.productId === oi.productId);
                    const p = products.find(prod => prod.id === oi.productId);
                    const requestedQty = oi.quantity;
                    const sentQty = si ? si.quantity : 0;
                    const missingQty = Math.max(0, requestedQty - sentQty);
                    
                    return (
                      <tr key={idx} className="text-zinc-400 group hover:bg-zinc-900/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                             <p className="text-[10px] font-black text-zinc-200 uppercase truncate max-w-[150px]">{products.find(p => p.id === oi.productId)?.name || 'Produto Removido'}</p>
                             <button 
                               onClick={() => {
                                 const p = products.find(prod => prod.id === oi.productId);
                                 if (p) setSelectedLabelProduct(p);
                               }}
                               className="text-zinc-500 hover:text-blue-400 transition-colors"
                             >
                               <Printer size={10} />
                             </button>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center font-black text-zinc-500 text-[10px]">{requestedQty}</td>
                        <td className="px-4 py-3 text-center font-black text-zinc-300 text-[10px]">{sentQty}</td>
                        <td className="px-4 py-3 text-center">
                          {missingQty > 0 ? (
                            <span className="text-[9px] font-black text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded">{missingQty}</span>
                          ) : (
                            <span className="text-[8px] text-zinc-800 font-bold">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-[10px] font-bold">R$ {oi.price.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-[10px] font-black text-zinc-100 italic">R$ {(sentQty * oi.price).toFixed(2)}</td>
                      </tr>
                    );
                  })}
                  {/* Extra items included manually during separation (if any) */}
                  {sale.items.filter(i => ! (sale.originalItems || []).some(oi => oi.productId === i.productId)).map((extraItem, idx) => {
                    return (
                      <tr key={`extra-${idx}`} className="bg-emerald-500/5 text-emerald-400 italic">
                        <td className="px-4 py-3">
                          <p className="text-[10px] font-black uppercase truncate max-w-[150px]">{products.find(p => p.id === extraItem.productId)?.name || 'Prod. Extra'}</p>
                          <span className="text-[7px] font-black bg-emerald-500/20 text-emerald-500 px-1 rounded uppercase">Inclusão Manual</span>
                        </td>
                        <td className="px-4 py-3 text-center font-black text-[10px]">0</td>
                        <td className="px-4 py-3 text-center font-black text-[10px]">{extraItem.quantity}</td>
                        <td className="px-4 py-3 text-center text-[8px] font-bold">-</td>
                        <td className="px-4 py-3 text-right text-[10px] font-bold">R$ {extraItem.price.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-[10px] font-black">R$ {(extraItem.quantity * extraItem.price).toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section: Financeiro */}
          <div className="bg-zinc-950 p-6 rounded-[2rem] border border-zinc-800 flex flex-col md:flex-row justify-between gap-6">
              <div className="space-y-4">
                <h5 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                  <CreditCard size={12} /> Pagamento
                </h5>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-black text-zinc-100 uppercase">
                    <span>{paymentIcons?.[sale.paymentMethod || ''] || '📦'}</span>
                    <span>{sale.paymentMethod || 'Não informado'}</span>
                  </div>
                  {sale.payments && sale.payments.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      {sale.payments.map((p, i) => (
                        <div key={i} className="flex justify-between items-center text-[9px] bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800">
                          <div className="flex items-center gap-1">
                            <span>{paymentIcons?.[p.method || ''] || '📦'}</span>
                            <span className="text-zinc-500 font-bold">{p.method}</span>
                          </div>
                          <span className="text-zinc-300 font-black">R$ {p.amount.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            <div className="flex flex-col items-end gap-2 shrink-0 md:min-w-[200px]">
              <div className="flex justify-between w-full text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">
                <span>Total Bruto (Original):</span>
                <span>R$ {originalTotal.toFixed(2)}</span>
              </div>
              {diffTotal > 0 && (
                <div className="flex justify-between w-full text-[10px] font-bold text-amber-500 uppercase tracking-tighter">
                  <span>Desconto por Faltas:</span>
                  <span>- R$ {diffTotal.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between w-full items-center pt-2 mt-2 border-t border-dashed border-zinc-800">
                <span className="text-xs font-black text-zinc-100 uppercase tracking-widest leading-none">Total à Receber:</span>
                <span className="text-2xl font-black text-[#5d5dff] italic">R$ {sale.total.toFixed(2)}</span>
              </div>
            </div>

            {sale.returns && sale.returns.length > 0 && (
              <div className="mt-8 space-y-4">
                <h5 className="text-[10px] font-black text-red-500 uppercase tracking-widest flex items-center gap-2">
                  <RotateCcw size={12} /> Devoluções Realizadas
                </h5>
                <div className="space-y-3">
                  {sale.returns.map(ret => (
                    <div key={ret.id} className="bg-red-500/5 border border-red-500/10 p-4 rounded-2xl space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-[10px] font-black text-red-400 uppercase">Data: {new Date(ret.date).toLocaleString()}</p>
                          <p className="text-[9px] font-bold text-zinc-500 uppercase">Responsável: {ret.userName}</p>
                        </div>
                        <span className="text-[8px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-black uppercase tracking-widest">Realizada</span>
                      </div>
                      <div className="space-y-1">
                        {ret.items.map(ri => {
                          const p = products.find(prod => prod.id === ri.productId);
                          return (
                            <p key={ri.productId} className="text-[10px] font-bold text-zinc-300">
                              • {ri.quantity}x {p?.name || 'Item'}
                            </p>
                          );
                        })}
                      </div>
                      {ret.reason && (
                        <p className="text-[9px] text-zinc-500 italic mt-2 border-t border-red-500/10 pt-2">
                          "{ret.reason}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 bg-zinc-950 border-t border-zinc-800 shrink-0 flex gap-4">
          <button 
            onClick={() => handlePrintAction(couponConfig.printMode === 'auto' ? 'print' : 'pdf')}
            className="flex-1 bg-[#5d5dff] text-white p-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
          >
            {getPrintIcon(couponConfig.printMode, 18)} {getPrintLabel(couponConfig.printMode, "Imprimir Comprovante")}
          </button>
          <button 
            onClick={onClose}
            className="px-8 bg-zinc-800 text-zinc-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-zinc-700 hover:text-white transition-all flex items-center justify-center"
          >
            Fechar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ReceiptModal({ 
  sale, 
  products, 
  onClose, 
  customers,
  company,
  couponConfig,
  couponPDVConfig,
  onConfirm,
  isFinalized = true,
  imprimirCupom,
  imprimirPedidoPDV,
  generateReceiptHTML,
  generateSimpleReceiptHTML,
  performUnifiedPrint,
  onGoToSeparation,
  paymentIcons,
  isSubmitting = false
}: { 
  sale: Sale, 
  products: Product[], 
  onClose: () => void, 
  customers: Customer[],
  company: CompanyInfo,
  couponConfig: CouponConfig,
  couponPDVConfig?: CouponPDVConfig,
  onConfirm?: () => void,
  isFinalized?: boolean,
  imprimirCupom: (saleOrHtml: Sale | string) => Promise<boolean>,
  imprimirPedidoPDV: (sale: Sale) => Promise<boolean>,
  generateReceiptHTML: any,
  generateSimpleReceiptHTML: any,
  performUnifiedPrint: any,
  onGoToSeparation?: () => void,
  paymentIcons: Record<string, string>,
  isSubmitting?: boolean
}) {
  const customer = customers.find(c => c.id === sale.customerId);
  const [pdvQrUrl, setPdvQrUrl] = useState<string>('');

  useEffect(() => {
    if (couponPDVConfig?.showQrCode) {
      QRCode.toDataURL(sale.sequentialId || sale.id).then(setPdvQrUrl);
    }
  }, [sale.id, sale.sequentialId, couponPDVConfig?.showQrCode]);

  const handlePrint = async (type: 'pdf' | 'print') => {
    const isPDF = type === 'pdf' || (type === 'print' && (couponConfig.outputType === 'pdf' || couponConfig.printMode === 'browser'));

    if (isFinalized) {
      if (type === 'print') {
        return await imprimirPedidoPDV(sale);
      } else {
        // Para PDF no PDV finalizado, usamos o mesmo gerador Moderno do PDV
        const html = await generateSimpleReceiptHTML(sale, company, couponPDVConfig || INITIAL_COUPON_PDV_CONFIG);
        const dims = getPaperDimensions(couponPDVConfig || INITIAL_COUPON_PDV_CONFIG);
        return performUnifiedPrint('cupom-pdv', html, couponPDVConfig?.printerName || '', 'browser', {
          width: dims.widthMm,
          height: dims.heightMm,
          format: couponPDVConfig?.format || '80mm',
          orientation: couponPDVConfig?.orientation || 'portrait',
          outputType: 'pdf'
        }, 'download');
      }
    }

    if (isPDF) {
      // Modernized approach: Use generateReceiptHTML + performUnifiedPrint for all PDFs
      const html = await generateReceiptHTML(sale, products, customers, company, couponConfig);
      const dims = getPaperDimensions(couponConfig);
      return performUnifiedPrint('cupom', html, couponConfig.printerName || '', 'browser', {
        width: dims.widthMm,
        height: dims.heightMm,
        format: couponConfig.format,
        orientation: couponConfig.orientation,
        outputType: 'pdf'
      }, type === 'pdf' ? 'download' : 'print');
    } else {
      // Normal print
      return await imprimirCupom(sale);
    }
  };

  if (isFinalized) {
    return (
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        className="fixed inset-0 z-[500] flex items-center justify-center bg-black/90 p-4 overflow-y-auto"
      >
        <motion.div 
          initial={{ scale: 0.95, y: 20 }} 
          animate={{ scale: 1, y: 0 }} 
          className="w-full max-w-[420px] max-h-[90vh] overflow-y-auto custom-scrollbar relative flex flex-col items-center py-4 bg-[#0d0d0d] rounded-[2.5rem] shadow-2xl border border-white/5"
        >
          {/* Botão Fechar */}
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 w-10 h-10 border-none rounded-xl bg-white/5 text-white/40 cursor-pointer flex items-center justify-center hover:bg-white/10 hover:text-white transition-all z-10"
          >
            <X size={20} />
          </button>

          <div className="w-full px-6 flex flex-col items-center">
            <h1 className="text-white text-2xl font-black tracking-tighter text-center">
              {couponPDVConfig?.headerMessage || 'Pedido Criado'}
            </h1>

            <div className="w-12 h-1 bg-[#16d45f] rounded-full my-3"></div>

            <div className="bg-[#16d45f]/10 text-[#16d45f] px-4 py-1.5 rounded-full font-black text-[9px] tracking-widest border border-[#16d45f]/20 uppercase mb-6">
              OPERAÇÃO FINALIZADA
            </div>

            <div className="w-full bg-white rounded-[2rem] p-6 md:p-8 flex flex-col items-center shadow-xl mb-6">
              <span className="text-[#888] text-[9px] font-black tracking-widest uppercase mb-1">
                NÚMERO DO PEDIDO
              </span>

              <h2 className="text-[32px] md:text-[40px] text-zinc-900 font-black leading-none mb-4">
                #{sale.sequentialId}
              </h2>

              <div className="w-full h-px bg-zinc-100 mb-4"></div>

              {pdvQrUrl && (
                <div className="w-full flex justify-center mb-6">
                  <img
                    src={pdvQrUrl}
                    className="w-32 h-32 md:w-40 md:h-40"
                    alt="QR Code"
                  />
                </div>
              )}

            <div className="w-full space-y-4">
              {couponPDVConfig?.showDateTime !== false && (
                <>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-[#16d45f]/10 text-[#16d45f] flex items-center justify-center shadow-sm">
                      <Calendar size={18} />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[#8b8b8b] text-[9px] font-bold uppercase block tracking-wider">FINALIZADO EM</span>
                      <p className="text-sm font-black text-zinc-900 truncate uppercase">
                        {new Date(sale.date).toLocaleDateString('pt-BR')} {new Date(sale.date).toLocaleTimeString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <div className="w-full h-px bg-zinc-100"></div>
                </>
              )}

              {couponPDVConfig?.showSoldBy !== false && (
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-[#16d45f]/10 text-[#16d45f] flex items-center justify-center shadow-sm">
                    <User size={18} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[#8b8b8b] text-[9px] font-bold uppercase block tracking-wider">VENDEDOR</span>
                    <p className="text-sm font-black text-zinc-900 truncate uppercase">
                      {sale.soldByUserName || 'SISTEMA'}
                    </p>
                  </div>
                </div>
              )}
            </div>
            </div>

            <div className="w-full grid grid-cols-2 gap-3 mb-2">
              <button 
                onClick={() => handlePrint(couponPDVConfig?.printMode === 'auto' ? 'print' : 'pdf')}
                className={`py-3 md:py-4 rounded-xl text-white text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 ${
                  couponPDVConfig?.printMode === 'auto' ? 'bg-orange-600 hover:bg-orange-500 shadow-orange-600/20' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20'
                }`}
              >
                {couponPDVConfig?.printMode === 'auto' ? (
                  <><Printer size={16} /> IMPRIMIR</>
                ) : (
                  <><FileText size={16} /> GERAR PDF</>
                )}
              </button>

              <button 
                onClick={onClose}
                className="py-3 md:py-4 rounded-xl bg-[#16d45f] text-white text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:bg-[#14cc5a] transition-all shadow-lg shadow-[#16d45f]/20 active:scale-95 flex items-center justify-center gap-2"
              >
                <CheckCircle size={16} /> CONCLUIR
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      className="fixed inset-0 z-[500] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
    >
      <motion.div 
        initial={{ scale: 0.95, y: 20 }} 
        animate={{ scale: 1, y: 0 }} 
        className="bg-white p-8 md:p-10 max-w-sm w-full space-y-8 shadow-3xl rounded-[2.5rem] relative overflow-y-auto flex flex-col max-h-[95vh] custom-scrollbar border border-zinc-200"
      >
        <div className={`absolute top-0 left-0 w-full h-2 rounded-t-[2.5rem] bg-blue-600`} />
        
        {onConfirm && (
          <button 
            onClick={onClose}
            className="absolute top-8 right-8 p-2.5 bg-zinc-100 text-zinc-400 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all active:scale-95 border border-zinc-200"
          >
            <X size={18} />
          </button>
        )}

        <div className="text-center space-y-4">
          {company.logo && (
            <div className="relative inline-block">
               <img src={company.logo} className="relative w-16 h-16 object-contain mx-auto bg-white p-2 rounded-2xl border border-zinc-100 shadow-xl" />
            </div>
          )}
          <div className="space-y-1">
            <h4 className="text-2xl font-black text-zinc-900 uppercase tracking-tighter">Resumo da Venda</h4>
            <div className="h-1 w-10 mx-auto rounded-full bg-blue-500" />
          </div>
          
          <div className="inline-block px-4 py-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 text-[10px] font-black uppercase tracking-widest">
            Conferir Detalhes
          </div>
        </div>

        <div className="bg-zinc-50 border border-zinc-200 p-6 rounded-[2rem] max-h-[45vh] overflow-y-auto no-scrollbar font-mono text-[10px] space-y-3 text-zinc-800 shadow-inner">
          <div className="text-center space-y-1 mb-4">
                 <p className="font-black uppercase text-base tracking-tighter text-black">{company.tradeName || company.name}</p>
                 <p className="text-[8px] opacity-60 font-black uppercase tracking-widest text-black">
                   CNPJ: {company.idNumber || '---'}
                 </p>
               </div>
               
               <div className="border-t border-zinc-200 border-dashed my-4"></div>
               
               {sale.items.map((item, idx) => {
                 const p = products.find(prod => prod.id === item.productId);
                 const originalPrice = p?.price || item.price;
                 const discount = originalPrice - item.price;
                 return (
                   <div key={idx} className="space-y-0.5">
                     <div className="flex justify-between font-black uppercase text-black">
                       <span className="truncate pr-4">{item.quantity}x {p?.name || 'ITEM'}</span>
                       <span className="shrink-0">R$ {(item.price * item.quantity).toFixed(2)}</span>
                     </div>
                     {couponConfig.showDiscount && discount > 0 && (
                       <div className="flex justify-between text-[8px] text-red-500 font-black italic">
                         <span>DESCONTO ATACADO</span>
                         <span>- R$ {(discount * item.quantity).toFixed(2)}</span>
                       </div>
                     )}
                   </div>
                 );
               })}
               
               <div className="border-t border-zinc-200 border-dashed my-3"></div>
               
               <div className="flex justify-between font-black text-sm pt-1 text-black">
                 <span>TOTAL GERAL</span>
                 <span>R$ {sale.total.toFixed(2)}</span>
               </div>

               <div className="space-y-1 mt-3 pt-3 border-t border-zinc-100">
                 <p className="font-black text-[9px] uppercase border-b border-zinc-50 pb-1 mb-2 text-black">Forma de Pagamento</p>
                 {sale.payments && sale.payments.length > 0 ? (
                   sale.payments.map((p, i) => (
                     <div key={i} className="flex justify-between text-[9px] uppercase font-black text-black">
                       <div className="flex items-center gap-1">
                         <span>{paymentIcons?.[p.method || ''] || '📦'}</span>
                         <span>{p.method}</span>
                       </div>
                       <span>R$ {p.amount.toFixed(2)}</span>
                     </div>
                   ))
                 ) : (
                   <div className="flex justify-between text-[9px] uppercase font-black text-black">
                     <div className="flex items-center gap-1">
                       <span>{paymentIcons?.[sale.paymentMethod || ''] || '📦'}</span>
                       <span>{sale.paymentMethod}</span>
                     </div>
                     <span>R$ {sale.total.toFixed(2)}</span>
                   </div>
                 )}
               </div>

               {(sale.change || 0) > 0 && (
                 <div className="flex justify-between text-[10px] uppercase text-emerald-600 font-black mt-2 pt-1 border-t border-zinc-100">
                   <span>Troco</span>
                   <span>R$ {(sale.change || 0).toFixed(2)}</span>
                 </div>
               )}

               {customer && couponConfig.showCustomer && (
                 <div className="mt-4 pt-2 border-t border-zinc-100 italic space-y-0.5 text-[9px] text-zinc-600">
                   <p className="font-black uppercase text-black">Destinatário:</p>
                   <p>{customer.name}</p>
                   {customer.whatsapp && <p>Whats: {customer.whatsapp}</p>}
                   {customer.address && (
                     <>
                       <p>{customer.address.street}, {customer.address.number}</p>
                       <p>{customer.address.neighborhood} - {customer.address.city}/{customer.address.state}</p>
                       <p>CEP: {customer.address.cep}</p>
                     </>
                   )}
                 </div>
               )}

               <div className="text-center pt-4 opacity-50 uppercase text-[8px] text-zinc-400">
                 {couponConfig.defaultMessage}
               </div>
        </div>

        <div className="flex flex-col gap-3">
          {!isFinalized && onConfirm ? (
            <button 
              onClick={onConfirm}
              disabled={isSubmitting}
              className="glass-button-primary w-full py-5 bg-emerald-600/80 hover:bg-emerald-600 text-xs shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check size={20} className={isSubmitting ? 'animate-spin' : ''} /> 
              {isSubmitting ? 'Finalizando...' : 'Concluir Venda'}
            </button>
          ) : (
            <div className="grid grid-cols-1 gap-2">
               <button 
                 onClick={() => handlePrint('print')}
                 className="glass-button-primary w-full py-3 text-[9px] uppercase font-black"
                 title={getPrintLabel(couponConfig.printMode, "Imprimir Cupom")}
               >
                 {getPrintIcon(couponConfig.printMode, 16)} {getPrintLabel(couponConfig.printMode)}
               </button>
            </div>
          )}
          
          {isFinalized && onGoToSeparation && (
            <button 
              onClick={onGoToSeparation}
              className="glass-button-primary w-full py-3 bg-orange-600/80 hover:bg-orange-600 text-[9px] uppercase font-black"
            >
              <Clock size={16} /> Ir para Separação
            </button>
          )}

          {isFinalized && (
            <button 
              onClick={onClose}
              className="glass-button-secondary w-full py-3 text-[9px] uppercase font-black tracking-widest"
            >
              Concluir e Fechar
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function SalesHistoryView({ 
  sales, 
  products, 
  onCancel, 
  customers,
  company,
  couponConfig,
  imprimirCupom,
  imprimirPedidoPDV,
  generateReceiptHTML,
  generateSimpleReceiptHTML,
  performUnifiedPrint,
  canEdit,
  currentUser,
  roles,
  paymentIcons,
  setSelectedLabelProduct
}: { 
  sales: Sale[], 
  products: Product[], 
  onCancel?: (id: string) => void, 
  customers: Customer[],
  company: CompanyInfo,
  couponConfig: CouponConfig,
  imprimirCupom: (sale: Sale | string, customTitle?: string) => Promise<any>,
  imprimirPedidoPDV: (sale: Sale) => Promise<boolean>,
  generateReceiptHTML: any,
  generateSimpleReceiptHTML: any,
  performUnifiedPrint: any,
  canEdit?: boolean,
  currentUser: SystemUser | null,
  roles: Role[],
  paymentIcons: Record<string, string>,
  setSelectedLabelProduct: (p: Product | null) => void
}) {
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [statusFilter, setStatusFilter] = useState<'todos' | Sale['status']>('todos');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSales = useMemo(() => {
    let list = [...sales];

    if (!isUserAdmin(currentUser, roles)) {
      list = list.filter(s => s.soldByUserId === currentUser?.id);
    }
    
    // Status Filter
    if (statusFilter !== 'todos') {
      list = list.filter(s => (s.status || 'pendente') === statusFilter);
    }

    // Search Term Filter
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      list = list.filter(s => {
        const customer = customers.find(c => c.id === s.customerId);
        return (
          s.sequentialId?.toLowerCase().includes(lowerSearch) ||
          customer?.name.toLowerCase().includes(lowerSearch) ||
          s.items.some(item => {
            const p = products.find(prod => prod.id === item.productId);
            return p?.name.toLowerCase().includes(lowerSearch) || p?.sku?.toLowerCase().includes(lowerSearch);
          })
        );
      });
    }

    return list.sort((a, b) => b.date - a.date);
  }, [sales, statusFilter, searchTerm, customers, products, currentUser]);

  const getStatusLabel = (status: Sale['status']) => {
    switch (status) {
      case 'pendente': return 'Pendente';
      case 'em_separacao': return 'Em Separação';
      case 'separado': return 'Separado';
      case 'falta_confirmada': return 'Falta Confirmada';
      case 'embalado': return 'Embalado';
      case 'enviado': return 'Enviado';
      case 'entregue': return 'Entregue';
      case 'cancelado': return 'Cancelado';
      default: return 'Pendente';
    }
  };

  const getStatusColor = (status: Sale['status']) => {
    switch (status) {
      case 'pendente': return 'bg-orange-950/30 text-orange-400 border-orange-900/50';
      case 'em_separacao': return 'bg-indigo-950/30 text-indigo-400 border-indigo-900/50';
      case 'separado': return 'bg-blue-950/30 text-blue-400 border-blue-900/50';
      case 'falta_confirmada': return 'bg-amber-950/30 text-amber-400 border-amber-900/50';
      case 'embalado': return 'bg-purple-950/30 text-purple-400 border-purple-900/50';
      case 'enviado': return 'bg-emerald-950/30 text-emerald-400 border-emerald-900/50';
      case 'entregue': return 'bg-zinc-800 text-zinc-100 border-transparent';
      case 'cancelado': return 'bg-red-950/30 text-red-400 border-red-900/50';
      default: return 'bg-orange-950/30 text-orange-400 border-orange-900/50';
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-4">
      <AnimatePresence>
        {selectedSale && (
          <OrderDetailsModal 
            sale={selectedSale} 
            products={products} 
            customers={customers}
            company={company}
            couponConfig={couponConfig}
            onClose={() => setSelectedSale(null)} 
            imprimirCupom={imprimirCupom}
            generateReceiptHTML={generateReceiptHTML}
            performUnifiedPrint={performUnifiedPrint}
            paymentIcons={paymentIcons}
            setSelectedLabelProduct={setSelectedLabelProduct}
          />
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between shrink-0 px-2">
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar w-full md:w-auto">
          {[
            { id: 'todos', label: 'Todas' },
            { id: 'pendente', label: 'Pendentes' },
            { id: 'em_separacao', label: 'Em Separação' },
            { id: 'separado', label: 'Separado' },
            { id: 'falta_confirmada', label: 'Falta Conf.' },
            { id: 'embalado', label: 'Embalado' },
            { id: 'enviado', label: 'Enviado' },
            { id: 'entregue', label: 'Entregue' },
            { id: 'cancelado', label: 'Canceladas' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id as any)}
              className={`px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all whitespace-nowrap border ${
                statusFilter === f.id 
                  ? 'bg-blue-600 text-white shadow-lg border-blue-500/50' 
                  : 'bg-[#1a2744] border-white/5 text-white/40 hover:text-white'
              }`}
            >
              {f.label}
              <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[8px] ${statusFilter === f.id ? 'bg-white/20' : 'bg-white/5'}`}>
                {f.id === 'todos' ? sales.length : sales.filter(s => (s.status || 'pendente') === f.id).length}
              </span>
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#334155]" size={14} />
          <input 
            type="text"
            placeholder="Buscar pedido ou cliente..."
            className="w-full bg-[#0d1c30] border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-[10px] font-black text-white uppercase outline-none focus:ring-1 ring-pink-500/30 transition-all placeholder:text-[#334155]"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-[#0d1c30] rounded-2xl border border-white/5 shadow-inner overflow-hidden flex flex-col">
        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto no-scrollbar overflow-y-auto flex-1">
          <table className="w-full text-left">
            <thead className="sticky top-0 z-20">
              <tr className="bg-black/40 border-b border-white/5 text-[9px] font-black text-white/40 uppercase tracking-widest">
                <th className="px-6 py-4">Pedido / Data</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Itens</th>
                <th className="px-6 py-4">Pagamento</th>
                <th className="px-6 py-4 text-right">Total</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {filteredSales.length > 0 ? (
                filteredSales.map((sale) => {
                  const customer = customers.find(c => c.id === sale.customerId);
                  return (
                    <tr key={sale.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-[10px] font-black text-blue-400 mb-0.5 group-hover:text-pink-400 transition-colors">#{sale.sequentialId || sale.id.substring(0, 8)}</p>
                        <p className="text-[8px] font-black text-[#64748b] uppercase">{new Date(sale.date).toLocaleString('pt-BR')}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-[10px] font-black text-white uppercase italic truncate max-w-[150px]">{customer?.name || 'Cliente de Balcão'}</p>
                        {customer?.whatsapp && <p className="text-[8px] text-[#64748b] font-black">{customer.whatsapp}</p>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span className={`text-[7px] font-black uppercase px-2 py-0.5 rounded-lg border ${getStatusColor(sale.status)}`}>
                            {getStatusLabel(sale.status)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          {sale.items.slice(0, 2).map((item, idx) => {
                            const p = products.find(prod => prod.id === item.productId);
                            return (
                              <p key={idx} className="text-[9px] font-black text-[#64748b] uppercase truncate max-w-[200px]">
                                {item.quantity}x {p?.name || 'Prod. Removido'}
                              </p>
                            );
                          })}
                          {sale.items.length > 2 && <p className="text-[8px] font-black text-pink-500 uppercase">+ {sale.items.length - 2} itens</p>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[8px] font-black uppercase px-2 py-1 rounded-lg bg-[#1a2744] text-[#64748b] border border-white/5 flex items-center gap-1 w-fit">
                          <span>{paymentIcons?.[sale.paymentMethod || ''] || '📦'}</span>
                          <span>{sale.paymentMethod}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <p className="text-[10px] font-black text-white italic">R$ {sale.total.toFixed(2)}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => setSelectedSale(sale)} className="p-2 text-[#64748b] hover:text-blue-400 transition-colors flex items-center gap-1 text-[9px] font-black uppercase tracking-widest"><Eye size={12} /> Abrir</button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr><td colSpan={7} className="px-6 py-20 text-center opacity-20 uppercase font-black text-xs italic">Nenhum registro encontrado</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden flex-1 overflow-y-auto no-scrollbar p-4 space-y-3">
          {filteredSales.length > 0 ? (
            filteredSales.map((sale) => {
              const customer = customers.find(c => c.id === sale.customerId);
              return (
                <div key={sale.id} onClick={() => setSelectedSale(sale)} className="bg-[#1a2744] p-5 rounded-2xl border border-white/5 space-y-4 active:scale-[0.98] transition-all">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-blue-400 font-black text-[10px]">#{sale.sequentialId || sale.id.substring(0, 8)}</p>
                      <p className="text-[#64748b] font-black text-[8px] uppercase">{new Date(sale.date).toLocaleString('pt-BR')}</p>
                    </div>
                    <span className={`text-[7px] font-black uppercase px-2 py-1 rounded-lg border ${getStatusColor(sale.status)}`}>
                      {getStatusLabel(sale.status)}
                    </span>
                  </div>
                  
                  <div>
                    <h4 className="text-white font-black text-xs uppercase italic">{customer?.name || 'Cliente de Balcão'}</h4>
                    <div className="mt-2 flex flex-wrap gap-2">
                       <span className="text-[8px] font-black text-[#64748b] uppercase bg-[#0d1c30] px-2 py-1 rounded">{sale.items.reduce((acc, i) => acc + i.quantity, 0)} ITENS</span>
                       <span className="text-[8px] font-black text-[#64748b] uppercase bg-[#0d1c30] px-2 py-1 rounded">{sale.paymentMethod}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-white/5">
                    <p className="text-emerald-400 font-black text-sm italic">R$ {sale.total.toFixed(2)}</p>
                    <div className="flex gap-2">
                       <button 
                         onClick={(e) => { e.stopPropagation(); imprimirCupom(sale); }} 
                         className="w-9 h-9 rounded-xl bg-[#0d1c30] flex items-center justify-center text-white"
                         title={getPrintLabel(couponConfig.printMode, "Imprimir Cupom")}
                       >
                         {getPrintIcon(couponConfig.printMode, 14)}
                       </button>
                       <button onClick={(e) => { e.stopPropagation(); setSelectedSale(sale); }} className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white"><Eye size={14} /></button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-20 text-center opacity-20 uppercase font-black text-xs italic">Nenhuma venda encontrada</div>
          )}
        </div>
      </div>
    </div>
  );
}

function POSView({ 
  view,
  sales,
  products, 
  setSales, 
  setProducts, 
  paymentMethods, 
  paymentIcons,
  addActivity,
  cashierSession,
  addSaleToCashier,
  customers,
  setCustomers,
  deliveryChannels,
  setDeliveryChannels,
  deliveryMethods,
  company,
  couponConfig,
  couponPDVConfig,
  setView,
  imprimirCupom,
  imprimirPedidoPDV,
  generateReceiptHTML,
  generateSimpleReceiptHTML,
  performUnifiedPrint,
  calculateProductCost,
  createRevenueForSale,
  goldCustomerIds,
  currentUser,
  canEdit,
  setRedirectAfterCashier,
  setSelectedLabelProduct,
  setIsMobileMenuOpen,
  setIsRightDrawerOpen,
  orderCounter,
  setOrderCounter
}: { 
  view: View,
  products: Product[], 
  sales: Sale[],
  setSales: any, 
  setProducts: any, 
  paymentMethods: string[], 
  paymentIcons: Record<string, string>,
  addActivity: (type: Activity['type'], action: string, details: string, extra?: Partial<Activity>) => void,
  cashierSession: CashierSession,
  addSaleToCashier: (sale: Sale) => void,
  customers: Customer[],
  setCustomers: any,
  deliveryChannels: DeliveryChannel[],
  setDeliveryChannels: any,
  deliveryMethods: DeliveryMethod[],
  company: CompanyInfo,
  couponConfig: CouponConfig,
  couponPDVConfig: CouponPDVConfig,
  setView: (v: View) => void,
  imprimirCupom: (saleOrHtml: Sale | string) => Promise<boolean>,
  imprimirPedidoPDV: (sale: Sale) => Promise<boolean>,
  calculateProductCost: (productId: string) => number,
  createRevenueForSale: (sale: Sale) => void,
  goldCustomerIds: Set<string>,
  currentUser: SystemUser | null,
  canEdit: boolean,
  setRedirectAfterCashier: (view: View | null) => void,
  setSelectedLabelProduct: (p: Product | null) => void,
  setIsMobileMenuOpen: (v: boolean) => void,
  setIsRightDrawerOpen: (v: boolean) => void,
  orderCounter: number,
  setOrderCounter: (v: number) => void,
  generateReceiptHTML: any,
  generateSimpleReceiptHTML: any,
  performUnifiedPrint: any
}) {
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentMethod, setPaymentMethod] = useState(paymentMethods[0] || 'DINHEIRO');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(() => {
    return deliveryChannels.find(c => c.name.toUpperCase() === 'PDV')?.id || deliveryChannels[0]?.id || null;
  });
  const [selectedPayments, setSelectedPayments] = useState<PaymentEntry[]>([]);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [showChannelModal, setShowChannelModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState<DeliveryChannel | null>(null);
  const [newChannelName, setNewChannelName] = useState('');
  
  const handleSaveChannel = () => {
    if (!canEdit) return;
    if (!newChannelName.trim()) return;
    
    if (editingChannel) {
      // Update
      const updated = deliveryChannels.map(c => 
        c.id === editingChannel.id ? { ...c, name: newChannelName.trim() } : c
      );
      setDeliveryChannels(updated);
      addActivity('ajustes', 'Canal Editado', `Canal de venda ${newChannelName} atualizado.`);
    } else {
      // Create
      const newcomer: DeliveryChannel = {
        id: crypto.randomUUID(),
        name: newChannelName.trim()
      };
      setDeliveryChannels([...deliveryChannels, newcomer]);
      addActivity('ajustes', 'Canal Criado', `Novo canal de venda ${newChannelName} cadastrado.`);
    }
    
    setNewChannelName('');
    setEditingChannel(null);
  };

  const handleDeleteChannel = (id: string, name: string) => {
    if (!canEdit) return;
    if (id === 'pdv' || name.toUpperCase() === 'PDV') {
      return alert('O canal padrão PDV não pode ser excluído.');
    }
    if (confirm(`Deseja realmente excluir o canal "${name}"?`)) {
      setDeliveryChannels(deliveryChannels.filter(c => c.id !== id));
      addActivity('ajustes', 'Canal Excluído', `Canal de venda ${name} removido.`);
    }
  };
  
  // States for confirmation flow
  const [showCheckoutConfirm, setShowCheckoutConfirm] = useState(false);
  const [checkoutPreview, setCheckoutPreview] = useState<Sale | null>(null);
  const [isFinalized, setIsFinalized] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return [];
    return customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()) || (c.whatsapp && c.whatsapp.includes(customerSearch)) || (c.taxId && c.taxId.includes(customerSearch)));
  }, [customers, customerSearch]);

  // Registration fields for unified shortcut (REMOVED)
  
  // Search input ref to focus back
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return [];
    const lowerTerm = searchTerm.toLowerCase();
    const normalizedTerm = searchTerm.replace(/^0+/, '');

    return products.filter(p => {
      // Começa com a letra ou número digitado (Prefixo)
      const nameMatch = p.name.toLowerCase().startsWith(lowerTerm);
      const sku = (p.sku || '').toLowerCase();
      const barcode = (p.barcode || '').toLowerCase();
      
      const skuMatch = sku === lowerTerm || sku.startsWith(lowerTerm) || (sku && sku.replace(/^0+/, '').startsWith(normalizedTerm));
      const barcodeMatch = barcode === lowerTerm || barcode.startsWith(lowerTerm) || (barcode && barcode.replace(/^0+/, '').startsWith(normalizedTerm));
      const idMatch = p.id === searchTerm || p.id.replace(/^0+/, '').startsWith(normalizedTerm);

      return nameMatch || skuMatch || barcodeMatch || idMatch;
    });
  }, [products, searchTerm]);

  const addToCart = (p: Product) => {
    const existing = cart.find(item => item.product.id === p.id);
    if (existing) {
      setCart(cart.map(item => item.product.id === p.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setCart([...cart, { product: p, quantity: 1 }]);
    }
    setSearchTerm('');
    searchInputRef.current?.focus();
  };

  const handleSearchKeyPress = (e: any) => {
    if (e.key === 'Enter') {
      if (filteredProducts.length === 1) {
        addToCart(filteredProducts[0]);
      } else if (filteredProducts.length > 1) {
        // Try to match exactly by SKU, Barcode or ID if multiple, prioritizing exact string match
        const term = searchTerm.trim();
        const normalizedTerm = term.replace(/^0+/, '');

        const exactMatch = filteredProducts.find(p => 
          p.sku === term || 
          p.barcode === term || 
          p.id === term
        ) || filteredProducts.find(p => 
          (p.sku && p.sku.replace(/^0+/, '') === normalizedTerm) || 
          (p.barcode && p.barcode.replace(/^0+/, '') === normalizedTerm) ||
          p.id.replace(/^0+/, '') === normalizedTerm
        );

        if (exactMatch) addToCart(exactMatch);
      }
    }
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQty = item.quantity + delta;
        if (newQty <= 0) return item;
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const calculateItemPrice = (item: { product: Product, quantity: number }) => {
    if (item.product.wholesalePrice && item.product.wholesaleMinQty && item.quantity >= item.product.wholesaleMinQty) {
      return item.product.wholesalePrice;
    }
    return item.product.price;
  };

  const total = cart.reduce((acc, item) => acc + calculateItemPrice(item) * item.quantity, 0);

  const totalPaid = selectedPayments.reduce((acc, p) => acc + p.amount, 0);
  const remainingValue = Math.max(0, total - totalPaid);
  const trocoCalculated = Math.max(0, totalPaid - total);

  const addPayment = () => {
    if (paymentAmount <= 0) return;

    if (paymentMethod === 'DINHEIRO') {
      const existingIdx = selectedPayments.findIndex(p => p.method === 'DINHEIRO');
      if (existingIdx !== -1) {
        setSelectedPayments(prev => {
          const next = [...prev];
          next[existingIdx] = {
            ...next[existingIdx],
            amount: next[existingIdx].amount + paymentAmount,
            date: Date.now()
          };
          return next;
        });
        setPaymentAmount(0);
        return;
      }
    }

    const newPayment: PaymentEntry = {
      method: paymentMethod,
      amount: paymentAmount,
      date: Date.now()
    };
    setSelectedPayments(prev => [...prev, newPayment]);
    setPaymentAmount(0);
  };

  const removePayment = (index: number) => {
    setSelectedPayments(prev => prev.filter((_, i) => i !== index));
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    
    // Auto-add remaining if no payments registered yet but user tries to finish
    let finalPayments = [...selectedPayments];
    if (finalPayments.length === 0) {
      finalPayments = [{
        method: paymentMethod,
        amount: total,
        date: Date.now()
      }];
    }

    const totalPaidFinal = finalPayments.reduce((acc, p) => acc + p.amount, 0);
    const finalChange = Math.max(0, totalPaidFinal - total);
    
    // Find highest sequential ID in current sales to ensure continuity
    const maxSalesSeq = sales.reduce((max, s) => {
      // Handle both old format (000001-DEV) and new format (0001)
      const parts = s.sequentialId?.split('-') || ['0'];
      const seqNum = parseInt(parts[0] || '0');
      return seqNum > max ? seqNum : max;
    }, 0);

    // Use the higher value between the counter and the existing sales to avoid duplicates
    const nextSeqNum = Math.max(maxSalesSeq, orderCounter) + 1;
    const nextSeq = nextSeqNum.toString().padStart(4, '0');

    const sale: Sale = {
      id: generateUniqueId('sale'),
      sequentialId: nextSeq,
      date: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      syncStatus: 'pending',
      deviceId: getDeviceId(),
      total,
      totalCost: cart.reduce((acc, i) => acc + (calculateProductCost(i.product.id) * i.quantity), 0),
      totalProfit: 0, // Calculated below
      paymentMethod: finalPayments.length > 1 ? 'Múltiplos' : finalPayments[0].method,
      payments: finalPayments,
      receivedAmount: totalPaidFinal,
      change: finalChange,
      soldByUserId: currentUser?.id,
      soldByUserName: currentUser?.name,
      items: cart.map(i => {
        const cost = calculateProductCost(i.product.id);
        const price = calculateItemPrice(i);
        const profit = price - cost;
        return { 
          productId: i.product.id, 
          quantity: i.quantity, 
          price,
          cost,
          profit
        };
      }),
      customerId: selectedCustomerId || undefined,
      deliveryChannelId: selectedChannelId || deliveryChannels.find(c => c.name.toUpperCase() === 'PDV')?.id || deliveryChannels[0]?.id,
      cashierSessionId: cashierSession.id,
      status: 'aguardando_producao',
    };
    
    sale.totalProfit = sale.total - sale.totalCost;
    
    setCheckoutPreview(sale);
    setShowCheckoutConfirm(true);
    setIsFinalized(false);
  };

  const confirmSale = async () => {
    if (!checkoutPreview || isSubmitting) return;
    if (!cashierSession.isOpen) {
      alert('⚠️ O CAIXA ESTÁ FECHADO. Abra o caixa no menu CAIXA para realizar vendas.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const subtotal = cart.reduce((acc, i) => acc + (i.product.price * i.quantity), 0);
      const total = checkoutPreview.total;
      const discount = subtotal - total;

      // Save sale
      setSales((prev: Sale[]) => [...prev, checkoutPreview!]);
      
      // Update order counter to the sequence number of this sale
      const currentSeq = parseInt(checkoutPreview.sequentialId || '0');
      if (!isNaN(currentSeq)) {
        setOrderCounter(currentSeq);
      }
      
      addSaleToCashier(checkoutPreview);
      createRevenueForSale(checkoutPreview);

      // Deduct stock (Allowing negative)
      setProducts((prev: Product[]) => prev.map(p => {
        const item = checkoutPreview!.items.find(i => i.productId === p.id);
        if (item) return { ...p, stock: p.stock - item.quantity };
        return p;
      }));
      
      let msg = `Venda de R$ ${checkoutPreview.total.toFixed(2)} via ${checkoutPreview.paymentMethod}`;
      if (checkoutPreview.deliveryMethodId) msg += ` (Entrega: ${deliveryMethods.find(m => m.id === checkoutPreview.deliveryMethodId)?.name})`;
      addActivity('sale', 'Venda Realizada', msg);

      if (discount > 0.01) {
        addActivity('sale', 'Aplicação de Desconto', `Desconto de R$ ${discount.toFixed(2)} aplicado na venda #${checkoutPreview.sequentialId}.`);
      }
      
      setIsFinalized(true);
      
      setCart([]);
      setSelectedCustomerId(null);
      setSelectedPayments([]);
      setPaymentAmount(0);
      setShowCheckoutConfirm(false);
      setCheckoutPreview(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeCheckout = () => {
    setCheckoutPreview(null);
    setIsFinalized(false);
  };

  if (!cashierSession.isOpen) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-6 glass-panel">
        <div className="w-24 h-24 bg-amber-500/20 text-amber-500 border border-amber-500/30 rounded-full flex items-center justify-center shadow-2xl">
          <Lock size={40} />
        </div>
        <div>
          <h3 className="text-2xl font-black text-white uppercase tracking-widest">Caixa Fechado</h3>
          <p className="text-xs text-white/40 font-bold mt-2 mb-8 uppercase tracking-tight">Você precisa abrir o caixa antes de realizar vendas.</p>
          <button 
            onClick={() => {
              setRedirectAfterCashier('pos');
              setView('cashier');
            }}
            className="glass-button-primary px-10 py-5 mx-auto"
          >
            <Unlock size={20} /> Ir Abrir Caixa
          </button>
        </div>
      </div>
    );
  }

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
  const subtotalTotal = cart.reduce((acc, i) => acc + i.product.price * i.quantity, 0);

  return (
    <div className="fixed inset-0 z-[200] bg-[#0d1526] text-white flex flex-col overflow-hidden font-sans">
      {/* DESKTOP VERSION */}
      <div className="hidden md:flex flex-col h-full w-full p-4 overflow-hidden">
        {/* Back Button */}
        <button 
          onClick={() => setView('dashboard')}
          className="w-9 h-9 rounded-lg bg-[#1a2744] flex items-center justify-center mb-4 shrink-0 hover:bg-[#23355d] transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-400" />
        </button>

        <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0 overflow-y-auto no-scrollbar pb-4">
          {/* Left Panel */}
          <div className="flex-1 space-y-4 pr-1">
            {/* Client and Sales Channel */}
            <div className="flex gap-3">
              <button 
                onClick={() => setShowCustomerModal(true)}
                className={`flex-1 flex items-center gap-3 bg-[#1a2744] rounded-xl px-4 py-3 border transition-all ${selectedCustomerId ? 'border-cyan-400/50' : 'border-transparent hover:bg-[#23355d]'}`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${selectedCustomerId ? 'bg-cyan-500/20 text-cyan-400' : 'bg-[#0d1526] text-gray-400'}`}>
                  <Users className="w-4 h-4" />
                </div>
                <div className="text-left min-w-0">
                  <p className="text-[10px] text-gray-400 font-medium">CLIENTE</p>
                  <p className="text-xs font-semibold truncate">{selectedCustomer ? selectedCustomer.name.toUpperCase() : 'SELECIONAR ...'}</p>
                </div>
              </button>

              <button 
                onClick={() => setShowChannelModal(true)}
                className="flex-1 flex items-center gap-3 bg-[#1a2744] rounded-xl px-4 py-3 border-2 border-cyan-400 hover:bg-[#23355d] transition-all"
              >
                <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center">
                  <Link2 className="w-4 h-4 text-white" />
                </div>
                <div className="text-left min-w-0">
                  <p className="text-[10px] text-cyan-400 font-medium">CANAL DE VENDA</p>
                  <p className="text-xs font-semibold truncate">
                    {deliveryChannels.find(c => c.id === selectedChannelId)?.name.toUpperCase() || 'PDV'}
                  </p>
                </div>
              </button>
            </div>

            {/* Search Input */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (filteredProducts.length === 1) {
                  addToCart(filteredProducts[0]);
                } else if (filteredProducts.length > 1) {
                  const term = searchTerm.trim();
                  const normalizedTerm = term.replace(/^0+/, '');
                  const exactMatch = filteredProducts.find(p => 
                    p.sku === term || 
                    p.barcode === term || 
                    p.id === term
                  ) || filteredProducts.find(p => 
                    (p.sku && p.sku.replace(/^0+/, '') === normalizedTerm) || 
                    (p.barcode && p.barcode.replace(/^0+/, '') === normalizedTerm) ||
                    p.id.replace(/^0+/, '') === normalizedTerm
                  );
                  if (exactMatch) addToCart(exactMatch);
                }
              }}
              className="relative z-10"
            >
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="BUSCAR PRODUTO (SKU / NOME)"
                className="w-full bg-[#1a2744] rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-gray-500 outline-none focus:ring-1 ring-cyan-400/50 transition-all uppercase font-medium"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                autoFocus
              />

              {/* Search Results Dropdown */}
              <AnimatePresence>
                {searchTerm && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-[#1a2744] border border-white/5 rounded-2xl z-20 max-h-[40vh] overflow-hidden shadow-2xl flex flex-col"
                  >
                    <div className="overflow-y-auto no-scrollbar">
                      {filteredProducts.map(p => (
                        <div 
                          key={p.id} 
                          onClick={() => addToCart(p)} 
                          className="w-full p-4 text-left hover:bg-white/5 flex justify-between items-center group transition-colors border-b border-white/5 last:border-0 cursor-pointer"
                        >
                          <div className="min-w-0 pr-4">
                            <p className="font-bold text-xs text-white uppercase truncate group-hover:text-cyan-400">{p.name}</p>
                            <p className="text-[9px] font-medium text-gray-500 uppercase tracking-wider mt-0.5">Ref: {p.sku || p.id.substring(0,6)} • Estoque: {p.stock}</p>
                          </div>
                          <div className="text-right shrink-0 flex items-center gap-2">
                            <button 
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setSelectedLabelProduct(p); }}
                              className="p-2 hover:bg-white/10 rounded-lg text-gray-500 hover:text-cyan-400 transition-colors"
                            >
                              <Printer size={12} />
                            </button>
                            <p className="text-cyan-400 font-bold text-sm">R$ {p.price.toFixed(2)}</p>
                          </div>
                        </div>
                      ))}
                      {filteredProducts.length === 0 && (
                        <div className="p-8 text-center text-gray-500 font-semibold uppercase tracking-widest text-[10px]">Produto não encontrado</div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </form>

            {/* Payment Methods */}
            <div className="space-y-2">
              <p className="text-[10px] font-semibold text-gray-400 tracking-wide">FORMA DE PAGAMENTO</p>
              <div className="flex gap-2 flex-wrap">
                {paymentMethods.map(method => (
                  <button 
                    key={method}
                    onClick={() => {
                      setPaymentMethod(method);
                      if (paymentAmount === 0) setPaymentAmount(remainingValue);
                    }}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all border ${
                      paymentMethod === method 
                        ? 'bg-cyan-500/10 border-cyan-500/30' 
                        : 'bg-[#1a2744] border-transparent hover:bg-[#23355d]'
                    }`}
                  >
                    <span className="text-lg leading-none">{paymentIcons[method] || '💰'}</span>
                    <span className={`text-xs font-semibold uppercase tracking-tight ${paymentMethod === method ? 'text-white' : 'text-gray-300'}`}>
                      {method}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Nova Área de Pagamentos Organizada */}
            <div className="space-y-4 pt-4 border-t border-white/5">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Valor a Registrar */}
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    addPayment();
                  }}
                  className="bg-[#1a2744] p-5 rounded-2xl border border-white/5 space-y-3"
                >
                  <p className="text-[10px] font-black text-gray-500 tracking-[0.2em] uppercase">VALOR A REGISTRAR</p>
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-bold">R$</span>
                      <input
                        type="number"
                        placeholder="0.00"
                        step="0.01"
                        className="bg-[#0d1526] rounded-xl py-3 pl-10 pr-4 text-lg font-black w-full outline-none focus:ring-1 ring-cyan-500/50"
                        value={paymentAmount || ''}
                        onChange={e => setPaymentAmount(Number(e.target.value))}
                      />
                    </div>
                    <button 
                      type="submit"
                      className="bg-cyan-500 hover:bg-cyan-400 text-black font-black px-6 py-3 rounded-xl text-[10px] uppercase tracking-widest transition-all active:scale-95 shrink-0"
                    >
                      ADICIONAR
                    </button>
                  </div>
                </form>

                {/* Pagamentos Adicionados */}
                <div className="bg-[#1a2744] p-5 rounded-2xl border border-white/5 space-y-3">
                  <p className="text-[10px] text-gray-500 uppercase font-black tracking-[0.2em] flex items-center gap-2">
                    <CreditCard size={12} /> PAGAMENTOS ADICIONADOS
                  </p>
                  <div className="bg-[#0d1526] rounded-xl border border-white/5 h-[100px] overflow-y-auto no-scrollbar p-2">
                    {selectedPayments.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-gray-600 opacity-40">
                        <p className="text-[9px] font-black tracking-widest">NENHUM PAGAMENTO</p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {selectedPayments.map((p, idx) => (
                          <div key={idx} className="flex justify-between items-center bg-white/[0.03] px-3 py-1.5 rounded-lg border border-white/5 group transition-colors hover:border-white/10">
                            <div className="flex items-center gap-2">
                              <span className="text-xs">{paymentIcons[p.method] || '💰'}</span>
                              <span className="text-[10px] font-black text-white uppercase">{p.method}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black text-cyan-400">R$ {p.amount.toFixed(2)}</span>
                              <button 
                                type="button"
                                onClick={() => removePayment(idx)}
                                className="text-gray-500 hover:text-red-400 transition-colors"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Totais Fixos */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-[#1a2744] p-4 rounded-2xl border border-white/5">
                  <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">TOTAL PAGO</p>
                  <p className="text-xl font-black text-white italic">R$ {totalPaid.toFixed(2)}</p>
                </div>

                <div className={`p-4 rounded-2xl border transition-all ${trocoCalculated > 0 ? 'bg-emerald-500/10 border-emerald-500/20 shadow-lg shadow-emerald-500/5' : 'bg-[#1a2744] border-white/5'}`}>
                  <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${trocoCalculated > 0 ? 'text-emerald-500' : 'text-gray-500'}`}>TROCO</p>
                  <p className={`text-xl font-black italic ${trocoCalculated > 0 ? 'text-emerald-400' : 'text-gray-400'}`}>R$ {trocoCalculated.toFixed(2)}</p>
                </div>

                {remainingValue > 0 && (
                  <div className="bg-amber-500/5 p-4 rounded-2xl border border-amber-500/10 hidden lg:block">
                    <p className="text-[9px] font-black text-amber-500/60 uppercase tracking-widest mb-1">FALTANDO</p>
                    <p className="text-xl font-black text-amber-400 italic">R$ {remainingValue.toFixed(2)}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel - Order */}
          <div className="w-full lg:w-[340px] bg-[#1a2744] rounded-2xl p-4 flex flex-col relative overflow-hidden shrink-0">
            {/* Gradient Border Effect */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500" />

            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-gray-400" />
                <span className="text-base font-semibold">PEDIDO</span>
              </div>
              <span className="bg-pink-500 text-white text-[10px] font-bold px-2 py-1 rounded-full">
                {cart.reduce((n, i) => n + i.quantity, 0)} ITENS
              </span>
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between bg-white/[0.03] px-3 py-2 rounded-xl border border-white/5">
                <span className="text-[10px] text-gray-500 uppercase font-black tracking-tight">Canal</span>
                <span className="text-[10px] text-cyan-400 font-black uppercase">
                  {deliveryChannels.find(c => c.id === selectedChannelId)?.name.toUpperCase() || 'PDV'}
                </span>
              </div>
            </div>

            {/* Cart Content */}
            <div className="flex-1 overflow-y-auto no-scrollbar py-2">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-500 opacity-40">
                  <div className="w-16 h-16 border-2 border-gray-600 rounded-xl flex items-center justify-center mb-3">
                    <ShoppingBag className="w-8 h-8 text-gray-600" />
                  </div>
                  <p className="text-xs font-medium tracking-wider">CARRINHO VAZIO</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map(item => (
                    <div key={item.product.id} className="bg-[#0d1526]/50 rounded-xl p-3 border border-white/[0.03] group">
                      <div className="flex justify-between items-start mb-2">
                        <div className="min-w-0 pr-2">
                          <p className="text-xs font-bold text-white uppercase truncate">{item.product.name}</p>
                          <p className="text-[10px] text-gray-500 font-medium">R$ {calculateItemPrice(item).toFixed(2)} / un</p>
                        </div>
                        <button 
                          onClick={() => setCart(cart.filter(i => i.product.id !== item.product.id))}
                          className="text-gray-600 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                           <button 
                             onClick={() => setSelectedLabelProduct(item.product)}
                             className="p-1.5 hover:bg-[#1a2744] rounded-lg text-gray-500 hover:text-cyan-400 transition-colors border border-white/5"
                           >
                             <Printer size={14} />
                           </button>
                           <div className="flex items-center bg-[#0d1526] rounded-lg p-1 border border-white/5">
                             <button 
                               onClick={() => updateQuantity(item.product.id, -1)}
                               className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white"
                             >
                               <Minus size={12} />
                             </button>
                             <span className="w-8 text-center text-xs font-bold">{item.quantity}</span>
                             <button 
                               onClick={() => updateQuantity(item.product.id, 1)}
                               className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white"
                             >
                               <Plus size={12} />
                             </button>
                           </div>
                        </div>
                        <p className="text-sm font-bold text-cyan-400">R$ {(calculateItemPrice(item) * item.quantity).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Totals */}
            <div className="space-y-2 pt-4 border-t border-gray-700">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">SUBTOTAL</span>
                <span className="text-sm text-gray-400 font-medium font-mono">R$ {subtotalTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center pb-2">
                <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">TOTAL GERAL</span>
                <span className="text-2xl font-black text-cyan-400 italic tracking-tight">R$ {total.toFixed(2)}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mt-4">
              <button 
                onClick={() => {
                  if (cart.length > 0 && confirm('Limpar o carrinho?')) setCart([]);
                }}
                className="w-12 h-12 bg-[#0d1526] rounded-lg flex items-center justify-center hover:bg-[#1a2744] hover:text-red-400 transition-all border border-white/5"
              >
                <Trash2 className="w-4 h-4 text-gray-400" />
              </button>
              <button 
                onClick={handleCheckout}
                disabled={cart.length === 0}
                className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:from-gray-700 disabled:to-gray-800 disabled:text-gray-500 text-white font-bold py-3 rounded-lg text-sm uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-blue-900/20"
              >
                FINALIZAR VENDA
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE VERSION (Directly from reference image) */}
      <div className="flex md:hidden flex-col h-full w-full overflow-hidden bg-[#0a0f1d]">
        {/* Header Mobile */}
        <div className="px-4 py-4 flex items-center justify-between shrink-0">
          <button 
            onClick={() => setView('dashboard')}
            className="w-10 h-10 rounded-xl bg-[#161d2f] flex items-center justify-center active:scale-90 transition-all"
          >
            <ChevronLeft size={20} className="text-gray-400" />
          </button>
          <h2 className="text-base font-black uppercase tracking-[0.2em] text-white italic">PDV</h2>
          <button className="w-10 h-10 rounded-xl bg-[#161d2f] flex items-center justify-center active:scale-90 transition-all">
            <MoreVertical size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Scrollable Content Mobile */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-4 space-y-4 pb-32">
          {/* Row 1: Client and Channel */}
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => setShowCustomerModal(true)}
              className="bg-[#161d2f] p-4 rounded-xl flex items-center gap-3 border border-transparent active:border-cyan-500/50 transition-all text-left"
            >
              <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center shrink-0">
                <Users size={18} className="text-gray-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-0.5">CLIENTE</p>
                <p className="text-[10px] font-black text-white uppercase truncate">{selectedCustomer ? selectedCustomer.name : 'SELECIONAR'}</p>
              </div>
              <ChevronRight size={14} className="ml-auto text-gray-600" />
            </button>

            <button 
              onClick={() => setShowChannelModal(true)}
              className="bg-[#161d2f] p-4 rounded-xl flex items-center gap-3 border-2 border-cyan-500 active:scale-95 transition-all text-left shadow-[0_0_15px_rgba(34,211,238,0.15)]"
            >
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
                <Link2 size={18} className="text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-[8px] font-black text-cyan-400 uppercase tracking-widest mb-0.5">CANAL DE VENDA</p>
                <p className="text-[10px] font-black text-white uppercase truncate">
                  {deliveryChannels.find(c => c.id === selectedChannelId)?.name.toUpperCase() || 'PDV'}
                </p>
              </div>
              <ChevronRight size={14} className="ml-auto text-cyan-400/50" />
            </button>
          </div>

          {/* Search Bar Mobile */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-500 group-focus-within:text-cyan-400 transition-colors" />
            </div>
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="BUSCAR PRODUTO (SKU / NOME)"
              className="w-full bg-[#161d2f]/60 border border-white/5 rounded-2xl py-4 pl-12 pr-12 text-[10px] font-black uppercase tracking-widest text-white placeholder:text-gray-600 focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 transition-all shadow-xl"
            />
            <button className="absolute inset-y-0 right-4 flex items-center text-gray-500 hover:text-white transition-colors">
              <QrCode size={20} />
            </button>
            
            {/* Search Results Dropdown Mobile */}
            <AnimatePresence>
              {searchTerm && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-[#1a2744] border border-white/10 rounded-2xl z-50 max-h-[40vh] overflow-y-auto shadow-2xl backdrop-blur-xl"
                >
                  {filteredProducts.map(p => (
                    <button 
                      key={p.id} 
                      onClick={() => addToCart(p)} 
                      className="w-full p-4 border-b border-white/5 active:bg-white/5 text-left flex justify-between items-center"
                    >
                      <div>
                        <p className="text-xs font-black text-white uppercase truncate">{p.name}</p>
                        <p className="text-[9px] font-bold text-gray-500 uppercase mt-0.5">Estoque: {p.stock}</p>
                      </div>
                      <p className="text-cyan-400 font-black text-xs">R$ {p.price.toFixed(2)}</p>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Payment Method Mobile */}
          <div className="space-y-3">
            <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em]">FORMA DE PAGAMENTO</p>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {paymentMethods.map(method => (
                <button 
                  key={method}
                  onClick={() => {
                    setPaymentMethod(method);
                    if (paymentAmount === 0) setPaymentAmount(remainingValue);
                  }}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 shrink-0 transition-all border ${
                    paymentMethod === method 
                      ? 'bg-cyan-500/10 border-cyan-500/30 ring-1 ring-cyan-500/20' 
                      : 'bg-[#161d2f] border-transparent'
                  }`}
                >
                  <span className="text-base">{paymentIcons[method] || '💰'}</span>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${paymentMethod === method ? 'text-white' : 'text-gray-400'}`}>
                    {method}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Value to Register Mobile */}
          <div className="bg-[#161d2f] p-4 rounded-2xl space-y-3 border border-white/5">
            <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em]">VALOR A REGISTRAR</p>
            <div className="flex gap-2 h-14">
              <div className="flex-1 relative flex items-center bg-[#0d1526] rounded-xl px-4 border border-white/5">
                <span className="text-gray-500 font-black text-xs mr-2">R$</span>
                <input 
                  type="number" 
                  step="0.01"
                  value={paymentAmount || ''}
                  onChange={e => setPaymentAmount(Number(e.target.value))}
                  placeholder="0.00"
                  className="bg-transparent border-none outline-none font-black text-base text-white w-full placeholder:text-gray-700"
                />
              </div>
              <button 
                onClick={addPayment}
                className="bg-cyan-500 text-black px-6 rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all"
              >
                ADICIONAR
              </button>
            </div>
          </div>

          {/* Paid and Change Mobile */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#161d2f] p-4 rounded-2xl border border-white/5">
              <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">TOTAL PAGO</p>
              <p className="text-xl font-black text-white italic">R$ {totalPaid.toFixed(2)}</p>
            </div>
            <div className="bg-[#161d2f] p-4 rounded-2xl border border-white/5">
              <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">TROCO</p>
              <p className={`text-xl font-black italic ${trocoCalculated > 0 ? 'text-emerald-400' : 'text-gray-400'}`}>R$ {trocoCalculated.toFixed(2)}</p>
            </div>
          </div>

          {/* Order Summary Mobile Card */}
          <div className="bg-[#161d2f] rounded-[1.5rem] border-t-2 border-purple-500 overflow-hidden shadow-2xl relative">
            <div className="p-4 border-b border-white/5 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <ShoppingBag size={18} className="text-gray-400" />
                <span className="text-xs font-black uppercase tracking-widest">PEDIDO</span>
              </div>
              <span className="bg-[#ec4899] text-white text-[8px] font-black px-2.5 py-1 rounded-full uppercase">
                {cart.reduce((n, i) => n + i.quantity, 0)} ITENS
              </span>
            </div>
            
            <div className="px-4 py-3 bg-white/[0.02] flex justify-between items-center border-b border-white/5">
              <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest italic">CANAL</span>
              <span className="text-[9px] font-black text-cyan-400 uppercase italic">
                {deliveryChannels.find(c => c.id === selectedChannelId)?.name.toUpperCase() || 'PDV'}
              </span>
            </div>

            <div className="p-4 min-h-[140px] max-h-[220px] overflow-y-auto no-scrollbar flex flex-col items-center justify-center">
              {cart.length === 0 ? (
                <>
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center opacity-30 mb-2">
                    <ShoppingBag size={20} className="text-gray-500" />
                  </div>
                  <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest">CARRINHO VAZIO</p>
                </>
              ) : (
                <div className="w-full space-y-3">
                  {cart.map(item => (
                    <div key={item.product.id} className="flex justify-between items-center">
                      <div className="min-w-0 pr-4">
                        <p className="text-[10px] font-black text-white uppercase truncate">{item.product.name}</p>
                        <p className="text-[8px] font-bold text-gray-500 mt-0.5">{item.quantity}x R$ {calculateItemPrice(item).toFixed(2)}</p>
                      </div>
                      <p className="text-[10px] font-black text-cyan-400 shrink-0">R$ {(calculateItemPrice(item) * item.quantity).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 bg-[#0a0f1d]/50 space-y-2 border-t border-white/5">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest italic">SUBTOTAL</span>
                <span className="text-[10px] font-black text-gray-400 italic">R$ {subtotalTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center pb-2">
                <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest italic leading-none">TOTAL GERAL</span>
                <span className="text-xl font-black text-cyan-400 italic leading-none">R$ {total.toFixed(2)}</span>
              </div>
              
              <div className="flex gap-2 pt-2">
                <button 
                  onClick={() => cart.length > 0 && confirm('Limpar carrinho?') && setCart([])}
                  className="w-12 h-12 bg-[#0d1526] rounded-xl flex items-center justify-center border border-white/5 scale-90 active:scale-75 transition-all"
                >
                  <Trash2 size={16} className="text-gray-500" />
                </button>
                <button 
                  onClick={handleCheckout}
                  disabled={cart.length === 0}
                  className="flex-1 bg-white/5 text-white/40 font-black text-[10px] tracking-[0.2em] py-4 rounded-xl uppercase border border-white/5 active:scale-[0.98] transition-all disabled:opacity-50"
                  style={{
                    backgroundColor: cart.length > 0 ? 'rgba(255,255,255,0.08)' : undefined,
                    color: cart.length > 0 ? 'white' : undefined
                  }}
                >
                  FINALIZAR VENDA
                </button>
              </div>
            </div>
          </div>

          {/* Payments Added Mobile */}
          <div className="bg-[#161d2f] p-4 rounded-2xl space-y-4 border border-white/5">
            <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2">
              <CreditCard size={12} /> PAGAMENTOS ADICIONADOS
            </p>
            <div className="bg-[#0d1526] rounded-xl border border-white/5 p-4 min-h-[120px] flex flex-col items-center justify-center relative overflow-hidden">
              {selectedPayments.length === 0 ? (
                <>
                  <div className="w-12 h-12 rounded-xl border border-white/5 flex items-center justify-center opacity-30 mb-2">
                    <ShoppingBag size={20} className="text-gray-500" />
                  </div>
                  <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest">NENHUM PAGAMENTO ADICIONADO AINDA</p>
                </>
              ) : (
                <div className="w-full space-y-2">
                  {selectedPayments.map((p, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-white/5 px-4 py-3 rounded-xl">
                      <div className="flex items-center gap-3">
                        <span className="text-base">{paymentIcons[p.method] || '💰'}</span>
                        <span className="text-[10px] font-black text-white uppercase">{p.method}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-cyan-400">R$ {p.amount.toFixed(2)}</span>
                        <button onClick={() => removePayment(idx)} className="text-gray-500">
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Global Footer Fixed at bottom for PDV Screen */}
        <div className="fixed bottom-0 left-0 right-0 h-20 bg-[#0d1526]/90 backdrop-blur-3xl border-t border-white/5 z-50 flex items-center justify-around px-6">
          <button 
            onClick={() => setView('dashboard')}
            className="flex flex-col items-center gap-1 text-white/40 active:scale-95 transition-all"
          >
            <Home size={20} />
            <span className="text-[8px] font-black uppercase tracking-widest">INÍCIO</span>
          </button>

          <button 
            className="flex flex-col items-center gap-1 text-purple-400 active:scale-95 transition-all"
          >
            <ShoppingBag size={20} />
            <span className="text-[8px] font-black uppercase tracking-widest">VENDAS</span>
          </button>

          <div className="relative -mt-10">
            <button 
              onClick={() => { setView('dashboard'); setIsMobileMenuOpen(true); }}
              className="w-16 h-16 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-600 rounded-full flex items-center justify-center shadow-[0_0_25px_rgba(147,51,234,0.5)] border-4 border-[#0d1526] active:scale-90 transition-all z-20"
            >
              <LayoutGrid size={24} className="text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
            </button>
            <div className="absolute inset-0 bg-purple-500/20 blur-xl rounded-full -z-10" />
          </div>

          <button 
            onClick={() => { setView('consultar-pedido'); }}
            className={`flex flex-col items-center gap-1 transition-all ${view === 'consultar-pedido' ? 'text-blue-400' : 'text-white/40'}`}
          >
            <Search size={20} />
            <span className="text-[8px] font-black uppercase tracking-widest">BUSCA</span>
          </button>

          <button 
            onClick={() => { setIsRightDrawerOpen(true); }}
            className="flex flex-col items-center gap-1 text-white/40 active:scale-95 transition-all"
          >
            <Cpu size={20} />
            <span className="text-[8px] font-black uppercase tracking-widest">AÇÕES</span>
          </button>
        </div>
      </div>

      {/* Reusing existing modals (Customer & Channel) */}
      <AnimatePresence>
        {checkoutPreview && showCheckoutConfirm && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm bg-[#12122b] rounded-[2.5rem] border border-white/10 shadow-3xl p-8 space-y-6 text-center"
            >
              <div className="w-20 h-20 bg-blue-600/10 rounded-3xl flex items-center justify-center mx-auto border border-blue-500/20 shadow-xl">
                <ShoppingBag size={40} className="text-blue-500" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-xl font-black text-white uppercase tracking-tight leading-tight">Confirmar Venda</h3>
                <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Deseja finalizar esta venda?</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => {
                    setShowCheckoutConfirm(false);
                    setCheckoutPreview(null);
                  }}
                  className="py-4 bg-white/5 text-white/50 rounded-2xl font-black uppercase tracking-widest text-[10px] border border-white/5 active:scale-95 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmSale}
                  className="py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
                >
                  Finalizar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Customer Modal */}
      <AnimatePresence>
        {showCustomerModal && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-[500] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }} 
               animate={{ scale: 1, y: 0 }} 
              className="glass-panel p-8 rounded-[2.5rem] w-full max-w-lg space-y-6 shadow-2xl relative border border-white/10 transition-all duration-300"
            >
              <button 
                onClick={() => setShowCustomerModal(false)}
                className="absolute top-6 right-6 text-white/40 hover:text-white transition-all hover:scale-110"
              >
                <X size={24} />
              </button>

              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-lg neon-purple">
                  <UserPlus size={32} />
                </div>
                <h4 className="text-xl font-black text-white uppercase tracking-widest">Vincular Cliente</h4>
                <p className="text-[10px] text-white/40 font-black uppercase tracking-tight">Busque ou crie um novo cliente para esta venda.</p>
              </div>

              <div className="space-y-4">
                <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 backdrop-blur-2xl">
                  <button onClick={() => setIsRegistering(false)} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${!isRegistering ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30' : 'text-white/40 hover:text-white'}`}>Pesquisar</button>
                  <button onClick={() => setIsRegistering(true)} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${isRegistering ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30' : 'text-white/40 hover:text-white'}`}>Novo Cliente</button>
                </div>

                {!isRegistering ? (
                  <>
                    <form 
                      onSubmit={(e) => e.preventDefault()}
                      className="relative"
                    >
                      <Search className="absolute left-4 top-4 text-white/40" size={20} />
                      <input 
                        placeholder="NOME, TELEFONE OU CPF..." 
                        className="glass-input w-full pl-12 pr-4 py-4 rounded-2xl outline-none font-black text-sm text-white placeholder:text-white/10 uppercase"
                        value={customerSearch}
                        onChange={e => setCustomerSearch(e.target.value)}
                      />
                    </form>
                    <div className="max-h-[50vh] overflow-y-auto divide-y divide-white/5 border border-white/10 rounded-2xl bg-black/20 custom-scrollbar">
                      {filteredCustomers.length > 0 ? (
                        filteredCustomers.map(c => (
                          <button 
                            key={c.id} 
                            onClick={() => {
                              setSelectedCustomerId(c.id);
                              setShowCustomerModal(false);
                            }}
                            className="w-full p-4 text-left hover:bg-white/5 flex justify-between items-center group transition-colors"
                          >
                             <div className="min-w-0">
                               <p className="font-black text-white uppercase group-hover:text-blue-400">{c.name}</p>
                               <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">{c.whatsapp || c.phone || 'SEM CONTATO'}</p>
                             </div>
                             <Check size={16} className="text-blue-400 opacity-0 group-hover:opacity-100" />
                          </button>
                        ))
                      ) : (
                        <div className="p-8 text-center text-white/20 italic text-[10px] font-black uppercase tracking-widest">
                          {customerSearch ? 'Cliente não encontrado' : 'Digite para pesquisar'}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="animate-in fade-in slide-in-from-bottom-2">
                    <QuickCustomerForm 
                      onCancel={() => setIsRegistering(false)}
                      onSubmit={(customerData) => {
                        const uuid = crypto.randomUUID();
                        const newCust: Customer = {
                          id: uuid,
                          displayId: `PDV-${Math.floor(1000 + Math.random() * 9000)}`,
                          ...customerData,
                          debt: 0,
                          createdAt: Date.now(),
                          updatedAt: Date.now()
                        };
                        setCustomers((prev: Customer[]) => [...prev, newCust]);
                        addActivity('customer', 'Atalho PDV', `Novo cliente ${customerData.name} cadastrado via PDV.`);
                        setSelectedCustomerId(uuid);
                        setShowCustomerModal(false);
                        setIsRegistering(false);
                      }}
                    />
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Canais de Venda Modal */}
        {showChannelModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[500] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="glass-panel p-8 rounded-[3rem] max-w-lg w-full space-y-6 shadow-2xl relative border border-white/10">
              <button 
                onClick={() => {
                  setShowChannelModal(false);
                  setEditingChannel(null);
                  setNewChannelName('');
                }} 
                className="absolute top-6 right-6 text-white/40 hover:text-white transition-transform"
              >
                <X size={20} />
              </button>
              
              <div className="space-y-2">
                <h4 className="text-xl font-black text-white uppercase tracking-widest flex items-center gap-3">
                  <Link size={20} className="text-blue-400" /> Canais de Venda
                </h4>
                <p className="text-[10px] text-white/40 font-black uppercase">Gerenciamento de origens de venda</p>
              </div>

              <div className="space-y-4">
                {canEdit && (
                  <div className="bg-white/5 p-6 rounded-3xl border border-white/10 space-y-4 shadow-lg">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1 italic">
                      {editingChannel ? 'Editar Canal' : 'Novo Canal'}
                    </label>
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSaveChannel();
                      }}
                      className="flex gap-2"
                    >
                      <input 
                        placeholder="EX: WHATSAPP, INSTAGRAM..." 
                        className="flex-1 glass-input p-4 rounded-xl outline-none text-sm font-black uppercase transition-all"
                        value={newChannelName}
                        onChange={e => setNewChannelName(e.target.value)}
                      />
                      <button 
                        type="submit"
                        className="bg-blue-600 text-white p-4 rounded-xl hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20"
                      >
                        {editingChannel ? <Save size={20} /> : <Plus size={20} />}
                      </button>
                      {editingChannel && (
                        <button 
                          type="button"
                          onClick={() => {
                            setEditingChannel(null);
                            setNewChannelName('');
                          }}
                          className="bg-white/5 text-white/60 p-4 rounded-xl border border-white/10 hover:bg-white/10 transition-all"
                        >
                          <X size={20} />
                        </button>
                      )}
                    </form>
                  </div>
                )}

                <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                  {deliveryChannels.map(c => (
                    <div key={c.id} className={`flex items-center justify-between p-4 border rounded-2xl group transition-all ${selectedChannelId === c.id ? 'bg-blue-600/20 border-blue-500/50 shadow-lg' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black border border-white/10 ${c.id === 'pdv' ? 'bg-blue-500 text-white' : 'bg-white/5 text-white/60'}`}>
                           {c.name.substring(0, 2).toUpperCase()}
                        </div>
                        <p className="text-xs font-black uppercase tracking-tight text-white">{c.name}</p>
                        {c.id === 'pdv' && (
                          <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-sm uppercase border ${selectedChannelId === c.id ? 'bg-blue-500/20 border-blue-500/30 text-blue-400' : 'bg-white/5 border-white/10 text-white/40'}`}>Padrão</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {selectedChannelId !== c.id ? (
                          <button 
                            onClick={() => {
                              setSelectedChannelId(c.id);
                              setShowChannelModal(false);
                            }}
                            className="bg-white/5 text-white/60 px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all border border-white/10"
                          >
                            Selecionar
                          </button>
                        ) : (
                          <div className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 border border-blue-500/50 shadow-lg">
                            <Check size={10} /> Selecionado
                          </div>
                        )}
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {canEdit && (
                            <>
                              <button 
                                onClick={() => {
                                  setEditingChannel(c);
                                  setNewChannelName(c.name);
                                }}
                                className="p-2 text-white/20 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all"
                              >
                                <Pencil size={14} />
                              </button>
                              {(c.id !== 'pdv' && c.name.toUpperCase() !== 'PDV') && (
                                <button 
                                  onClick={() => handleDeleteChannel(c.id, c.name)}
                                  className="p-2 text-white/20 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DeliveryView({ 
  sales, 
  deliveryChannels, 
  deliveryMethods,
  setDeliveryMethods,
  products, 
  customers,
  company,
  couponConfig,
  generateReceiptHTML,
  generateSimpleReceiptHTML,
  performUnifiedPrint,
  addActivity,
  setSales,
  imprimirCupom,
  imprimirPedidoPDV,
  canEdit,
  currentUser,
  couponPDVConfig,
  paymentIcons,
  setView
}: { 
  sales: Sale[], 
  deliveryChannels: DeliveryChannel[], 
  deliveryMethods: DeliveryMethod[],
  setDeliveryMethods: any,
  products: Product[],
  customers: Customer[],
  company: CompanyInfo,
  couponConfig: CouponConfig,
  generateReceiptHTML: any,
  generateSimpleReceiptHTML: any,
  performUnifiedPrint: any,
  addActivity: any,
  setSales: any,
  imprimirCupom: (saleOrHtml: Sale | string, customTitle?: string) => Promise<any>,
  imprimirPedidoPDV: (sale: Sale) => Promise<boolean>,
  canEdit: boolean,
  currentUser: any | null,
  couponPDVConfig: CouponPDVConfig,
  paymentIcons: Record<string, string>,
  setView: (v: View) => void
}) {
  const [activeTab, setActiveTab] = useState<'pending' | 'shipping' | 'delivered'>('pending');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showMethodsModal, setShowMethodsModal] = useState(false);
  const [newMethodName, setNewMethodName] = useState('');

  const deliverySales = useMemo(() => {
    return sales
      .filter(s => {
        if (activeTab === 'pending') return ['pendente', 'em_separacao', 'separado', 'embalado'].includes(s.status || '');
        if (activeTab === 'shipping') return ['enviado', 'em_transporte'].includes(s.status || '');
        if (activeTab === 'delivered') return s.status === 'entregue';
        return false;
      })
      .sort((a, b) => b.date - a.date);
  }, [sales, activeTab]);

  const getDeliveryMethodName = (sale: Sale) => {
    if (sale.deliveryMethod) return sale.deliveryMethod;
    if (!sale.deliveryMethodId) return 'Não Definido';
    return deliveryMethods.find(m => m.id === sale.deliveryMethodId)?.name || 'Outros';
  };

  const handleAddMethod = (e: FormEvent) => {
    e.preventDefault();
    if (!newMethodName.trim()) return;
    const newMethod: DeliveryMethod = {
      id: crypto.randomUUID(),
      name: newMethodName.trim(),
      isActive: true,
      updatedAt: Date.now()
    };
    setDeliveryMethods([...deliveryMethods, newMethod]);
    setNewMethodName('');
  };

  const toggleMethodStatus = (id: string) => {
    const updatedAt = Date.now();
    const updated = deliveryMethods.map(m => m.id === id ? { ...m, isActive: !m.isActive, updatedAt } : m);
    setDeliveryMethods(updated);
  };

  const deleteMethod = (id: string, name: string) => {
    if (name.toUpperCase() === 'EM MÃOS') {
      return alert('O tipo de entrega padrão "Em mãos" não pode ser excluído.');
    }
    if (confirm(`Deseja excluir permanentemente o tipo "${name}"?`)) {
      setDeliveryMethods(deliveryMethods.filter(m => m.id !== id));
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-[#0a1628] text-white p-2 md:p-4 font-sans flex flex-col overflow-hidden animate-in fade-in duration-500">
      {/* Header Padrao */}
      <div className="flex items-center justify-between mb-4 shrink-0 px-2 md:px-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setView('dashboard')}
            className="w-10 h-10 rounded-xl bg-[#1a2744] flex items-center justify-center border border-white/5 hover:bg-[#1a2744]/80 transition-all cursor-pointer group"
          >
            <ChevronLeft className="w-5 h-5 text-[#64748b] group-hover:text-white" />
          </button>
          <div>
            <h2 className="text-lg md:text-xl font-black text-white uppercase italic leading-none">
              Gerenciamento de Entregas
            </h2>
            <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mt-1">
              Logística e Acompanhamento em Tempo Real
            </p>
          </div>
        </div>

        <button 
          onClick={() => setShowMethodsModal(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg active:scale-95"
        >
          <Plus size={14} />
          <span className="hidden sm:inline">Tipos de Entrega</span>
          <span className="sm:hidden">Tipos</span>
        </button>
      </div>

      {/* Cards de Status Compactos */}
      <div className="grid grid-cols-3 gap-2 md:gap-4 mb-4 shrink-0 px-2 md:px-0">
        <button 
          onClick={() => setActiveTab('pending')}
          className={`p-3 md:p-4 flex flex-col items-center justify-center rounded-xl transition-all border shrink-0 ${activeTab === 'pending' ? 'bg-blue-600/20 border-blue-500 shadow-lg shadow-blue-500/10' : 'bg-[#1a2744] border-white/5 hover:bg-[#1a2744]/80'}`}
        >
          <Package className={`w-4 h-4 md:w-5 md:h-5 mb-1 ${activeTab === 'pending' ? 'text-blue-400' : 'text-[#64748b]'}`} />
          <span className={`text-[8px] md:text-[10px] font-black tracking-widest uppercase mb-1 ${activeTab === 'pending' ? 'text-white' : 'text-[#64748b]'}`}>Aguardando</span>
          <span className={`text-[10px] md:text-xs font-black px-2 py-0.5 rounded-lg ${activeTab === 'pending' ? 'bg-blue-500 text-white' : 'bg-black/20 text-[#64748b]'}`}>
            {sales.filter(s => ['pendente', 'em_separacao', 'separado', 'embalado'].includes(s.status || '')).length}
          </span>
        </button>

        <button 
          onClick={() => setActiveTab('shipping')}
          className={`p-3 md:p-4 flex flex-col items-center justify-center rounded-xl transition-all border shrink-0 ${activeTab === 'shipping' ? 'bg-orange-600/20 border-orange-500 shadow-lg shadow-orange-500/10' : 'bg-[#1a2744] border-white/5 hover:bg-[#1a2744]/80'}`}
        >
          <Truck className={`w-4 h-4 md:w-5 md:h-5 mb-1 ${activeTab === 'shipping' ? 'text-orange-400' : 'text-[#64748b]'}`} />
          <span className={`text-[8px] md:text-[10px] font-black tracking-widest uppercase mb-1 ${activeTab === 'shipping' ? 'text-white' : 'text-[#64748b]'}`}>Em Trânsito</span>
          <span className={`text-[10px] md:text-xs font-black px-2 py-0.5 rounded-lg ${activeTab === 'shipping' ? 'bg-orange-500 text-white' : 'bg-black/20 text-[#64748b]'}`}>
            {sales.filter(s => ['enviado', 'em_transporte'].includes(s.status || '')).length}
          </span>
        </button>

        <button 
          onClick={() => setActiveTab('delivered')}
          className={`p-3 md:p-4 flex flex-col items-center justify-center rounded-xl transition-all border shrink-0 ${activeTab === 'delivered' ? 'bg-emerald-600/20 border-emerald-500 shadow-lg shadow-emerald-500/10' : 'bg-[#1a2744] border-white/5 hover:bg-[#1a2744]/80'}`}
        >
          <CheckCircle className={`w-4 h-4 md:w-5 md:h-5 mb-1 ${activeTab === 'delivered' ? 'text-emerald-400' : 'text-[#64748b]'}`} />
          <span className={`text-[8px] md:text-[10px] font-black tracking-widest uppercase mb-1 ${activeTab === 'delivered' ? 'text-white' : 'text-[#64748b]'}`}>Entregue</span>
          <span className={`text-[10px] md:text-xs font-black px-2 py-0.5 rounded-lg ${activeTab === 'delivered' ? 'bg-emerald-500 text-white' : 'bg-black/20 text-[#64748b]'}`}>
            {sales.filter(s => s.status === 'entregue').length}
          </span>
        </button>
      </div>

      {/* Grid de Pedidos Scrollable */}
      <div className="flex-1 min-h-0 bg-[#0d1c30] rounded-2xl border border-white/5 shadow-inner overflow-hidden flex flex-col p-2 md:p-4">
        <div className="flex-1 overflow-y-auto no-scrollbar scroll-smooth">
          {deliverySales.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 p-1">
              {deliverySales.map((sale) => {
                const customer = customers.find(c => c.id === sale.customerId);
                return (
                  <div key={sale.id} className="bg-[#1a2744] rounded-xl border border-white/5 p-4 hover:border-blue-500/30 transition-all group relative flex flex-col">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                          <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest leading-none">#{sale.sequentialId || sale.id.slice(0, 5)}</span>
                        </div>
                        <p className="text-[8px] font-black text-[#64748b] uppercase leading-none">{new Date(sale.date).toLocaleDateString()} {new Date(sale.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      <button 
                        onClick={() => setSelectedSale(sale)}
                        className="p-2 bg-black/20 text-[#64748b] rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-lg"
                      >
                        <Eye size={14} />
                      </button>
                    </div>
                    
                    <div className="flex-1 space-y-3">
                      <div>
                        <p className="text-[8px] font-black text-[#64748b] uppercase tracking-widest mb-1 italic">Cliente</p>
                        <h4 className="text-[11px] font-black text-white uppercase truncate">{customer?.name || 'Cliente de Balcão'}</h4>
                      </div>

                      <div className="space-y-2">
                        <div className="flex gap-2 p-2 bg-black/20 rounded-lg border border-white/5">
                          <MapPin size={12} className="text-[#64748b] shrink-0 mt-0.5" />
                          <p className="text-[9px] text-zinc-300 leading-tight uppercase font-medium line-clamp-2">
                            {customer?.address ? (
                              `${customer.address.street}, ${customer.address.number}${(customer.address.neighborhood || customer.address.city) ? ` - ${customer.address.neighborhood || customer.address.city}` : ''}`
                            ) : 'Endereço não informado'}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 p-2 bg-black/20 rounded-lg border border-white/5">
                          <Truck size={12} className="text-[#64748b] shrink-0" />
                          <span className="text-[9px] font-black text-emerald-400 uppercase truncate">
                            {getDeliveryMethodName(sale)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-white/5 mt-3 flex justify-between items-center bg-black/10 -mx-4 -mb-4 p-3 rounded-b-xl px-4">
                      <span className="text-[11px] font-black text-white leading-none">R$ {sale.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md border text-[8px] font-black uppercase tracking-widest leading-none ${
                        activeTab === 'pending' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                        activeTab === 'shipping' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                        'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}>
                        {activeTab === 'pending' ? <Package size={10} /> : activeTab === 'shipping' ? <Truck size={10} /> : <Check size={10} />}
                        {activeTab === 'pending' ? 'Pendente' : activeTab === 'shipping' ? 'Em Trânsito' : 'Entregue'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center py-20 grayscale opacity-20">
              <Package size={64} strokeWidth={1} className="text-white mb-4" />
              <p className="text-[10px] font-black text-white uppercase tracking-widest italic">Nenhum pedido nesta etapa</p>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showMethodsModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-[#0f172a] w-full max-w-lg rounded-3xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-8 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
                    <Truck size={24} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-widest leading-none">Gerenciar Entregas</h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter mt-1">Configure seus meios de envio</p>
                  </div>
                </div>
                <button onClick={() => setShowMethodsModal(false)} className="p-3 bg-slate-800 text-slate-400 rounded-xl hover:text-white hover:bg-slate-700 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-8 space-y-6 overflow-y-auto no-scrollbar scroll-smooth">
                <form onSubmit={handleAddMethod} className="flex gap-2">
                  <div className="flex-1">
                    <Input 
                      label="Nome do Tipo" 
                      placeholder="EX: MOTOBOY PRÓPRIO" 
                      value={newMethodName} 
                      onChange={setNewMethodName} 
                      dark
                    />
                  </div>
                  <button 
                    type="submit"
                    className="self-end p-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                  >
                    <Plus size={24} />
                  </button>
                </form>

                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 px-1">Tipos Cadastrados</h4>
                  {deliveryMethods.length > 0 ? (
                    deliveryMethods.map(method => (
                      <div key={method.id} className="flex items-center justify-between p-4 bg-slate-900/50 rounded-2xl border border-slate-800 transition-all hover:border-slate-700 group">
                        <div className="flex items-center gap-3">
                           <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${method.isActive ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-slate-800 text-slate-700 border-slate-700'}`}>
                             <Truck size={18} />
                           </div>
                           <span className={`text-xs font-bold uppercase tracking-tight transition-colors ${method.isActive ? 'text-white' : 'text-slate-600'}`}>
                             {method.name}
                           </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {canEdit && (
                            <button 
                              onClick={() => toggleMethodStatus(method.id)}
                              className={`p-2.5 rounded-xl transition-all border ${method.isActive ? 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20' : 'bg-slate-800 text-slate-600 border-slate-700 hover:bg-slate-700 hover:text-slate-400'}`}
                            >
                              {method.isActive ? <Unlock size={14} /> : <Lock size={14} />}
                            </button>
                          )}
                          {canEdit && method.name.toUpperCase() !== 'EM MÃOS' && method.name.toUpperCase() !== 'ENTREGA EM MÃOS' && (
                            <button 
                              onClick={() => deleteMethod(method.id, method.name)}
                              className="p-2.5 text-slate-700 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-12 text-center border-2 border-dashed border-slate-800 rounded-[2rem]">
                      <Truck size={32} className="mx-auto text-slate-800 mb-4" />
                      <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Nenhum tipo cadastrado</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-8 bg-slate-900 border-t border-slate-800 flex justify-end">
                <button 
                  onClick={() => setShowMethodsModal(false)}
                  className="px-10 py-4 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-500 transition-all border border-blue-500/20"
                >
                  Concluir
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedSale && (
          <ReceiptModal 
            sale={selectedSale} 
            products={products} 
            customers={customers}
            company={company}
            couponConfig={couponConfig}
            couponPDVConfig={couponPDVConfig}
            onClose={() => setSelectedSale(null)} 
            isFinalized={true}
            imprimirCupom={imprimirCupom}
            imprimirPedidoPDV={imprimirPedidoPDV}
            generateReceiptHTML={generateReceiptHTML}
            generateSimpleReceiptHTML={generateSimpleReceiptHTML}
            performUnifiedPrint={performUnifiedPrint}
            paymentIcons={paymentIcons}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
function CashierView({ 
  cashierSession,
  setCashierSession,
  sales,
  closedSessions,
  setClosedSessions,
  addActivity,
  users,
  couponConfig,
  imprimirCupom,
  canEdit,
  currentUser,
  setView,
  redirectAfterCashier,
  setRedirectAfterCashier
}: { 
  cashierSession: CashierSession,
  setCashierSession: any,
  sales: Sale[],
  closedSessions: CashierSession[],
  setClosedSessions: any,
  addActivity: (type: Activity['type'], action: string, details: string, extra?: Partial<Activity>) => void,
  users: SystemUser[],
  couponConfig: CouponConfig,
  imprimirCupom: (sale: Sale | string) => Promise<boolean>,
  canEdit: boolean,
  currentUser: SystemUser | null,
  setView: (view: View) => void,
  redirectAfterCashier: View | null,
  setRedirectAfterCashier: (view: View | null) => void
}) {
  const [openingBalanceInput, setOpeningBalanceInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [reportData, setReportData] = useState<CashierSession | null>(null);

  const handleOpenCashier = () => {
    const val = parseLocaleFloat(openingBalanceInput);
    if (!openingBalanceInput) return alert('Informe um valor válido.');
    
    const session: CashierSession = {
      id: crypto.randomUUID(),
      isOpen: true,
      openedAt: new Date().toLocaleString('pt-BR'),
      openingBalance: val,
      userId: currentUser?.id,
      userName: currentUser?.name,
      totalSales: 0,
      totalCanceled: 0,
      salesCount: 0,
      canceledCount: 0,
      salesByMethod: {},
      updatedAt: Date.now()
    };
    setCashierSession(session);
    addActivity('system', 'Caixa Aberto', `Saldo inicial: R$ ${val.toFixed(2)}.`);
    
    // Redireciona se houver uma origem pendente (ex: vindo do PDV)
    if (redirectAfterCashier) {
      setView(redirectAfterCashier);
      setRedirectAfterCashier(null);
    }
  };

  const handlePrintReport = async () => {
    if (!reportData) return;
    
    const reportHtml = `
      <html>
        <head>
          <title>Fechamento de Caixa</title>
          <style>
            body { font-family: monospace; width: ${couponConfig.format === '58mm' ? '58mm' : '80mm'}; margin: 0; padding: 5mm; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 10px; }
            .item { display: flex; justify-content: space-between; margin-bottom: 2px; }
            .total { font-weight: bold; font-size: 14px; border-top: 1px solid #000; padding-top: 5px; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h3>FECHAMENTO DE CAIXA</h3>
            <p>${reportData.closedAt}</p>
          </div>
          <div class="item"><span>INICIAL</span><span>R$ ${reportData.openingBalance.toFixed(2)}</span></div>
          <div class="item"><span>ENTRADAS</span><span>R$ ${reportData.totalSales.toFixed(2)}</span></div>
          ${Object.entries(reportData.salesByMethod).map(([method, amount]) => `
            <div class="item" style="padding-left: 10px; font-size: 10px;">
              <span>- ${method}</span><span>R$ ${(Number(amount) || 0).toFixed(2)}</span>
            </div>
          `).join('')}
          <div class="item"><span>REFORÇOS</span><span>R$ ${(reportData.reforsos || 0).toFixed(2)}</span></div>
          <div class="item"><span>SANGRIAS</span><span>R$ ${(reportData.sangrias || 0).toFixed(2)}</span></div>
          <div class="item"><span>SAIDAS/CANCEL</span><span>R$ ${reportData.totalCanceled.toFixed(2)}</span></div>
          <div class="total">
            <div class="item"><span>RESUMO FINAL</span><span>R$ ${((reportData.closingBalance ?? 0)).toFixed(2)}</span></div>
          </div>
        </body>
      </html>
    `;

    if (couponConfig.printMode === 'auto') {
      const handled = await imprimirCupom(reportHtml);
      if (handled) return;
    }
    
    window.print();
  };

  const handleCloseCashier = () => {
    const adminUser = users.find(u => u.id === 'admin' || u.username.toUpperCase() === 'ADM');
    const isAdmSetupDone = adminUser && isHashed(adminUser.password || '') && !adminUser.isFirstAccess;
    
    const matchedUser = users.find(u => verifyPassword(passwordInput, u.password || ''));
    const isMasterPassword = !isAdmSetupDone && passwordInput === 'ADM1234';

    if (!matchedUser && !isMasterPassword) {
      alert('Senha inválida!');
      return;
    }

    const user = matchedUser || (isMasterPassword ? adminUser : null);
    const userName = user?.name || 'Administrador';

    // Recalculate totals based on actual sales linked to this session
    const sessionSales = sales.filter(s => s.cashierSessionId === cashierSession.id && s.status !== 'cancelado');
    const totalSalesCalculated = sessionSales.reduce((acc, s) => acc + s.total, 0);
    const salesCountCalculated = sessionSales.length;
    
    // Group sales by method
    const salesByMethodCalculated = sessionSales.reduce((acc, s) => {
      acc[s.paymentMethod] = (acc[s.paymentMethod] || 0) + s.total;
      return acc;
    }, {} as Record<string, number>);

    const canceledSales = sales.filter(s => s.cashierSessionId === cashierSession.id && s.status === 'cancelado');
    const totalCanceledCalculated = canceledSales.reduce((acc, s) => acc + s.total, 0);
    const canceledCountCalculated = canceledSales.length;

    const closedSession: CashierSession = {
      ...cashierSession,
      isOpen: false,
      userId: user?.id,
      userName: userName,
      closedAt: new Date().toLocaleString('pt-BR'),
      totalSales: totalSalesCalculated,
      salesCount: salesCountCalculated,
      salesByMethod: salesByMethodCalculated,
      totalCanceled: totalCanceledCalculated,
      canceledCount: canceledCountCalculated,
      closingBalance: cashierSession.openingBalance + totalSalesCalculated - (cashierSession.sangrias || 0) + (cashierSession.reforsos || 0),
      updatedAt: Date.now()
    };
    
    setReportData(closedSession);
    setClosedSessions((prev: CashierSession[]) => [...prev, closedSession]);
    setCashierSession({
      id: '', isOpen: false, openedAt: '', openingBalance: 0, totalSales: 0, totalCanceled: 0, salesCount: 0, canceledCount: 0, salesByMethod: {}, reforsos: 0, sangrias: 0, estornos: 0, descontos: 0, acrescimos: 0, taxaEntrega: 0
    });
    // This resets the current session, in DB we also need to mark as closed or just leave the closedSession as the synced one.
    // Usually we sync the finished session.

    addActivity('system', 'Caixa Fechado', `Fechado por ${userName}. Saldo final: R$ ${closedSession.closingBalance?.toFixed(2)}.`);
    setShowCloseConfirm(false);
    setPasswordInput('');
  };

  if (reportData) {
    return (
      <div className="max-w-md mx-auto bg-zinc-950 p-8 rounded-3xl border border-zinc-800 shadow-xl space-y-6 animate-in fade-in zoom-in-95 duration-500 font-mono text-zinc-100">
        <div className="text-center space-y-1 relative">
          <button onClick={() => setReportData(null)} className="absolute -top-4 -right-4 bg-zinc-900 text-zinc-500 p-2 rounded-full hover:text-red-500 shadow-sm border border-zinc-800"><X size={16} /></button>
          <h3 className="text-lg font-black uppercase tracking-widest border-b border-zinc-800 pb-2 mb-4">Fechamento do Caixa</h3>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-1 text-[9px] border-b border-zinc-800 pb-4">
            <div className="flex justify-between"><span>ABERTURA:</span><span className="font-bold">{reportData.openedAt}</span></div>
            <div className="flex justify-between"><span>FECHAMENTO:</span><span className="font-bold">{reportData.closedAt}</span></div>
            <div className="flex justify-between"><span>ID SESSÃO:</span><span className="font-bold">#{reportData.id.substring(0, 8).toUpperCase()}</span></div>
          </div>

          <div className="space-y-2 pt-2 text-[10px]">
            <div className="flex justify-between font-bold"><span>(+) SALDO INICIAL</span><span>R$ {reportData.openingBalance.toFixed(2)}</span></div>
            
            <div className="border-t border-zinc-900 my-2"></div>
            
            <div className="flex justify-between font-bold text-emerald-400"><span>(+) TOTAL ENTRADAS</span><span>R$ {reportData.totalSales.toFixed(2)}</span></div>
            
            {/* Payment methods detail - grouping for clearer report */}
            <div className="pl-4 space-y-1">
              {Object.entries(reportData.salesByMethod).map(([method, amount]) => (
                <div key={method} className="flex justify-between text-[9px] text-zinc-500 uppercase italic">
                  <span>- {method}</span>
                  <span>R$ {(Number(amount) || 0).toFixed(2)}</span>
                </div>
              ))}
            </div>
            
            {reportData.reforsos ? (
              <div className="flex justify-between"><span>(+) REFORÇOS</span><span>R$ {reportData.reforsos.toFixed(2)}</span></div>
            ) : null}

            <div className="border-t border-zinc-900 my-2"></div>

            <div className="flex justify-between text-red-500"><span>(-) SANGRIAS</span><span>R$ {(reportData.sangrias || 0).toFixed(2)}</span></div>
            <div className="flex justify-between text-red-500"><span>(-) ESTORNOS/CANCEL</span><span>R$ {(reportData.totalCanceled || 0).toFixed(2)}</span></div>
          </div>

          <div className="flex justify-between pt-6 border-t border-zinc-700 font-black text-lg text-blue-400 bg-zinc-900/50 p-2 rounded-xl">
            <span>RESUMO FINAL</span>
            <span>R$ {reportData.closingBalance?.toFixed(2)}</span>
          </div>

          <div className="pt-4 text-center border-t border-dashed border-zinc-800">
             <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">{reportData.salesCount} Vendas Processadas</p>
          </div>
        </div>

        <div className="text-center">
          <p className="text-[8px] font-black uppercase text-zinc-700 tracking-widest mb-2 italic">Formato: {couponConfig.format}</p>
        </div>

        <div className="flex gap-4 pt-4 no-print">
          <button onClick={handlePrintReport} className="flex-1 bg-zinc-900 text-zinc-100 p-4 rounded-2xl font-black text-[10px] uppercase border border-zinc-800 flex items-center justify-center gap-2 shadow-sm hover:bg-zinc-800">
            {getPrintIcon(couponConfig.printMode, 16)} {getPrintLabel(couponConfig.printMode)}
          </button>
          <button onClick={() => setReportData(null)} className="flex-1 bg-blue-600 text-white p-4 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20">Sair</button>
        </div>
      </div>
    );
  }

  if (!cashierSession.isOpen) {
    return (
      <div className="max-w-md mx-auto glass-panel p-10 rounded-[3rem] border border-white/10 shadow-2xl space-y-8 animate-in fade-in slide-in-from-bottom-4">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-blue-500/10 rounded-2xl border border-blue-500/20 flex items-center justify-center mx-auto text-blue-400 shadow-lg shadow-blue-500/5">
            <Unlock size={32} strokeWidth={2} />
          </div>
          <div>
            <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Abrir Caixa</h3>
            <p className="text-[10px] text-white/40 font-black uppercase tracking-widest mt-1 italic">Sessão Financeira do Dia</p>
          </div>
        </div>
        <div className="space-y-6">
          <div className="relative">
            <Input 
              label="Valor Inicial em Caixa" 
              value={openingBalanceInput} 
              onChange={setOpeningBalanceInput} 
              placeholder="0,00"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && canEdit) handleOpenCashier();
              }}
            />
          </div>
          {canEdit ? (
            <button 
              onClick={handleOpenCashier} 
              className="glass-button-primary w-full py-6 text-sm flex items-center justify-center gap-3"
            >
              <Zap size={18} fill="currentColor" /> Iniciar Sessão
            </button>
          ) : (
            <div className="w-full bg-white/5 text-white/20 p-6 rounded-2xl font-black text-[10px] uppercase tracking-widest text-center border border-dashed border-white/10 italic">Acesso Restrito para Abertura</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="glass-panel p-8 rounded-[3rem] border border-white/10 shadow-2xl space-y-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-blue-500 opacity-50"></div>
        
        <div className="flex justify-between items-start">
          <div className="space-y-1">
             <p className="text-[10px] font-black text-white/30 uppercase tracking-widest leading-none">Status da Sessão</p>
             <div className="flex items-center gap-2">
               <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
               <span className="text-xl font-black text-white uppercase tracking-tighter">Caixa Aberto</span>
             </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
            <Lock size={24} strokeWidth={2} />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-6 border-y border-white/10 py-8 text-center bg-white/5 rounded-3xl">
          <div>
            <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-2 italic">Aberto em</p>
            <p className="text-sm font-black text-white tracking-tight">{cashierSession.openedAt}</p>
          </div>
          <div>
            <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-2 italic">Saldo Inicial</p>
            <p className="text-sm font-black text-blue-400 tracking-tight">R$ {cashierSession.openingBalance.toFixed(2)}</p>
          </div>
        </div>

        <div className="space-y-4 px-2">
           <div className="flex justify-between items-center group">
             <span className="text-xs font-bold text-white/40 uppercase tracking-widest">Vendas Acumuladas</span>
             <span className="text-xl font-black text-emerald-400 tracking-tighter group-hover:scale-105 transition-transform">R$ {cashierSession.totalSales.toFixed(2)}</span>
           </div>
           <div className="flex justify-between items-center group">
             <span className="text-xs font-bold text-white/40 uppercase tracking-widest">Cancelamentos</span>
             <span className="text-xl font-black text-red-400 tracking-tighter group-hover:scale-105 transition-transform">- R$ {cashierSession.totalCanceled.toFixed(2)}</span>
           </div>
        </div>

        {canEdit && (
          <button 
            onClick={() => setShowCloseConfirm(true)} 
            className="w-full bg-red-500/10 border border-red-500/20 text-red-500 p-6 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all shadow-lg active:scale-95 flex items-center justify-center gap-3"
          >
            <Lock size={18} strokeWidth={2} /> Encerrar Sessão
          </button>
        )}
      </div>

      <AnimatePresence>
        {showCloseConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 p-4 backdrop-blur-xl">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} className="glass-panel p-10 rounded-[3rem] border border-white/10 max-w-sm w-full space-y-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-red-500 opacity-50"></div>
              <div className="text-center">
                <div className="w-20 h-20 bg-red-500/10 rounded-3xl border border-red-500/20 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-red-500/5">
                  <Unlock size={32} className="text-red-500" strokeWidth={2} />
                </div>
                <h4 className="text-xl font-black text-white uppercase tracking-tight">Fechar Caixa</h4>
                <p className="text-[10px] text-white/40 font-bold mt-2 uppercase tracking-widest italic">Insira sua senha para confirmar</p>
              </div>
              <div className="space-y-8">
                <Input label="Senha de Confirmação" value={passwordInput} onChange={setPasswordInput} type="password" placeholder="****" />
                <div className="flex gap-4">
                  <button onClick={() => setShowCloseConfirm(false)} className="flex-1 py-5 rounded-2xl bg-white/5 text-white/40 border border-white/10 font-black text-[10px] uppercase hover:bg-white/10 hover:text-white transition-all">Cancelar</button>
                  <button onClick={handleCloseCashier} className="flex-1 py-5 rounded-2xl bg-blue-600 text-white font-black text-[10px] uppercase shadow-lg shadow-blue-600/20 border border-blue-500 hover:bg-blue-500 active:scale-95 transition-all">CONFIRMAR</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CashierHistoryView({ 
  closedSessions, 
  imprimirCupom, 
  couponConfig,
  canEdit,
  onBack
}: { 
  closedSessions: CashierSession[], 
  imprimirCupom: (s: string) => Promise<boolean>, 
  couponConfig: CouponConfig,
  canEdit: boolean,
  onBack?: () => void
}) {
  const [selectedSession, setSelectedSession] = useState<CashierSession | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSessions = useMemo(() => {
    return closedSessions
      .filter(s => 
        s.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.closedAt?.includes(searchTerm)
      )
      .sort((a, b) => {
        // Simple date comparison for pt-BR string "DD/MM/YYYY, HH:MM:SS"
        const parseDate = (d?: string) => {
          if (!d) return 0;
          try {
            const [datePart, timePart] = d.split(', ');
            const [day, month, year] = datePart.split('/');
            return new Date(`${year}-${month}-${day}T${timePart}`).getTime();
          } catch { return 0; }
        };
        return parseDate(b.closedAt) - parseDate(a.closedAt);
      });
  }, [closedSessions, searchTerm]);

  return (
    <div className="fixed inset-0 z-[200] bg-[#0a1628] text-white p-2 md:p-4 font-sans flex flex-col overflow-hidden animate-in fade-in duration-500">
      {/* Header Padrao */}
      <div className="flex items-center justify-between mb-4 shrink-0 px-2 md:px-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack || (() => window.history.back())}
            className="w-10 h-10 rounded-xl bg-[#1a2744] flex items-center justify-center border border-white/5 hover:bg-[#1a2744]/80 transition-all cursor-pointer group"
          >
            <ChevronLeft className="w-5 h-5 text-[#64748b] group-hover:text-white" />
          </button>
          <div>
            <h2 className="text-lg md:text-xl font-black text-white uppercase italic leading-none">
              Histórico de Caixas
            </h2>
            <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mt-1">
              Registro de Fechamentos Realizados
            </p>
          </div>
        </div>

        <div className="relative w-48 md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#334155]" size={14} />
          <input 
            type="text" 
            placeholder="BUSCAR USUÁRIO OU DATA..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-[#0d1c30] border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-[10px] font-black text-white uppercase outline-none focus:ring-1 ring-pink-500/30 transition-all placeholder:text-[#334155]"
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-[#0d1c30] rounded-2xl border border-white/5 shadow-inner overflow-hidden flex flex-col">
        <div className="overflow-x-auto no-scrollbar overflow-y-auto flex-1">
          <table className="w-full text-left order-collapse">
            <thead>
              <tr className="bg-black/40 border-b border-white/5 text-[9px] font-black text-white/40 uppercase tracking-widest sticky top-0 z-20">
                <th className="px-6 py-4">Sessão / Data</th>
                <th className="px-6 py-4">Usuário</th>
                <th className="px-6 py-4 text-right">Saldo Final</th>
                <th className="px-6 py-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {filteredSessions.map((session) => (
                <tr key={session.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20 shadow-lg shadow-amber-500/5">
                          <Calculator size={16} />
                       </div>
                       <div>
                         <p className="text-[10px] font-black text-white uppercase group-hover:text-amber-400 transition-colors tracking-tight">#{session.id.substring(0, 8)}</p>
                         <p className="text-[8px] font-black text-[#64748b] uppercase mt-0.5 tracking-tighter">{session.closedAt}</p>
                       </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[9px] font-black text-[#64748b] uppercase tracking-widest bg-[#1a2744] px-3 py-1 rounded-lg border border-white/5 inline-flex items-center gap-1.5 group-hover:text-white transition-colors">
                      <User size={10} className="text-[#334155]" />
                      {session.userName || 'ADMINISTRADOR'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="text-[11px] font-black text-white italic leading-none">R$ {session.closingBalance?.toFixed(2)}</p>
                    <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest mt-1 italic">Vendas: R$ {session.totalSales.toFixed(2)}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center">
                       <button 
                         onClick={() => setSelectedSession(session)}
                         className="p-2 bg-[#1a2744] border border-white/5 text-[#64748b] rounded-xl hover:bg-blue-600 hover:text-white transition-all flex items-center gap-2 px-4 shadow-lg group/btn"
                       >
                         <Receipt size={14} className="group-hover/btn:scale-110 transition-transform" />
                         <span className="text-[9px] font-black uppercase tracking-widest">Relatório</span>
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredSessions.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-20 text-center">
                    <History size={48} className="mx-auto text-[#1a2744]/20 mb-4" strokeWidth={1} />
                    <p className="text-[10px] font-black text-[#334155] uppercase tracking-widest italic">Nenhuma sessão concluída</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {selectedSession && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-zinc-900 w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-zinc-800"
            >
              <div className="p-8 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/50">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 rounded-2xl bg-amber-600 text-white flex items-center justify-center shadow-lg shadow-amber-900/40">
                      <Receipt size={24} />
                   </div>
                   <div>
                     <h3 className="text-sm font-black text-zinc-100 uppercase tracking-widest">Relatório de Fechamento</h3>
                     <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-tight">Sessão #{selectedSession.id.substring(0, 8)}</p>
                   </div>
                </div>
                <button 
                  onClick={() => setSelectedSession(null)}
                  className="p-3 hover:bg-zinc-800 rounded-2xl transition-all text-zinc-500 hover:text-zinc-100 shadow-sm"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-10 bg-zinc-950/30 no-scrollbar">
                 <div className="bg-zinc-900 p-8 rounded-[2rem] border border-zinc-800 shadow-sm space-y-6 text-zinc-100 font-mono">
                    <div className="text-center space-y-2 border-b border-dashed border-zinc-800 pb-6 mb-6">
                       <h4 className="text-lg font-black uppercase text-zinc-100">Resumo da Movimentação</h4>
                       <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Operador: {selectedSession.userName || 'ADMINISTRADOR'}</p>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-1 gap-1 text-[9px] border-b border-zinc-800 pb-4">
                        <div className="flex justify-between"><span>ABERTURA:</span><span className="font-bold">{selectedSession.openedAt}</span></div>
                        <div className="flex justify-between"><span>FECHAMENTO:</span><span className="font-bold">{selectedSession.closedAt}</span></div>
                        <div className="flex justify-between"><span>SESSÃO ID:</span><span className="font-bold uppercase">#{selectedSession.id.substring(0, 8)}</span></div>
                      </div>

                      <div className="space-y-2 pt-2 text-[10px]">
                        <div className="flex justify-between font-bold"><span>(+) SALDO INICIAL</span><span>R$ {selectedSession.openingBalance.toFixed(2)}</span></div>
                        
                        <div className="border-t border-zinc-800 my-2"></div>
                        
                        <div className="flex justify-between font-bold text-emerald-400"><span>(+) TOTAL ENTRADAS</span><span>R$ {selectedSession.totalSales.toFixed(2)}</span></div>
                        
                        <div className="pl-4 space-y-1">
                          {Object.entries(selectedSession.salesByMethod || {}).map(([method, amount]) => (
                            <div key={method} className="flex justify-between text-[9px] text-zinc-500 uppercase italic">
                              <span>- {method}</span>
                              <span>R$ {(Number(amount) || 0).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                        
                        {selectedSession.reforsos ? (
                          <div className="flex justify-between"><span>(+) REFORÇOS</span><span>R$ {selectedSession.reforsos.toFixed(2)}</span></div>
                        ) : null}

                        <div className="border-t border-zinc-800 my-2"></div>

                        <div className="flex justify-between text-red-500"><span>(-) SANGRIAS</span><span>R$ {(selectedSession.sangrias || 0).toFixed(2)}</span></div>
                        <div className="flex justify-between text-red-500"><span>(-) ESTORNOS/CANCEL</span><span>R$ {(selectedSession.totalCanceled || 0).toFixed(2)}</span></div>
                      </div>

                      <div className="flex justify-between pt-6 border-t border-zinc-700 font-black text-lg text-blue-400 bg-zinc-950/50 p-2 rounded-xl">
                        <span>RESUMO FINAL</span>
                        <span>R$ {selectedSession.closingBalance?.toFixed(2)}</span>
                      </div>

                      <div className="pt-4 text-center border-t border-dashed border-zinc-800">
                         <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">{selectedSession.salesCount} Vendas Processadas</p>
                      </div>
                    </div>
                 </div>
              </div>

              <div className="p-6 bg-zinc-950/50 border-t border-zinc-800 flex gap-4">
                 <button onClick={() => setSelectedSession(null)} className="flex-1 py-4 rounded-2xl bg-zinc-800 text-zinc-100 font-black text-[10px] uppercase tracking-widest hover:bg-zinc-700 transition-all">Sair</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SeparadorScanner({ onScan, onClose, id = "reader-separador" }: { onScan: (text: string) => void, onClose: () => void, id?: string }) {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScanTime = useRef<number>(0);

  const handleScan = (text: string) => {
    const now = Date.now();
    if (now - lastScanTime.current < 2000) return; // Cooldown of 2s
    lastScanTime.current = now;
    
    playScanFeedback();
    onScan(text);
  };

  const startCamera = async () => {
    try {
      setPermissionError(null);
      setIsCameraActive(true);
      
      // Wait for the div to be rendered
      setTimeout(async () => {
        try {
          if (!scannerRef.current) {
            scannerRef.current = new Html5Qrcode(id);
          }
          
          await scannerRef.current.start(
            { facingMode: "environment" },
            { fps: 15, qrbox: { width: 250, height: 250 } },
            handleScan,
            () => {}
          );
        } catch (innerErr: any) {
          setIsCameraActive(false);
          const errStr = innerErr.toString();
          if (errStr.includes("NotAllowedError") || errStr.includes("Permission denied")) {
            setPermissionError("Permissão de câmera necessária para escanear o pedido. Verifique as configurações do seu navegador.");
          } else {
            console.error("Camera error:", innerErr);
            setPermissionError("Não foi possível acessar a câmera. Verifique se ela está sendo usada por outro app ou tente recarregar a página.");
          }
        }
      }, 100);
    } catch (err: any) {
      console.error("Camera error:", err);
      setIsCameraActive(false);
    }
  };

  const scanFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileError(null);
    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(id);
      }
      const result = await scannerRef.current.scanFile(file, true);
      handleScan(result);
    } catch (err) {
      console.error("File scan error:", err);
      setFileError("QR Code inválido ou não reconhecido");
      setTimeout(() => setFileError(null), 3000);
    }
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  return (
    <div className="w-full flex flex-col items-center">
      {/* Hidden/Active scanner container */}
      <div 
        className={`${isCameraActive ? 'relative w-full aspect-square bg-black rounded-[2rem] overflow-hidden shadow-2xl mb-4' : 'hidden'}`}
      >
        <div id={id} className="w-full h-full" />
        
        {/* Target area overlay */}
        <div className="absolute inset-0 z-10 pointer-events-none flex flex-col items-center justify-center">
          {/* Scrim with focus hole */}
          <div className="absolute inset-0 bg-black/40 shadow-[inset_0_0_0_1000px_rgba(0,0,0,0.5)]" />
          
          {/* Focus lines */}
          <div className="relative w-[250px] max-w-[70%] aspect-square border-2 border-white/20 rounded-3xl">
             {/* Corners */}
             <div className="absolute -top-1 -left-1 w-10 h-10 border-t-4 border-l-4 border-purple-400 rounded-tl-2xl" />
             <div className="absolute -top-1 -right-1 w-10 h-10 border-t-4 border-r-4 border-purple-400 rounded-tr-2xl" />
             <div className="absolute -bottom-1 -left-1 w-10 h-10 border-b-4 border-l-4 border-purple-400 rounded-bl-2xl" />
             <div className="absolute -bottom-1 -right-1 w-10 h-10 border-b-4 border-r-4 border-purple-400 rounded-br-2xl" />
             
             {/* Scanning line animation */}
             <motion.div 
               animate={{ top: ['10%', '90%'] }}
               transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
               className="absolute left-2 right-2 h-1 bg-purple-400/50 shadow-[0_0_20px_rgba(168,85,247,0.8)] rounded-full"
             />
          </div>

          <div className="mt-8 px-6 py-3 bg-black/40 backdrop-blur-md rounded-full border border-white/10">
            <p className="text-white/90 font-black text-[10px] uppercase tracking-[0.2em] text-center">
              Aponte a câmera para o QR Code
            </p>
          </div>
        </div>

        <button 
          onClick={() => {
            if (scannerRef.current?.isScanning) {
              scannerRef.current.stop().then(() => setIsCameraActive(false)).catch(() => setIsCameraActive(false));
            } else {
              setIsCameraActive(false);
            }
          }}
          className="absolute top-6 right-6 z-20 p-3 bg-black/50 text-white rounded-2xl backdrop-blur-md border border-white/10 hover:bg-black/70 transition-all shadow-xl active:scale-90"
        >
          <X size={24} />
        </button>
      </div>

      {!isCameraActive && (
        <div className="w-full">
          {/* QR Code Section */}
          <div className="rounded-2xl bg-[#0a0f1a] border border-[#1e2a45] p-5 mb-0">
            <div className="flex items-center gap-4 mb-5">
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-[#1a2a4a]">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#5b7fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                    <rect x="14" y="14" width="3" height="3" rx="0.5" />
                    <rect x="18" y="14" width="3" height="3" rx="0.5" />
                    <rect x="14" y="18" width="3" height="3" rx="0.5" />
                    <rect x="18" y="18" width="3" height="3" rx="0.5" />
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <h2 className="text-base font-bold text-white tracking-wide uppercase">ESCANEAR QR CODE</h2>
                  <p className="text-xs text-gray-500 tracking-wide">CÂMERA OU UPLOAD DE IMAGEM</p>
                </div>
              </div>
            {permissionError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-[10px] uppercase font-bold text-center leading-relaxed italic">
                {permissionError}
              </div>
            )}

            {/* Camera Button */}
            <button 
              onClick={startCamera}
              className="w-full flex items-center gap-4 rounded-xl bg-gradient-to-r from-[#5b6cff] to-[#7b5cff] py-4 px-5 mb-4 hover:opacity-90 transition-all active:scale-[0.98]"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/20">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                  <circle cx="12" cy="13" r="3" />
                </svg>
              </div>
              <span className="h-6 w-px bg-white/30" />
              <span className="flex-1 text-left text-sm font-bold text-white tracking-widest uppercase">ATIVAR SCANNER DE CÂMERA</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>

            {/* Image Selection Button */}
            <label className="cursor-pointer w-full flex items-center gap-4 rounded-xl bg-[#141c2e] border border-[#1e2a45] py-4 px-5 hover:bg-[#1a2235] transition-all active:scale-[0.98]">
              <input type="file" accept="image/*" className="hidden" onChange={scanFile} />
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#1a2235]">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="9" cy="9" r="2" />
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                </svg>
              </div>
              <span className="flex-1 text-left text-sm font-bold text-gray-400 tracking-widest uppercase">CARREGAR ARQUIVO DE IMAGEM</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </label>

            {fileError && <p className="text-red-400 text-[10px] font-black uppercase text-center mt-3 tracking-widest leading-none">{fileError}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function ConsultarPedidoView({ 
  sales, 
  setSales,
  products, 
  customers, 
  currentUser,
  addActivity,
  setView,
  imprimirCupom,
  imprimirGreetingCupom,
  couponConfig,
  setSelectedLabelProduct
}: { 
  sales: Sale[], 
  setSales: any,
  products: Product[], 
  customers: Customer[], 
  currentUser: any | null,
  addActivity: any,
  setView: (view: any) => void,
  imprimirCupom: (sale: Sale) => Promise<boolean>,
  imprimirGreetingCupom: (sale: Sale) => Promise<boolean>,
  couponConfig: CouponConfig,
  setSelectedLabelProduct: (p: Product | null) => void
}) {
  const [activeTab, setActiveTab] = useState<Sale['status'] | 'falta_confirmada'>('em_separacao');
  const [search, setSearch] = useState('');
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);

  const tabs: { id: Sale['status'] | 'falta_confirmada', label: string, icon: any }[] = [
    { id: 'pendente', label: 'PENDENTES', icon: Clock },
    { id: 'em_separacao', label: 'SEPARANDO', icon: Package },
    { id: 'separado', label: 'SEPARADOS', icon: PackageCheck },
    { id: 'embalado', label: 'EMBALADOS', icon: Box },
    { id: 'enviado', label: 'ENVIADOS', icon: Send },
    { id: 'entregue', label: 'ENTREGUES', icon: CheckCircle },
  ];

  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      const statusMatch = s.status === activeTab || (activeTab === 'separado' && s.status === 'falta_confirmada');
      const searchMatch = !search || 
        s.sequentialId?.toString().includes(search) || 
        s.id.includes(search) ||
        customers.find(c => c.id === s.customerId)?.name.toLowerCase().includes(search.toLowerCase());
      return statusMatch && searchMatch;
    }).sort((a, b) => b.updatedAt - a.updatedAt);
  }, [sales, activeTab, search, customers]);

  const handleStatusUpdate = (saleId: string, nextStatus: Sale['status']) => {
    setSales((prev: Sale[]) => prev.map(s => s.id === saleId ? { ...s, status: nextStatus, updatedAt: Date.now() } : s));
    addActivity('sale', 'Status Atualizado', `Pedido movido para ${nextStatus}.`);
  };

  const selectedSale = useMemo(() => sales.find(s => s.id === selectedSaleId), [sales, selectedSaleId]);
  const selectedCustomer = useMemo(() => customers.find(c => c.id === selectedSale?.customerId), [customers, selectedSale]);

  return (
    <div className="fixed inset-0 z-[200] bg-[#0a1628] text-white p-2 md:p-4 font-sans flex flex-col overflow-hidden">
      {/* Back Button & Header Row */}
      <div className="flex items-center gap-4 mb-4">
        <button 
          onClick={() => setView('dashboard')}
          className="w-10 h-10 rounded-lg border border-[#334155] flex items-center justify-center bg-transparent cursor-pointer hover:bg-white/5 transition-colors shrink-0"
        >
          <ChevronLeft size={20} className="text-[#94a3b8]" />
        </button>
        
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#1a2744] flex items-center justify-center border border-white/5 shadow-xl shrink-0">
            <Box size={22} className="text-[#f59e0b]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold tracking-tight m-0 uppercase truncate">CONSULTA & GESTÃO</h1>
            <p className="text-[#64748b] text-[10px] m-0 uppercase font-bold tracking-widest">FLUXO LOGÍSTICO</p>
          </div>
        </div>

        <div className="relative flex-1 max-w-md ml-auto">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#64748b]" />
          <input 
            type="text" 
            placeholder="BUSCAR PEDIDO..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-black/20 border border-[#334155] rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-[#64748b] focus:ring-1 ring-cyan-500/50 outline-none transition-all uppercase" 
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto no-scrollbar gap-1 mb-4 border-b border-[#1e293b] shrink-0">
        {tabs.map(tab => {
          const count = sales.filter(s => s.status === tab.id || (tab.id === 'separado' && s.status === 'falta_confirmada')).length;
          const isActive = activeTab === tab.id;
          return (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 whitespace-nowrap transition-all relative border-none cursor-pointer rounded-t-lg shrink-0 ${
                isActive ? 'text-[#f59e0b] bg-[#1a2744]' : 'text-[#64748b] bg-transparent hover:text-white/60'
              }`}
            >
              <tab.icon size={16} />
              <span className="font-bold text-[10px] tracking-widest">{tab.label}</span>
              {count > 0 && (
                <span className={`min-w-[18px] h-4 rounded-full text-[9px] font-black flex items-center justify-center text-white px-1 border border-black/20 ${isActive ? 'bg-cyan-500' : 'bg-blue-500/50'}`}>
                  {count}
                </span>
              )}
              {isActive && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#f59e0b]" />}
            </button>
          );
        })}
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap items-end gap-3 mb-4 shrink-0">
        <div className="space-y-1">
          <label className="text-[9px] font-black text-[#64748b] uppercase tracking-widest pl-1">Período</label>
          <div className="min-w-[180px] flex items-center justify-between bg-[#1a2744] border border-[#334155] rounded-lg p-2 text-[10px] text-white">
            <span className="truncate">05/05/2026 - 05/05/2026</span>
            <Calendar size={12} className="text-[#64748b] shrink-0 ml-2" />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-[#64748b] uppercase tracking-widest pl-1">Status</label>
          <div className="min-w-[100px] flex items-center justify-between bg-[#1a2744] border border-[#334155] rounded-lg p-2 text-[10px] text-white">
            <span>Todos</span>
            <ChevronDown size={12} className="text-[#64748b]" />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-[#64748b] uppercase tracking-widest pl-1">Entrega</label>
          <div className="min-w-[100px] flex items-center justify-between bg-[#1a2744] border border-[#334155] rounded-lg p-2 text-[10px] text-white">
            <span>Todos</span>
            <ChevronDown size={12} className="text-[#64748b]" />
          </div>
        </div>
        <button 
          onClick={() => setSearch('')}
          className="flex items-center justify-center gap-2 border border-cyan-400/50 text-cyan-400 hover:bg-cyan-400/10 rounded-lg px-4 py-2 text-[10px] font-black uppercase tracking-widest bg-transparent cursor-pointer transition-all"
        >
          <Filter size={12} />
          <span>LIMPAR</span>
        </button>
      </div>

      {/* Table Area (The only part that scrolls) */}
      <div className="flex-1 min-h-0 bg-[#0d1c30] rounded-xl overflow-hidden border border-white/5 shadow-2xl flex flex-col">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10 bg-[#0d1c30]">
              <tr className="border-b border-white/5 bg-black/40">
                <th className="text-left text-[9px] text-[#64748b] font-black uppercase tracking-widest p-3 pl-6">N° PEDIDO</th>
                <th className="text-left text-[9px] text-[#64748b] font-black uppercase tracking-widest p-3">CLIENTE</th>
                <th className="text-left text-[9px] text-[#64748b] font-black uppercase tracking-widest p-3">DATA</th>
                <th className="text-left text-[9px] text-[#64748b] font-black uppercase tracking-widest p-3">STATUS</th>
                <th className="text-left text-[9px] text-[#64748b] font-black uppercase tracking-widest p-3">ENTREGA</th>
                <th className="text-left text-[9px] text-[#64748b] font-black uppercase tracking-widest p-3">PAGAMENTO</th>
                <th className="text-left text-[9px] text-[#64748b] font-black uppercase tracking-widest p-3">VALOR</th>
                <th className="text-right text-[9px] text-[#64748b] font-black uppercase tracking-widest p-3 pr-6">AÇÕES</th>
              </tr>
            </thead>
          </table>
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar">
          <table className="w-full border-collapse">
            <tbody className="divide-y divide-white/[0.03]">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-20 text-center text-[#64748b] font-bold uppercase tracking-widest text-xs opacity-50">Nenhum pedido encontrado</td>
                </tr>
              ) : (
                filteredSales.map((sale) => {
                  const customer = customers.find(c => c.id === sale.customerId);
                  return (
                    <tr key={sale.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-3 pl-6 w-[15%]">
                        <div className="text-cyan-400 font-bold text-xs tracking-tight italic">#{sale.sequentialId || sale.id.substring(0, 6)}</div>
                        <div className="text-[#64748b] text-[9px] font-medium mt-0.5">ID: {sale.id.substring(0, 8)}</div>
                      </td>
                      <td className="p-3 w-[20%]">
                        <div className="font-bold text-[11px] uppercase tracking-tight truncate max-w-[140px] text-white/90">{customer?.name || 'Cliente Casual'}</div>
                      </td>
                      <td className="p-3 w-[12%]">
                        <div className="text-[10px] font-medium text-gray-300">{new Date(sale.date).toLocaleDateString()}</div>
                        <div className="text-[#64748b] text-[9px] uppercase font-bold">{new Date(sale.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </td>
                      <td className="p-3 w-[12%]">
                        <span className="inline-flex items-center gap-1.5 bg-amber-500/10 text-amber-500 py-1 px-2 rounded-lg text-[9px] font-black uppercase tracking-tighter border border-amber-500/20">
                          <Clock size={10} />
                          {activeTab}
                        </span>
                      </td>
                      <td className="p-3 w-[12%]">
                        <div className="flex items-center gap-2 text-[10px] font-medium text-gray-400">
                          <Package size={12} className="text-[#64748b]" />
                          <span>ENTREGA</span>
                        </div>
                      </td>
                      <td className="p-3 w-[15%]">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded bg-[#1a2744] flex items-center justify-center border border-white/5">
                             <CreditCard size={10} className="text-cyan-400" />
                          </div>
                          <span className="text-[10px] font-bold text-white/70 uppercase truncate">{sale.paymentMethod}</span>
                        </div>
                      </td>
                      <td className="p-3 w-[10%]">
                        <span className="text-[#f59e0b] font-black text-xs tracking-tight italic">R$ {sale.total.toFixed(2)}</span>
                      </td>
                      <td className="p-3 pr-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button 
                            onClick={() => setSelectedSaleId(sale.id)}
                            className="w-8 h-8 rounded-lg border border-[#334155] flex items-center justify-center bg-transparent cursor-pointer hover:bg-cyan-500/10 hover:border-cyan-500/50 transition-all text-[#94a3b8] hover:text-cyan-400"
                          >
                            <Eye size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Container (Fixed at bottom) */}
      <div className="flex items-center justify-between mt-4 bg-black/20 p-3 rounded-xl border border-white/5 shrink-0">
        <span className="text-[#64748b] text-[10px] font-bold uppercase tracking-widest">Total: {filteredSales.length} pedidos</span>
        <div className="flex items-center gap-1.5">
          <button className="w-8 h-8 rounded-lg border border-[#334155] flex items-center justify-center bg-transparent cursor-pointer disabled:opacity-20" disabled>
            <ChevronLeft size={14} className="text-[#94a3b8]" />
          </button>
          <button className="w-8 h-8 rounded-lg bg-blue-600 border-none flex items-center justify-center font-black text-[10px] text-white">1</button>
          <button className="w-8 h-8 rounded-lg border border-[#334155] flex items-center justify-center bg-transparent cursor-pointer">
            <ChevronRight size={14} className="text-[#94a3b8]" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {selectedSaleId && selectedSale && (
          <div className="fixed inset-0 z-[250] flex justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedSaleId(null)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="relative w-full max-w-lg bg-[#0a1628] border-l border-white/10 h-full flex flex-col shadow-2xl p-8 overflow-y-auto no-scrollbar">
              <div className="flex items-center justify-between mb-8">
                 <div>
                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em] mb-1">Detalhes do Pedido</p>
                    <h2 className="text-3xl font-black text-white italic">#{selectedSale.sequentialId}</h2>
                 </div>
                 <button onClick={() => setSelectedSaleId(null)} className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all text-white/50 hover:text-white">
                    <X size={24} />
                 </button>
              </div>

              <div className="space-y-6">
                <div className="bg-[#1a2744] p-6 rounded-2xl border border-white/5 space-y-4">
                  <div className="flex items-center gap-4 border-b border-white/10 pb-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-600/20 flex items-center justify-center">
                       <User size={24} className="text-blue-400" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Cliente</p>
                        <h4 className="text-base font-black text-white uppercase italic">{selectedCustomer?.name || 'Cliente Casual'}</h4>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-black/20 rounded-xl">
                      <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Status</p>
                      <p className="text-xs font-black uppercase text-amber-500 italic">{tabs.find(t => t.id === selectedSale.status)?.label}</p>
                    </div>
                    <div className="p-3 bg-black/20 rounded-xl">
                      <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Data</p>
                      <p className="text-xs font-black uppercase text-white italic">{new Date(selectedSale.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                   <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 pl-2 border-l-2 border-amber-500">Produtos do Pedido</h3>
                   {selectedSale.items.map(item => {
                     const product = products.find(p => p.id === item.productId);
                     return (
                       <div key={item.productId} className="flex items-center gap-4 bg-[#1a2744] p-4 rounded-xl border border-white/5">
                          <div className="w-12 h-12 bg-black rounded-lg overflow-hidden shrink-0 border border-white/10 flex items-center justify-center shadow-inner">
                            {product?.imageUrl ? <img src={product.imageUrl} className="w-full h-full object-cover" /> : <Package className="text-gray-800" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-xs text-white uppercase truncate italic">{product?.name}</p>
                            <p className="text-[10px] text-gray-500 font-bold tracking-tight">R$ {item.price.toFixed(2)} x {item.quantity}</p>
                          </div>
                          <p className="text-sm font-black text-cyan-400 italic">R$ {(item.price * item.quantity).toFixed(2)}</p>
                       </div>
                     );
                   })}
                </div>

                <div className="bg-amber-500/5 border border-amber-500/10 p-6 rounded-2xl">
                   <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total dos Itens</span>
                      <span className="text-xs font-bold text-gray-400 italic">R$ {selectedSale.total.toFixed(2)}</span>
                   </div>
                   <div className="flex justify-between items-center border-t border-white/10 pt-3 mt-3">
                      <span className="text-[12px] font-black text-white uppercase tracking-widest">Total Geral</span>
                      <span className="text-3xl font-black text-amber-500 italic drop-shadow-[0_0_10px_rgba(245,158,11,0.2)]">R$ {selectedSale.total.toFixed(2)}</span>
                   </div>
                </div>

                <div className="grid grid-cols-1 gap-3 pt-4">
                  {selectedSale.status === 'separado' && (
                    <div className="flex flex-col gap-3">
                      <div className="grid grid-cols-2 gap-3">
                        <button 
                          onClick={() => imprimirCupom(selectedSale)} 
                          className="w-full py-3 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] border border-blue-600/30 transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                          {getPrintIcon(couponConfig.printMode, 14)}
                          {getPrintLabel(couponConfig.printMode, "CUPOM")}
                        </button>
                        <button 
                          onClick={() => imprimirGreetingCupom(selectedSale)} 
                          className="w-full py-3 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] border border-emerald-600/30 transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                          {getPrintIcon(couponConfig.printMode, 14)}
                          {getPrintLabel(couponConfig.printMode, "MIMO")}
                        </button>
                      </div>
                      <button 
                        onClick={() => handleStatusUpdate(selectedSale.id, 'embalado')} 
                        className="w-full py-5 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95 shadow-purple-500/20 flex items-center justify-center gap-2"
                      >
                        <Box size={16} />
                        Marcar Embalado
                      </button>
                    </div>
                  )}

                  {selectedSale.status === 'embalado' && (
                    <button 
                      onClick={() => handleStatusUpdate(selectedSale.id, 'enviado')} 
                      className="w-full py-5 bg-blue-500 hover:bg-blue-400 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95 shadow-blue-500/20 flex items-center justify-center gap-2"
                    >
                      <Send size={16} />
                      Enviar Pedido
                    </button>
                  )}

                  {selectedSale.status === 'enviado' && (
                    <button 
                      onClick={() => handleStatusUpdate(selectedSale.id, 'entregue')} 
                      className="w-full py-5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95 shadow-emerald-500/20 flex items-center justify-center gap-2"
                    >
                      <CheckCircle size={16} />
                      Confirmar Entrega
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SeparationView({ 
  sales, 
  products, 
  setProducts,
  setSales, 
  setRevenues,
  productLocations,
  customers,
  addActivity,
  setView,
  company,
  currentUser,
  couponConfig,
  setSelectedLabelProduct
}: { 
  sales: Sale[], 
  products: Product[], 
  setProducts: any,
  setSales: any, 
  setRevenues: any,
  productLocations: ProductLocation[],
  customers: Customer[],
  addActivity: any,
  setView: (v: View) => void,
  company: any,
  currentUser: any,
  couponConfig: CouponConfig,
  setSelectedLabelProduct: (p: Product | null) => void
}) {
  const [orderSearch, setOrderSearch] = useState('');
  const [activeSaleId, setActiveSaleId] = useState<string | null>(null);
  const [conferQuantities, setConferQuantities] = useState<Record<string, number>>({});
  const [productSearch, setProductSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [scannerType, setScannerType] = useState<'order' | 'product'>('order');
  const [lastScan, setLastScan] = useState<string | null>(null);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [mobileScannedProduct, setMobileScannedProduct] = useState<Product | null>(null);
  const [mobileScanQty, setMobileScanQty] = useState<string>('');

  const activeSale = useMemo(() => sales.find(s => s.id === activeSaleId || s.sequentialId?.toString() === activeSaleId), [sales, activeSaleId]);
  const customer = useMemo(() => customers.find(c => c.id === activeSale?.customerId), [customers, activeSale]);

  const handleOrderSearch = (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!orderSearch.trim()) return;
    setError(null);
    const sale = sales.find(s => s.sequentialId?.toString() === orderSearch || s.id === orderSearch);
    if (sale) {
      setActiveSaleId(sale.id);
      setOrderSearch('');
      const initial: Record<string, number> = {};
      sale.items.forEach(item => {
        initial[item.productId] = 0;
      });
      setConferQuantities(initial);
      setLastScan(null);
    } else {
      setError('Pedido não encontrado.');
      // Keep activeSaleId unchanged or clear it? Request says "mensagem de erro sem travar o campo"
      // and "O campo deve continuar clicável/editável após erro".
      // Usually if search fails, we don't want to lose the current active sale if there was one,
      // but here we are in the "selection" phase, so it's probably fine.
    }
  };

  const handleProductScan = (e: FormEvent) => {
    e.preventDefault();
    if (!activeSale || !productSearch.trim()) return;

    const query = productSearch.trim().toLowerCase();
    const product = products.find(p => 
      p.barcode === query || 
      p.sku?.toLowerCase() === query || 
      p.id === query ||
      p.name.toLowerCase().includes(query)
    );

    if (product) {
      const item = activeSale.items.find(i => i.productId === product.id);
      if (item) {
        const isMobile = window.innerWidth < 768;
        if (isMobile) {
          setMobileScannedProduct(product);
          setMobileScanQty('');
          setError(null);
        } else {
          const currentQty = conferQuantities[product.id] || 0;
          if (currentQty < item.quantity) {
            setConferQuantities(prev => ({ ...prev, [product.id]: currentQty + 1 }));
            setLastScan(product.name);
            setError(null);
          } else {
            setError(`Quantidade excedida para: ${product.name}`);
          }
        }
      } else {
        setError('Produto não pertence a este pedido');
      }
    } else {
      setError('Produto não encontrado');
    }
    setProductSearch('');
  };

  const updateQty = (productId: string, delta: number) => {
    const item = activeSale?.items.find(i => i.productId === productId);
    if (!item) return;
    setConferQuantities(prev => {
      const current = prev[productId] || 0;
      const next = Math.max(0, Math.min(item.quantity, current + delta));
      return { ...prev, [productId]: next };
    });
  };

  const totalOrdered = useMemo(() => activeSale?.items.reduce((acc, i) => acc + i.quantity, 0) || 0, [activeSale]);
  const totalConferred = useMemo(() => Object.values(conferQuantities).reduce((acc: number, q: number) => acc + q, 0), [conferQuantities]);
  const counts = useMemo(() => {
    if (!activeSale) return { separated: 0, pending: 0, remaining: 0, distinct: 0, progressPercent: 0 };
    
    let finishedCount = 0;
    let partialCount = 0;
    let notStartedCount = 0;
    
    activeSale.items.forEach(item => {
      const current = conferQuantities[item.productId] || 0;
      if (current === item.quantity) {
        finishedCount++;
      } else if (current > 0) {
        partialCount++;
      } else {
        notStartedCount++;
      }
    });

    const progressPercent = totalOrdered > 0 ? (totalConferred / totalOrdered) * 100 : 0;

    return { 
      separated: totalConferred, 
      pending: Math.max(0, totalOrdered - totalConferred), 
      remaining: notStartedCount,
      distinct: activeSale.items.length,
      totalOrdered,
      progressPercent
    };
  }, [activeSale, conferQuantities, totalOrdered, totalConferred]);

  const progressPercent = counts.progressPercent;

  const handleFinish = () => {
    if (!activeSale) return;

    if (totalConferred < totalOrdered) {
      setShowFinishConfirm(true);
    } else {
      executeFinish();
    }
  };

  const handleScannerScan = (text: string) => {
    if (scannerType === 'order') {
      setOrderSearch(text);
      setShowScanner(false);
      // Trigger search automatically
      setError(null);
      const sale = sales.find(s => s.sequentialId?.toString() === text || s.id === text);
      if (sale) {
        setActiveSaleId(sale.id);
        setOrderSearch('');
        const initial: Record<string, number> = {};
        sale.items.forEach(item => {
          initial[item.productId] = 0;
        });
        setConferQuantities(initial);
        setLastScan(null);
      } else {
        setError('Pedido não encontrado.');
        setActiveSaleId(null);
      }
    } else {
      setProductSearch(text);
      setShowScanner(false);
      // Process product scan
      if (!activeSale) return;
      const query = text.trim().toLowerCase();
      const product = products.find(p => 
        p.barcode === query || 
        p.sku?.toLowerCase() === query || 
        p.id === query ||
        p.name.toLowerCase().includes(query)
      );

      if (product) {
        const item = activeSale.items.find(i => i.productId === product.id);
        if (item) {
          const isMobile = window.innerWidth < 768;
          if (isMobile) {
            setMobileScannedProduct(product);
            const currentQty = conferQuantities[product.id] || 0;
            // Set initial quantity to 1 or maybe the remaining quantity? 
            // Usually, user wants to input how many they just picked.
            // Let's set it to empty or 1.
            setMobileScanQty(''); 
            setError(null);
            playScanFeedback();
          } else {
            const currentQty = conferQuantities[product.id] || 0;
            if (currentQty < item.quantity) {
              setConferQuantities(prev => ({ ...prev, [product.id]: currentQty + 1 }));
              setLastScan(product.name);
              setError(null);
              playScanFeedback();
            } else {
              setError(`Quantidade excedida para: ${product.name}`);
            }
          }
        } else {
          setError('Produto não pertence a este pedido');
        }
      } else {
        setError('Produto não encontrado');
      }
      setProductSearch('');
    }
  };

  const executeFinish = () => {
    if (!activeSale) return;

    // Calcular o que foi realmente conferido
    const updatedItems = activeSale.items.map(item => ({
      ...item,
      quantity: conferQuantities[item.productId] ?? 0
    })).filter(item => item.quantity > 0);

    const newTotal = updatedItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const newTotalCost = updatedItems.reduce((acc, item) => acc + (item.cost * item.quantity), 0);
    const newTotalProfit = newTotal - newTotalCost;
    const originalTotal = activeSale.total;

    // Identificar itens em falta para devolver ao estoque
    const missingItems: { productId: string, quantity: number }[] = [];
    activeSale.items.forEach(item => {
      const conferred = conferQuantities[item.productId] ?? 0;
      if (conferred < item.quantity) {
        missingItems.push({
          productId: item.productId,
          quantity: item.quantity - conferred
        });
      }
    });

    // 1. Corrigir Estoque: Devolve os itens que não foram encontrados/separados
    if (missingItems.length > 0) {
      setProducts((prev: Product[]) => prev.map(p => {
        const missing = missingItems.find(m => m.productId === p.id);
        if (missing) {
          return { ...p, stock: (p.stock || 0) + missing.quantity };
        }
        return p;
      }));
    }

    // 2. Atualizar Venda
    setSales((prev: Sale[]) => prev.map(s => {
      if (s.id === activeSale.id) {
        // Corrigir pagamentos se o total diminuiu
        let updatedPayments = [...(s.payments || [])];
        if (newTotal < originalTotal && updatedPayments.length > 0) {
          let diffPay = originalTotal - newTotal;
          for (let i = updatedPayments.length - 1; i >= 0 && diffPay > 0; i--) {
            if (updatedPayments[i].amount >= diffPay) {
              updatedPayments[i] = { ...updatedPayments[i], amount: updatedPayments[i].amount - diffPay };
              diffPay = 0;
            } else {
              diffPay -= updatedPayments[i].amount;
              updatedPayments[i] = { ...updatedPayments[i], amount: 0 };
            }
          }
          updatedPayments = updatedPayments.filter(p => p.amount > 0);
        }

        return { 
          ...s, 
          items: updatedItems,
          originalItems: s.originalItems || s.items, // Guarda o pedido original
          total: newTotal,
          totalCost: newTotalCost,
          totalProfit: newTotalProfit,
          payments: updatedPayments,
          status: 'separado' as any, 
          updatedAt: Date.now(),
          separatedByUserId: currentUser?.id,
          separatedByUserName: currentUser?.name,
          separatedByAt: new Date().toISOString()
        };
      }
      return s;
    }));

    // 3. Atualizar Receitas (Faturamento)
    if (newTotal < originalTotal) {
      setRevenues((prev: Revenue[]) => {
        let diffRev = originalTotal - newTotal;
        return prev.map(r => {
          if (r.saleId === activeSale.id && diffRev > 0) {
            if (r.amount >= diffRev) {
              const newAmount = r.amount - diffRev;
              diffRev = 0;
              return { ...r, amount: newAmount, updatedAt: Date.now() };
            } else {
              diffRev -= r.amount;
              return { ...r, amount: 0, updatedAt: Date.now() };
            }
          }
          return r;
        }).filter(r => r.amount > 0);
      });
    }

    addActivity('sale', 'Pedido Separado', `Pedido #${activeSale.sequentialId} separado com sucesso. Itens em falta ajustados.`);
    
    alert('Separação finalizada com sucesso!');

    // Limpar estados
    setShowFinishConfirm(false);
    setActiveSaleId(null);
    setConferQuantities({});
    setError(null);
    setOrderSearch('');
    setProductSearch('');
    setLastScan(null);
  };

  return (
    <div className="fixed inset-0 z-[500] bg-[#0d0a1a] text-white flex flex-col lg:flex-row font-sans selection:bg-purple-500/30 overflow-hidden">
      {/* MOBILE INITIAL ENTRY SCREEN */}
      {!activeSaleId && (
        <div className="md:hidden flex-1 flex flex-col items-center justify-center p-6 bg-[#0d0a1a] text-center space-y-8 animate-in fade-in duration-500 relative z-[600]">
          {/* Back button for mobile entry */}
          <button 
            onClick={() => setView('dashboard')}
            className="absolute top-6 left-6 w-10 h-10 rounded-xl bg-[#1a1625] flex items-center justify-center text-gray-500 active:scale-90 transition-all border border-white/5"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="w-24 h-24 bg-purple-600/10 rounded-[2.5rem] flex items-center justify-center mb-2 shadow-2xl shadow-purple-500/10 border border-purple-500/20">
            <QrCode size={48} className="text-purple-500 animate-pulse" />
          </div>
          
          <div className="space-y-3">
            <h2 className="text-3xl font-black text-white uppercase tracking-tight italic">Separação</h2>
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Escaneie ou digite seu pedido</p>
          </div>

          <div className="w-full max-w-sm space-y-4">
            <div className="flex items-center bg-[#1a1625] border border-white/10 rounded-2xl shadow-2xl focus-within:ring-2 ring-purple-500/30 transition-all p-1.5">
              <form 
                onSubmit={(e) => { e.preventDefault(); handleOrderSearch(); }}
                className="flex-1"
              >
                <input 
                  type="text" 
                  placeholder="Nº DO PEDIDO" 
                  className="w-full bg-transparent py-4 px-4 text-white font-black text-xl text-center outline-none placeholder:text-white/5 uppercase tracking-widest"
                  value={orderSearch}
                  onChange={e => setOrderSearch(e.target.value)}
                  autoFocus
                />
              </form>
              <button 
                onClick={() => { setScannerType('order'); setShowScanner(true); }}
                className="w-14 h-14 bg-purple-600/10 text-purple-400 rounded-xl flex items-center justify-center active:scale-90 transition-transform cursor-pointer border border-purple-500/20"
              >
                <QrCode size={26} />
              </button>
            </div>

            <button 
              onClick={() => handleOrderSearch()}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white font-black py-5 rounded-2xl uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-purple-600/20 active:scale-95 transition-all"
            >
              Confirmar Pedido
            </button>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl"
              >
                <p className="text-red-500 text-[10px] font-black uppercase tracking-widest text-center">
                  {error}
                </p>
              </motion.div>
            )}
          </div>

          <div className="pt-10 opacity-10 flex flex-col items-center gap-2">
             <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <Package size={14} />
             </div>
             <p className="text-[8px] font-black uppercase tracking-[0.3em]">Lukasfe3d Custom Hub</p>
          </div>
        </div>
      )}

      {/* Main UI (Hidden on mobile if no active sale) */}
      <div className={`flex flex-col lg:flex-row flex-1 overflow-hidden ${!activeSaleId ? 'hidden md:flex' : 'flex'}`}>
        {/* Scanner Modal */}
      <AnimatePresence>
        {showScanner && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-lg rounded-3xl bg-[#0d1526]/95 border border-[#1e2a45] p-6 shadow-2xl relative"
            >
              {/* Header */}
              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-[#3d2b7a]">
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M7 3H5a2 2 0 0 0-2 2v2" />
                    <path d="M17 3h2a2 2 0 0 1 2 2v2" />
                    <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
                    <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h1 className="text-xl font-bold text-white tracking-wide uppercase">ESCANEAR {scannerType === 'order' ? 'PEDIDO' : 'PRODUTO'}</h1>
                  <p className="text-sm text-gray-400 tracking-wide">POSICIONE O CÓDIGO NO CENTRO</p>
                </div>
                <button 
                  onClick={() => setShowScanner(false)}
                  className="flex items-center justify-center w-12 h-12 rounded-xl bg-[#1a2235] text-gray-400 hover:text-white transition-colors"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </button>
              </div>

              <SeparadorScanner onScan={handleScannerScan} onClose={() => setShowScanner(false)} />

              {/* Loading Status */}
              <div className="flex items-center justify-center gap-3 pt-4">
                <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4a5a8a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                <span className="text-sm text-gray-500 tracking-widest uppercase">AGUARDANDO LEITURA DO CÓDIGO...</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar - top on mobile, side on desktop */}
      <aside className={`${activeSaleId ? 'hidden lg:flex' : 'flex'} w-full lg:w-80 bg-[#0d0a1a] p-4 lg:p-5 flex-col gap-4 shrink-0 border-b lg:border-b-0 lg:border-r border-white/[0.03] z-20`}>
        <div className="flex items-center justify-between lg:justify-start lg:flex-col lg:items-stretch gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center shadow-[0_0_20px_rgba(147,51,234,0.3)] shrink-0">
              <span className="text-white font-bold text-lg italic">LF</span>
            </div>
            <span className="hidden sm:block text-gray-400 text-[11px] leading-tight font-medium uppercase tracking-wider">Personalizando com qualidade</span>
          </div>

          <div className="bg-[#1a1625] rounded-xl p-3 border border-white/[0.03] shadow-lg flex-1 lg:flex-none">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Package className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h2 className="text-white font-bold text-sm lg:text-base leading-none">Separação</h2>
                <p className="text-gray-500 text-[10px] mt-1 font-medium uppercase tracking-tight">Conferência de pedidos</p>
              </div>
            </div>
          </div>
        </div>

        {/* Collapsible Info on Mobile (using grid to hide desktop-only) */}
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
          <div className="bg-[#1a1625] rounded-xl p-3 border border-white/[0.03] shadow-lg space-y-3">
            <h3 className="text-purple-400 font-bold text-[10px] uppercase tracking-[0.2em] opacity-80">Pedido Atual</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-gray-500 text-[9px] uppercase tracking-wider mb-0.5">Nº Pedido</p>
                <p className="text-emerald-500 font-black text-sm lg:text-lg leading-none">#{activeSale?.sequentialId || '---'}</p>
              </div>
              <div className="hidden lg:block">
                <p className="text-gray-500 text-[9px] uppercase tracking-wider mb-0.5">Data</p>
                <p className="text-white text-xs font-bold leading-none">{activeSale ? new Date(activeSale.date).toLocaleDateString('pt-BR') : '--/--/----'}</p>
              </div>
            </div>
            <div className="pt-2 border-t border-white/[0.03]">
              <p className="text-gray-500 text-[9px] uppercase tracking-wider mb-0.5">Cliente</p>
              <p className="text-white font-black text-[10px] lg:text-sm truncate uppercase tracking-tight">{customer?.name || (activeSale ? 'Cliente Casual' : 'Nenhum selecionado')}</p>
            </div>
          </div>

          <div className="bg-[#1a1625] rounded-xl p-3 border border-white/[0.03] shadow-lg flex-1 flex flex-col min-h-0">
            <h3 className="hidden lg:block text-gray-400 text-[10px] uppercase tracking-[0.2em] border-b border-white/[0.03] pb-2 mb-3">Progresso</h3>
            
            <div className="flex-1 flex flex-col lg:justify-center gap-2 lg:gap-4">
              <div className="flex justify-center scale-75 lg:scale-100">
                <div className="relative w-24 h-24 lg:w-32 lg:h-32">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="48" cy="48" r="40" stroke="#2a2440" strokeWidth="6" fill="none" className="lg:hidden" />
                    <circle cx="64" cy="64" r="56" stroke="#2a2440" strokeWidth="10" fill="none" className="hidden lg:block" />
                    
                    <motion.circle 
                      cx="48" cy="48" r="40" 
                      stroke="url(#gradient-mob)" 
                      strokeWidth="6" 
                      fill="none" 
                      strokeDasharray="251.32" 
                      strokeDashoffset={251.32 - (251.32 * progressPercent) / 100} 
                      strokeLinecap="round" 
                      className="lg:hidden"
                      animate={{ strokeDashoffset: 251.32 - (251.32 * progressPercent) / 100 }}
                    />
                    
                    <motion.circle 
                      cx="64" cy="64" r="56" 
                      stroke="url(#gradient)" 
                      strokeWidth="10" 
                      fill="none" 
                      strokeDasharray="351.86" 
                      strokeDashoffset={351.86 - (351.86 * progressPercent) / 100} 
                      strokeLinecap="round" 
                      className="hidden lg:block"
                      initial={{ strokeDashoffset: 351.86 }}
                      animate={{ strokeDashoffset: 351.86 - (351.86 * progressPercent) / 100 }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                    />
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#8b5cf6" />
                      </linearGradient>
                      <linearGradient id="gradient-mob" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#8b5cf6" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl lg:text-3xl font-black text-white italic leading-none">{Math.round(progressPercent)}%</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1 pt-1 lg:pt-2">
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-0.5 lg:gap-1 text-green-400">
                    <Check className="w-2.5 h-2.5 lg:w-3 lg:h-3" />
                    <span className="font-bold text-[10px] lg:text-xs">{counts.separated}</span>
                  </div>
                  <span className="text-gray-500 text-[7px] lg:text-[8px] uppercase font-bold tracking-tighter">Sep.</span>
                </div>
                <div className="flex flex-col items-center border-l border-white/[0.03]">
                  <div className="flex items-center gap-0.5 lg:gap-1 text-yellow-400">
                    <Clock className="w-2.5 h-2.5 lg:w-3 lg:h-3" />
                    <span className="font-bold text-[10px] lg:text-xs">{counts.pending}</span>
                  </div>
                  <span className="text-gray-500 text-[7px] lg:text-[8px] uppercase font-bold tracking-tighter">Pend.</span>
                </div>
                <div className="flex flex-col items-center border-l border-white/[0.03]">
                  <div className="flex items-center gap-0.5 lg:gap-1 text-red-400">
                    <X className="w-2.5 h-2.5 lg:w-3 lg:h-3" />
                    <span className="font-bold text-[10px] lg:text-xs">{counts.remaining}</span>
                  </div>
                  <span className="text-gray-500 text-[7px] lg:text-[8px] uppercase font-bold tracking-tighter">Rest.</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <button 
          onClick={handleFinish}
          disabled={!activeSale}
          className={`hidden lg:flex w-full py-4 rounded-xl items-center justify-center gap-2 font-black text-xs uppercase tracking-widest mt-auto transition-all transform active:scale-95 shadow-lg ${
            activeSale
              ? 'bg-purple-600 text-white hover:bg-purple-500 shadow-purple-600/20'
              : 'bg-[#1a1625] text-white/10 border border-white/[0.03] cursor-not-allowed'
          }`}
        >
          <CheckCircle className="w-5 h-5" />
          {totalConferred < totalOrdered ? 'Finalizar com Faltas' : 'Finalizar Separação'}
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-2 md:p-6 flex flex-col gap-2 md:gap-6 overflow-hidden">
        {/* Modal de Confirmação de Faltas */}
        {showFinishConfirm && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-[#1a1625] w-full max-w-sm rounded-3xl border border-white/10 shadow-2xl overflow-hidden"
            >
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-8 h-8 text-yellow-500" />
                </div>
                <h3 className="text-xl font-black text-white mb-2 uppercase tracking-tight">Itens em Falta!</h3>
                <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                  Este pedido possui <span className="text-yellow-500 font-bold">{counts.pending}</span> itens não conferidos. 
                  Deseja finalizar a separação mesmo assim? 
                  O estoque será corrigido automaticamente.
                </p>
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={executeFinish}
                    className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-purple-600/20 transition-all active:scale-95"
                  >
                    Confirmar e Finalizar
                  </button>
                  <button 
                    onClick={() => setShowFinishConfirm(false)}
                    className="w-full py-4 bg-white/5 hover:bg-white/10 text-white/60 font-black text-xs uppercase tracking-widest rounded-xl transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
        {/* Header - Optimized for mobile when order is active */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 lg:gap-4 shrink-0">
          {/* Mobile Back/Header */}
          <div className="md:hidden flex items-center justify-between p-1 pb-2">
             <button 
               onClick={() => activeSaleId ? setActiveSaleId(null) : setView('dashboard')}
               className="w-10 h-10 rounded-xl bg-[#1a1625] flex items-center justify-center text-gray-500 active:scale-90 transition-all border border-white/5"
             >
               <ChevronLeft size={20} />
             </button>
             <div className="text-center">
                <div className="flex items-center justify-center gap-1.5">
                   <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest italic leading-none">CONFERÊNCIA</p>
                   <span className="text-[8px] font-black text-white/20 uppercase tracking-tighter">{Math.round(progressPercent)}%</span>
                </div>
                <h2 className="text-base font-black text-white italic leading-tight">#{activeSale?.sequentialId || '---'}</h2>
             </div>
             <button 
               onClick={() => setView('dashboard')}
               className="w-10 h-10 rounded-xl bg-[#1a1625] flex items-center justify-center text-gray-500 active:scale-90 transition-all border border-white/5"
             >
               <LogOut size={16} />
             </button>
          </div>

          <div className="flex-1 hidden md:block">
            <p className="text-gray-400 text-[10px] lg:text-sm mb-1 lg:mb-2 font-medium uppercase tracking-wider">Digite ou escaneie o Nº do Pedido</p>
            <div className="flex items-center bg-[#1a1625] rounded-xl border border-white/[0.05] shadow-xl focus-within:border-purple-500/50 transition-all">
              <form onSubmit={handleOrderSearch} className="flex-1">
                <input 
                  type="text" 
                  placeholder="Ex.: 0001258" 
                  className="w-full bg-transparent px-3 lg:px-4 py-2 lg:py-3 text-white outline-none text-base lg:text-lg" 
                  value={orderSearch}
                  onChange={e => setOrderSearch(e.target.value)}
                />
              </form>
              <button 
                type="button"
                onClick={() => { setScannerType('order'); setShowScanner(true); }}
                className="bg-[#2a2440] p-2.5 lg:p-3 m-1 rounded-lg text-yellow-500 shadow-inner hover:bg-[#3a3450] transition-colors active:scale-95 cursor-pointer"
                title="Escanear Pedido"
              >
                <QrCode className="w-5 h-5 lg:w-6 lg:h-6" />
              </button>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button className="hidden lg:block p-4 bg-[#1a1625] rounded-xl border border-white/[0.03] hover:bg-[#2a2440] transition-colors text-gray-400 hover:text-white shadow-lg">
              <Keyboard className="w-5 h-5" />
            </button>
            <button className="hidden lg:block p-4 bg-[#1a1625] rounded-xl border border-white/[0.03] hover:bg-[#2a2440] transition-colors text-gray-400 hover:text-white shadow-lg">
              <HelpCircle className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setView('dashboard')}
              className="hidden md:flex lg:flex px-4 lg:px-6 py-3 lg:py-4 bg-[#1a1625] rounded-xl items-center justify-center gap-2 text-gray-400 hover:text-white hover:bg-red-500/10 hover:text-red-500 transition-all border border-white/[0.03] shadow-lg group"
            >
              <LogOut className="w-4 h-4 lg:w-5 lg:h-5 group-hover:-translate-x-1 transition-transform" />
              <span className="font-semibold uppercase text-[10px] lg:text-xs tracking-widest whitespace-nowrap">Sair</span>
            </button>
          </div>
        </div>

        {/* Itens do Pedido */}
        <div className="bg-[#1a1625] rounded-xl p-4 lg:p-6 flex-1 flex flex-col min-h-0 border border-white/[0.03] shadow-2xl relative overflow-hidden">
          <div className="flex items-center gap-2 mb-4 lg:mb-6 shrink-0">
            <Package className="w-4 h-4 lg:w-5 lg:h-5 text-purple-400" />
            <h2 className="text-white font-semibold text-sm lg:text-lg uppercase tracking-tight">Itens do Pedido</h2>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar pr-1 lg:pr-2">
            {/* Desktop Table View */}
            <div className="hidden md:block">
              <table className="w-full border-separate border-spacing-y-2">
                <thead className="sticky top-0 bg-[#1a1625] z-10">
                  <tr className="text-gray-500 text-[10px] uppercase font-bold tracking-[0.2em]">
                    <th className="text-left pb-4 pl-4 font-normal">PRODUTO</th>
                    <th className="text-center pb-4 font-normal">QTD. PEDIDA</th>
                    <th className="text-center pb-4 font-normal">CONFERÊNCIA</th>
                    <th className="text-right pb-4 pr-10 font-normal">STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {activeSale ? activeSale.items.map((item, idx) => {
                    const product = products.find(p => p.id === item.productId);
                    const currentQty = conferQuantities[item.productId] || 0;
                    const isFinished = currentQty === item.quantity;
                    const isStarted = currentQty > 0 && !isFinished;

                    return (
                      <motion.tr 
                        key={item.productId}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="group bg-[#2a2440]/20 hover:bg-[#2a2440]/40 transition-colors"
                      >
                        <td className="py-4 pl-4 rounded-l-xl">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-[#2a2440] rounded-xl flex items-center justify-center overflow-hidden border border-white/[0.05] shadow-inner shrink-0 scale-95 group-hover:scale-100 transition-transform" id={`prod-desk-${item.productId}`}>
                              {product?.imageUrl ? (
                                <img src={product.imageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <Package size={24} className="text-white/10" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-white font-semibold truncate text-[15px]">{product?.name || 'Produto'}</p>
                              <p className="text-gray-500 text-xs font-medium mt-0.5 tracking-tight">{product?.barcode || '000000000000'}</p>
                              {product?.locationId && (
                                <p className="text-blue-400 text-[10px] font-black uppercase mt-1 flex items-center gap-1">
                                  <MapPin size={10} /> {productLocations.find(l => l.id === product.locationId)?.description || 'Local não encontrado'}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="text-center text-white text-2xl font-black italic tracking-tighter">
                          {item.quantity}
                        </td>
                        <td className="text-center">
                          <div className="flex items-center justify-center gap-4">
                             <button 
                               onClick={() => {
                                 const p = products.find(prod => prod.id === item.productId);
                                 if (p) setSelectedLabelProduct(p);
                               }}
                               className="w-10 h-10 bg-[#2a2440] rounded-full flex items-center justify-center hover:bg-white/10 transition-colors border border-white/[0.03] text-gray-400 hover:text-blue-400 shadow-sm"
                               id={`print-desk-${item.productId}`}
                               title={getPrintLabel(couponConfig.printMode, "Imprimir Etiqueta")}
                             >
                               {getPrintIcon(couponConfig.printMode, 20)}
                             </button>
                            <button 
                              onClick={() => updateQty(item.productId, -1)}
                              className="w-10 h-10 bg-[#2a2440] rounded-full flex items-center justify-center hover:bg-white/10 transition-colors active:scale-90 border border-white/[0.03]"
                              id={`minus-desk-${item.productId}`}
                            >
                              <Minus className="w-4 h-4 text-gray-400 group-hover:text-white" />
                            </button>
                            <div className="flex items-baseline gap-1.5 min-w-[70px] justify-center">
                              <span className={`text-xl font-bold tracking-tighter ${isFinished ? 'text-green-500' : isStarted ? 'text-yellow-500' : 'text-white/20'}`}>
                                {currentQty}
                              </span>
                              <span className="text-gray-500 text-xs font-medium">de {item.quantity}</span>
                            </div>
                            <button 
                              onClick={() => updateQty(item.productId, 1)}
                              className="w-10 h-10 bg-[#2a2440] rounded-full flex items-center justify-center hover:bg-white/10 transition-colors active:scale-90 border border-white/[0.03]"
                              id={`plus-desk-${item.productId}`}
                            >
                              <Plus className="w-4 h-4 text-gray-400 group-hover:text-white" />
                            </button>
                          </div>
                        </td>
                        <td className="text-right pr-10 rounded-r-xl">
                          {isFinished ? (
                            <span className="inline-flex items-center gap-2 text-green-500 font-bold text-xs uppercase tracking-wider">
                              <Check className="w-4 h-4" />
                              Conferido
                            </span>
                          ) : isStarted ? (
                            <span className="inline-flex items-center gap-2 text-yellow-500 font-bold text-xs uppercase tracking-wider">
                              <Clock className="w-4 h-4" />
                              Parcial
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-2 text-red-500 font-bold text-xs uppercase tracking-wider">
                              <X className="w-4 h-4" />
                              Pendente
                            </span>
                          )}
                        </td>
                      </motion.tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={4} className="py-20 text-center">
                        <div className="flex flex-col items-center justify-center text-white/5 gap-6">
                          <QrCode size={120} strokeWidth={0.5} className="animate-pulse" />
                          <div className="space-y-2">
                             <p className="text-2xl font-black uppercase tracking-[0.5em] italic">Pronto</p>
                             <p className="text-xs font-bold uppercase tracking-widest opacity-40">Escaneie um pedido para iniciar</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="md:hidden space-y-1">
              {activeSale ? activeSale.items.map((item, idx) => {
                const product = products.find(p => p.id === item.productId);
                const currentQty = conferQuantities[item.productId] || 0;
                const isFinished = currentQty === item.quantity;
                const isStarted = currentQty > 0 && !isFinished;

                return (
                  <motion.div 
                    key={item.productId}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`relative p-3.5 border-b border-white/[0.03] transition-all ${isFinished ? 'bg-emerald-500/5' : isStarted ? 'bg-amber-500/5' : 'bg-transparent'}`}
                    id={`card-mob-${item.productId}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-[#2a2440] rounded-xl flex items-center justify-center overflow-hidden shrink-0 border border-white/[0.05] shadow-inner">
                        {product?.imageUrl ? (
                          <img src={product.imageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <Package size={20} className="text-white/10" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`font-black truncate text-[14px] uppercase tracking-tight ${isFinished ? 'text-emerald-400' : 'text-white'}`}>
                          {product?.name || 'Produto'}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-gray-600 text-[9px] font-black uppercase tracking-wider bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
                            {product?.barcode || '---'}
                          </span>
                          {isFinished && <Check size={12} className="text-emerald-500" />}
                          {product?.locationId && (
                            <div className="flex items-center gap-1 ml-2">
                               <MapPin size={8} className="text-blue-400" />
                               <span className="text-blue-400 text-[8px] font-black uppercase">{productLocations.find(l => l.id === product.locationId)?.name || '---'}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0 flex flex-col items-end gap-1">
                        <span className="text-[14px] font-black text-white/20 italic tracking-tighter">
                          /{item.quantity}
                        </span>
                        <div className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border ${
                          isFinished ? 'bg-emerald-500 text-white border-emerald-500' : 
                          isStarted ? 'bg-amber-500 text-black border-amber-500' : 
                          'bg-transparent text-white/20 border-white/10'
                        }`}>
                          {isFinished ? 'OK' : isStarted ? 'PRC' : 'PEN'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 mt-3">
                      <div className="flex items-center gap-2">
                        <button 
                           onClick={() => {
                             const p = products.find(prod => prod.id === item.productId);
                             if (p) setSelectedLabelProduct(p);
                           }}
                           className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-gray-500 border border-white/10 active:scale-95 transition-all hover:text-blue-400 hover:bg-blue-400/10"
                           id={`print-mob-${item.productId}`}
                         >
                           <Printer className="w-5 h-5" />
                         </button>
                      </div>
                      
                      <div className="flex items-center gap-2 pr-2">
                        <span className={`text-sm font-black uppercase tracking-widest italic ${isFinished ? 'text-emerald-400' : isStarted ? 'text-amber-400' : 'text-white/20'}`}>
                           Conferido: {currentQty} de {item.quantity}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              }) : (
                <div className="py-20 text-center">
                   <div className="flex flex-col items-center gap-4 opacity-20">
                     <QrCode size={64} strokeWidth={0.5} className="animate-pulse" />
                     <p className="font-black uppercase tracking-[0.3em] text-[10px] italic">Aguardando pedido</p>
                   </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Scanner Bar / Mobile Finish Button */}
        <div className="flex flex-col gap-3 shrink-0">
          {/* Scanner Bar - Desktop */}
          <div className="hidden md:flex bg-[#1a1625] rounded-2xl p-5 items-center justify-between border border-white/[0.05] shadow-2xl relative overflow-hidden group focus-within:ring-2 ring-purple-500/50 ring-inset transition-all">
            <div className="flex items-center gap-6 relative z-10">
              <button 
                type="button"
                onClick={() => { setScannerType('product'); setShowScanner(true); }}
                className="w-16 h-16 bg-[#2a2440] rounded-xl flex items-center justify-center shadow-inner border border-white/[0.03] hover:rotate-3 transition-transform duration-500 hover:border-blue-500/50"
                title="Abrir Câmera para Escanear"
              >
                <QrCode size={32} className="text-blue-400" />
              </button>
              <div className="cursor-default">
                <p className="text-white font-black text-xl leading-none italic uppercase tracking-tight">Aguardando Leitura</p>
                <p className="text-gray-500 text-xs mt-2 uppercase tracking-widest font-bold opacity-60">Escaneie o código do produto para conferir</p>
              </div>
            </div>

            <div className="flex-1 max-w-sm mx-10 relative z-10">
               <div className="h-14 bg-black/20 rounded-xl border border-white/[0.05] flex items-center px-4 overflow-hidden relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-blue-500 animate-pulse rounded-full" />
                  <form onSubmit={handleProductScan} className="w-full h-full flex items-center">
                     <input 
                       type="text" 
                       placeholder="BIPE O PRODUTO AGORA..."
                       className="w-full h-full bg-transparent outline-none pl-6 text-white font-bold tracking-widest placeholder:text-white/5 uppercase"
                       value={productSearch} 
                       onChange={e => setProductSearch(e.target.value)} 
                       autoFocus
                     />
                  </form>
               </div>
            </div>

            <div className="text-right relative z-10 min-w-[140px]">
              <p className="text-gray-500 text-[10px] uppercase font-black tracking-[0.2em] mb-1 italic opacity-40">Última leitura</p>
              <p className="text-2xl font-black text-white italic tracking-tighter truncate leading-none uppercase">
                {lastScan ? lastScan : '---'}
              </p>
            </div>
          </div>

        </div> {/* Close Footer Area */}

        {/* Compact Mobile Footer */}
        <div className="md:hidden sticky bottom-0 bg-[#0d0a1a] p-3 flex items-center gap-3 border-t border-white/10 z-40 -mx-2 -mb-2">
           <button 
             onClick={handleFinish}
             disabled={!activeSale}
             className={`flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-xl uppercase tracking-widest text-[10px] shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 ${
               !activeSale && 'opacity-50 cursor-not-allowed'
             }`}
           >
             <CheckCircle size={14} className="text-white" />
             Finalizar
           </button>
           
           <div className="flex-[1.5] flex items-center bg-[#1a1625] border border-white/10 rounded-xl overflow-hidden focus-within:ring-1 ring-purple-500/50">
             <form onSubmit={handleProductScan} className="flex-1">
               <input 
                 type="text" 
                 placeholder="BIPAR..."
                 className="w-full bg-transparent py-3 px-3 text-white font-black text-[10px] tracking-widest outline-none uppercase placeholder:text-white/10"
                 value={productSearch}
                 onChange={e => setProductSearch(e.target.value)}
               />
             </form>
             <button 
               onClick={() => { setScannerType('product'); setShowScanner(true); }}
               className="p-3 text-purple-400 border-l border-white/10 active:bg-white/5 transition-colors"
             >
               <QrCode size={18} />
             </button>
           </div>
        </div>
      </main>


      {/* MOBILE SCAN CONFIRMATION MODAL */}
      <AnimatePresence>
        {mobileScannedProduct && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-[#1a1625] w-full max-w-sm rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden p-6 space-y-6"
            >
              <div className="text-center space-y-2">
                <div className="w-20 h-20 bg-purple-600/10 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-purple-500/20 shadow-xl">
                   {mobileScannedProduct.imageUrl ? (
                     <img src={mobileScannedProduct.imageUrl} className="w-full h-full object-cover rounded-2xl" />
                   ) : (
                     <Package size={32} className="text-purple-500" />
                   )}
                </div>
                <h3 className="text-xl font-black text-white uppercase tracking-tight leading-tight">
                  {mobileScannedProduct.name}
                </h3>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{mobileScannedProduct.barcode}</p>
              </div>

              <div className="space-y-4">
                 <div className="bg-black/20 rounded-2xl p-4 border border-white/5">
                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest text-center mb-2">Informe a Quantidade</p>
                    <input 
                      type="number" 
                      inputMode="numeric"
                      className="w-full bg-transparent text-white text-5xl font-black text-center outline-none italic"
                      placeholder="0"
                      value={mobileScanQty}
                      onChange={e => setMobileScanQty(e.target.value)}
                      autoFocus
                    />
                    <div className="mt-2 text-center">
                       <span className="text-[10px] font-black text-purple-400 uppercase tracking-tight">Pedido: {activeSale?.items.find(i => i.productId === mobileScannedProduct.id)?.quantity || 0} UNI</span>
                    </div>
                 </div>

                 {error && (
                    <p className="text-red-500 text-[10px] font-black uppercase text-center tracking-widest animate-pulse">{error}</p>
                 )}

                 <div className="grid grid-cols-2 gap-3 pt-2">
                    <button 
                      onClick={() => {
                        setMobileScannedProduct(null);
                        setMobileScanQty('');
                        setError(null);
                      }}
                      className="py-4 bg-white/5 text-white/50 rounded-2xl font-black uppercase tracking-widest text-[10px] border border-white/5 active:scale-95 transition-all"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={() => {
                        if (!mobileScannedProduct || !activeSale) return;
                        const qtyValue = parseInt(mobileScanQty);
                        if (isNaN(qtyValue) || qtyValue <= 0) {
                          setError('Qtd Inválida');
                          return;
                        }

                        const item = activeSale.items.find(i => i.productId === mobileScannedProduct.id);
                        if (!item) return;

                        if (qtyValue > item.quantity) {
                          setError(`Máximo: ${item.quantity}`);
                          return;
                        }

                        setConferQuantities(prev => ({ ...prev, [mobileScannedProduct.id]: qtyValue }));
                        setMobileScannedProduct(null);
                        setMobileScanQty('');
                        setLastScan(mobileScannedProduct.name);
                        setError(null);
                      }}
                      className="py-4 bg-purple-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-purple-600/20 active:scale-95 transition-all"
                    >
                      Confirmar
                    </button>
                 </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FOOTER MOBILE - Quick Actions or Info */}
      <div className="md:hidden h-16 shrink-0" /> {/* Spacer for safe area if needed */}
    </div>
  </div>
);
}

function ResultsView({ 
  sales, 
  products, 
  customers, 
  cashierSession,
  canEdit,
  currentUser
}: { 
  sales: Sale[], 
  products: Product[], 
  customers: Customer[], 
  cashierSession: any,
  canEdit: boolean,
  currentUser: SystemUser | null
}) {
  const [tab, setTab] = useState<'billing' | 'cashier' | 'bestsellers' | 'customers'>('billing');
  const now = new Date();
  const [filterYear, setFilterYear] = useState(now.getFullYear().toString());
  const [filterMonth, setFilterMonth] = useState((now.getMonth() + 1).toString().padStart(2, '0'));
  const [filterDay, setFilterDay] = useState(now.getDate().toString().padStart(2, '0'));

  const filteredSalesData = useMemo(() => {
    let list = [...sales];
    
    if (!isUserAdmin(currentUser)) {
      list = list.filter(s => s.soldByUserId === currentUser?.id);
    }

    return list.filter(s => {
      const d = new Date(s.date);
      const y = d.getFullYear().toString() === filterYear;
      const m = (d.getMonth() + 1).toString().padStart(2, '0') === filterMonth;
      const dayMatch = filterDay ? d.getDate().toString().padStart(2, '0') === filterDay : true;
      return y && m && dayMatch;
    });
  }, [sales, filterYear, filterMonth, filterDay, currentUser]);

  const billingData = useMemo(() => {
    const data: any[] = [];
    const daysInMonth = new Date(parseInt(filterYear), parseInt(filterMonth), 0).getDate();
    
    for (let i = 1; i <= daysInMonth; i++) {
        const dayStr = i.toString().padStart(2, '0');
        const daySales = filteredSalesData.filter(s => new Date(s.date).getDate() === i);
        const total = daySales.reduce((acc, s) => acc + s.total, 0);
        data.push({ name: dayStr, total });
    }
    return data;
  }, [filteredSalesData, filterYear, filterMonth]);

  const bestSellersData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredSalesData.forEach(s => {
        s.items.forEach(item => {
            counts[item.productId] = (counts[item.productId] || 0) + item.quantity;
        });
    });
    return Object.entries(counts)
        .map(([id, qty]) => {
            const p = products.find(prod => prod.id === id);
            return { name: p?.name || 'Inexistente', value: qty };
        })
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);
  }, [filteredSalesData, products]);

  const customerProfitData = useMemo(() => {
    const profits: Record<string, number> = {};
    filteredSalesData.forEach(s => {
        if (s.customerId) {
            profits[s.customerId] = (profits[s.customerId] || 0) + s.total;
        }
    });
    return Object.entries(profits)
        .map(([id, profit]) => {
            const c = customers.find(cust => cust.id === id);
            return { name: c?.name || 'Venda Avulsa', value: profit };
        })
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);
  }, [filteredSalesData, customers]);

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex flex-col items-center gap-4">
        <div className="text-center">
          <h3 className="text-xl font-black text-white uppercase tracking-tighter">Resultados do Negócio</h3>
          <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest italic">Análise de Performance</p>
        </div>
        
        <div className="flex items-center gap-2 bg-white/5 p-2 rounded-2xl border border-white/10 shadow-sm mx-auto backdrop-blur-md">
           <select value={filterYear ?? new Date().getFullYear().toString()} onChange={e => setFilterYear(e.target.value)} className="p-2 text-[10px] font-black uppercase outline-none bg-transparent text-zinc-100">
              {[2024, 2025, 2026].map(y => <option key={y} value={y} className="bg-zinc-900">{y}</option>)}
           </select>
           <select value={filterMonth ?? (new Date().getMonth() + 1).toString().padStart(2, '0')} onChange={e => setFilterMonth(e.target.value)} className="p-2 text-[10px] font-black uppercase outline-none bg-transparent text-zinc-100">
              {['01','02','03','04','05','06','07','08','09','10','11','12'].map(m => (
                  <option key={m} value={m} className="bg-zinc-900">{m}</option>
              ))}
           </select>
           <div className="w-12">
             <input 
              type="text" 
              value={filterDay} 
              onChange={e => setFilterDay(e.target.value)} 
              placeholder="Dia" 
              className="w-full p-2 text-[10px] font-black uppercase outline-none text-center bg-transparent text-zinc-100"
             />
           </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 pb-4">
        {( [
          { id: 'billing', label: 'Faturamento', icon: TrendingUp },
          { id: 'cashier', label: 'Caixa', icon: Calculator },
          { id: 'bestsellers', label: 'Mais Vendidos', icon: Package },
          { id: 'customers', label: 'Clientes', icon: Users }
        ] as const).map(t => (
          <button 
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border border-white/10 backdrop-blur-md hover:translate-y-[-2px] active:translate-y-0 ${tab === t.id ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20' : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'}`}
          >
            <t.icon size={18} /> {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white/5 p-6 rounded-3xl border border-white/10 shadow-sm backdrop-blur-md">
            <p className="text-[8px] font-black text-white/40 uppercase tracking-widest mb-1">Vendas Totais</p>
            <p className="text-2xl font-black text-white tracking-tighter">R$ {filteredSalesData.reduce((acc, s) => acc + s.total, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white/5 p-6 rounded-3xl border border-white/10 shadow-sm backdrop-blur-md">
            <p className="text-[8px] font-black text-white/40 uppercase tracking-widest mb-1">Qtd Vendas</p>
            <p className="text-2xl font-black text-zinc-300 tracking-tighter">{filteredSalesData.length}</p>
        </div>
        <div className="bg-white/5 p-6 rounded-3xl border border-white/10 shadow-sm backdrop-blur-md">
            <p className="text-[8px] font-black text-white/40 uppercase tracking-widest mb-1">Ticket Médio</p>
            <p className="text-2xl font-black text-blue-400 tracking-tighter">R$ {filteredSalesData.length > 0 ? (filteredSalesData.reduce((acc, s) => acc + s.total, 0) / filteredSalesData.length).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}</p>
        </div>
        <div className="bg-white/5 p-6 rounded-3xl border border-white/10 shadow-sm backdrop-blur-md">
            <p className="text-[8px] font-black text-white/40 uppercase tracking-widest mb-1">Itens Vendidos</p>
            <p className="text-2xl font-black text-orange-400 tracking-tighter">{filteredSalesData.reduce((acc, s) => acc + s.items.reduce((a, i) => a + i.quantity, 0), 0)}</p>
        </div>
      </div>

      <div className="bg-white/5 p-8 rounded-[3rem] border border-white/10 shadow-sm min-h-[400px] backdrop-blur-md">
        {tab === 'billing' && (
           <div className="h-[350px] w-full">
              <h4 className="text-[10px] font-black uppercase text-white/40 mb-6 tracking-widest">Evolução de Faturamento Diário</h4>
              <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={billingData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                    <XAxis dataKey="name" fontSize={10} fontStyle="italic" stroke="#ffffff40" />
                    <YAxis fontSize={10} fontStyle="italic" stroke="#ffffff40" />
                    <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff10', borderRadius: '1rem', color: '#f4f4f5', fontSize: '10px' }} />
                    <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                 </BarChart>
              </ResponsiveContainer>
           </div>
        )}

        {tab === 'bestsellers' && (
           <div className="h-[350px] w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <h4 className="text-[10px] font-black uppercase text-white/40 mb-6 tracking-widest">Top 10 Produtos (Volume)</h4>
                <div className="space-y-4">
                  {bestSellersData.length > 0 ? bestSellersData.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                       <span className="text-[10px] font-bold text-white/60 uppercase truncate w-32">{item.name}</span>
                       <div className="flex-1 mx-4 h-2 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${bestSellersData[0]?.value ? (item.value / bestSellersData[0].value) * 100 : 0}%` }}></div>
                       </div>
                       <span className="text-[10px] font-black text-white">{item.value} unid</span>
                    </div>
                  )) : (
                    <div className="py-20 text-center flex flex-col items-center justify-center text-white/20 space-y-2">
                       <Package size={32} className="opacity-20" />
                       <p className="italic text-[10px] uppercase font-black tracking-widest">Sem vendas registradas</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={bestSellersData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {bestSellersData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff10', borderRadius: '1rem', color: '#f4f4f5' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
           </div>
        )}

        {tab === 'customers' && (
           <div className="min-h-[350px] h-auto w-full flex flex-col overflow-y-auto custom-scrollbar">
              <h4 className="text-[10px] font-black uppercase text-zinc-500 mb-6 tracking-widest">Ranking de Clientes (Mais Rentáveis)</h4>
              <div className="grid grid-cols-1 gap-4">
                 {customerProfitData.length > 0 ? customerProfitData.map((item, idx) => (
                   <div key={idx} className="flex items-center gap-4 bg-zinc-950 p-4 rounded-2xl border border-zinc-800/50">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${idx < 3 ? 'bg-amber-500/10 text-amber-500' : 'bg-zinc-800 text-zinc-500'}`}>
                         {idx + 1}
                      </div>
                      <div className="flex-1">
                         <p className="text-[10px] font-black uppercase text-zinc-100">{item.name}</p>
                         <p className="text-[8px] font-bold text-zinc-500 uppercase italic">Participação na Receita</p>
                      </div>
                      <p className="text-[12px] font-black text-blue-400">R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                   </div>
                 )) : (
                   <div className="py-20 text-center flex flex-col items-center justify-center text-zinc-600 space-y-2">
                       <Users size={32} className="opacity-20" />
                       <p className="italic text-[10px] uppercase font-black tracking-widest">Nenhum dado de cliente disponível</p>
                    </div>
                 )}
              </div>
           </div>
        )}

        {tab === 'cashier' && (
           <div className="min-h-[350px] h-auto w-full flex flex-col overflow-y-auto custom-scrollbar">
              <h4 className="text-[10px] font-black uppercase text-white/40 mb-6 tracking-widest">Resumo de Movimentação de Caixa</h4>
              <div className="flex-1 flex flex-col items-center justify-center text-white/20 italic text-[10px] space-y-4">
                 <Calculator size={48} className="opacity-20" />
                 <p className="text-center max-w-[200px] uppercase font-black tracking-widest opacity-40">Fluxo de caixa consolidado para {filterMonth}/{filterYear}.</p>
                 <div className="w-full max-w-xs space-y-2 mt-4">
                    <div className="flex justify-between bg-blue-500/10 text-blue-400 p-3 rounded-xl font-black border border-blue-500/20">
                       <span>ENTRADAS</span>
                       <span>R$ {filteredSalesData.reduce((acc, s) => acc + s.total, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between bg-red-500/10 text-red-400 p-3 rounded-xl font-black border border-red-500/20">
                       <span>SAÍDAS / CANC.</span>
                       <span>R$ 0,00</span>
                    </div>
                 </div>
              </div>
           </div>
        )}
     </div>
  </div>
);
}

