
import { db } from './db';
import { logger } from './logger';

// Chaves para o LocalStorage
export const STORAGE_KEYS = {
  PRODUCTS: 'pdv_products',
  SALES: 'pdv_sales',
  CUSTOMERS: 'pdv_customers',
  CATEGORIES: 'pdv_categories',
  SUBCATEGORIES: 'pdv_subcategories',
  PAYMENT_METHODS: 'pdv_payment_methods',
  CUSTOM_PAYMENT_METHODS: 'pdv_custom_payment_methods',
  DELIVERY_CHANNELS: 'pdv_delivery_channels',
  DELIVERY_METHODS: 'pdv_delivery_methods',
  CLOSED_SESSIONS: 'pdv_closed_sessions',
  CASHIER_SESSION: 'pdv_cashier_session',
  OPEN_SESSIONS: 'pdv_open_sessions',
  COMPANY_INFO: 'pdv_company_info',
  COUPON_CONFIG: 'pdv_coupon_config',
  COUPON_PDV_CONFIG: 'pdv_coupon_pdv_config',
  GREETING_COUPON_CONFIG: 'pdv_greeting_coupon_config',
  LABEL_CONFIG: 'pdv_label_config',
  PRINTERS: 'pdv_printers',
  REGISTERED_PRINTERS: 'pdv_registered_printers',
  USERS: 'pdv_users',
  ROLES: 'pdv_roles',
  ACTIVITIES: 'pdv_activities',
  HIDDEN_PAYMENT_METHODS: 'pdv_hidden_payment_methods',
  SELECTED_PRINTER: 'pdv_selected_printer',
  SELECTED_LABEL_PRINTER: 'pdv_selected_label_printer',
  REVENUES: 'pdv_revenues',
  PURCHASES: 'pdv_purchases',
  EXPENSES: 'pdv_expenses',
  INVENTORIES: 'pdv_inventories',
  PRODUCT_RECIPES: 'pdv_product_recipes',
  RAW_MATERIALS: 'pdv_raw_materials_structured',
  LOCAL_BACKUPS: 'pdv_local_backups',
  LAST_AUTO_BACKUP: 'pdv_last_auto_backup_date',
  CATALOG_DESCRIPTIONS: 'pdv_catalog_descriptions',
  SHOPKEEPERS: 'pdv_shopkeepers',
  SHOPKEEPER_DELIVERIES: 'pdv_shopkeeper_deliveries',
  CALCULATOR_MATERIALS: 'pdv_calculator_materials',
  CALCULATOR_PROJECTS: 'pdv_calculator_projects',
  PAYMENT_ICONS: 'pdv_payment_icons',
  PRE_ORDERS: 'pdv_pre_orders',
  LABEL_LOT: 'pdv_label_lot',
  LABEL_LOT_CONFIG: 'pdv_label_lot_config',
  PRODUCT_LOCATIONS: 'pdv_product_locations',
  ORDER_COUNTER: 'pdv_order_counter',
  QR_STANDALONE: 'pdv_qr_standalone'
};

export type SyncStatus = 'local' | 'pending' | 'synced' | 'error';

/**
 * Interface base para todas as entidades principais que serão sincronizadas futuramente.
 */
export interface SyncableEntity {
  id: string;
  createdAt?: number;
  updatedAt?: number;
  syncStatus?: SyncStatus;
  deviceId?: string;
  serverUpdatedAt?: number;
}

export interface LocalBackup {
  id: string;
  date: string;
  data: any;
  size: number;
}

/**
 * Gera um identificador único para o dispositivo.
 */
export function getDeviceId(): string {
  let deviceId = localStorage.getItem('pdv_device_id');
  if (!deviceId) {
    deviceId = `dev_${Math.random().toString(36).substring(2, 10)}_${Date.now().toString(36)}`;
    localStorage.setItem('pdv_device_id', deviceId);
  }
  return deviceId;
}

/**
 * Gera um ID único e robusto preparado para ambiente distribuído (múltiplos terminais).
 */
