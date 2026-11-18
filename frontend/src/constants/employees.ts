import type { Employee } from '../types';

/**
 * Danh sách nhân viên mặc định (để trống khi triển khai dùng thật,
 * nhân viên sẽ được tạo từ mục Quản lý tài khoản con).
 */
export const DEFAULT_EMPLOYEES: Employee[] = [];

/** Danh sách ID nhân viên mẫu cũ cần loại bỏ khi chuyển sang dùng thật */
export const DEMO_EMPLOYEE_IDS = new Set([
  'NV001',
  'NV002',
  'NV003',
  'NV004',
  'NV005',
  'NV006',
  'NV007',
  'NV008',
]);
