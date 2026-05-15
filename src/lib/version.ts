export const APP_VERSION = '1.0.0';

export interface VersionInfo {
  version: string;
  updateUrl?: string;
  critical?: boolean;
}

/**
 * Lógica para verificação de atualização remota.
 * Em um cenário real, você configuraria um endpoint (ex: GitHub Gist, API própria)
 * que retorna o JSON com a versão mais recente.
 */
export async function checkUpdate(): Promise<VersionInfo | 'not_configured' | null> {
  try {
    // Para configurar futuramente:
    // 1. Defina uma URL (ex: GitHub Gist ou API própria)
    // 2. Descomente as linhas abaixo
    
    const UPDATE_URL = ''; // EX: 'https://minha-api.com/version.json'
    
    if (!UPDATE_URL) return 'not_configured';

    const response = await fetch(UPDATE_URL);
    if (!response.ok) return null;
    
    const remote: VersionInfo = await response.json();
    
    // Compara versão simples (string)
    if (remote.version !== APP_VERSION) {
      return remote;
    }
    
    return null; 
  } catch (error) {
    console.error('Erro ao verificar atualização:', error);
    return null;
  }
}