export function generateUniqueId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  const devId = getDeviceId().split('_')[1] || '0';
  return `${prefix}${prefix ? '_' : ''}${timestamp}_${devId}_${random}`;
}

/**
 * Normaliza um item para o padrão de sincronização.
 */
function normalizeForSync(item: any, fromServer: boolean = false): any {
  if (!item || typeof item !== 'object') return item;
  
  const now = Date.now();
  return {
    ...item,
    id: item.id || generateUniqueId(),
    createdAt: item.createdAt || item.date || now,
    updatedAt: now,
    deviceId: item.deviceId || getDeviceId(),
    syncStatus: fromServer ? 'synced' : 'pending',
    // Mantém compatibilidade com o campo legível pelo indexador do sync antigo
    synced: fromServer ? 1 : 0
  };
}

// Chaves que devem OBRIGATORIAMENTE usar IndexedDB (Dexie) ao invés de LocalStorage
const INDEXED_DB_KEYS = [
  STORAGE_KEYS.PRODUCTS,
  STORAGE_KEYS.CUSTOMERS,
  STORAGE_KEYS.SALES,
  STORAGE_KEYS.CATEGORIES,
  STORAGE_KEYS.SUBCATEGORIES,
  STORAGE_KEYS.EXPENSES,
  STORAGE_KEYS.REVENUES,
  STORAGE_KEYS.PURCHASES,
  STORAGE_KEYS.RAW_MATERIALS,
  STORAGE_KEYS.PRODUCT_RECIPES,
  STORAGE_KEYS.INVENTORIES,
  STORAGE_KEYS.CLOSED_SESSIONS,
  STORAGE_KEYS.ACTIVITIES,
  STORAGE_KEYS.PRE_ORDERS,
  STORAGE_KEYS.LABEL_LOT,
  STORAGE_KEYS.PRODUCT_LOCATIONS,
  STORAGE_KEYS.QR_STANDALONE
];

let isRestoringGlobal = false;

export function setRestoringFlag(value: boolean) {
  isRestoringGlobal = value;
  console.log(`[Persistência] Flag de restauração definida como: ${value}`);
}

/**
 * Salva um objeto sob uma chave específica no armazenamento local ou IndexedDB.
 * Se for uma chave pesada, salva apenas no IndexedDB para evitar extrapolar limite do LocalStorage.
 */
