import { useEffect, useState } from 'react';
import { Wifi, X, Plus, Trash2, Check, RefreshCw, AlertCircle, ShieldCheck } from 'lucide-react';
import type { Branch } from '../types';
import { getBranches, updateBranchAllowedIps } from '../services/branchService';
import { getPublicIp, clearIpCache } from '../services/ipService';

interface BranchWifiModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BranchWifiModal({ isOpen, onClose }: BranchWifiModalProps) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [currentIp, setCurrentIp] = useState<string>('');
  const [isDetectingIp, setIsDetectingIp] = useState(false);
  const [newIpInputs, setNewIpInputs] = useState<Record<string, string>>({});
  const [savingBranchId, setSavingBranchId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Nạp danh sách chi nhánh và IP hiện tại
  useEffect(() => {
    if (!isOpen) return;
    loadData();
  }, [isOpen]);

  const loadData = async () => {
    try {
      const list = await getBranches();
      setBranches(list);
    } catch (err) {
      console.error('Lỗi nạp chi nhánh:', err);
    }
    detectCurrentIp();
  };

  const detectCurrentIp = async () => {
    setIsDetectingIp(true);
    try {
      clearIpCache();
      const ip = await getPublicIp();
      setCurrentIp(ip);
    } catch {
      setCurrentIp('Không xác định được');
    } finally {
      setIsDetectingIp(false);
    }
  };

  if (!isOpen) return null;

  const handleAddIp = async (branchId: string, ipToAdd: string) => {
    const cleanIp = ipToAdd.trim();
    if (!cleanIp) return;

    const branch = branches.find((b) => b.id === branchId);
    if (!branch) return;

    const currentList = branch.allowedIps || [];
    if (currentList.includes(cleanIp)) {
      setNotice({ type: 'error', message: `IP ${cleanIp} đã tồn tại trong danh sách.` });
      setTimeout(() => setNotice(null), 3000);
      return;
    }

    const updatedList = [...currentList, cleanIp];
    await saveBranchIps(branchId, updatedList);

    // Xoá input
    setNewIpInputs((prev) => ({ ...prev, [branchId]: '' }));
  };

  const handleRemoveIp = async (branchId: string, ipToRemove: string) => {
    const branch = branches.find((b) => b.id === branchId);
    if (!branch) return;

    const updatedList = (branch.allowedIps || []).filter((ip) => ip !== ipToRemove);
    await saveBranchIps(branchId, updatedList);
  };

  const saveBranchIps = async (branchId: string, allowedIps: string[]) => {
    setSavingBranchId(branchId);
    try {
      const updated = await updateBranchAllowedIps(branchId, allowedIps);
      setBranches((prev) => prev.map((b) => (b.id === branchId ? updated : b)));
      setNotice({ type: 'success', message: 'Đã cập nhật danh sách IP WiFi thành công!' });
      setTimeout(() => setNotice(null), 3000);
    } catch (err: any) {
      setNotice({ type: 'error', message: err?.message || 'Lỗi khi lưu IP' });
      setTimeout(() => setNotice(null), 4000);
    } finally {
      setSavingBranchId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary)] text-white shadow-xs">
              <Wifi size={20} />
            </span>
            <div>
              <h2 className="font-display text-base font-bold text-[var(--color-ink)] sm:text-lg">
                Cài đặt IP WiFi các chi nhánh
              </h2>
              <p className="text-xs text-[var(--color-ink-soft)]">
                Chặn 4G & WiFi lạ — Chỉ cho phép nhân viên check-in/out tại đúng WiFi cửa hàng
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[var(--color-ink-soft)] hover:bg-[var(--color-bg)]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Thông báo */}
        {notice && (
          <div
            className={`mt-4 flex items-center gap-2 rounded-xl p-3 text-xs font-medium ${
              notice.type === 'success'
                ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border border-red-200 bg-red-50 text-red-800'
            }`}
          >
            {notice.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
            <span>{notice.message}</span>
          </div>
        )}

        {/* IP Hiện Tại Đang Kết Nối */}
        <div className="mt-4 flex flex-col gap-2 rounded-2xl border border-blue-200 bg-blue-50/60 p-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldCheck size={18} className="text-blue-600 shrink-0" />
            <div>
              <div className="text-xs font-semibold text-blue-900">
                IP WiFi thiết bị của bạn đang kết nối:
              </div>
              <div className="font-mono text-sm font-bold text-blue-700">
                {isDetectingIp ? 'Đang kiểm tra...' : currentIp || 'Chưa xác định'}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={detectCurrentIp}
            disabled={isDetectingIp}
            className="flex items-center gap-1.5 self-start rounded-xl border border-blue-200 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50 sm:self-auto cursor-pointer"
          >
            <RefreshCw size={13} className={isDetectingIp ? 'animate-spin' : ''} />
            <span>Kiểm tra lại IP</span>
          </button>
        </div>

        {/* Danh sách từng chi nhánh */}
        <div className="mt-4 flex-1 space-y-4 overflow-y-auto pr-1">
          {branches.map((branch) => {
            const allowedIps = branch.allowedIps || [];
            const inputVal = newIpInputs[branch.id] || '';
            const isSaving = savingBranchId === branch.id;

            return (
              <div
                key={branch.id}
                className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-[var(--color-ink)]">{branch.name}</h3>
                    <p className="text-[11px] text-[var(--color-ink-soft)]">Mã: {branch.id}</p>
                  </div>
                  {allowedIps.length === 0 ? (
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-semibold text-amber-800">
                      Chưa giới hạn IP (Mọi mạng đều được)
                    </span>
                  ) : (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                      Đã khoá ({allowedIps.length} IP WiFi)
                    </span>
                  )}
                </div>

                {/* Danh sách IP được phép */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {allowedIps.length === 0 ? (
                    <p className="text-xs italic text-[var(--color-ink-soft)]">
                      Chưa có IP nào. Vui lòng thêm IP WiFi của chi nhánh này để kích hoạt tính năng khoá mạng.
                    </p>
                  ) : (
                    allowedIps.map((ip) => (
                      <span
                        key={ip}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-3 py-1 font-mono text-xs font-bold text-emerald-800 shadow-2xs"
                      >
                        <Wifi size={12} className="text-emerald-600" />
                        <span>{ip}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveIp(branch.id, ip)}
                          disabled={isSaving}
                          title="Xoá IP này"
                          className="ml-1 rounded-md p-0.5 text-zinc-400 hover:bg-red-50 hover:text-red-600 cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </span>
                    ))
                  )}
                </div>

                {/* Công cụ thêm IP */}
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[var(--color-border)] pt-3">
                  {/* Nút 1-click gán IP hiện tại */}
                  {currentIp && currentIp !== 'Không xác định được' && !allowedIps.includes(currentIp) && (
                    <button
                      type="button"
                      onClick={() => handleAddIp(branch.id, currentIp)}
                      disabled={isSaving}
                      className="flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50 cursor-pointer"
                    >
                      <Plus size={14} />
                      <span>Thêm IP hiện tại ({currentIp})</span>
                    </button>
                  )}

                  {/* Nhập IP thủ công */}
                  <div className="flex flex-1 items-center gap-1.5 min-w-[200px]">
                    <input
                      type="text"
                      value={inputVal}
                      onChange={(e) =>
                        setNewIpInputs((prev) => ({ ...prev, [branch.id]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddIp(branch.id, inputVal);
                        }
                      }}
                      placeholder="Nhập IP thủ công (vd: 113.161.45.12)..."
                      className="flex-1 rounded-xl border border-[var(--color-border)] bg-white px-3 py-1.5 font-mono text-xs text-[var(--color-ink)] outline-none focus:border-[var(--color-primary)]"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddIp(branch.id, inputVal)}
                      disabled={!inputVal.trim() || isSaving}
                      className="flex items-center gap-1 rounded-xl bg-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--color-primary-dark)] disabled:opacity-40 cursor-pointer"
                    >
                      <Plus size={14} />
                      <span>Thêm</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between border-t border-[var(--color-border)] pt-4">
          <p className="text-[11px] text-[var(--color-ink-soft)]">
            💡 Mẹo: Quản lý đứng tại từng cửa hàng, kết nối vào WiFi của cửa hàng rồi bấm "Thêm IP hiện tại" là xong!
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-zinc-800 px-5 py-2 text-xs font-semibold text-white hover:bg-black cursor-pointer"
          >
            Hoàn tất
          </button>
        </div>
      </div>
    </div>
  );
}
