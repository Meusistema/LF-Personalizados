const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');

const isDev = process.env.NODE_ENV === 'development';

// Flag crucial para instalação de atualização
let isUpdating = false;

// Configurações do autoUpdater
autoUpdater.autoDownload = false; 
autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.allowPrerelease = false;
autoUpdater.logger = require('electron-log');
autoUpdater.logger.transports.file.level = 'info';

// Logs para depuração inicial
console.log('[Electron] Inicializando AutoUpdater...');
console.log('[Electron] Versão Atual:', app.getVersion());
console.log('[Electron] Canal de Update:', autoUpdater.channel || 'default');
console.log('[Electron] Argumentos de início:', process.argv);

if (process.argv.includes('--updated')) {
  console.log('[AutoUpdater] Aplicativo reiniciado automaticamente após atualização!');
}

function sendStatusToWindow(text, info = null) {
  try {
    const win = BrowserWindow.getAllWindows()[0];
    if (win && !win.isDestroyed()) {
      win.webContents.send('update-message', { text, info });
    }
  } catch (err) {
    console.error('[Electron] Error sending status to window:', err);
  }
}

const BACKUP_FILENAME = 'backup_pdv.json';
const backupPath = path.join(app.getPath('userData'), BACKUP_FILENAME);

// Caminho para backups automáticos reforçados conforme solicitado pelo usuário
const documentsBackupDir = path.join(app.getPath('documents'), 'MeuSistema', 'Backups');

