/**
 * ipService.ts
 * ------------
 * Lấy địa chỉ IP public của thiết bị đang truy cập.
 * Dùng để kiểm tra nhân viên có đang kết nối WiFi nội bộ chi nhánh không.
 */

/** Cache IP trong session để không gọi API liên tục */
let cachedIp: string | null = null;

/**
 * Lấy IP public hiện tại của thiết bị.
 * Thử nhiều API miễn phí để đảm bảo tính khả dụng.
 */
export async function getPublicIp(): Promise<string> {
  if (cachedIp) return cachedIp;

  const apis = [
    'https://api.ipify.org?format=json',
    'https://api64.ipify.org?format=json',
    'https://ipapi.co/json/',
  ];

  for (const url of apis) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) continue;
      const data = await res.json();
      const ip = data.ip;
      if (ip) {
        cachedIp = ip;
        return ip;
      }
    } catch {
      // Thử API tiếp theo
    }
  }

  throw new Error('Không thể xác định địa chỉ IP. Vui lòng kiểm tra kết nối mạng.');
}

/** Xoá cache IP (khi cần check lại, ví dụ khi đổi mạng) */
export function clearIpCache(): void {
  cachedIp = null;
}

/**
 * Kiểm tra IP hiện tại có nằm trong danh sách IP được phép không.
 * Nếu danh sách rỗng hoặc undefined → cho phép tất cả (chưa cấu hình).
 */
export async function isIpAllowed(allowedIps?: string[]): Promise<{
  allowed: boolean;
  currentIp: string;
}> {
  if (!allowedIps || allowedIps.length === 0) {
    // Chưa cấu hình IP → cho phép tất cả
    return { allowed: true, currentIp: 'không kiểm tra' };
  }

  const currentIp = await getPublicIp();
  const allowed = allowedIps.includes(currentIp);
  return { allowed, currentIp };
}