export function salvarDados(key: string, data: any, fromServer: boolean = false, isRestoreOperation: boolean = false): boolean {
  try {
    if (isRestoringGlobal && !isRestoreOperation) {
      console.warn(`[Persistência] Tentativa de salvar "${key}" bloqueada: Restauração em andamento.`);
      return false;
    }
    
    if (!key) throw new Error('Chave de armazenamento não fornecida.');
    
    // Lista de chaves que representam coleções de dados sincronizáveis
    const syncableKeys = [
      STORAGE_KEYS.PRODUCTS, STORAGE_KEYS.CUSTOMERS, STORAGE_KEYS.SALES, 
      STORAGE_KEYS.CATEGORIES, STORAGE_KEYS.SUBCATEGORIES, STORAGE_KEYS.EXPENSES,
      STORAGE_KEYS.REVENUES, STORAGE_KEYS.PURCHASES, STORAGE_KEYS.RAW_MATERIALS,
      STORAGE_KEYS.PRODUCT_RECIPES, STORAGE_KEYS.DELIVERY_METHODS, STORAGE_KEYS.ROLES,
      STORAGE_KEYS.CALCULATOR_MATERIALS, STORAGE_KEYS.CALCULATOR_PROJECTS, STORAGE_KEYS.USERS,
      STORAGE_KEYS.SHOPKEEPERS, STORAGE_KEYS.SHOPKEEPER_DELIVERIES, STORAGE_KEYS.PRODUCT_LOCATIONS,
      STORAGE_KEYS.QR_STANDALONE
    ];

    let dataToSave = data;
    
    // Se for uma das chaves principais e for um array, garantimos os metadados de sync
    if (syncableKeys.includes(key) && Array.isArray(data)) {
      dataToSave = data.map(item => normalizeForSync(item, fromServer));
    } else if (key === STORAGE_KEYS.CASHIER_SESSION && data) {
      dataToSave = normalizeForSync(data, fromServer);
    } else if (key === STORAGE_KEYS.OPEN_SESSIONS && data && typeof data === 'object') {
      dataToSave = { ...data };
      Object.keys(dataToSave).forEach(k => {
        dataToSave[k] = normalizeForSync(dataToSave[k], fromServer);
      });
    }

    // Só salvamos no LocalStorage se NÃO for uma das chaves exclusivas de IndexedDB
    const isHeavyCollection = INDEXED_DB_KEYS.includes(key);
    
    if (!isHeavyCollection) {
      const serializedData = JSON.stringify(dataToSave);
      localStorage.setItem(key, serializedData);
    } else {
      // Se era uma chave pesada, garantimos que foi removida do LocalStorage para liberar espaço
      // mas fazemos isso de forma controlada apenas se soubermos que o IndexedDB está ok
      // para evitar perda de dados por falha no Dexie.
    }

    // Persistência em IndexedDB (Prioritária para busca rápida e sync futuro)
    try {
      if (key === STORAGE_KEYS.PRODUCTS) {
        if(Array.isArray(dataToSave)) db.products.bulkPut(dataToSave);
      } else if (key === STORAGE_KEYS.CUSTOMERS) {
        if(Array.isArray(dataToSave)) db.customers.bulkPut(dataToSave);
      } else if (key === STORAGE_KEYS.SALES) {
        if(Array.isArray(dataToSave)) db.sales.bulkPut(dataToSave);
      } else if (key === STORAGE_KEYS.CATEGORIES) {
        if(Array.isArray(dataToSave)) db.categories.bulkPut(dataToSave);
      } else if (key === STORAGE_KEYS.SUBCATEGORIES) {
        if(Array.isArray(dataToSave)) db.subcategories.bulkPut(dataToSave);
      } else if (key === STORAGE_KEYS.EXPENSES) {
        if(Array.isArray(dataToSave)) db.expenses.bulkPut(dataToSave);
      } else if (key === STORAGE_KEYS.REVENUES) {
        if(Array.isArray(dataToSave)) db.revenues.bulkPut(dataToSave);
      } else if (key === STORAGE_KEYS.PURCHASES) {
        if(Array.isArray(dataToSave)) db.purchases.bulkPut(dataToSave);
      } else if (key === STORAGE_KEYS.RAW_MATERIALS) {
        if(Array.isArray(dataToSave)) db.raw_materials.bulkPut(dataToSave);
      } else if (key === STORAGE_KEYS.PRODUCT_RECIPES) {
        if(Array.isArray(dataToSave)) db.product_recipes.bulkPut(dataToSave);
      } else if (key === STORAGE_KEYS.DELIVERY_METHODS) {
        if(Array.isArray(dataToSave)) db.delivery_methods.bulkPut(dataToSave);
      } else if (key === STORAGE_KEYS.ROLES) {
        if(Array.isArray(dataToSave)) db.roles.bulkPut(dataToSave);
      } else if (key === STORAGE_KEYS.CALCULATOR_MATERIALS) {
        if(Array.isArray(dataToSave)) db.calculator_materials.bulkPut(dataToSave);
      } else if (key === STORAGE_KEYS.CALCULATOR_PROJECTS) {
        if(Array.isArray(dataToSave)) db.calculator_projects.bulkPut(dataToSave);
      } else if (key === STORAGE_KEYS.USERS) {
        if(Array.isArray(dataToSave)) db.system_users.bulkPut(dataToSave);
      } else if (key === STORAGE_KEYS.CASHIER_SESSION) {
        if(dataToSave) db.cashier_sessions.put(dataToSave);
      } else if (key === STORAGE_KEYS.OPEN_SESSIONS) {
        if(dataToSave) {
          const sessions = Object.values(dataToSave);
          db.cashier_sessions.bulkPut(sessions);
        }
      } else if (key === STORAGE_KEYS.ACTIVITIES) {
        if(Array.isArray(dataToSave)) db.activities.bulkPut(dataToSave);
      } else if (key === STORAGE_KEYS.PRE_ORDERS) {
        if(Array.isArray(dataToSave)) db.pre_orders.bulkPut(dataToSave);
      } else if (key === STORAGE_KEYS.LABEL_LOT) {
        if(Array.isArray(dataToSave)) db.label_lot.bulkPut(dataToSave);
      } else if (key === STORAGE_KEYS.PRODUCT_LOCATIONS) {
        if(Array.isArray(dataToSave)) db.product_locations.bulkPut(dataToSave);
      } else if (key === STORAGE_KEYS.QR_STANDALONE) {
        if(Array.isArray(dataToSave)) db.qr_standalone.bulkPut(dataToSave);
      }
      
      // Se salvamos com sucesso no DB e é uma coleção pesada, podemos limpar do LocalStorage
      if (isHeavyCollection && localStorage.getItem(key)) {
        localStorage.removeItem(key);
        logger.info(`[Persistência] Migrado collection "${key}" do LocalStorage para IndexedDB.`, null, 'Storage');
      }
      
    } catch (dbError) {
      console.warn('[OfflineDB] Erro ao salvar em IndexedDB:', dbError);
      logger.error(`Erro ao salvar em IndexedDB (${key}):`, dbError, 'Storage');
      
      // Fallback: se falhou no IndexedDB e era heavy, salvamos no LocalStorage como medida de emergência
      if (isHeavyCollection) {
        localStorage.setItem(key, JSON.stringify(dataToSave));
      }
    }

    return true;
  } catch (error) {
    console.error(`[Persistência] Erro ao salvar dados na chave "${key}":`, error);
    logger.error(`Erro ao salvar dados (${key}):`, error, 'Storage');
    return false;
  }
}

