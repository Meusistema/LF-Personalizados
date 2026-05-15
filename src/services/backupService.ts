
import { STORAGE_KEYS, exportarBackup, carregarDados, salvarDados } from '../lib/persistence';
import { logger } from '../lib/logger';
import { db } from '../lib/db';

/**
 * Service to handle automatic backups of the application data.
 */
class BackupService {
  private backupInterval: any = null;
  private readonly AUTO_BACKUP_INTERVAL = 1000 * 60 * 60 * 24; // 24 hours

  startAutoBackup() {
    if (this.backupInterval) return;

    logger.info('Iniciando serviço de backup automático...', null, 'Backup');
    
    // Check every hour if a backup is needed
    this.backupInterval = setInterval(() => {
      this.checkAndRunBackup();
    }, 1000 * 60 * 60);

    // Initial check
    this.checkAndRunBackup();
  }

  stopAutoBackup() {
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
      this.backupInterval = null;
    }
  }

  private async checkAndRunBackup() {
    try {
      const lastBackup = localStorage.getItem(STORAGE_KEYS.LAST_AUTO_BACKUP);
      const now = Date.now();

      if (!lastBackup || (now - parseInt(lastBackup)) > this.AUTO_BACKUP_INTERVAL) {
        await this.createAutoBackup();
      }
    } catch (e) {
      logger.error('Erro no check de backup automático:', e, 'Backup');
    }
  }

  async createAutoBackup(reason: string = 'diário'): Promise<any> {
    try {
      logger.info(`Executando backup automático (${reason})...`, null, 'Backup');
      
      const data = await this.collectAllData();
      
      // If in Electron, save the full content to file system (AppData and Documents)
      let fileName = undefined;
      const electronAPI = (window as any).electronAPI;
      if (electronAPI?.saveBackup) {
        const result = await electronAPI.saveBackup(data);
        if (!result.success) {
          throw new Error(result.error);
        }
        fileName = result.filename;
      }
      
      // Save metadata to local storage for quick access references
      // WE NO LONGER SAVE THE FULL 'data' IN LOCALSTORAGE TO PREVENT QUOTA ERRORS
      const backups = carregarDados(STORAGE_KEYS.LOCAL_BACKUPS, []);
      const newBackupMetadata = {
        id: `auto_${Date.now()}`,
        date: new Date().toISOString(),
        size: JSON.stringify(data).length,
        reason: reason,
        type: 'auto',
        fileName: fileName
      };
      
      // Keep metadata for the last 30 backups in the list
      const updatedBackups = [newBackupMetadata, ...backups.filter((b: any) => b.id.startsWith('auto') || b.type === 'auto')].slice(0, 30);
      salvarDados(STORAGE_KEYS.LOCAL_BACKUPS, updatedBackups);
      localStorage.setItem(STORAGE_KEYS.LAST_AUTO_BACKUP, Date.now().toString());

      logger.info('Backup automático concluído com sucesso.', { size: newBackupMetadata.size, reason }, 'Backup');
      return newBackupMetadata;
    } catch (error) {
      logger.error(`Falha ao criar backup automático (${reason}):`, error, 'Backup');
      return null;
    }
  }

  async loadBackupData(backup: any): Promise<any> {
    try {
      // If full data is already in the object (compatibility with old backups)
      if (backup.data) return backup.data;

      // In Electron, if we have a fileName, load from file system
      const electronAPI = (window as any).electronAPI;
      if (electronAPI?.loadBackup && backup.fileName) {
        return await electronAPI.loadBackup(backup.fileName);
      }

      throw new Error('Não foi possível localizar os dados deste backup. O arquivo pode ter sido removido ou não estar disponível neste dispositivo.');
    } catch (error) {
      logger.error('Erro ao carregar dados do backup:', error, 'Backup');
      throw error;
    }
  }

  async collectAllData(): Promise<any> {
    const data: any = {};
    
    // Collect from IndexedDB
    data.products = await db.products.toArray();
    data.customers = await db.customers.toArray();
    data.sales = await db.sales.toArray();
    data.categories = await db.categories.toArray();
    data.subcategories = await db.subcategories.toArray();
    data.expenses = await db.expenses.toArray();
    data.revenues = await db.revenues.toArray();
    data.purchases = await db.purchases.toArray();
    data.raw_materials = await db.raw_materials.toArray();
    data.product_recipes = await db.product_recipes.toArray();
    data.stock_moves = await db.stock_moves.toArray();
    data.deliveries = await db.deliveries.toArray();
    data.shopkeepers = await db.shopkeepers.toArray();
    data.calculator_projects = await db.calculator_projects.toArray();
    data.calculator_materials = await db.calculator_materials.toArray();
    data.cashier_sessions = await db.cashier_sessions.toArray();
    data.payment_methods = await db.payment_methods.toArray();
    data.delivery_methods = await db.delivery_methods.toArray();
    data.roles_db = await db.roles.toArray();
    data.system_users = await db.system_users.toArray();
    data.product_locations = await db.product_locations.toArray();
    data.label_lot = await db.label_lot.toArray();
    data.activities = await db.activities.toArray();
    data.pre_orders = await db.pre_orders.toArray();
    
    // Collect specific configs from LocalStorage
    data.company = carregarDados(STORAGE_KEYS.COMPANY_INFO, {});
    data.couponConfig = carregarDados(STORAGE_KEYS.COUPON_CONFIG, {});
    data.couponPDVConfig = carregarDados(STORAGE_KEYS.COUPON_PDV_CONFIG, {});
    data.greetingCouponConfig = carregarDados(STORAGE_KEYS.GREETING_COUPON_CONFIG, {});
    data.labelConfig = carregarDados(STORAGE_KEYS.LABEL_CONFIG, {});
    data.users = carregarDados(STORAGE_KEYS.USERS, []);
    data.roles = carregarDados(STORAGE_KEYS.ROLES, []);
    data.printers = carregarDados(STORAGE_KEYS.PRINTERS, []);

    return data;
  }

  async restoreFromData(data: any): Promise<boolean> {
    try {
      console.log('DEBUG: ==========================================');
      console.log('DEBUG: RESTORE INICIADO');
      console.log('DEBUG: ==========================================');
      
      if (!data || typeof data !== 'object') {
        console.error('DEBUG: DADOS INVÁLIDOS', data);
        throw new Error('Dados de backup inválidos ou corrompidos.');
      }

      console.log('DEBUG: Chaves encontradas no JSON:', Object.keys(data));
      console.log('DEBUG: Quantidade de registros no JSON:', {
        products: data.products?.length || 0,
        customers: data.customers?.length || 0,
        sales: data.sales?.length || 0,
        categories: data.categories?.length || 0,
        expenses: data.expenses?.length || 0,
        purchases: data.purchases?.length || 0,
        raw_materials: (data.raw_materials || data.rawMaterialsStructured)?.length || 0,
        stock_moves: data.stock_moves?.length || 0,
        system_users: (data.users || data.system_users)?.length || 0
      });

      // 1. Limpeza e Restauração de IndexedDB
      // NOTA: Removemos a transação global para permitir que falhas em tabelas não críticas não abortem o restore inteiro
      console.log('DEBUG: Iniciando restauração das tabelas IndexedDB...');
      
      const tables = [
        { key: 'products', name: db.products, data: data.products },
        { key: 'customers', name: db.customers, data: data.customers },
        { key: 'sales', name: db.sales, data: data.sales },
        { key: 'activities', name: db.activities, data: data.activities },
        { key: 'categories', name: db.categories, data: data.categories },
        { key: 'subcategories', name: db.subcategories, data: data.subcategories },
        { key: 'expenses', name: db.expenses, data: data.expenses },
        { key: 'revenues', name: db.revenues, data: data.revenues },
        { key: 'purchases', name: db.purchases, data: data.purchases },
        { key: 'raw_materials', name: db.raw_materials, data: data.raw_materials || data.rawMaterialsStructured },
        { key: 'product_recipes', name: db.product_recipes, data: data.product_recipes || data.productRecipes },
        { key: 'stock_moves', name: db.stock_moves, data: data.stock_moves },
        { key: 'deliveries', name: db.deliveries, data: data.deliveries },
        { key: 'shopkeepers', name: db.shopkeepers, data: data.shopkeepers },
        { key: 'shopkeeper_deliveries', name: db.shopkeeper_deliveries, data: data.shopkeeper_deliveries || data.shopkeeperDeliveries },
        { key: 'pre_orders', name: db.pre_orders, data: data.pre_orders },
        { key: 'label_lot', name: db.label_lot, data: data.label_lot || data.labelLot },
        { key: 'product_locations', name: db.product_locations, data: data.product_locations || data.productLocations },
        { key: 'system_users', name: db.system_users, data: data.users || data.system_users },
        { key: 'roles', name: db.roles, data: data.roles },
        { key: 'payment_methods', name: db.payment_methods, data: data.paymentMethods || data.payment_methods },
        { key: 'delivery_methods', name: db.delivery_methods, data: data.deliveryMethods || data.delivery_methods },
        { key: 'calculator_projects', name: db.calculator_projects, data: data.calculator_projects || data.calculatorProjects },
        { key: 'calculator_materials', name: db.calculator_materials, data: data.calculator_materials || data.calculatorMaterials },
        { key: 'cashier_sessions', name: db.cashier_sessions, data: data.cashier_sessions || data.cashierSessions || data.closed_sessions || data.closedSessions }
      ];

      for (const table of tables) {
        try {
          // Normalização de dados (CORREÇÃO DE ARRAY DE STRINGS PARA payment_methods e delivery_methods)
          if (table.data && Array.isArray(table.data)) {
            table.data = table.data.map((item: any) => {
              // Se for uma string (formato antigo/incompatível), normaliza para objeto
              if (typeof item === 'string') {
                console.log(`DEBUG: [NORMALIZAÇÃO] Convertendo string "${item}" para objeto na tabela ${table.key}`);
                return {
                  id: item.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '_'),
                  name: item.toUpperCase(),
                  updatedAt: Date.now()
                };
              }
              
              // Se for objeto mas faltar ID (chave primária obrigatória), tenta gerar um
              if (typeof item === 'object' && !item.id) {
                console.warn(`DEBUG: [NORMALIZAÇÃO] Item sem ID na tabela ${table.key}. Gerando ID temporário.`);
                return { ...item, id: `pkg_${Math.random().toString(36).substr(2, 9)}` };
              }
              
              return item;
            });
          }

          console.log(`DEBUG: Limpando tabela ${table.key}...`);
          await table.name.clear();
          console.log(`DEBUG: Tabela ${table.key} limpa com sucesso.`);

          if (table.data && Array.isArray(table.data) && table.data.length > 0) {
            console.log(`DEBUG: [TABLE:${table.key}] Restaurando ${table.data.length} itens...`);
            
            // Usamos chunking para evitar estourar limites em tabelas grandes
            const chunkSize = 100;
            for (let i = 0; i < table.data.length; i += chunkSize) {
              const chunk = table.data.slice(i, i + chunkSize);
              await (table.name as any).bulkPut(chunk);
            }
            
            const finalCount = await table.name.count();
            console.log(`DEBUG: [TABLE:${table.key}] GRAVADOS: ${finalCount} itens.`);
            
            if (finalCount !== table.data.length) {
              console.warn(`DEBUG: [TABLE:${table.key}] AVISO: Divergência entre enviado (${table.data.length}) e gravado (${finalCount})`);
            }
          } else {
            console.log(`DEBUG: [TABLE:${table.key}] Sem dados para restaurar.`);
          }
        } catch (tableError: any) {
          console.error(`DEBUG: ERROR NA TABELA ${table.key}:`, {
            name: tableError?.name,
            message: tableError?.message,
            stack: tableError?.stack,
            dataSample: table.data && Array.isArray(table.data) ? table.data[0] : 'Indisponível'
          });
          // Não re-throw para que o restore continue para outras tabelas
          console.warn(`DEBUG: Pulando restauração da tabela ${table.key} devido a erro.`);
        }
      }

      // 2. Restauração de LocalStorage com FLAG DE RESTAURAÇÃO (Forçado)
      console.log('DEBUG: Restaurando configurações do LocalStorage (Bypass Lock)...');
      
      const configMappings = [
        { key: STORAGE_KEYS.COMPANY_INFO, data: data.company },
        { key: STORAGE_KEYS.COUPON_CONFIG, data: data.couponConfig },
        { key: STORAGE_KEYS.COUPON_PDV_CONFIG, data: data.couponPDVConfig },
        { key: STORAGE_KEYS.GREETING_COUPON_CONFIG, data: data.greetingCouponConfig },
        { key: STORAGE_KEYS.LABEL_CONFIG, data: data.labelConfig },
        { key: STORAGE_KEYS.USERS, data: data.users },
        { key: STORAGE_KEYS.ROLES, data: data.roles },
        { key: STORAGE_KEYS.PRINTERS, data: data.printers },
        { key: STORAGE_KEYS.PAYMENT_METHODS, data: data.paymentMethods },
        { key: STORAGE_KEYS.CUSTOM_PAYMENT_METHODS, data: data.customPaymentMethods },
        { key: STORAGE_KEYS.HIDDEN_PAYMENT_METHODS, data: data.hiddenPaymentMethods },
        { key: STORAGE_KEYS.DELIVERY_CHANNELS, data: data.delivery_channels },
        { key: STORAGE_KEYS.DELIVERY_METHODS, data: data.delivery_methods },
        { key: STORAGE_KEYS.CASHIER_SESSION, data: data.cashierSession },
        { key: STORAGE_KEYS.OPEN_SESSIONS, data: data.openSessions },
        { key: STORAGE_KEYS.LABEL_LOT_CONFIG, data: data.labelLotConfig }
      ];

      for (const mapping of configMappings) {
        if (mapping.data) {
          console.log(`DEBUG: Gravando config ${mapping.key}...`);
          salvarDados(mapping.key, mapping.data, false, true); // true = isRestoreOperation
        }
      }

      // 3. VALIDAÇÃO REAL DO INDEXEDDB (OBRIGATÓRIO)
      console.log('DEBUG: Iniciando validação física pós-transaction...');
      
      const customersCount = await db.customers.count();
      const productsCount = await db.products.count();
      const salesCount = await db.sales.count();
      const allCustomers = await db.customers.toArray();
      const allProducts = await db.products.toArray();
      
      console.log('DEBUG: RESULTADOS FINAIS:', {
        clientes: { count: customersCount, samples: allCustomers.slice(0, 2) },
        produtos: { count: productsCount, samples: allProducts.slice(0, 2) },
        vendas: salesCount
      });

      // Se o backup original tinha dados mas o banco está vazio, algo deu errado
      if ((data.customers?.length > 0 && customersCount === 0) || 
          (data.products?.length > 0 && productsCount === 0)) {
        console.error('DEBUG: FALHA DE INTEGRIDADE DETECTADA!');
        throw new Error(`Falha na integridade: O banco continua vazio após a gravação. (C:${customersCount}, P:${productsCount})`);
      }

      console.log('DEBUG: RESTORE CONCLUÍDO COM SUCESSO');
      return true;
    } catch (error: any) {
      console.error('DEBUG: ERRO CRÍTICO NO RESTORE:', {
        name: error?.name,
        message: error?.message,
        stack: error?.stack
      });
      return false;
    }
  }

}

export const backupService = new BackupService();
