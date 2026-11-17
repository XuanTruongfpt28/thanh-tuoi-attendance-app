import { useMemo, useState } from 'react';
import { Search, Camera, X } from 'lucide-react';
import type { AttendanceRecord, ShiftConfig } from '../types';
import { DEFAULT_BRANCHES } from '../constants/branches';
import { formatMinutesToReadable } from '../utils/timeUtils';
import { StatusBadge } from './StatusBadge';

type StatusFilterValue = 'all' | 'on_time' | 'late' | 'early_leave' | 'in_progress';

const STATUS_OPTIONS: { value: StatusFilterValue; label: string }[] = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'in_progress', label: 'Đang có mặt' },
  { value: 'on_time', label: 'Đúng giờ' },
  { value: 'late', label: 'Đi muộn' },
  { value: 'early_leave', label: 'Về sớm' },
];

interface AttendanceTableProps {
  records: AttendanceRecord[];
  shifts: ShiftConfig[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onNoteChange: (recordId: string, note: string) => void;
}

const branchNameById = new Map(DEFAULT_BRANCHES.map((b) => [b.id, b.name]));

/** Bảng chấm công realtime: tìm kiếm theo tên/mã NV, lọc trạng thái, ghi chú lý do. */
export function AttendanceTable({
  records,
  shifts,
  searchTerm,
  onSearchChange,
  onNoteChange,
}: AttendanceTableProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>('all');
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; title: string } | null>(null);
  const shiftNameById = useMemo(() => new Map(shifts.map((s) => [s.id, s.name])), [shifts]);

  const visibleRecords = useMemo(() => {
    if (statusFilter === 'all') return records;
    return records.filter((record) => {
      if (statusFilter === 'in_progress') return !record.checkOutTime;
      if (statusFilter === 'late') return record.checkInStatus === 'late';
      if (statusFilter === 'early_leave') return record.checkOutStatus === 'early_leave';
      if (statusFilter === 'on_time') return record.checkInStatus === 'on_time';
      return true;
    });
  }, [records, statusFilter]);

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="flex flex-col gap-3 border-b border-[var(--color-border)] p-4 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex flex-1 items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 sm:max-w-xs">
          <Search size={16} className="text-[var(--color-ink-soft)]" />
          <input
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm theo tên hoặc mã NV..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--color-ink-soft)]"
          />
        </label>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilterValue)}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-ink)] outline-none"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-xs uppercase tracking-wide text-[var(--color-ink-soft)]">
              <th className="px-4 py-3 font-medium normal-case">Nhân viên</th>
              <th className="px-4 py-3 font-medium normal-case">Chi nhánh</th>
              <th className="px-4 py-3 font-medium normal-case">Ca</th>
              <th className="px-4 py-3 font-medium normal-case">Vào ca</th>
              <th className="px-4 py-3 font-medium normal-case">Tan ca</th>
              <th className="px-4 py-3 font-medium normal-case">Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            {visibleRecords.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-[var(--color-ink-soft)]">
                  Không có dữ liệu điểm danh phù hợp.
                </td>
              </tr>
            )}
            {visibleRecords.map((record) => (
              <tr key={record.id} className="border-b border-[var(--color-border)] last:border-0">
                <td className="px-4 py-3">
                  <p className="font-medium text-[var(--color-ink)]">{record.employeeName}</p>
                  <p className="text-xs text-[var(--color-ink-soft)]">{record.employeeId}</p>
                </td>
                <td className="px-4 py-3 text-[var(--color-ink-soft)]">
                  {branchNameById.get(record.branchId) ?? record.branchId}
                </td>
                <td className="px-4 py-3 text-[var(--color-ink-soft)]">
                  {shiftNameById.get(record.shiftId) ?? record.shiftId}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[var(--color-ink)]">{record.checkInTime ?? '—'}</p>
                    {record.checkInPhoto && (
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewPhoto({
                            url: record.checkInPhoto!,
                            title: `Ảnh Check-in: ${record.employeeName} (${record.checkInTime})`,
                          })
                        }
                        className="inline-flex items-center gap-0.5 rounded-md bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-100 cursor-pointer"
                        title="Bấm xem ảnh check-in"
                      >
                        <Camera size={11} />
                        <span>Ảnh</span>
                      </button>
                    )}
                  </div>
                  {record.checkInStatus === 'late' && (
                    <StatusBadge tone="amber">Trễ {formatMinutesToReadable(record.lateMinutes ?? 0)}</StatusBadge>
                  )}
                  {record.checkInStatus === 'on_time' && <StatusBadge tone="primary">Đúng giờ</StatusBadge>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[var(--color-ink)]">{record.checkOutTime ?? '—'}</p>
                    {record.checkOutPhoto && (
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewPhoto({
                            url: record.checkOutPhoto!,
                            title: `Ảnh Check-out: ${record.employeeName} (${record.checkOutTime})`,
                          })
                        }
                        className="inline-flex items-center gap-0.5 rounded-md bg-blue-50 border border-blue-200 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 hover:bg-blue-100 cursor-pointer"
                        title="Bấm xem ảnh check-out"
                      >
                        <Camera size={11} />
                        <span>Ảnh</span>
                      </button>
                    )}
                  </div>
                  {record.checkOutStatus === 'early_leave' && (
                    <StatusBadge tone="red">
                      Về sớm {formatMinutesToReadable(record.earlyLeaveMinutes ?? 0)}
                    </StatusBadge>
                  )}
                  {record.checkOutStatus === 'overtime' && (
                    <StatusBadge tone="blue">
                      Tăng ca {formatMinutesToReadable(record.overtimeMinutes ?? 0)}
                    </StatusBadge>
                  )}
                  {record.checkOutStatus === 'on_time' && <StatusBadge tone="primary">Đúng giờ</StatusBadge>}
                  {!record.checkOutTime && <StatusBadge tone="neutral">Đang có mặt</StatusBadge>}
                </td>
                <td className="px-4 py-3">
                  <input
                    defaultValue={record.note ?? ''}
                    onBlur={(e) => {
                      if (e.target.value !== (record.note ?? '')) {
                        onNoteChange(record.id, e.target.value);
                      }
                    }}
                    placeholder="Thêm ghi chú..."
                    className="w-40 rounded-md border border-transparent bg-transparent px-2 py-1 text-sm outline-none hover:border-[var(--color-border)] focus:border-[var(--color-primary)] focus:bg-[var(--color-bg)]"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL XEM ẢNH ĐIỂM DANH */}
      {previewPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          onClick={() => setPreviewPhoto(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
              <h3 className="font-display text-sm font-bold text-[var(--color-ink)]">
                {previewPhoto.title}
              </h3>
              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                className="rounded-lg p-1.5 text-[var(--color-ink-soft)] hover:bg-[var(--color-bg)] cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-black">
              <img
                src={previewPhoto.url}
                alt="Ảnh điểm danh"
                className="h-80 w-full object-cover"
              />
            </div>

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                className="rounded-xl bg-zinc-800 px-5 py-2 text-xs font-semibold text-white hover:bg-black cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
