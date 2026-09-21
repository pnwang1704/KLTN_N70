import React, { useState, useEffect } from 'react';
import {
  Clock,
  Plus,
  Edit2,
  Power,
  X,
  AlertCircle,
  Loader2,
  Building2,
  CheckCircle2,
  Save,
  RotateCcw,
  ChevronDown,
} from 'lucide-react';
import api from '../lib/axios';

export interface ShiftData {
  id: string;
  branchId?: string | null;
  code: string;
  name: string;
  startTime: string;
  endTime: string;
  gracePeriodMinutes: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface Time24PickerProps {
  label: string;
  required?: boolean;
  value: string; // Format "HH:mm" (00:00 - 23:59)
  onChange: (val: string) => void;
  helperText?: string;
}

const Time24Picker: React.FC<Time24PickerProps> = ({
  label,
  required,
  value,
  onChange,
  helperText,
}) => {
  const [h = '00', m = '00'] = (value || '00:00').split(':');
  const currentHour = h.padStart(2, '0');
  const currentMinute = m.padStart(2, '0');

  const handleHourChange = (newHour: string) => {
    onChange(`${newHour.padStart(2, '0')}:${currentMinute}`);
  };

  const handleMinuteChange = (newMinute: string) => {
    onChange(`${currentHour}:${newMinute.padStart(2, '0')}`);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="font-bold text-zinc-700 text-xs">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
        <span className="font-mono font-extrabold text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-lg text-[11px]">
          {currentHour}:{currentMinute} ({Number(currentHour)}h{currentMinute !== '00' ? `${currentMinute}p` : ''})
        </span>
      </div>

      <div className="flex items-center gap-1.5 bg-white border border-zinc-200 rounded-xl p-1.5 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-100 transition-all">
        <Clock size={15} className="text-zinc-400 shrink-0 ml-1.5" />

        {/* Giờ: 00 - 23 */}
        <div className="flex-1 relative">
          <select
            value={currentHour}
            onChange={e => handleHourChange(e.target.value)}
            className="w-full bg-zinc-50 border border-zinc-200/80 rounded-lg pl-2 pr-6 py-1.5 text-xs font-bold text-zinc-800 focus:outline-none focus:bg-white focus:border-orange-500 cursor-pointer appearance-none transition-colors"
          >
            {Array.from({ length: 24 }, (_, i) => {
              const val = String(i).padStart(2, '0');
              return (
                <option key={val} value={val}>
                  {val} giờ ({i}h)
                </option>
              );
            })}
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
        </div>

        <span className="font-extrabold text-zinc-400 text-sm">:</span>

        {/* Phút: 00 - 59 */}
        <div className="flex-1 relative">
          <select
            value={currentMinute}
            onChange={e => handleMinuteChange(e.target.value)}
            className="w-full bg-zinc-50 border border-zinc-200/80 rounded-lg pl-2 pr-6 py-1.5 text-xs font-bold text-zinc-800 focus:outline-none focus:bg-white focus:border-orange-500 cursor-pointer appearance-none transition-colors"
          >
            {Array.from({ length: 60 }, (_, i) => {
              const val = String(i).padStart(2, '0');
              return (
                <option key={val} value={val}>
                  {val} phút
                </option>
              );
            })}
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
        </div>
      </div>

      {/* Phím chọn nhanh phút */}
      <div className="flex items-center gap-1 mt-1.5 flex-wrap">
        <span className="text-[10px] text-zinc-400 font-medium mr-0.5">Phút nhanh:</span>
        {['00', '15', '30', '45', '59'].map(minVal => (
          <button
            key={minVal}
            type="button"
            onClick={() => handleMinuteChange(minVal)}
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
              currentMinute === minVal
                ? 'bg-orange-500 text-white shadow-xs'
                : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600'
            }`}
          >
            :{minVal}
          </button>
        ))}
      </div>

      {helperText && <p className="text-[10px] text-zinc-400 mt-1">{helperText}</p>}
    </div>
  );
};

interface ShiftManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
}

export const ShiftManagementModal: React.FC<ShiftManagementModalProps> = ({
  isOpen,
  onClose,
  user,
}) => {
  const [shifts, setShifts] = useState<ShiftData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Form state
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    startTime: '06:00',
    endTime: '14:00',
    gracePeriodMinutes: 15,
    isGlobal: true,
  });

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => {
      setToastMsg(null);
    }, 3000);
  };

  const fetchShifts = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.get('/shifts', {
        params: { branchId: user?.branchId },
      });
      if (Array.isArray(res.data)) {
        setShifts(res.data);
      }
    } catch (err: any) {
      console.error('Lỗi khi tải danh sách ca làm việc:', err);
      setErrorMsg(err.response?.data?.message || 'Không thể tải danh sách ca làm việc');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchShifts();
      setIsFormOpen(false);
      setEditingShiftId(null);
    }
  }, [isOpen]);

  const handleOpenCreate = () => {
    setEditingShiftId(null);
    setFormData({
      code: '',
      name: '',
      startTime: '06:00',
      endTime: '14:00',
      gracePeriodMinutes: 15,
      isGlobal: user?.role === 'ADMIN',
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (shift: ShiftData) => {
    setEditingShiftId(shift.id);
    setFormData({
      code: shift.code,
      name: shift.name,
      startTime: shift.startTime,
      endTime: shift.endTime,
      gracePeriodMinutes: shift.gracePeriodMinutes || 15,
      isGlobal: !shift.branchId,
    });
    setIsFormOpen(true);
  };

  const handleToggleStatus = async (shift: ShiftData) => {
    try {
      const res = await api.patch(`/shifts/${shift.id}/toggle`);
      const updated = res.data;
      setShifts(prev => prev.map(s => (s.id === shift.id ? updated : s)));
      showToast(
        updated.isActive
          ? `Đã kích hoạt ca '${updated.name}'`
          : `Đã tạm ngưng ca '${updated.name}'`,
        'success'
      );
    } catch (err: any) {
      console.error('Lỗi khi bật/tắt trạng thái ca:', err);
      showToast(err.response?.data?.message || 'Không thể thay đổi trạng thái ca', 'error');
    }
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim() || !formData.name.trim()) {
      showToast('Vui lòng nhập đầy đủ mã và tên ca làm việc', 'error');
      return;
    }

    setFormSubmitting(true);
    try {
      const payload: any = {
        code: formData.code.trim().toUpperCase(),
        name: formData.name.trim(),
        startTime: formData.startTime,
        endTime: formData.endTime,
        gracePeriodMinutes: Number(formData.gracePeriodMinutes) || 15,
        branchId: formData.isGlobal ? null : (user?.branchId || '1'),
      };

      if (editingShiftId) {
        const res = await api.put(`/shifts/${editingShiftId}`, payload);
        const updated = res.data;
        setShifts(prev => prev.map(s => (s.id === editingShiftId ? updated : s)));
        showToast(`Cập nhật ca '${updated.name}' thành công!`, 'success');
      } else {
        const res = await api.post('/shifts', payload);
        const created = res.data;
        setShifts(prev => [...prev, created].sort((a, b) => a.startTime.localeCompare(b.startTime)));
        showToast(`Tạo mới ca '${created.name}' thành công!`, 'success');
      }

      setIsFormOpen(false);
      setEditingShiftId(null);
    } catch (err: any) {
      console.error('Lỗi khi lưu ca làm việc:', err);
      showToast(err.response?.data?.message || 'Lỗi khi lưu ca làm việc', 'error');
    } finally {
      setFormSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl border border-zinc-200 max-h-[92vh] flex flex-col relative">
        {/* Toast Alert */}
        {toastMsg && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-3 duration-200">
            <div
              className={`px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-bold border ${toastMsg.type === 'success'
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-600/25'
                  : 'bg-rose-600 text-white border-rose-500 shadow-rose-600/25'
                }`}
            >
              {toastMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{toastMsg.text}</span>
            </div>
          </div>
        )}

        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-orange-600 to-amber-600 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
              <Clock size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">Quản Lý Khung Giờ Ca Làm Việc</h2>
              <p className="text-orange-100 text-xs">
                Cấu hình giờ chuẩn, thời gian ân hạn và trạng thái ca trực của chi nhánh
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* Action Bar */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-zinc-500 font-medium">
              <Building2 size={15} className="text-orange-500" />
              <span>
                Phạm vi áp dụng: <strong className="text-zinc-800">Chi nhánh {user?.branchId || 1} & Toàn chuỗi</strong>
              </span>
            </div>

            {!isFormOpen && (
              <button
                type="button"
                onClick={handleOpenCreate}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm shadow-orange-600/20 transition-all cursor-pointer"
              >
                <Plus size={15} />
                <span>Thêm ca làm việc mới</span>
              </button>
            )}
          </div>

          {/* Form Create / Edit Section */}
          {isFormOpen && (
            <form onSubmit={handleSubmitForm} className="bg-orange-50/50 border border-orange-200/80 rounded-2xl p-5 space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-orange-200/60 pb-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-orange-900 flex items-center gap-2">
                  <Edit2 size={14} className="text-orange-600" />
                  <span>{editingShiftId ? 'Chỉnh sửa ca làm việc' : 'Tạo ca làm việc mới'}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="text-xs text-zinc-400 hover:text-zinc-700 font-semibold"
                >
                  Đóng form
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Mã ca */}
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">
                    Mã ca làm việc <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: CA_1, CA_TOI, CA_NGAY"
                    value={formData.code}
                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl font-bold uppercase text-zinc-800 focus:outline-none focus:border-orange-500 transition-all"
                  />
                  <p className="text-[10px] text-zinc-400 mt-1">Mã duy nhất viết liền, không dấu</p>
                </div>

                {/* Tên ca */}
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">
                    Tên hiển thị <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Ca Sáng (06:00 - 14:00)"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl font-semibold text-zinc-800 focus:outline-none focus:border-orange-500 transition-all"
                  />
                  <p className="text-[10px] text-zinc-400 mt-1">Tên ca hiển thị cho thu ngân</p>
                </div>

                {/* Giờ bắt đầu */}
                <Time24Picker
                  label="Giờ bắt đầu"
                  required
                  value={formData.startTime}
                  onChange={val => setFormData({ ...formData, startTime: val })}
                  helperText="Khung 24 giờ: 00:00 đến 23:59"
                />

                {/* Giờ kết thúc */}
                <Time24Picker
                  label="Giờ kết thúc"
                  required
                  value={formData.endTime}
                  onChange={val => setFormData({ ...formData, endTime: val })}
                  helperText="Khung 24 giờ: 00:00 đến 23:59"
                />

                {/* Thời gian ân hạn */}
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">
                    Thời gian ân hạn đi trễ (Phút)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={120}
                    value={formData.gracePeriodMinutes}
                    onChange={e => setFormData({ ...formData, gracePeriodMinutes: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl font-bold text-zinc-800 focus:outline-none focus:border-orange-500 transition-all"
                  />
                  <p className="text-[10px] text-zinc-400 mt-1">Mặc định: 15 phút</p>
                </div>

                {/* Phạm vi áp dụng (Chỉ Admin mới có quyền chọn toàn chuỗi) */}
                {user?.role === 'ADMIN' && (
                  <div className="flex items-center gap-2 pt-5">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-zinc-700">
                      <input
                        type="checkbox"
                        checked={formData.isGlobal}
                        onChange={e => setFormData({ ...formData, isGlobal: e.target.checked })}
                        className="w-4 h-4 text-orange-600 rounded border-zinc-300 focus:ring-orange-500"
                      />
                      <span>Áp dụng chung toàn hệ thống (Toàn chuỗi)</span>
                    </label>
                  </div>
                )}
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-orange-200/60">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 bg-white border border-zinc-200 hover:bg-zinc-100 rounded-xl text-xs font-bold text-zinc-600 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-orange-600/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {formSubmitting ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Save size={14} />
                  )}
                  <span>{editingShiftId ? 'Lưu thay đổi' : 'Tạo ca làm'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Table List */}
          <div className="border border-zinc-200 rounded-2xl overflow-hidden shadow-xs">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-zinc-400 text-xs">
                <Loader2 size={24} className="animate-spin text-orange-500" />
                <span>Đang tải danh sách ca làm việc...</span>
              </div>
            ) : errorMsg ? (
              <div className="py-8 text-center text-rose-500 text-xs space-y-2">
                <AlertCircle size={20} className="mx-auto" />
                <p>{errorMsg}</p>
                <button
                  type="button"
                  onClick={fetchShifts}
                  className="inline-flex items-center gap-1 text-xs text-orange-600 font-bold underline"
                >
                  <RotateCcw size={12} />
                  Thử lại
                </button>
              </div>
            ) : shifts.length === 0 ? (
              <div className="py-12 text-center text-zinc-400 text-xs space-y-2">
                <Clock size={28} className="mx-auto text-zinc-300" />
                <p>Chưa có ca làm việc nào được cấu hình</p>
                <button
                  type="button"
                  onClick={handleOpenCreate}
                  className="text-xs text-orange-600 font-bold hover:underline"
                >
                  + Thêm ca làm việc đầu tiên
                </button>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Mã ca</th>
                    <th className="py-3 px-4">Tên ca làm việc</th>
                    <th className="py-3 px-4">Khung giờ (Bắt đầu - Kết thúc)</th>
                    <th className="py-3 px-4 text-center">Ân hạn</th>
                    <th className="py-3 px-4 text-center">Phạm vi</th>
                    <th className="py-3 px-4 text-center">Trạng thái</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {shifts.map(shift => (
                    <tr key={shift.id} className="hover:bg-zinc-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-zinc-800">
                        {shift.code}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-zinc-900">
                        {shift.name}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-orange-700">
                        <span className="bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-lg">
                          {shift.startTime} - {shift.endTime}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center text-zinc-600 font-medium">
                        {shift.gracePeriodMinutes} phút
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {shift.branchId ? (
                          <span className="text-[10px] font-bold text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded-full">
                            CN {shift.branchId}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                            Toàn chuỗi
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {shift.isActive ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Hoạt động
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-zinc-400 bg-zinc-100 px-2.5 py-0.5 rounded-full">
                            Tạm ngưng
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1.5">
                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(shift)}
                          className="w-8 h-8 rounded-lg border border-zinc-200 hover:bg-zinc-100 text-zinc-700 inline-flex items-center justify-center transition-colors cursor-pointer"
                          title="Chỉnh sửa ca"
                        >
                          <Edit2 size={13} />
                        </button>

                        {/* Toggle Status Button */}
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(shift)}
                          className={`w-8 h-8 rounded-lg border inline-flex items-center justify-center transition-colors cursor-pointer ${shift.isActive
                              ? 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                              : 'border-zinc-200 text-zinc-400 hover:bg-zinc-100'
                            }`}
                          title={shift.isActive ? 'Tạm ngưng hoạt động' : 'Kích hoạt lại'}
                        >
                          <Power size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex items-center justify-between shrink-0">
          <p className="text-[11px] text-zinc-400">
            * Chỉ các ca có trạng thái <strong>Hoạt động</strong> mới hiển thị trên màn hình chọn ca của Thu ngân.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-zinc-200 hover:bg-zinc-300 font-bold text-zinc-700 text-xs rounded-xl transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
