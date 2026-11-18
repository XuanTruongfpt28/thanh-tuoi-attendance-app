import type { IStorageAdapter } from './StorageAdapter';
import type { UserAccount } from '../../types';
import { DEFAULT_BRANCHES } from '../../constants/branches';
import { supabase } from '../supabaseClient';

class LocalStorageAdapter<T = any> implements IStorageAdapter<T> {
  private storageKey: string;
  private defaultData: any;

  constructor(storageKey: string = 'tt_default', defaultData: any = []) {
    this.storageKey = storageKey;
    this.defaultData = defaultData;
  }

  async getAll(): Promise<T[]> {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) {
      if (this.defaultData) {
        localStorage.setItem(this.storageKey, JSON.stringify(this.defaultData));
        return this.defaultData as T[];
      }
      return [];
    }
    try {
      return JSON.parse(raw) as T[];
    } catch {
      return [];
    }
  }

  async saveAll(items: T[]): Promise<void> {
    localStorage.setItem(this.storageKey, JSON.stringify(items));
  }

  async getItem<U = T>(key: string): Promise<U | null> {
    const data = localStorage.getItem(key);
    if (!data) return null;
    try {
      return JSON.parse(data) as U;
    } catch {
      return data as unknown as U;
    }
  }

  async setItem<U = T>(key: string, value: U): Promise<void> {
    localStorage.setItem(key, JSON.stringify(value));
  }

  async removeItem(key: string): Promise<void> {
    const raw = localStorage.getItem(this.storageKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter((item: any) => item.id !== key);
          localStorage.setItem(this.storageKey, JSON.stringify(filtered));
          return;
        }
      } catch {}
    }
    localStorage.removeItem(key);
  }

  async clear(): Promise<void> {
    localStorage.clear();
  }

  async getUserAccounts(): Promise<UserAccount[]> {
    const raw = localStorage.getItem('tt_user_accounts');
    if (!raw) {
      const initial: UserAccount[] = [
        {
          id: 'usr_admin',
          username: 'admin',
          name: 'Quản trị viên Hệ thống',
          password: 'admin',
          role: 'admin',
          position: 'Tổng Quản lý',
          isActive: true,
          createdAt: new Date().toISOString(),
        } as UserAccount,
      ];
      localStorage.setItem('tt_user_accounts', JSON.stringify(initial));
      return initial;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  async createUserAccount(account: Partial<UserAccount>): Promise<UserAccount> {
    const list = await this.getUserAccounts();
    const newAcc: UserAccount = {
      id: account.id || `acc_${Date.now()}`,
      username: account.username || `user_${Date.now()}`,
      name: account.name || account.username || '',
      password: (account as any).password || '123456',
      role: account.role || 'employee',
      employeeId: account.employeeId || '',
      branchId: account.branchId || '',
      position: account.position || '',
      phone: account.phone || '',
      isActive: account.isActive ?? true,
      createdAt: new Date().toISOString(),
    } as UserAccount;
    list.unshift(newAcc);
    localStorage.setItem('tt_user_accounts', JSON.stringify(list));
    return newAcc;
  }

  async toggleAccountStatus(usernameOrId: string): Promise<UserAccount> {
    const list = await this.getUserAccounts();
    const item = list.find((u) => u.username === usernameOrId || u.id === usernameOrId);
    if (!item) throw new Error('Không tìm thấy tài khoản');
    item.isActive = !item.isActive;
    localStorage.setItem('tt_user_accounts', JSON.stringify(list));
    return item;
  }

  async updatePassword(usernameOrId: string, newPassword: string): Promise<UserAccount> {
    const list = await this.getUserAccounts();
    const item = list.find((u) => u.username === usernameOrId || u.id === usernameOrId);
    if (!item) throw new Error('Không tìm thấy tài khoản');
    item.password = newPassword;
    localStorage.setItem('tt_user_accounts', JSON.stringify(list));
    return item;
  }

  async updateUserAccount(usernameOrId: string, updates: Partial<UserAccount>): Promise<UserAccount> {
    const list = await this.getUserAccounts();
    const index = list.findIndex((u) => u.username === usernameOrId || u.id === usernameOrId);
    if (index < 0) throw new Error('Không tìm thấy tài khoản');
    const updated = { ...list[index], ...updates };
    list[index] = updated;
    localStorage.setItem('tt_user_accounts', JSON.stringify(list));
    return updated;
  }

  async deleteUserAccount(usernameOrId: string): Promise<boolean> {
    let list = await this.getUserAccounts();
    list = list.filter((u) => u.username !== usernameOrId && u.id !== usernameOrId);
    localStorage.setItem('tt_user_accounts', JSON.stringify(list));
    return true;
  }
}

class SupabaseStorageAdapter<T = any> implements IStorageAdapter<T> {
  private tableName: string;

  constructor(tableName: string = 'user_accounts', _defaultData?: any) {
    this.tableName = tableName;
  }

  private getTable(): string {
    const clean = this.tableName.replace(/^tt_/, '');
    if (clean === 'accounts') return 'user_accounts';
    if (clean === 'shifts') return 'shift_configs';
    return clean;
  }

  private mapRowFromDb(row: any): any {
    if (!row || typeof row !== 'object') return row;
    const table = this.getTable();
    switch (table) {
      case 'attendance_records':
        return {
          id: row.id,
          employeeId: row.employee_id,
          employeeName: row.employee_name,
          branchId: row.branch_id,
          shiftId: row.shift_id,
          date: row.date,
          checkInTime: row.check_in_time ?? undefined,
          checkOutTime: row.check_out_time ?? undefined,
          checkInStatus: row.check_in_status ?? undefined,
          lateMinutes: row.late_minutes ?? 0,
          checkOutStatus: row.check_out_status ?? undefined,
          earlyLeaveMinutes: row.early_leave_minutes ?? 0,
          overtimeMinutes: row.overtime_minutes ?? 0,
          note: row.note ?? undefined,
          checkInPhoto: row.check_in_photo ?? undefined,
          checkOutPhoto: row.check_out_photo ?? undefined,
        };
      case 'employees':
        return {
          id: row.id,
          name: row.name,
          branchId: row.branch_id,
          position: row.position ?? undefined,
        };
      case 'shift_configs':
        return {
          id: row.id,
          name: row.name,
          startTime: row.start_time,
          endTime: row.end_time,
          gracePeriodMinutes: row.grace_period_minutes ?? 0,
        };
      case 'branches':
        return {
          id: row.id,
          name: row.name,
          address: row.address ?? undefined,
          allowedIps: row.allowed_ips ?? undefined,
        };
      case 'user_accounts':
        return {
          id: row.id,
          username: row.username,
          password: row.password,
          role: row.role || 'employee',
          employeeId: row.employee_id || undefined,
          name: row.name || row.full_name || row.username,
          branchId: row.branch_id || undefined,
          position: row.position || undefined,
          phone: row.phone || undefined,
          isActive: row.is_active ?? true,
          createdAt: row.created_at || new Date().toISOString(),
          lastLoginAt: row.last_login_at || row.last_login || undefined,
        };
      default:
        return row;
    }
  }

  private mapRowToDb(item: any): any {
    if (!item || typeof item !== 'object') return item;
    const table = this.getTable();
    switch (table) {
      case 'attendance_records':
        return {
          id: item.id || `att_${Date.now()}`,
          employee_id: item.employeeId,
          employee_name: item.employeeName,
          branch_id: item.branchId,
          shift_id: item.shiftId,
          date: item.date,
          check_in_time: item.checkInTime ?? null,
          check_out_time: item.checkOutTime ?? null,
          check_in_status: item.checkInStatus ?? null,
          late_minutes: item.lateMinutes ?? 0,
          check_out_status: item.checkOutStatus ?? null,
          early_leave_minutes: item.earlyLeaveMinutes ?? 0,
          overtime_minutes: item.overtimeMinutes ?? 0,
          note: item.note ?? null,
          check_in_photo: item.checkInPhoto ?? null,
          check_out_photo: item.checkOutPhoto ?? null,
        };
      case 'employees':
        return {
          id: item.id,
          name: item.name,
          branch_id: item.branchId,
          position: item.position ?? null,
        };
      case 'shift_configs':
        return {
          id: item.id,
          name: item.name,
          start_time: item.startTime,
          end_time: item.endTime,
          grace_period_minutes: item.gracePeriodMinutes ?? 0,
        };
      case 'branches':
        return {
          id: item.id,
          name: item.name,
          address: item.address ?? null,
          allowed_ips: item.allowedIps ?? null,
        };
      case 'user_accounts': {
        const dbObj: any = {};
        dbObj.id =
          item.id ||
          (typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `acc_${Date.now()}`);
        if (item.username !== undefined) dbObj.username = item.username;
        if (item.password !== undefined) dbObj.password = item.password;
        dbObj.role = item.role || 'employee'; // Bắt buộc có role ('admin' hoặc 'employee')
        dbObj.employee_id = item.employeeId ? item.employeeId : null;
        if (item.name !== undefined) dbObj.name = item.name;
        dbObj.branch_id = item.branchId ? item.branchId : null;
        if (item.position !== undefined) dbObj.position = item.position;
        if (item.phone !== undefined) dbObj.phone = item.phone;
        dbObj.is_active = item.isActive ?? true;
        return dbObj;
      }
      default:
        return item;
    }
  }

  async getAll(): Promise<T[]> {
    const { data, error } = await supabase.from(this.getTable()).select('*');
    if (error) {
      console.warn(`Lỗi lấy dữ liệu bảng ${this.getTable()}:`, error.message);
      return [];
    }

    const fallbackRaw = localStorage.getItem(`tt_fallback_${this.getTable()}`);
    const fallbackMap = new Map<string, any>();
    if (fallbackRaw) {
      try {
        const parsed = JSON.parse(fallbackRaw);
        if (Array.isArray(parsed)) {
          parsed.forEach((item: any) => {
            if (item?.id) fallbackMap.set(item.id, item);
          });
        }
      } catch {}
    }

    return (data || []).map((row) => {
      const mapped = this.mapRowFromDb(row);
      if (fallbackMap.has(mapped.id)) {
        const fb = fallbackMap.get(mapped.id);
        if (!mapped.allowedIps && fb.allowedIps) {
          mapped.allowedIps = fb.allowedIps;
        }
        if (!mapped.checkOutPhoto && fb.checkOutPhoto) {
          mapped.checkOutPhoto = fb.checkOutPhoto;
        }
      }
      return mapped;
    }) as T[];
  }

  async saveAll(items: T[]): Promise<void> {
    if (!items || items.length === 0) return;
    const dbItems = items.map((item) => this.mapRowToDb(item));
    let { error } = await supabase.from(this.getTable()).upsert(dbItems);

    // Xử lý an toàn nếu Supabase chưa có cột allowed_ips hoặc check_out_photo
    if (error && (error.message?.includes('allowed_ips') || error.message?.includes('check_out_photo'))) {
      const strippedItems = dbItems.map((row: any) => {
        const copy = { ...row };
        delete copy.allowed_ips;
        delete copy.check_out_photo;
        return copy;
      });
      const retry = await supabase.from(this.getTable()).upsert(strippedItems);
      if (!retry.error) {
        localStorage.setItem(`tt_fallback_${this.getTable()}`, JSON.stringify(items));
        return;
      }
      error = retry.error;
    }

    if (error) {
      console.error(`Lỗi ghi dữ liệu bảng ${this.getTable()}:`, error.message);
      throw new Error(error.message);
    }
  }

  async getItem<U = T>(key: string): Promise<U | null> {
    const { data, error } = await supabase.from(key).select('*');
    if (error) return null;
    return (data as unknown as U) || null;
  }

  async setItem<U = T>(key: string, value: U): Promise<void> {
    const { error } = await supabase.from(key).upsert(value as any);
    if (error) throw new Error(error.message);
  }

  async removeItem(id: string): Promise<void> {
    const { error } = await supabase.from(this.getTable()).delete().eq('id', id);
    if (error) {
      console.error(`Lỗi xoá bản ghi id ${id} khỏi bảng ${this.getTable()}:`, error.message);
      if (error.message.includes('foreign key constraint') || error.message.includes('violates foreign key')) {
        throw new Error('Ca làm việc này đã có dữ liệu chấm công lịch sử, không thể xoá để đảm bảo tính toàn vẹn dữ liệu.');
      }
      throw new Error(error.message);
    }
    // Dọn dẹp cả trong fallback localStorage
    const fallbackRaw = localStorage.getItem(`tt_fallback_${this.getTable()}`);
    if (fallbackRaw) {
      try {
        const parsed = JSON.parse(fallbackRaw);
        if (Array.isArray(parsed)) {
          localStorage.setItem(
            `tt_fallback_${this.getTable()}`,
            JSON.stringify(parsed.filter((item: any) => item.id !== id)),
          );
        }
      } catch {}
    }
  }
  async clear(): Promise<void> {}

  async getUserAccounts(): Promise<UserAccount[]> {
    const { data, error } = await supabase
      .from('user_accounts')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.warn('Lỗi lấy tài khoản từ Supabase:', error.message);
      return [];
    }
    return (data || []).map((row) => this.mapRowFromDb(row));
  }

  async createUserAccount(accountData: Partial<UserAccount>): Promise<UserAccount> {
    // 1. Tự động đồng bộ chi nhánh vào bảng branches (check error từ Supabase đúng cách)
    if (accountData.branchId) {
      const foundBranch = DEFAULT_BRANCHES.find((b) => b.id === accountData.branchId);
      const { error: bErr } = await supabase.from('branches').upsert({
        id: accountData.branchId,
        name: foundBranch?.name || accountData.branchId,
        address: foundBranch?.address || null,
      });
      if (bErr) {
        console.error('Lỗi đồng bộ branches:', bErr.message);
        throw new Error(`Lỗi đồng bộ chi nhánh: ${bErr.message}`);
      }
    }

    // 2. Nếu có mã nhân viên, đồng bộ vào bảng employees trước để tránh lỗi foreign key
    if (accountData.employeeId && accountData.name) {
      const { error: eErr } = await supabase.from('employees').upsert({
        id: accountData.employeeId,
        name: accountData.name,
        branch_id: accountData.branchId || 'CN_CHO_MOI',
        position: accountData.position || null,
      });
      if (eErr) {
        console.error('Lỗi đồng bộ employees:', eErr.message);
        throw new Error(`Lỗi đồng bộ nhân viên: ${eErr.message}`);
      }
    }

    const payload = this.mapRowToDb({
      ...accountData,
      role: accountData.role || 'employee',
      password: (accountData as any).password || '123456',
      isActive: accountData.isActive ?? true,
    });

    const { data, error } = await supabase.from('user_accounts').insert([payload]).select();
    if (error) {
      console.error('Lỗi tạo tài khoản Supabase:', error);
      throw new Error(error.message || 'Lỗi khi tạo tài khoản trên Supabase');
    }
    return this.mapRowFromDb(data[0]);
  }

  async toggleAccountStatus(usernameOrId: string): Promise<UserAccount> {
    const accounts = await this.getUserAccounts();
    const current = accounts.find((a) => a.username === usernameOrId || a.id === usernameOrId);
    if (!current) throw new Error('Không tìm thấy tài khoản');
    const newStatus = !current.isActive;

    const { data, error } = await supabase
      .from('user_accounts')
      .update({ is_active: newStatus })
      .eq('id', current.id)
      .select();
    if (error) throw new Error(error.message);
    return this.mapRowFromDb(data[0]);
  }

  async updatePassword(usernameOrId: string, newPassword: string): Promise<UserAccount> {
    const accounts = await this.getUserAccounts();
    const current = accounts.find((a) => a.username === usernameOrId || a.id === usernameOrId);
    if (!current) throw new Error('Không tìm thấy tài khoản');

    const { data, error } = await supabase
      .from('user_accounts')
      .update({ password: newPassword })
      .eq('id', current.id)
      .select();
    if (error) throw new Error(error.message);
    return this.mapRowFromDb(data[0]);
  }

  async updateUserAccount(usernameOrId: string, updates: Partial<UserAccount>): Promise<UserAccount> {
    const accounts = await this.getUserAccounts();
    const current = accounts.find((a) => a.username === usernameOrId || a.id === usernameOrId);
    if (!current) throw new Error('Không tìm thấy tài khoản');

    // Đồng bộ chi nhánh nếu có thay đổi
    if (updates.branchId) {
      try {
        const foundBranch = DEFAULT_BRANCHES.find((b) => b.id === updates.branchId);
        await supabase.from('branches').upsert({
          id: updates.branchId,
          name: foundBranch?.name || updates.branchId,
          address: foundBranch?.address || null,
        });
      } catch (bErr) {
        console.warn('Không thể đồng bộ bảng branches khi update:', bErr);
      }
    }

    // Đồng bộ sang bảng employees nếu có mã nhân viên
    if (updates.employeeId && (updates.name || current.name)) {
      try {
        await supabase.from('employees').upsert({
          id: updates.employeeId,
          name: updates.name || current.name,
          branch_id: updates.branchId || current.branchId || 'CN_CHO_MOI',
          position: updates.position || current.position || null,
        });
      } catch (err) {
        console.warn('Không thể đồng bộ bảng employees khi update:', err);
      }
    }

    const payload = this.mapRowToDb({ ...updates });
    delete payload.id; // Không thay đổi primary key

    const { data, error } = await supabase
      .from('user_accounts')
      .update(payload)
      .eq('id', current.id)
      .select();
    if (error) throw new Error(error.message);
    return this.mapRowFromDb(data[0]);
  }

  async deleteUserAccount(usernameOrId: string): Promise<boolean> {
    const accounts = await this.getUserAccounts();
    const current = accounts.find((a) => a.username === usernameOrId || a.id === usernameOrId);
    if (!current) return false;

    const { error } = await supabase.from('user_accounts').delete().eq('id', current.id);
    if (error) throw new Error(error.message);
    return true;
  }
}

const storageMode = import.meta.env.VITE_STORAGE_MODE || 'local';

export const createAdapter = <T = any>(key?: string, defaultData?: any): IStorageAdapter<T> => {
  if (storageMode === 'supabase') {
    return new SupabaseStorageAdapter<T>(key, defaultData);
  }
  return new LocalStorageAdapter<T>(key, defaultData);
};

export const getStorageAdapter = createAdapter;
