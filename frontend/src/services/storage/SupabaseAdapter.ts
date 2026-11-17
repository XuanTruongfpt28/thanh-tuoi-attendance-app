import { supabase } from '../supabaseClient';
import type { IStorageAdapter, UserAccount } from './StorageAdapter';

export class SupabaseAdapter<T = any> implements IStorageAdapter<T> {
  private tableName: string;

  constructor(tableName: string = 'user_accounts') {
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
        if (item.role !== undefined) dbObj.role = item.role;
        if (item.employeeId !== undefined) dbObj.employee_id = item.employeeId;
        if (item.name !== undefined) dbObj.name = item.name;
        if (item.branchId !== undefined) dbObj.branch_id = item.branchId;
        if (item.position !== undefined) dbObj.position = item.position;
        if (item.phone !== undefined) dbObj.phone = item.phone;
        if (item.isActive !== undefined) dbObj.is_active = item.isActive;
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
    return (data || []).map((row) => this.mapRowFromDb(row)) as T[];
  }

  async saveAll(items: T[]): Promise<void> {
    if (!items || items.length === 0) return;
    const dbItems = items.map((item) => this.mapRowToDb(item));
    const { error } = await supabase.from(this.getTable()).upsert(dbItems);
    if (error) {
      console.error(`Lỗi ghi dữ liệu bảng ${this.getTable()}:`, error.message);
    }
  }

  async getItem<U = T>(key: string): Promise<U | null> {
    const { data, error } = await supabase.from(key).select('*');
    if (error) return null;
    return (data as unknown as U) || null;
  }

  async setItem<U = T>(key: string, value: U): Promise<void> {
    await supabase.from(key).upsert(value as any);
  }

  async removeItem(_key: string): Promise<void> {}
  async clear(): Promise<void> {}

  async getUserAccounts(): Promise<UserAccount[]> {
    const { data, error } = await supabase
      .from('user_accounts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Lỗi lấy danh sách tài khoản từ Supabase:', error.message);
      return [];
    }
    return (data || []).map((row) => this.mapRowFromDb(row));
  }

  async createUserAccount(accountData: Partial<UserAccount>): Promise<UserAccount> {
    const payload = this.mapRowToDb({
      ...accountData,
      password: (accountData as any).password || '123456',
      isActive: accountData.isActive ?? true,
    });

    const { data, error } = await supabase.from('user_accounts').insert([payload]).select();
    if (error) throw error;
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

    if (error) throw error;
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

    if (error) throw error;
    return this.mapRowFromDb(data[0]);
  }

  async updateUserAccount(usernameOrId: string, updates: Partial<UserAccount>): Promise<UserAccount> {
    const accounts = await this.getUserAccounts();
    const current = accounts.find((a) => a.username === usernameOrId || a.id === usernameOrId);
    if (!current) throw new Error('Không tìm thấy tài khoản');

    const payload = this.mapRowToDb({ ...updates });
    delete payload.id;

    const { data, error } = await supabase
      .from('user_accounts')
      .update(payload)
      .eq('id', current.id)
      .select();

    if (error) throw error;
    return this.mapRowFromDb(data[0]);
  }

  async deleteUserAccount(usernameOrId: string): Promise<boolean> {
    const accounts = await this.getUserAccounts();
    const current = accounts.find((a) => a.username === usernameOrId || a.id === usernameOrId);
    if (!current) return false;

    const { error } = await supabase.from('user_accounts').delete().eq('id', current.id);
    if (error) throw error;
    return true;
  }
}
