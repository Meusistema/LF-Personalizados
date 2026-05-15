import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UpdateService, UpdateInfo } from '../services/updateService';
import { backupService } from '../services/backupService';
import { Download, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Capacitor } from '@capacitor/core';

export const AppUpdater: React.FC = () => {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  const [currentVersion, setCurrentVersion] = useState<string>('');
  const [isDownloaded, setIsDownloaded] = useState(false);

  useEffect(() => {
    // Buscar versão atual
    UpdateService.getCurrentVersion().then(setCurrentVersion);

    // Configurar listener global de progresso para Electron
    if ((window as any).electronAPI?.onDownloadProgress) {
      (window as any).electronAPI.onDownloadProgress((p: any) => {
        const percent = Math.round(p.percent || 0);
        setProgress(percent);
        if (percent > 0) {
          setIsDownloading(true);
        }
      });
    }

    // Configurar listener de erros
    if ((window as any).electronAPI?.onUpdateError) {
      (window as any).electronAPI.onUpdateError((msg: any) => {
        setError(`Erro na atualização: ${msg.message}`);
        setIsDownloading(false);
      });
    }

    // Configurar listener de mensagens gerais do updatestatus
    if ((window as any).electronAPI?.onUpdateMessage) {
      (window as any).electronAPI.onUpdateMessage((msg: any) => {
        console.log('[AppUpdater] Mensagem do Electron:', msg.text);
        if (msg.text === 'Update available.') {
          checkForUpdates();
        } else if (msg.text === 'Update downloaded') {
          console.log('[AppUpdater] Update baixado com sucesso no Electron.');
          setIsDownloading(false);
          setIsDownloaded(true);
          setProgress(100);
        } else if (msg.text === 'Update not available.') {
          console.log('[AppUpdater] Nenhuma atualização disponível (Electron).');
          setIsDownloading(false);
        } else if (msg.text.includes('Error')) {
          setError(msg.info || 'Ocorreu um erro ao processar a atualização.');
          setIsDownloading(false);
        }
      });
    }

    // Check on native platforms (Android) OR Electron
    // Usamos um pequeno delay para garantir que o Electron autoUpdater esteja pronto
    const timer = setTimeout(() => {
      if (Capacitor.getPlatform() === 'android' || (window as any).electronAPI) {
        checkForUpdates();
      }
    }, 3000);

    // Listener para verificação manual
    const handleManualCheck = () => {
      console.log('[AppUpdater] Verificação manual disparada.');
      setIsDismissed(false);
      setError(null);
      checkForUpdates();
    };

    window.addEventListener('check-app-updates', handleManualCheck);
    return () => {
      window.removeEventListener('check-app-updates', handleManualCheck);
      clearTimeout(timer);
    };
  }, []);

    const checkForUpdates = async () => {
      try {
        const info = await UpdateService.checkForUpdates();
        if (info) {
          setUpdateInfo(info);
        } else {
          // Se for manual e não houver atualização, podemos mostrar um feedback
          // Mas como o AppUpdater só renderiza se tiver updateInfo, deixamos o feedback no App.tsx
        }
      } catch (err) {
        console.error('Check for updates failed:', err);
      }
    };

  const handleUpdate = async () => {
    if (!updateInfo) return;
    
    setIsDownloading(true);
    setIsDownloaded(false);
    setError(null);
    try {
      await UpdateService.downloadAndInstall(updateInfo.downloadUrl, (p) => {
        setProgress(p);
      });
    } catch (err: any) {
      setError('Falha ao iniciar o download. Verifique sua conexão.');
      setIsDownloading(false);
    }
  };

  const handleInstall = async () => {
    if ((window as any).electronAPI?.installUpdate) {
      setError(null);
      try {
        console.log('[AppUpdater] Iniciando backup pré-atualização...');
        const backupResult = await backupService.createAutoBackup('pré-atualização');
        if (!backupResult) {
          const confirmUpdate = window.confirm('ATENÇÃO: Falha ao criar backup de segurança. Deseja continuar com a atualização mesmo assim?');
          if (!confirmUpdate) return;
        }
        console.log('[AppUpdater] Backup concluído. Prosseguindo com instalação...');
        (window as any).electronAPI.installUpdate();
      } catch (err) {
        console.error('[AppUpdater] Erro no fluxo de instalação:', err);
        setError('Ocorreu um erro ao preparar a atualização.');
      }
    }
  };

  if (isDismissed || !updateInfo) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 100 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 100 }}
        className="fixed bottom-6 left-6 right-6 z-[9999] md:left-auto md:right-6 md:w-[420px]"
      >
        <div className="bg-[#1A1A1A] text-white rounded-[2rem] border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] p-6 space-y-6">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[#5d5dff] border-2 border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <Download className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-black uppercase tracking-tighter italic">Update Disponível</h3>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-zinc-500 uppercase">V{currentVersion}</span>
                  <div className="w-1 h-1 bg-zinc-700 rounded-full" />
                  <span className="text-[10px] font-black text-[#5d5dff] uppercase">V{updateInfo.version}</span>
                </div>
              </div>
            </div>
            {!isDownloading && (
              <button 
                onClick={() => setIsDismissed(true)}
                className="p-2 bg-black/40 hover:bg-black rounded-xl transition-all"
              >
                <X className="w-5 h-5 text-zinc-500" />
              </button>
            )}
          </div>

          <div className="bg-black/20 border-2 border-zinc-800 rounded-2xl p-4">
            <div className="text-xs font-bold text-zinc-300 leading-relaxed italic">
              {updateInfo.releaseNotes ? (
                updateInfo.releaseNotes.replace(/<[^>]+>/g, '')
              ) : (
                'Esta versão traz melhorias de estabilidade e novas funcionalidades para sua operação.'
              )}
            </div>
          </div>

          {error && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="flex items-center gap-2 text-rose-500 bg-rose-500/10 border-2 border-rose-500/20 p-3 rounded-xl text-[10px] font-black uppercase tracking-widest"
            >
              <AlertCircle size={14} className="flex-shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          {isDownloading ? (
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em]">Status do Download</span>
                  <span className="text-xs font-black text-white uppercase italic">
                    {progress > 0 ? `Baixando pacotes...` : 'Estabelecendo conexão...'}
                  </span>
                </div>
                <span className="text-2xl font-black text-[#5d5dff] font-mono italic">
                  {progress}%
                </span>
              </div>
              <div className="h-4 bg-black/40 border-2 border-black rounded-full p-0.5 overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(progress, 5)}%` }}
                  className="h-full bg-[#5d5dff] rounded-full shadow-[inset_0_2px_4px_rgba(255,255,255,0.3)] transition-all"
                />
              </div>
            </div>
          ) : isDownloaded ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 bg-emerald-500/10 border-2 border-emerald-500/20 p-4 rounded-2xl">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <p className="text-xs font-black text-emerald-500 uppercase tracking-tight">Download Concluído! Reinicie para Aplicar.</p>
              </div>
              <button
                onClick={handleInstall}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl text-sm font-black uppercase tracking-widest transition-all active:scale-95 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] hover:translate-x-[-2px] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
              >
                Reiniciar e Atualizar
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={handleUpdate}
                className="bg-[#5d5dff] hover:bg-[#4a4aff] text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] hover:translate-x-[-2px] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
              >
                {Capacitor.isNativePlatform() 
                  ? 'Baixar APK Android' 
                  : (window as any).electronAPI 
                    ? 'Baixar Update PC' 
                    : 'Ver no GitHub'}
              </button>
              <button
                onClick={() => setIsDismissed(true)}
                className="bg-zinc-800 hover:bg-zinc-700 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] hover:translate-x-[-2px] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
              >
                Lembrar Depois
              </button>
            </div>
          )}
          
          <div className="pt-2 flex items-center justify-between border-t border-zinc-800">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
              <span className="text-[9px] font-black text-zinc-500 uppercase tracking-wider">Servidor de Produção OK</span>
            </div>
            <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">LukasFe3D Hub</span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
