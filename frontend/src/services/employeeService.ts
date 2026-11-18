/**
 * employeeService.ts
 * ------------------
 * Nghiệp vụ truy vấn danh sách nhân viên. Hiện tại dữ liệu là seed cố
 * định + LocalStorage, nhưng interface trả về Promise sẵn để tương
 * thích khi thay bằng gọi API thật (không cần sửa nơi gọi).
 */
import type { Employee } from '../types';
import { STORAGE_KEYS, type IStorageAdapter } from './storage/StorageAdapter';
import { createAdapter } from './storage/adapterFactory';
import { DEMO_EMPLOYEE_IDS } from '../constants/employees';
import { getAllAccounts } from './authService';

const adapter: IStorageAdapter<Employee> = createAdapter<Employee>(STORAGE_KEYS.EMPLOYEES, 'employees');

/** Lấy toàn bộ nhân viên thực tế (loại bỏ dữ liệu mẫu demo). */
export async function getEmployees(): Promise<Employee[]> {
  try {
    const accounts = await getAllAccounts();
    const employeeAccounts = accounts.filter((a) => a.role === 'employee' && a.isActive);
    if (employeeAccounts.length > 0) {
      return employeeAccounts.map((a) => ({
        id: a.employeeId || a.username || a.id,
        name: a.name || a.username,
        branchId: a.branchId || 'CN_CHO_MOI',
        position: a.position || 'Nhân viên',
      }));
    }
  } catch (err) {
    console.warn('Không thể nạp danh sách nhân viên từ user_accounts:', err);
  }

  const employees = await adapter.getAll();
  // Loại bỏ các tài khoản nhân viên demo NV001 -> NV008
  const realEmployees = employees.filter((e) => !DEMO_EMPLOYEE_IDS.has(e.id));
  return realEmployees;
}

/** Lấy danh sách nhân viên thuộc một chi nhánh cụ thể. */
export async function getEmployeesByBranch(branchId: string): Promise<Employee[]> {
  const employees = await getEmployees();
  return employees.filter((employee) => employee.branchId === branchId);
}

/** Tìm một nhân viên theo mã số. */
export async function findEmployeeById(employeeId: string): Promise<Employee | undefined> {
  const employees = await getEmployees();
  return employees.find((employee) => employee.id === employeeId);
}

/** Thêm hoặc cập nhật một nhân viên vào danh sách. */
export async function upsertEmployee(employee: Employee): Promise<void> {
  const employees = await getEmployees();
  const index = employees.findIndex((e) => e.id === employee.id);
  let updated: Employee[];
  if (index >= 0) {
    updated = employees.map((e) => (e.id === employee.id ? { ...e, ...employee } : e));
  } else {
    updated = [...employees, employee];
  }
  await adapter.saveAll(updated);
}

/** Xoá một nhân viên khỏi danh sách. */
export async function removeEmployee(employeeId: string): Promise<void> {
  const employees = await getEmployees();
  const filtered = employees.filter((e) => e.id !== employeeId);
  await adapter.saveAll(filtered);
}

/** Dọn dẹp các bản ghi nhân viên mẫu demo cũ còn tồn đọng trong database */
export async function cleanUpDemoEmployees(): Promise<void> {
  try {
    const all = await adapter.getAll();
    const hasDemo = all.some((e) => DEMO_EMPLOYEE_IDS.has(e.id));
    if (hasDemo) {
      const cleaned = all.filter((e) => !DEMO_EMPLOYEE_IDS.has(e.id));
      await adapter.saveAll(cleaned);
    }
  } catch (err) {
    console.warn('Không thể dọn dẹp nhân viên demo:', err);
  }
}

