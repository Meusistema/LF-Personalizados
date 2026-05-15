import { App } from '@capacitor/app';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { FileOpener } from '@capawesome-team/capacitor-file-opener';
import { Capacitor } from '@capacitor/core';

const GITHUB_REPO = 'Meusistema/LF-Personalizados';

export interface UpdateInfo {
  version: string;
  downloadUrl: string;
  releaseNotes: string;
}

export const UpdateService = {
  async getCurrentVersion(): Promise<string> {
    if ((window as any).electronAPI?.getAppVersion) {
      try {
        return await (window as any).electronAPI.getAppVersion();
      } catch (err) {
        console.error('Error getting Electron app version:', err);
      }
    }
    if (Capacitor.isNativePlatform()) {
      const info = await App.getInfo();
      return info.version;
    }
    return '1.0.0';
  },

  async checkForUpdates(): Promise<UpdateInfo | null> {
    const currentVersion = await this.getCurrentVersion();
    console.log('[UpdateService] Verificando atualizações. Versão atual:', currentVersion);
    
    // Se estiver no Electron, usamos a API do Electron
    if ((window as any).electronAPI?.checkForUpdates) {
      try {
        console.log('[UpdateService] Chamando Electron IPC check-for-updates...');
        const result = await (window as any).electronAPI.checkForUpdates();
        console.log('[UpdateService] Resposta do Electron:', result);
        
        if (result.success && result.result?.updateInfo) {
          const info = result.result.updateInfo;
          console.log('[UpdateService] Versão remota (Electron):', info.version);
          
          if (this.compareVersions(info.version, currentVersion) > 0) {
            return {
              version: info.version,
              downloadUrl: '', // No Electron o download é disparado via IPC
              releaseNotes: info.releaseNotes || 'Nova versão disponível para download.'
            };
          } else {
            console.log('[UpdateService] Versão já é a mais recente.');
          }
        }
        return null;
      } catch (err) {
        console.error('[UpdateService] Electron update check error:', err);
        return null;
      }
    }

    // Lógica existente para Capacitor/Android
    try {
      console.log('[UpdateService] Buscando do GitHub API...');
      const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`);
      if (!response.ok) {
        console.log('[UpdateService] Erro ao buscar do GitHub:', response.status);
        return null;
      }

      const data = await response.json();
      const latestVersion = data.tag_name.replace('v', '');
      console.log('[UpdateService] Versão remota (GitHub):', latestVersion);

      if (this.compareVersions(latestVersion, currentVersion) > 0) {
        // Find APK asset for Android
        const apkAsset = data.assets.find((asset: any) => asset.name.endsWith('.apk'));
        
        // If we are on Android, we MUST have an APK asset
        if (Capacitor.getPlatform() === 'android' && !apkAsset) {
          console.log('[UpdateService] APK não encontrado no release para Android.');
          return null;
        }

        return {
          version: latestVersion,
          downloadUrl: apkAsset ? apkAsset.browser_download_url : data.html_url,
          releaseNotes: data.body || 'Nova versão disponível.'
        };
      } else {
        console.log('[UpdateService] Versão GitHub já é a mais recente ou inferior.');
      }
    } catch (error) {
      console.error('[UpdateService] Error checking for updates (GitHub):', error);
    }
    return null;
  },

  compareVersions(v1: string, v2: string): number {
    const parse = (v: string) => v.split('.').map(s => parseInt(s.replace(/\D/g, '')) || 0);
    const parts1 = parse(v1);
    const parts2 = parse(v2);
    
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;
      if (p1 > p2) return 1;
      if (p1 < p2) return -1;
    }
    return 0;
  },

  async downloadAndInstall(url: string, onProgress: (progress: number) => void): Promise<void> {
    // Se estiver no Electron
    if ((window as any).electronAPI?.downloadUpdate) {
      // O listener global já deve estar configurado no componente AppUpdater
      // Mas garantimos que chamamos o downloadUpdate se ele não for automático
      try {
        await (window as any).electronAPI.downloadUpdate();
      } catch (err) {
        console.error('Electron download error:', err);
      }
      return;
    }

    if (!Capacitor.isNativePlatform()) {
      window.open(url, '_blank');
      return;
    }

    try {
      const fileName = 'update.apk';
      
      // Download file using fetch (progressive)
      const response = await fetch(url);
      const reader = response.body?.getReader();
      const contentLength = +(response.headers.get('Content-Length') || 0);

      if (!reader) throw new Error('Failed to start download');

      let receivedLength = 0;
      const chunks = [];
      while(true) {
        const {done, value} = await reader.read();
        if (done) break;
        chunks.push(value);
        receivedLength += value.length;
        onProgress(Math.round((receivedLength / contentLength) * 100));
      }

      const blob = new Blob(chunks);
      const base64Data = await this.blobToBase64(blob);

      // Save to filesystem
      const savedFile = await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Data
      });

      // Open for installation
      await FileOpener.openFile({
        path: savedFile.uri,
        mimeType: 'application/vnd.android.package-archive'
      });
    } catch (error) {
      console.error('Download/Install error:', error);
      throw error;
    }
  },

  blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
};