/**
 * Carrega e faz o parse de um objeto do armazenamento local ou IndexedDB (Async).
 */
export async function carregarDadosAsync<T>(key: string, defaultValue: T): Promise<T> {
  try {
    // 1. Tenta carregar do IndexedDB se for uma das chaves suportadas
    if (INDEXED_DB_KEYS.includes(key)) {
      let dbData: any = null;
      
      if (key === STORAGE_KEYS.PRODUCTS) dbData = await db.products.toArray();
      else if (key === STORAGE_KEYS.CUSTOMERS) dbData = await db.customers.toArray();
      else if (key === STORAGE_KEYS.SALES) dbData = await db.sales.toArray();
      else if (key === STORAGE_KEYS.CATEGORIES) dbData = await db.categories.toArray();
      else if (key === STORAGE_KEYS.SUBCATEGORIES) dbData = await db.subcategories.toArray();
      else if (key === STORAGE_KEYS.EXPENSES) dbData = await db.expenses.toArray();
      else if (key === STORAGE_KEYS.REVENUES) dbData = await db.revenues.toArray();
      else if (key === STORAGE_KEYS.PURCHASES) dbData = await db.purchases.toArray();
      else if (key === STORAGE_KEYS.RAW_MATERIALS) dbData = await db.raw_materials.toArray();
      else if (key === STORAGE_KEYS.PRODUCT_RECIPES) dbData = await db.product_recipes.toArray();
      else if (key === STORAGE_KEYS.PRODUCT_LOCATIONS) dbData = await db.product_locations.toArray();
      else if (key === STORAGE_KEYS.ACTIVITIES) dbData = await db.activities.toArray();
      else if (key === STORAGE_KEYS.PRE_ORDERS) dbData = await db.pre_orders.toArray();
      else if (key === STORAGE_KEYS.LABEL_LOT) dbData = await db.label_lot.toArray();
      else if (key === STORAGE_KEYS.QR_STANDALONE) dbData = await db.qr_standalone.toArray();
      else if (key === STORAGE_KEYS.CLOSED_SESSIONS) dbData = await db.cashier_sessions.where('status').equals('closed').toArray();
      
      if (dbData && Array.isArray(dbData) && dbData.length > 0) {
        return dbData as unknown as T;
      }
      
      // Se não encontrou no DB, tenta migrar do LocalStorage se existir lá
      const localData = localStorage.getItem(key);
      if (localData) {
        try {
          const parsed = JSON.parse(localData);
          if (parsed && Array.isArray(parsed) && parsed.length > 0) {
            // Migra para o IndexedDB em background
            salvarDados(key, parsed);
            return parsed as T;
          }
        } catch (e) {
          logger.error(`Erro ao parsear migração do LocalStorage para ${key}:`, e, 'Migration');
        }
      }
    }

    // 2. Fallback ou Carregamento Padrão via LocalStorage
    return carregarDados(key, defaultValue);
  } catch (error) {
    logger.error(`Erro ao carregar dados async da chave "${key}":`, error, 'Storage');
    return defaultValue;
  }
}

