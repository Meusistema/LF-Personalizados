import Dexie, { type Table } from 'dexie';
import { logger } from './logger';

export interface LocalProduct {
  id: string;
  name: string;
  price: number;
  costPrice?: number;
  stock: number;
  category?: string;
  updatedAt: number;
  synced?: number; // 0 for pending, 1 for synced
  serverUpdatedAt?: number;
}

export interface LocalCustomer {
  id: string;
  name: string;
  email?: string;
  whatsapp?: string;
  debt: number;
  updatedAt: number;
  synced?: number;
  serverUpdatedAt?: number;
}

export interface LocalSale {
  id: string;
  total: number;
  date: number;
  status: string;
  items: any[];
  paymentMethod: string;
  updatedAt: number;
  synced?: number;
  serverUpdatedAt?: number;
}

export class OfflineDB extends Dexie {
  products!: Table<LocalProduct>;
  customers!: Table<LocalCustomer>;
  sales!: Table<LocalSale>;
  categories!: Table<any>;
  subcategories!: Table<any>;
  expenses!: Table<any>;
  revenues!: Table<any>;
  purchases!: Table<any>;
  raw_materials!: Table<any>;
  product_recipes!: Table<any>;
  stock_moves!: Table<any>;
  deliveries!: Table<any>;
  payment_methods!: Table<any>;
  shopkeepers!: Table<any>;
  shopkeeper_deliveries!: Table<any>;
  calculator_materials!: Table<any>;
  calculator_projects!: Table<any>;
  roles!: Table<any>;
  system_users!: Table<any>;
  cashier_sessions!: Table<any>;
  delivery_methods!: Table<any>;
  activities!: Table<any>;
  pre_orders!: Table<any>;
  label_lot!: Table<any>;
  product_locations!: Table<any>;
  qr_standalone!: Table<any>;
  logs!: Table<any>;

  constructor() {
    super('PDV_Offline_DB');
    this.version(14).stores({ // Incrementing version to 14
      products: 'id, name, category, updatedAt, synced, syncStatus, deviceId',
      customers: 'id, name, email, updatedAt, synced, syncStatus, deviceId',
      sales: 'id, date, status, updatedAt, synced, syncStatus, deviceId',
      categories: 'id, name, updatedAt, synced, syncStatus, deviceId',
      subcategories: 'id, categoryId, name, updatedAt, synced, syncStatus, deviceId',
      expenses: 'id, date, category, userId, updatedAt, synced, syncStatus, deviceId',
      revenues: 'id, date, status, userId, updatedAt, synced, syncStatus, deviceId',
      purchases: 'id, date, itemName, userId, updatedAt, synced, syncStatus, deviceId',
      raw_materials: 'id, name, userId, updatedAt, synced, syncStatus, deviceId',
      product_recipes: 'id, productId, updatedAt, synced, syncStatus, deviceId',
      stock_moves: 'id, productId, type, updatedAt, synced, syncStatus, deviceId',
      deliveries: 'id, saleId, status, updatedAt, synced, syncStatus, deviceId',
      payment_methods: 'id, name, updatedAt, synced, syncStatus, deviceId',
      delivery_methods: 'id, name, updatedAt, synced, syncStatus, deviceId',
      shopkeepers: 'id, name, updatedAt, synced, syncStatus, deviceId',
      shopkeeper_deliveries: 'id, shopkeeperId, status, updatedAt, synced, syncStatus, deviceId',
      calculator_materials: 'id, name, category, updatedAt, synced, syncStatus, deviceId',
      calculator_projects: 'id, name, updatedAt, synced, syncStatus, deviceId',
      roles: 'id, name, updatedAt, synced, syncStatus, deviceId',
      system_users: 'id, username, updatedAt, synced, syncStatus, deviceId',
      cashier_sessions: 'id, userId, status, updatedAt, synced, syncStatus, deviceId',
      activities: 'id, timestamp, type, userId, updatedAt, synced, syncStatus, deviceId',
      pre_orders: 'id, date, status, customerId, updatedAt, synced, syncStatus, deviceId',
      label_lot: 'id, date, updatedAt, synced, syncStatus, deviceId',
      product_locations: 'id, name, updatedAt, synced, syncStatus, deviceId',
      qr_standalone: 'id, code, status, updatedAt, synced, syncStatus, deviceId',
      logs: '++id, timestamp, level, context'
    });
  }

  onReady() {
    console.log('DEBUG: Dexie Database is ready.');
  }
}

export const db = new OfflineDB();

db.on('ready', () => {
  console.log('DEBUG: DB PDV_Offline_DB pronta para uso.');
});

// Dexie 3+ supports global error handling via Dexie.Promise.on('error') or catch on open.
// For now, removing the incorrect Dexie.on('error') to fix build.
db.open().catch((err) => {
  logger.error('Erro ao abrir o banco de dados:', err, 'Database');
});

db.on('blocked', () => {
  console.warn('DEBUG: DB PDV_Offline_DB está bloqueada (outra aba aberta com versão antiga).');
});

db.on('versionchange', () => {
  console.log('DEBUG: DB PDV_Offline_DB mudando de versão...');
});
