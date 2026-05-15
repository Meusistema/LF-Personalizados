
import { db } from './db';
import { STORAGE_KEYS, salvarDadosAsync, carregarDadosAsync, generateUniqueId } from './persistence';
import { logger } from './logger';

export interface SystemUser {
  id: string;
  username: string;
  name: string;
  password?: string;
  roleId?: string;
  isActive?: boolean;
  mustChangePassword?: boolean;
  isFirstAccess?: boolean; // For compatibility
  deactivatedAt?: number; // For compatibility
  createdAt: number;
  updatedAt: number;
}

export interface Role {
  id: string;
  name: string;
  permissions: any;
  isDefault?: boolean;
}

const SALT_PREFIX = 'PF3D_';

/**
 * Robust SHA-256 Hashing using Web Crypto API
 */
async function hashPassword(password: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(SALT_PREFIX + password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return `sha256:${hashHex}`;
}

/**
 * Verify a password against a stored hash
 */
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!hash) return false;
  // Fallback for old plain text passwords if they exist (though we aim to remove them)
  if (!hash.startsWith('sha256:')) {
    return password === hash;
  }
  const hashedInput = await hashPassword(password);
  return hashedInput === hash;
}

/**
 * Initialize Authentication System
 * Checks for existing users and creates the default ADM if needed.
 */
export async function initializeAuth(): Promise<{ user: SystemUser | null; roles: Role[] }> {
  try {
    console.log('[Auth] Inicializando sistema de autenticação unificado...');
    
    // Load Roles
    let roles = await carregarDadosAsync<Role[]>(STORAGE_KEYS.ROLES, []);
    if (roles.length === 0) {
      // Import roles from App.tsx constants or define here
      // For now, we rely on App.tsx providing roles to save or we define defaults
      console.log('[Auth] Nenhum papel (role) encontrado. Aguardando App.tsx injetar ou usando padrão...');
    }

    // Check for Users
    const usersCount = await db.system_users.count();
    
    if (usersCount === 0) {
      console.log('[Auth] Instalação limpa detectada. Criando usuário ADM padrão...');
      
      const adminPasswordHash = await hashPassword('1234');
      const defaultAdmin: SystemUser = {
        id: 'admin',
        username: 'ADM',
        name: 'Administrador Mestre',
        password: adminPasswordHash,
        roleId: 'role-gerente', // Standard ID used in App.tsx
        isActive: true,
        mustChangePassword: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      await db.system_users.put(defaultAdmin);
      logger.info('Usuário ADM / 1234 criado automaticamente.', { username: 'ADM' }, 'Auth');
    }

    // Check for session in localStorage (simulating basic persistence of login)
    const sessionUserId = localStorage.getItem('pdv_current_user_id');
    if (sessionUserId) {
      const user = await db.system_users.get(sessionUserId);
      if (user && user.isActive) {
        return { user, roles };
      }
      localStorage.removeItem('pdv_current_user_id');
    }

    return { user: null, roles };
  } catch (error) {
    logger.error('Erro ao inicializar autenticação:', error, 'Auth');
    return { user: null, roles: [] };
  }
}

/**
 * Logic for user login
 */
export async function login(username: string, password: string): Promise<{ success: boolean; user?: SystemUser; error?: string }> {
  try {
    if (!username || !password) {
      return { success: false, error: 'Usuário e senha são obrigatórios.' };
    }

    // Find user by username (case insensitive for ease of use)
    const allUsers = await db.system_users.toArray();
    const user = allUsers.find(u => u.username?.toUpperCase() === username.toUpperCase());

    if (!user) {
      return { success: false, error: 'Usuário não encontrado.' };
    }

    if (!user.isActive) {
      return { success: false, error: 'Usuário desativado.' };
    }

    const isMatch = await verifyPassword(password, user.password || '');
    if (!isMatch) {
      return { success: false, error: 'Senha incorreta.' };
    }

    // Success
    localStorage.setItem('pdv_current_user_id', user.id);
    logger.info(`Usuário logado: ${user.username}`, { userId: user.id }, 'Auth');
    
    return { success: true, user };
  } catch (error) {
    logger.error('Erro no login:', error, 'Auth');
    return { success: false, error: 'Erro interno ao processar login.' };
  }
}

/**
 * Logout
 */
export function logout() {
  localStorage.removeItem('pdv_current_user_id');
}

/**
 * Change User Password
 */
export async function changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string; user?: SystemUser }> {
  try {
    const user = await db.system_users.get(userId);
    if (!user) return { success: false, error: 'Usuário não encontrado.' };

    const isMatch = await verifyPassword(currentPassword, user.password || '');
    if (!isMatch) return { success: false, error: 'A senha atual está incorreta.' };

    const newHash = await hashPassword(newPassword);
    const updatedFields = {
      password: newHash,
      mustChangePassword: false,
      isFirstAccess: false,
      updatedAt: Date.now()
    };
    
    await db.system_users.update(userId, updatedFields);
    const updatedUser = { ...user, ...updatedFields };

    logger.info(`Senha alterada para o usuário: ${user.username}`, { userId }, 'Auth');
    return { success: true, user: updatedUser };
  } catch (error) {
    logger.error('Erro ao trocar senha:', error, 'Auth');
    return { success: false, error: 'Erro interno ao trocar senha.' };
  }
}