/**
 * Carrega e faz o parse de um objeto do armazenamento local.
 * Retorna o valor padrão se não encontrar a chave ou houver erro.
 */
export function carregarDados<T>(key: string, defaultValue: T): T {
  try {
    const serializedData = localStorage.getItem(key);
    if (serializedData === null) {
      return defaultValue;
    }
    const parsedData = JSON.parse(serializedData);
    
    // Pequena validação para garantir que o tipo retornado não é nulo/undefined 
    // se o defaultValue for um objeto/array
    if (typeof defaultValue === 'object' && defaultValue !== null && parsedData === null) {
      return defaultValue;
    }
    
    return parsedData as T;
  } catch (error) {
    console.error(`[Persistência] Erro ao carregar dados da chave "${key}":`, error);
    return defaultValue;
  }
}

/**
 * Versão assíncrona do salvarDados para quando precisamos garantir que a gravação ocorreu
 * (especialmente útil em restaurações de backup).
 */
export async function salvarDadosAsync(key: string, data: any, fromServer: boolean = false, isRestoreOperation: boolean = false): Promise<boolean> {
  try {
    if (isRestoringGlobal && !isRestoreOperation) {
      console.warn(`[Persistência] Tentativa de salvar async "${key}" bloqueada: Restauração em andamento.`);
      return false;
    }
    if (!key) throw new Error('Chave de armazenamento não fornecida.');
    
    const syncableKeys = [
      STORAGE_KEYS.PRODUCTS, STORAGE_KEYS.CUSTOMERS, STORAGE_KEYS.SALES, 
      STORAGE_KEYS.CATEGORIES, STORAGE_KEYS.SUBCATEGORIES, STORAGE_KEYS.EXPENSES,
      STORAGE_KEYS.REVENUES, STORAGE_KEYS.PURCHASES, STORAGE_KEYS.RAW_MATERIALS,
      STORAGE_KEYS.PRODUCT_RECIPES, STORAGE_KEYS.DELIVERY_METHODS, STORAGE_KEYS.ROLES,
      STORAGE_KEYS.CALCULATOR_MATERIALS, STORAGE_KEYS.CALCULATOR_PROJECTS, STORAGE_KEYS.USERS,
      STORAGE_KEYS.SHOPKEEPERS, STORAGE_KEYS.SHOPKEEPER_DELIVERIES, STORAGE_KEYS.PRODUCT_LOCATIONS,
      STORAGE_KEYS.QR_STANDALONE
    ];

    let dataToSave = data;
    if (syncableKeys.includes(key) && Array.isArray(data)) {
      dataToSave = data.map(item => normalizeForSync(item, fromServer));
    }

    const isHeavyCollection = INDEXED_DB_KEYS.includes(key);
    
    // 1. Salva no LocalStorage (se permitido)
    if (!isHeavyCollection) {
      localStorage.setItem(key, JSON.stringify(dataToSave));
    }

    // 2. Salva no IndexedDB (Prioritário e aguardado)
    try {
      if (key === STORAGE_KEYS.PRODUCTS && Array.isArray(dataToSave)) await db.products.bulkPut(dataToSave);
      else if (key === STORAGE_KEYS.CUSTOMERS && Array.isArray(dataToSave)) await db.customers.bulkPut(dataToSave);
      else if (key === STORAGE_KEYS.SALES && Array.isArray(dataToSave)) await db.sales.bulkPut(dataToSave);
      else if (key === STORAGE_KEYS.CATEGORIES && Array.isArray(dataToSave)) await db.categories.bulkPut(dataToSave);
      else if (key === STORAGE_KEYS.SUBCATEGORIES && Array.isArray(dataToSave)) await db.subcategories.bulkPut(dataToSave);
      else if (key === STORAGE_KEYS.EXPENSES && Array.isArray(dataToSave)) await db.expenses.bulkPut(dataToSave);
      else if (key === STORAGE_KEYS.REVENUES && Array.isArray(dataToSave)) await db.revenues.bulkPut(dataToSave);
      else if (key === STORAGE_KEYS.PURCHASES && Array.isArray(dataToSave)) await db.purchases.bulkPut(dataToSave);
      else if (key === STORAGE_KEYS.RAW_MATERIALS && Array.isArray(dataToSave)) await db.raw_materials.bulkPut(dataToSave);
      else if (key === STORAGE_KEYS.PRODUCT_RECIPES && Array.isArray(dataToSave)) await db.product_recipes.bulkPut(dataToSave);
      else if (key === STORAGE_KEYS.DELIVERY_METHODS && Array.isArray(dataToSave)) await db.delivery_methods.bulkPut(dataToSave);
      else if (key === STORAGE_KEYS.ROLES && Array.isArray(dataToSave)) await db.roles.bulkPut(dataToSave);
      else if (key === STORAGE_KEYS.CALCULATOR_MATERIALS && Array.isArray(dataToSave)) await db.calculator_materials.bulkPut(dataToSave);
      else if (key === STORAGE_KEYS.CALCULATOR_PROJECTS && Array.isArray(dataToSave)) await db.calculator_projects.bulkPut(dataToSave);
      else if (key === STORAGE_KEYS.USERS && Array.isArray(dataToSave)) await db.system_users.bulkPut(dataToSave);
      else if (key === STORAGE_KEYS.CASHIER_SESSION && dataToSave) await db.cashier_sessions.put(dataToSave);
      else if (key === STORAGE_KEYS.ACTIVITIES && Array.isArray(dataToSave)) await db.activities.bulkPut(dataToSave);
      else if (key === STORAGE_KEYS.PRE_ORDERS && Array.isArray(dataToSave)) await db.pre_orders.bulkPut(dataToSave);
      else if (key === STORAGE_KEYS.LABEL_LOT && Array.isArray(dataToSave)) await db.label_lot.bulkPut(dataToSave);
      else if (key === STORAGE_KEYS.QR_STANDALONE && Array.isArray(dataToSave)) await db.qr_standalone.bulkPut(dataToSave);
      else if (key === STORAGE_KEYS.PRODUCT_LOCATIONS && Array.isArray(dataToSave)) await db.product_locations.bulkPut(dataToSave);
      
      // Se era heavy, garante remoção do LocalStorage após sucesso no DB
      if (isHeavyCollection) {
        localStorage.removeItem(key);
      }
      
      return true;
    } catch (dbError) {
      logger.error(`Erro async no IndexedDB (${key}):`, dbError, 'Storage');
      // Fallback emergencial no LocalStorage se não for excessivamente grande
      if (isHeavyCollection) {
         localStorage.setItem(key, JSON.stringify(dataToSave));
      }
      return false;
    }
  } catch (error) {
    logger.error(`Erro async ao salvar dados (${key}):`, error, 'Storage');
    return false;
  }
}