// Garante que o diretório de backups nos Documentos existe
try {
  if (!fs.existsSync(documentsBackupDir)) {
    fs.mkdirSync(documentsBackupDir, { recursive: true });
  }
} catch (err) {
  console.error('[Electron] Erro ao criar diretório de backups nos documentos:', err);
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, '../public/vite.svg')
  });

  Menu.setApplicationMenu(null);

  const startUrl = isDev 
    ? 'http://localhost:3000' 
    : `file://${path.join(__dirname, '../dist/index.html')}`;

  if (isDev) {
    mainWindow.loadURL(startUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
  mainWindow.maximize();
  mainWindow.show();

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  // Interceptar fechamento da janela para fazer backup
  mainWindow.on('close', (e) => {
    if (isUpdating) return; // Se estiver atualizando, deixa o processo seguir
    
    // Se o app já estiver "pronto para sair" (chamado via IPC quit-app), não interceptamos
    if (app.isQuitting) return;

    e.preventDefault();
    console.log('[Electron] Interceptando fechamento para backup final...');
    mainWindow.webContents.send('app-closing');
  });
}

// IPC Handlers
ipcMain.handle('get-printers', async () => {
  try {
    const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
    let printers = [];
    if (win) {
      printers = await win.webContents.getPrintersAsync();
    } else {
      const tempWin = new BrowserWindow({ show: false });
      printers = await tempWin.webContents.getPrintersAsync();
      tempWin.close();
    }
    console.log('[Electron] Impressoras detectadas:', printers.map(p => ({ name: p.name, displayName: p.displayName, isDefault: p.isDefault })));
    return printers;
  } catch (error) {
    console.error('[Electron] Erro ao buscar impressoras:', error);
    return [];
  }
});

ipcMain.handle('print', async (event, content, options = {}) => {
  const targetDevice = options.deviceName || '';
  console.log(`[Electron] [PRINT_START] - Destino: "${targetDevice || 'Padrão'}"`);
  
  const printWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      offscreen: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Validar se a impressora existe no sistema
  try {
    const allPrinters = await printWindow.webContents.getPrintersAsync();
    const printerExists = allPrinters.some(p => p.name === targetDevice);
    
    if (targetDevice && !printerExists) {
      console.warn(`[Electron] [ERROR] - Impressora "${targetDevice}" não encontrada.`);
      return { 
        success: false, 
        error: `Impressora "${targetDevice}" não encontrada. Verifique se está ligada e instalada no Windows.`,
        code: 'PRINTER_NOT_FOUND'
      };
    }
  } catch (err) {
    console.error('[Electron] [WARN] - Erro ao validar lista de impressoras:', err);
  }

  const htmlContent = (content.trim().startsWith('<html>') || content.trim().startsWith('<!DOCTYPE')) 
    ? content 
    : `<html><head><meta charset="UTF-8"></head><body>${content}</body></html>`;
  
  return new Promise((resolve) => {
    let resolved = false;

    const executePrint = () => {
      if (resolved) return;
      console.log(`[Electron] [PRINT_EXEC] - Iniciando envio para a fila do Windows: "${targetDevice || 'Padrão'}"`);
      
      const printParams = {
        silent: true,
        deviceName: targetDevice,
        printBackground: true,
        ...options
      };

      try {
        printWindow.webContents.print(printParams, (success, failureReason) => {
          if (resolved) return;
          resolved = true;

          console.log(`[Electron] [PRINT_CALLBACK] - Sucesso: ${success}, Motivo: ${failureReason || 'Nenhum'}`);

          if (!printWindow.isDestroyed()) printWindow.close();
          
          if (!success) {
            console.error(`[Electron] [PRINT_FAIL] - Falha no driver: "${failureReason}"`);
            resolve({ 
              success: false, 
              error: failureReason || 'O driver da impressora rejeitou o trabalho ou a impressora está offline.',
              code: 'DRIVER_FAILURE'
            });
          } else {
            console.log('[Electron] [PRINT_SUCCESS] - Trabalho aceito pela fila de impressão do Windows.');
            resolve({ success: true });
          }
        });
      } catch (printErr) {
        console.error('[Electron] [PRINT_CRITICAL] - Erro ao chamar webContents.print:', printErr);
        resolved = true;
        if (!printWindow.isDestroyed()) printWindow.close();
        resolve({ success: false, error: printErr.message, code: 'INTERNAL_ERROR' });
      }
    };

    // Registrar o listener ANTES de começar o loadURL
    printWindow.webContents.on('did-finish-load', () => {
      console.log('[Electron] [CONTENT_LOADED] - HTML pronto para renderização.');
      // Delay de 1000ms para garantir que CSS e fontes (especialmente em máquinas lentas) carreguem
      setTimeout(executePrint, 1000);
    });

    printWindow.webContents.on('did-fail-load', (e, errorCode, errorDescription) => {
      console.error('[Electron] [LOAD_FAIL] - Falha ao carregar conteúdo:', errorDescription);
      if (!resolved) {
        resolved = true;
        if (!printWindow.isDestroyed()) printWindow.close();
        resolve({ success: false, error: `Falha ao preparar conteúdo: ${errorDescription}`, code: 'LOAD_FAILURE' });
      }
    });

    // Iniciar o carregamento de forma robusta
    console.log('[Electron] [LOAD_START] - Carregando conteúdo na janela oculta...');
    
    // Usamos about:blank e document.write para evitar limites de tamanho de data: URLs (comum em recibos com muitas imagens)
    printWindow.loadURL('about:blank').then(() => {
      const base64Html = Buffer.from(htmlContent).toString('base64');
      const script = `
        document.open();
        document.write(decodeURIComponent(escape(atob('${base64Html}'))));
        document.close();
      `;
      printWindow.webContents.executeJavaScript(script).catch(err => {
        console.error('[Electron] [JS_EXEC_FAIL] - Erro ao injetar HTML:', err);
      });
    }).catch(err => {
      console.error('[Electron] [LOAD_CATCH] - Erro no loadURL:', err);
    });

    // Timeout de segurança (60 segundos)
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        if (!printWindow.isDestroyed()) printWindow.close();
        console.error('[Electron] [TIMEOUT] - O driver de impressão ou a renderização não respondeu em 60s.');
        resolve({ 
          success: false, 
          error: 'A operação de impressão demorou mais de 60 segundos. Verifique o status da impressora no Windows.',
          code: 'TIMEOUT'
        });
      }
    }, 60000);
  });
});

