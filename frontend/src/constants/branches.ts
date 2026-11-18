import type { Branch } from '../types';

/**
 * Danh sách 5 chi nhánh chính thức của chuỗi cửa hàng Xe Điện Thanh Tươi.
 */
export const DEFAULT_BRANCHES: Branch[] = [
  { id: 'CN_CHO_MOI', name: 'Cửa hàng Chợ Mới' },
  { id: 'CN_LAP_VO', name: 'Cửa hàng Lấp Vò' },
  { id: 'CN_LAP_VO_5', name: 'Cửa hàng Lấp Vò 5' },
  { id: 'CN_MY_LUONG_3', name: 'Cửa hàng Mỹ Luông 3' },
  { id: 'CN_MY_LUONG_4', name: 'Cửa hàng Mỹ Luông 4' },
];

/** Giá trị đặc biệt dùng cho bộ lọc "Tất cả chi nhánh" */
export const ALL_BRANCHES_FILTER = 'ALL';