/**
 * Salva o backup em arquivo (Electron)
 */
export async function salvarBackupArquivo(data: any): Promise<void> {
  const electronAPI = (window as any).electronAPI;
  if (electronAPI && electronAPI.saveBackup) {
    console.log('[Backup] Salvando backup em arquivo...');
    await electronAPI.saveBackup(data);
  }
}

/**
 * Carrega o backup do arquivo (Electron)
 */
export async function carregarBackupArquivo(): Promise<any | null> {
  const electronAPI = (window as any).electronAPI;
  if (electronAPI && electronAPI.loadBackup) {
    console.log('[Backup] Carregando backup do arquivo...');
    const result = await electronAPI.loadBackup();
    // Ao carregar um backup, garantimos que os dados importados mantenham a consistência
    return result;
  }
  return null;
}

/**
 * Exporta o backup via diálogo (Electron) ou download (Browser)
 */
export async function exportarBackup(data: any): Promise<void> {
  const electronAPI = (window as any).electronAPI;
  
  // Adiciona metadados de exportação para rastreabilidade
  const exportData = {
    ...data,
    _exportMeta: {
      deviceId: getDeviceId(),
      version: 2, // Versão do esquema de sincronização
      timestamp: Date.now()
    }
  };

  if (electronAPI && electronAPI.exportBackup) {
    const result = await electronAPI.exportBackup(exportData);
    if (result && result.success) {
      alert('Backup exportado com sucesso!');
    } else if (result && result.error) {
      alert('Erro ao exportar backup: ' + result.error);
    }
  } else {
    // Browser fallback
    try {
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }).replace(':', '-');
      const fileName = `backup_integrado_${dateStr}_{timeStr}.json`.replace('{timeStr}', timeStr);
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      alert('Backup gerado e baixado com sucesso!');
    } catch (error) {
      console.error('[Backup] Erro ao exportar no navegador:', error);
      alert('Erro ao exportar backup.');
    }
  }
}

