import { useState } from 'react';
import { Plus, Trash2, X, Check, AlertCircle, RefreshCw } from 'lucide-react';
import type { ShiftConfig } from '../types';

interface ShiftConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  shifts: ShiftConfig[];
  onAdd: (input: Omit<ShiftConfig, 'id'>) => Promise<void>;
  onEdit: (shiftId: string, changes: Partial<Omit<ShiftConfig, 'id'>>) => Promise<void>;
  onRemove: (shiftId: string) => Promise<void>;
}

const emptyForm: Omit<ShiftConfig, 'id'> = {
  name: '',
  startTime: '08:00',
  endTime: '17:00',
  gracePeriodMinutes: 5,
};

/**
 * Modal cho phép người quản trị tự thêm/sửa/xoá ca làm việc bất cứ lúc
 * nào - đây chính là nơi hiện thực hoá yêu cầu "không hardcode giờ ca".
 */
export function ShiftConfigModal({ isOpen, onClose, shifts, onAdd, onEdit, onRemove }: ShiftConfigModalProps) {
  const [form, setForm] = useState<Omit<ShiftConfig, 'id'>>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!isOpen) return null;

  const startEdit = (shift: ShiftConfig) => {
    setEditingId(shift.id);
    setForm({
      name: shift.name,
      startTime: shift.startTime,
      endTime: shift.endTime,
      gracePeriodMinutes: shift.gracePeriodMinutes,
    });
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    setIsSubmitting(true);
    setNotice(null);
    try {
      if (editingId) {
        await onEdit(editingId, form);
        setNotice({ type: 'success', message: 'Đã cập nhật ca làm việc thành công!' });
      } else {
        await onAdd(form);
        setNotice({ type: 'success', message: 'Đã thêm ca làm việc mới thành công!' });
      }
      resetForm();
      setTimeout(() => setNotice(null), 3000);
    } catch (err: any) {
      setNotice({ type: 'error', message: err?.message || 'Có lỗi xảy ra khi lưu ca.' });
      setTimeout(() => setNotice(null), 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (shift: ShiftConfig) => {
    const ok = window.confirm(`Bạn có chắc chắn muốn xoá ca "${shift.name}" không?`);
    if (!ok) return;

    setIsDeletingId(shift.id);
    setNotice(null);
    try {
      await onRemove(shift.id);
      setNotice({ type: 'success', message: `Đã xoá ca "${shift.name}" thành công!` });
      setTimeout(() => setNotice(null), 3000);
    } catch (err: any) {
      setNotice({ type: 'error', message: err?.message || 'Không thể xoá ca làm việc.' });
      setTimeout(() => setNotice(null), 5000);
    } finally {
      setIsDeletingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-2xl rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between border-b border-[var(--color-border)] pb-3">
          <h2 className="font-display text-lg font-bold text-[var(--color-ink)]">Cấu hình ca làm việc</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--color-ink-soft)] hover:bg-black/5 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Thông báo kết quả thao tác */}
        {notice && (
          <div
            className={`mb-4 flex items-center gap-2 rounded-xl p-3 text-xs font-medium ${
              notice.type === 'success'
                ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border border-red-200 bg-red-50 text-red-800'
            }`}
          >
            {notice.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
            <span>{notice.message}</span>
          </div>
        )}

        {/* Danh sách ca hiện có */}
        <div className="mb-5 max-h-56 space-y-2 overflow-y-auto pr-1">
          {shifts.map((shift) => {
            const isDeleting = isDeletingId === shift.id;
            return (
              <div
                key={shift.id}
                className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2.5 transition-all"
              >
                <div>
                  <p className="text-sm font-semibold text-[var(--color-ink)]">{shift.name}</p>
                  <p className="text-xs text-[var(--color-ink-soft)]">
                    {shift.startTime} – {shift.endTime} · Trễ cho phép {shift.gracePeriodMinutes} phút
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => startEdit(shift)}
                    disabled={isDeleting}
                    className="rounded-lg px-2.5 py-1 text-xs font-medium text-[var(--color-primary-dark)] hover:bg-[var(--color-primary)]/10 cursor-pointer disabled:opacity-50"
                  >
                    Sửa
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(shift)}
                    disabled={isDeleting}
                    title="Xoá ca này"
                    className="rounded-lg p-1.5 text-red-600 hover:bg-red-50 cursor-pointer disabled:opacity-50 transition-colors"
                  >
                    {isDeleting ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={15} />}
                  </button>
                </div>
              </div>
            );
          })}
          {shifts.length === 0 && (
            <p className="py-6 text-center text-sm text-[var(--color-ink-soft)]">Chưa có ca làm việc nào.</p>
          )}
        </div>

        {/* Form thêm mới / chỉnh sửa */}
        <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg)]/50 p-4">
          <p className="mb-3 text-sm font-bold text-[var(--color-ink)]">
            {editingId ? 'Chỉnh sửa ca' : 'Thêm ca mới'}
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Tên ca (vd: Ca Sáng)"
              className="col-span-2 rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)] sm:col-span-1"
            />
            <input
              type="time"
              value={form.startTime}
              onChange={(e) => setForm({ ...form, startTime: e.target.value })}
              className="rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
            />
            <input
              type="time"
              value={form.endTime}
              onChange={(e) => setForm({ ...form, endTime: e.target.value })}
              className="rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
            />
            <input
              type="number"
              min={0}
              value={form.gracePeriodMinutes}
              onChange={(e) => setForm({ ...form, gracePeriodMinutes: Number(e.target.value) })}
              placeholder="Phút trễ"
              className="rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
            />
          </div>
          <div className="mt-3 flex justify-end gap-2">
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                disabled={isSubmitting}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-[var(--color-ink-soft)] hover:bg-black/5 cursor-pointer"
              >
                Huỷ
              </button>
            )}
            <button
              type="button"
              disabled={isSubmitting || !form.name.trim()}
              onClick={handleSubmit}
              className="flex items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-4 py-2 text-xs font-bold text-white hover:bg-[var(--color-primary-dark)] disabled:opacity-50 cursor-pointer shadow-xs"
            >
              <Plus size={15} />
              <span>{editingId ? (isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi') : (isSubmitting ? 'Đang thêm...' : 'Thêm ca')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
