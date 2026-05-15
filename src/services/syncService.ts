import { db } from '../lib/db';
import { SyncStatus as LocalSyncStatus } from '../lib/persistence';

export type ServiceStatus = 'online' | 'offline' | 'syncing' | 'error' | 'synced';

/**
 * SyncService: Gerencia a preparação e o status de sincronização.
 * Atualmente opera em modo local (preparação), simulando o processo que ocorrerá
 * quando um servidor estiver disponível.
 */
export class SyncService {
  private static instance: SyncService;
  private syncInterval: any = null;
  private onStatusChange: ((status: ServiceStatus) => void) | null = null;
  private currentStatus: ServiceStatus = 'online';
  private isPaused: boolean = false;

  private constructor() {
    window.addEventListener('online', () => this.handleConnectivityChange(true));
    window.addEventListener('offline', () => this.handleConnectivityChange(false));
    this.currentStatus = navigator.onLine ? 'online' : 'offline';
  }

  public static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService();
    }
    return SyncService.instance;
  }

  public setStatusCallback(callback: (status: ServiceStatus) => void) {
    this.onStatusChange = callback;
    callback(this.currentStatus);
  }

  public pauseSync() {
    this.isPaused = true;
    console.log('[Sync] Sincronização pausada.');
  }

  public resumeSync() {
    this.isPaused = false;
    console.log('[Sync] Sincronização retomada.');
    this.performSync();
  }

  private handleConnectivityChange(isOnline: boolean) {
    this.currentStatus = isOnline ? 'online' : 'offline';
    if (this.onStatusChange) this.onStatusChange(this.currentStatus);
    if (isOnline) {
      this.startSync();
    }
  }

  /**
   * Inicia o monitoramento de itens pendentes de sincronização.
   */
  public startSync() {
    if (this.syncInterval) return;
    
    // Sincronização inicial
    this.performSync();

    // Verificação periódica a cada 60 segundos para preparar lotes de sync
    this.syncInterval = setInterval(() => {
      // Mesmo offline, podemos rodar o performSync para organizar a fila local
      this.performSync();
    }, 60000);
  }

  /**
   * Executa a rotina de preparação para sincronização.
   * Em modo local, ela apenas identifica o que mudou e marca para o futuro.
   */
  private async performSync() {
    if (this.isPaused) return;

    // Se o sistema estiver configurado para sincronização real no futuro,
    // aqui seria checada a conectividade. Para modo local, processamos a fila.
    
    try {
      if (navigator.onLine) {
        this.updateStatus('syncing');
      }
      
      const tables = [
        'products', 'customers', 'sales', 'categories', 'subcategories', 
        'expenses', 'revenues', 'purchases', 'raw_materials', 
        'product_recipes', 'stock_moves', 'deliveries', 
        'payment_methods', 'delivery_methods', 'shopkeepers', 
        'shopkeeper_deliveries', 'roles', 'system_users', 'cashier_sessions'
      ];

      let totalPending = 0;

      for (const tableName of tables) {
        const table = (db as any)[tableName];
        if (!table) continue;

        // Busca itens que estão em estado 'pending' ou com a flag legada synced: 0
        const pendingItems = await table.where('syncStatus').equals('pending')
          .or('synced').equals(0)
          .toArray();
        
        totalPending += pendingItems.length;

        if (pendingItems.length > 0) {
          console.log(`[FutureSync] Preparando ${pendingItems.length} itens da tabela ${tableName}`);
          
          /**
           * MODO LOCAL / PREPARAÇÃO FUTURA:
           * Atualmente apenas simulamos que os itens foram colocados em uma fila.
           * Em um cenário com servidor, aqui ocorreria a chamada REST/WebSocket.
           */
          
          // Se houver internet, simulamos o sucesso do envio para o "limbo" de sync
          if (navigator.onLine) {
            await new Promise(resolve => setTimeout(resolve, 300)); // Simula processamento

            // Marcar como 'synced' localmente para simular que o "servidor" (futuro) recebeu
            // NOTA: Em produção futura, isso só ocorre após resposta 200 OK do servidor.
            await table.bulkPut(pendingItems.map((item: any) => ({
              ...item,
              syncStatus: 'synced',
              synced: 1, // Mantém compatibilidade legada
              lastSyncAttempt: Date.now()
            })));
          }
        }
      }

      if (totalPending > 0) {
        console.log(`[Sync] Preparação concluída. ${totalPending} itens pendentes processados.`);
      }

      this.updateStatus(navigator.onLine ? 'synced' : 'offline');
    } catch (error) {
      console.error('[Sync] Erro na preparação de sincronização:', error);
      this.updateStatus('error');
    }
  }

  private updateStatus(status: ServiceStatus) {
    this.currentStatus = status;
    if (this.onStatusChange) this.onStatusChange(status);
  }
}

export const syncService = SyncService.getInstance();