/**
 * Importa o backup via diálogo (Electron) ou input (Browser)
 */
export async function importarBackup(): Promise<any | null> {
  const electronAPI = (window as any).electronAPI;
  let importedData: any = null;

  if (electronAPI && electronAPI.importBackup) {
    importedData = await electronAPI.importBackup();
  } else {
    // Browser fallback
    importedData = await new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      
      input.onchange = (e: any) => {
        const file = e.target.files?.[0];
        if (!file) {
          resolve(null);
          return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
          const result = event.target?.result as string;
          if (!result || result.trim() === '') {
            alert('O arquivo de backup está vazio.');
            resolve(null);
            return;
          }
          try {
            const data = JSON.parse(result);
            logger.info('Arquivo de backup processado com sucesso.', null, 'Backup');
            resolve(data);
          } catch (err) {
            logger.error('Erro ao processar JSON do arquivo de backup:', err, 'Backup');
            alert('Arquivo inválido ou corrompido (Erro no JSON).');
            resolve(null);
          }
        };
        reader.onerror = () => {
          logger.error('Erro de leitura física do arquivo de backup.', null, 'Backup');
          alert('Erro ao ler o arquivo.');
          resolve(null);
        };
        reader.readAsText(file);
      };

      input.click();
    });
  }

  // Ao importar, se os dados existem, podemos marcar itens antigos para re-sincronização se necessário
  // mas por enquanto apenas retornamos os dados para que o App.tsx decida como mesclar.
  return importedData;
}

/**
 * Limpa uma chave específica ou todo o armazenamento
 */
export function limparDados(key?: string): void {
  try {
    if (key) {
      localStorage.removeItem(key);
    } else {
      // Preserva o device ID ao limpar tudo
      const deviceId = localStorage.getItem('pdv_device_id');
      localStorage.clear();
      if (deviceId) localStorage.setItem('pdv_device_id', deviceId);
    }
  } catch (error) {
    console.error('[Persistência] Erro ao limpar dados:', error);
  }
}

