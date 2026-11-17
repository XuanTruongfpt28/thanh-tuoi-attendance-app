import { createAdapter } from './storage/adapterFactory';
import { STORAGE_KEYS } from './storage/StorageAdapter';
import type { UserAccount } from '../types';

const adapter = createAdapter<UserAccount>(STORAGE_KEYS.ACCOUNTS);
const SESSION_KEY = 'tt_session';

export const getAllAccounts = async (): Promise<UserAccount[]> => {
  return await adapter.getUserAccounts();
};

export const createEmployeeAccount = async (accountData: Partial<UserAccount>): Promise<UserAccount> => {
  return await adapter.createUserAccount(accountData);
};

export const updateAccount = async (idOrUsername: string, updates: Partial<UserAccount>): Promise<UserAccount> => {
  return await adapter.updateUserAccount(idOrUsername, updates);
};

export const toggleAccountLock = async (idOrUsername: string): Promise<UserAccount> => {
  return await adapter.toggleAccountStatus(idOrUsername);
};

export const resetPassword = async (idOrUsername: string, newPass: string): Promise<UserAccount> => {
  return await adapter.updatePassword(idOrUsername, newPass);
};

export const changePersonalPassword = async (
  idOrUsername: string,
  oldPass: string,
  newPass: string
): Promise<boolean> => {
  const accounts = await adapter.getUserAccounts();
  const current = accounts.find((a) => a.id === idOrUsername || a.username === idOrUsername);
  if (!current) throw new Error('Không tìm thấy tài khoản');
  if ((current as any).password && (current as any).password !== oldPass) {
    throw new Error('Mật khẩu cũ không chính xác');
  }
  await adapter.updatePassword(current.id, newPass);
  return true;
};

export const deleteAccount = async (idOrUsername: string): Promise<boolean> => {
  return await adapter.deleteUserAccount(idOrUsername);
};

export const login = async (username: string, pass: string): Promise<UserAccount | null> => {
  const accounts = await adapter.getUserAccounts();
  const found = accounts.find((a) => a.username.toLowerCase() === username.trim().toLowerCase() && (a as any).password === pass);
  if (!found) {
    throw new Error('Sai tài khoản hoặc mật khẩu');
  }
  if (!found.isActive) {
    throw new Error('Tài khoản đã bị khóa');
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(found));
  return found;
};

export const logout = async (): Promise<void> => {
  localStorage.removeItem(SESSION_KEY);
};

export const getCurrentSession = (): UserAccount | null => {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const authService = {
  getAllAccounts,
  createEmployeeAccount,
  updateAccount,
  toggleAccountLock,
  resetPassword,
  changePersonalPassword,
  deleteAccount,
  login,
  logout,
  getCurrentSession,
};

export default authService;