ipcMain.handle('save-backup', async (event, data, customFilename = null) => {
  try {
    // 1. Salva no local padrão (AppData)
    if (!customFilename) {
      fs.writeFileSync(backupPath, JSON.stringify(data, null, 2), 'utf-8');
    }
    
    // 2. Salva uma cópia datada nos Documentos para segurança extra (Solicitado pelo usuário)
    try {
      let filename = customFilename;
      if (!filename) {
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.getHours().toString().padStart(2, '0') + now.getMinutes().toString().padStart(2, '0');
        filename = `auto_backup_${dateStr}_${timeStr}.json`;
      }
      
      const docPath = path.join(documentsBackupDir, filename);
      fs.writeFileSync(docPath, JSON.stringify(data, null, 2), 'utf-8');
      
      // Limpeza opcional: manter apenas os últimos 30 backups diários nos documentos
      if (!customFilename) {
        const files = fs.readdirSync(documentsBackupDir).filter(f => f.startsWith('auto_backup_'));
        if (files.length > 30) {
          const sortedFiles = files.sort((a, b) => fs.statSync(path.join(documentsBackupDir, b)).mtime.getTime() - fs.statSync(path.join(documentsBackupDir, a)).mtime.getTime());
          sortedFiles.slice(30).forEach(file => {
            fs.unlinkSync(path.join(documentsBackupDir, file));
          });
        }
      }
      return { success: true, filename };
    } catch (docErr) {
      console.error('Erro ao salvar cópia de backup nos documentos:', docErr);
      return { success: true }; // Ainda retorna true pois o backup principal no AppData funcionou
    }
  } catch (error) {
    console.error('Erro ao salvar backup:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('load-backup', async (event, filename = null) => {
  try {
    const targetPath = filename ? path.join(documentsBackupDir, filename) : backupPath;
    if (fs.existsSync(targetPath)) {
      const data = fs.readFileSync(targetPath, 'utf-8');
      return JSON.parse(data);
    }
    return null;
  } catch (error) {
    console.error('Erro ao carregar backup:', error);
    return null;
  }
});

ipcMain.handle('export-backup', async (event, data) => {
  const { filePath } = await dialog.showSaveDialog({
    title: 'Exportar Backup',
    defaultPath: path.join(app.getPath('downloads'), `backup_pdv_${new Date().toISOString().split('T')[0]}.json`),
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });

  if (filePath) {
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
      return { success: true, filePath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  return { success: false };
});

ipcMain.handle('import-backup', async () => {
  const { filePaths } = await dialog.showOpenDialog({
    title: 'Importar Backup',
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile']
  });

  if (filePaths && filePaths.length > 0) {
    try {
      const data = fs.readFileSync(filePaths[0], 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Erro ao importar backup:', error);
      return null;
    }
  }
  return null;
});

const logPath = path.join(app.getPath('userData'), 'logs');
if (!fs.existsSync(logPath)) fs.mkdirSync(logPath, { recursive: true });

ipcMain.handle('write-log', async (event, logEntry) => {
  try {
    const errorLogPath = path.join(logPath, 'error.log');
    
    // Rotação básica de logs: se passar de 5MB, renomeia para .old e começa novo
    if (fs.existsSync(errorLogPath)) {
      const stats = fs.statSync(errorLogPath);
      if (stats.size > 5 * 1024 * 1024) { // 5MB
        const oldLogPath = path.join(logPath, 'error.log.old');
        if (fs.existsSync(oldLogPath)) fs.unlinkSync(oldLogPath);
        fs.renameSync(errorLogPath, oldLogPath);
      }
    }

    const timestamp = new Date(logEntry.timestamp).toLocaleString();
    const logLine = `[${timestamp}] [${logEntry.level.toUpperCase()}] [${logEntry.context || 'System'}] ${logEntry.message} ${logEntry.details ? JSON.stringify(logEntry.details) : ''}\n`;
    fs.appendFileSync(errorLogPath, logLine, 'utf-8');
    return { success: true };
  } catch (error) {
    console.error('Erro ao escrever log:', error);
    return { success: false };
  }
});

// Captura de erros globais no processo principal
process.on('uncaughtException', (error) => {
  console.error('[Electron] Uncaught Exception:', error);
  try {
    const errorLogPath = path.join(app.getPath('userData'), 'logs', 'error.log');
    const logLine = `[${new Date().toLocaleString()}] [CRITICAL] [MainProcess] Uncaught Exception: ${error.stack || error.message}\n`;
    fs.appendFileSync(errorLogPath, logLine, 'utf-8');
  } catch (e) {}
});

process.on('unhandledRejection', (reason) => {
  console.error('[Electron] Unhandled Rejection:', reason);
  try {
    const errorLogPath = path.join(app.getPath('userData'), 'logs', 'error.log');
    const logLine = `[${new Date().toLocaleString()}] [CRITICAL] [MainProcess] Unhandled Rejection: ${reason}\n`;
    fs.appendFileSync(errorLogPath, logLine, 'utf-8');
  } catch (e) {}
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('quit-app', () => {
  console.log('[Electron] quit-app recebido. Encerrando agora...');
  app.isQuitting = true;
  app.quit();
});

ipcMain.handle('check-for-updates', async () => {
  console.log('[Electron] [IPC] check-for-updates chamado');
  if (isDev) return { success: false, message: 'Não disponível em modo desenvolvimento' };
  try {
    const result = await autoUpdater.checkForUpdates();
    console.log('[Electron] [IPC] check-for-updates resultado:', result ? 'Update encontrado' : 'Nenhum update');
    return { success: true, result };
  } catch (error) {
    console.error('[Electron] [IPC] Erro ao verificar atualização:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('download-update', async () => {
  try {
    await autoUpdater.downloadUpdate();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('install-update', () => {
  console.log('[AutoUpdater] [IPC] install-update: Usuário confirmou instalação.');
  // O backup já deve ter sido feito pelo frontend antes de chamar este IPC
  console.log('[AutoUpdater] [PROCESS] Fechando janelas e preparando quitAndInstall...');
  
  isUpdating = true; // Define flag para evitar interferência do window-all-closed

  // Garantir que todas as janelas sejam destruídas antes de tentar atualizar
  // Isso ajuda a liberar travas de arquivo que o Windows possa ter
  try {
    const windows = BrowserWindow.getAllWindows();
    windows.forEach(win => {
      if (!win.isDestroyed()) {
        console.log(`[AutoUpdater] Destruindo janela: ${win.getTitle()}`);
        win.removeAllListeners('close');
        win.destroy();
      }
    });
  } catch (err) {
    console.error('[AutoUpdater] Erro ao fechar janelas para update:', err);
  }
  
  // O setImmediate ou setTimeout garante que o handler do IPC termine antes de o app fechar
  // e que o sistema operacional tenha tempo de processar o fechamento das janelas
  setTimeout(() => {
    console.log('[AutoUpdater] Chamando autoUpdater.quitAndInstall(false, true)...');
    try {
      autoUpdater.quitAndInstall(false, true);
    } catch (err) {
      console.error('[AutoUpdater] Erro crítico ao chamar quitAndInstall:', err);
      // Tentativa de fallback caso quitAndInstall falhe
      isUpdating = false;
      app.quit();
    }
  }, 1000);
});

app.on('before-quit', () => {
  // Limpeza final antes de fechar
  console.log('[Electron] Aplicativo sendo encerrado...');
});

app.whenReady().then(() => {
  console.log(`[Electron] [READY] Aplicativo iniciado. Versão: ${app.getVersion()}`);
  createWindow();

  // Verificação de atualização somente em produção
  if (!isDev) {
    console.log('[AutoUpdater] Iniciando verificação automática em produção...');
    autoUpdater.checkForUpdatesAndNotify().catch(err => {
      console.error('[AutoUpdater] erro no update (catch):', err.message);
    });
  }

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Eventos do AutoUpdater com logs claros solicitados
autoUpdater.on('checking-for-update', () => {
  console.log('[AutoUpdater] verificando atualização...');
  sendStatusToWindow('Checking for update...');
});

autoUpdater.on('update-available', (info) => {
  console.log('[AutoUpdater] atualização encontrada:', info.version);
  console.log('[AutoUpdater] download iniciado...');
  sendStatusToWindow('Update available.', info);
});

autoUpdater.on('update-not-available', (info) => {
  console.log('[AutoUpdater] nenhuma atualização encontrada.');
  sendStatusToWindow('Update not available.', info);
});

autoUpdater.on('error', (err) => {
  const errorMessage = err instanceof Error ? err.stack || err.message : String(err);
  console.error('[AutoUpdater] erro no update:', errorMessage);
  sendStatusToWindow('Error in auto-updater.', err.message);
  
  try {
    const win = BrowserWindow.getAllWindows()[0];
    if (win && !win.isDestroyed()) {
      win.webContents.send('update-error', { message: err.message, stack: errorMessage });
    }
  } catch (windowErr) {
    console.error('[Electron] Error sending update error to window:', windowErr);
  }
});

autoUpdater.on('download-progress', (progressObj) => {
  const log_message = `progresso: ${Math.round(progressObj.percent)}%`;
  // Logamos apenas em intervalos de 25% para não poluir o console
  if (Math.round(progressObj.percent) % 25 === 0) {
    console.log('[AutoUpdater] ' + log_message);
  }
  
  try {
    const win = BrowserWindow.getAllWindows()[0];
    if (win && !win.isDestroyed()) {
      win.webContents.send('download-progress', {
        percent: progressObj.percent,
        transferred: progressObj.transferred,
        total: progressObj.total,
        bytesPerSecond: progressObj.bytesPerSecond
      });
    }
  } catch (err) {
    console.error('[Electron] Error sending download progress:', err);
  }
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('[AutoUpdater] download concluído. Nova versão pronta:', info.version);
  console.log('[AutoUpdater] Aguardando comando de instalação do usuário...');
  sendStatusToWindow('Update downloaded', info);
});

app.on('window-all-closed', function () {
  if (isUpdating) {
    console.log('[Electron] Todas as janelas fechadas devido ao processo de atualização.');
    return; // Não chama app.quit() se estivermos atualizando, deixa o quitAndInstall cuidar disso
  }
  if (process.platform !== 'darwin') app.quit();
});