/**
 * Check if a password is correct for a specific user
 */
export async function checkPassword(userId: string, password: string): Promise<boolean> {
  const user = await db.system_users.get(userId);
  if (!user) return false;
  return verifyPassword(password, user.password || '');
}

/**
 * Create a new user
 */
export async function createUser(userData: Omit<SystemUser, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ success: boolean; user?: SystemUser; error?: string }> {
  try {
    const existing = await db.system_users.where('username').equalsIgnoreCase(userData.username).first();
    if (existing) return { success: false, error: 'Este nome de usuário já está sendo usado.' };

    const id = generateUniqueId();
    const finalPassword = userData.password ? await hashPassword(userData.password) : await hashPassword('1234');
    
    const newUser: SystemUser = {
      ...userData,
      id: id as any,
      password: finalPassword,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await db.system_users.put(newUser);
    return { success: true, user: newUser };
  } catch (error) {
    logger.error('Erro ao criar usuário:', error, 'Auth');
    return { success: false, error: 'Erro interno ao criar usuário.' };
  }
}

/**
 * Update an existing user
 */
export async function updateUser(userId: string, data: Partial<SystemUser>): Promise<{ success: boolean; user?: SystemUser; error?: string }> {
  try {
    const user = await db.system_users.get(userId);
    if (!user) return { success: false, error: 'Usuário não encontrado.' };

    const updatedData: any = { ...data, updatedAt: Date.now() };
    
    if (data.password && !data.password.startsWith('sha256:')) {
      updatedData.password = await hashPassword(data.password);
    }

    await db.system_users.update(userId, updatedData);
    const updatedUser = { ...user, ...updatedData };
    
    return { success: true, user: updatedUser };
  } catch (error) {
    logger.error('Erro ao atualizar usuário:', error, 'Auth');
    return { success: false, error: 'Erro interno ao atualizar usuário.' };
  }
}

/**
 * Delete a user
 */
export async function deleteUser(userId: string): Promise<boolean> {
  try {
    if (userId === 'admin') return false; // Never delete master admin
    await db.system_users.delete(userId);
    return true;
  } catch (error) {
    logger.error('Erro ao excluir usuário:', error, 'Auth');
    return false;
  }
}

/**
 * Reset Administrator (Emergency)
 * ONLY resets users, keeps other data intact.
 */
export async function resetAdmin(): Promise<boolean> {
  try {
    console.log('[Auth] Executando Reset de Administrador...');
    
    // Clear all users
    await db.system_users.clear();
    
    // Recreate default ADM
    const adminPasswordHash = await hashPassword('1234');
    const defaultAdmin: SystemUser = {
      id: 'admin',
      username: 'ADM',
      name: 'Administrador Mestre',
      password: adminPasswordHash,
      roleId: 'role-gerente',
      isActive: true,
      mustChangePassword: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    await db.system_users.put(defaultAdmin);
    localStorage.removeItem('pdv_current_user_id');
    
    logger.info('Administrador resetado para ADM / 1234.', null, 'Auth');
    return true;
  } catch (error) {
    logger.error('Erro ao resetar administrador:', error, 'Auth');
    return false;
  }
}
