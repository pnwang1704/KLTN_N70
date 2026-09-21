import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle2, User, Building2, ArrowRight, Banknote, HelpCircle, Loader2 } from 'lucide-react';
import api from '../lib/axios';

export interface ShiftSession {
  shiftName: string;
  shiftCode: string;
  openedAt: string;
  cashierName: string;
  cashierId?: string;
  initialCash?: number;
}

export interface ShiftItem {
  id?: string;
  branchId?: string | null;
  code: string;
  name: string;
  startTime: string;
  endTime: string;
  gracePeriodMinutes?: number;
  isActive?: boolean;
  description?: string;
}

interface ShiftSelectModalProps {
  user: any;
  currentShift: ShiftSession | null;
  onSelectShift: (shift: ShiftSession) => void;
  canDismiss?: boolean;
  onClose?: () => void;
}

export const DEFAULT_SHIFTS: ShiftItem[] = [
  {
    code: 'CA_1',
    name: 'Ca 1 (06:00 - 14:00)',
    startTime: '06:00',
    endTime: '14:00',
    gracePeriodMinutes: 15,
    description: 'Ca sáng - Phục vụ bữa sáng & cà phê đầu ngày',
  },
  {
    code: 'CA_2',
    name: 'Ca 2 (14:00 - 22:00)',
    startTime: '14:00',
    endTime: '22:00',
    gracePeriodMinutes: 15,
    description: 'Ca chiều & tối - Giờ cao điểm & tổng kết ngày',
  },
];

// Helper to determine which shift matches current time
const getSuggestedShiftCode = (items: ShiftItem[]): string => {
  if (!items || items.length === 0) return 'CA_1';
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  for (const shift of items) {
    if (!shift.startTime || !shift.endTime) continue;
    const [startH, startM] = shift.startTime.split(':').map(Number);
    const [endH, endM] = shift.endTime.split(':').map(Number);
    const startTotal = startH * 60 + startM;
    const endTotal = endH * 60 + endM;

    // Handle shift crossing midnight (e.g. 22:00 -> 06:00)
    if (endTotal <= startTotal) {
      if (currentMinutes >= startTotal || currentMinutes < endTotal) {
        return shift.code;
      }
    } else {
      if (currentMinutes >= startTotal && currentMinutes < endTotal) {
        return shift.code;
      }
    }
  }

  return items[0].code;
};

export const ShiftSelectModal: React.FC<ShiftSelectModalProps> = ({
  user,
  currentShift,
  onSelectShift,
  canDismiss = false,
  onClose,
}) => {
  const [shifts, setShifts] = useState<ShiftItem[]>(DEFAULT_SHIFTS);
  const [loadingShifts, setLoadingShifts] = useState<boolean>(true);

  // Selected shift code
  const [selectedCode, setSelectedCode] = useState<string>(() => {
    return currentShift?.shiftCode || getSuggestedShiftCode(DEFAULT_SHIFTS);
  });

  // Fetch dynamic shifts from backend with fallback
  useEffect(() => {
    let isMounted = true;
    api.get('/shifts', { params: { activeOnly: true, branchId: user?.branchId } })
      .then((res) => {
        if (!isMounted) return;
        const data = res.data;
        if (Array.isArray(data) && data.length > 0) {
          setShifts(data);
          if (!currentShift?.shiftCode) {
            setSelectedCode(getSuggestedShiftCode(data));
          } else {
            // Check if current shift code is still in the active list
            const found = data.some((s: ShiftItem) => s.code === currentShift.shiftCode);
            if (!found) {
              setSelectedCode(getSuggestedShiftCode(data));
            }
          }
        }
      })
      .catch((err) => {
        console.warn('Không thể tải ca làm việc từ API, chuyển sang dùng ca mặc định (Fallback):', err.message);
      })
      .finally(() => {
        if (isMounted) setLoadingShifts(false);
      });

    return () => {
      isMounted = false;
    };
  }, [user?.branchId, currentShift?.shiftCode]);

  // State: stores pure integer number in state
  const [initialCash, setInitialCash] = useState<number>(() => {
    if (currentShift?.initialCash !== undefined) return Number(currentShift.initialCash);
    return 1000000;
  });

  // Display state: formatted as 'X.XXX.XXX đ'
  const [initialCashStr, setInitialCashStr] = useState<string>(() => {
    const init = currentShift?.initialCash !== undefined ? Number(currentShift.initialCash) : 1000000;
    return init > 0 ? `${init.toLocaleString('vi-VN')} đ` : '0 đ';
  });

  // Handle typing numbers smoothly without cursor jumps
  const handleCashChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const raw = input.value;
    const digits = raw.replace(/\D/g, '');

    if (!digits) {
      setInitialCash(0);
      setInitialCashStr('');
      return;
    }

    const num = parseInt(digits, 10);
    if (num > 100000000000) return; // Prevent overflow

    const formatted = `${num.toLocaleString('vi-VN')} đ`;
    setInitialCash(num);
    setInitialCashStr(formatted);

    // Keep cursor right before ' đ' to allow continuous, smooth typing
    requestAnimationFrame(() => {
      const pos = Math.max(0, formatted.length - 2);
      input.setSelectionRange(pos, pos);
    });
  };

  // Intercept Backspace so user can delete smoothly even with the ' đ' suffix
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      const input = e.currentTarget;
      const { selectionStart, selectionEnd } = input;
      if (selectionStart !== null && selectionStart === selectionEnd) {
        const val = input.value;
        if (selectionStart >= val.length - 2 && val.endsWith(' đ')) {
          e.preventDefault();
          const digits = val.slice(0, val.length - 2).replace(/\D/g, '');
          const newDigits = digits.slice(0, -1);
          if (!newDigits) {
            setInitialCash(0);
            setInitialCashStr('');
          } else {
            const newNum = parseInt(newDigits, 10);
            const formatted = `${newNum.toLocaleString('vi-VN')} đ`;
            setInitialCash(newNum);
            setInitialCashStr(formatted);
            requestAnimationFrame(() => {
              const pos = Math.max(0, formatted.length - 2);
              input.setSelectionRange(pos, pos);
            });
          }
        }
      }
    }
  };

  // When focused or clicked, ensure cursor is placed before ' đ'
  const handleFocusOrClick = (e: React.SyntheticEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const val = input.value;
    if (val.endsWith(' đ') && val.length >= 2) {
      const pos = val.length - 2;
      if ((input.selectionStart || 0) > pos) {
        input.setSelectionRange(pos, pos);
      }
    }
  };

  const handleConfirm = () => {
    const option = shifts.find(s => s.code === selectedCode) || shifts[0] || DEFAULT_SHIFTS[0];

    const session: ShiftSession = {
      shiftName: option.name,
      shiftCode: option.code,
      openedAt: currentShift?.shiftCode === option.code && currentShift.openedAt
        ? currentShift.openedAt
        : new Date().toISOString(),
      cashierName: user?.fullName || user?.username || 'Thu ngân',
      cashierId: user?.id || user?.sub,
      initialCash: initialCash,
    };

    localStorage.setItem('pos_shift', JSON.stringify(session));
    onSelectShift(session);
  };

  const suggestedCode = getSuggestedShiftCode(shifts);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 border border-zinc-200 max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-amber-600 p-5 text-white text-center relative shrink-0">
          <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-inner">
            <Clock className="text-white" size={26} />
          </div>
          <h2 className="text-xl font-black tracking-tight">Chọn Ca Làm Việc</h2>
          <p className="text-orange-100 text-xs mt-0.5">
            Xác nhận ca trực và số tiền mặt trong két nhận bàn giao
          </p>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* User Info Card */}
          <div className="bg-orange-50/60 border border-orange-100 rounded-2xl p-3 flex items-center justify-between text-xs text-zinc-700">
            <div className="flex items-center gap-2">
              <User size={15} className="text-orange-600" />
              <span className="font-semibold text-zinc-900">{user?.fullName || user?.username}</span>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-500">
              <Building2 size={14} />
              <span>Chi nhánh {user?.branchId || 1}</span>
            </div>
          </div>

          {/* Shift Selection List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider">
                1. Chọn ca làm việc hôm nay
              </label>
              {loadingShifts && (
                <span className="flex items-center gap-1 text-[11px] text-zinc-400">
                  <Loader2 size={11} className="animate-spin text-orange-500" />
                  <span>Đang tải ca...</span>
                </span>
              )}
            </div>

            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-0.5">
              {shifts.map((option) => {
                const isSelected = selectedCode === option.code;
                const isSuggested = suggestedCode === option.code;

                return (
                  <div
                    key={option.code}
                    onClick={() => setSelectedCode(option.code)}
                    className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer relative flex items-start justify-between ${
                      isSelected
                        ? 'border-orange-500 bg-orange-50/40 shadow-sm ring-2 ring-orange-200'
                        : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50/50'
                    }`}
                  >
                    <div className="flex-1 pr-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className={`font-bold text-xs ${isSelected ? 'text-orange-950 font-black' : 'text-zinc-800'}`}>
                          {option.name}
                        </h4>
                        {isSuggested && (
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Đúng giờ
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        {option.description || `${option.startTime} - ${option.endTime}${option.gracePeriodMinutes ? ` (Ân hạn ${option.gracePeriodMinutes}p)` : ''}`}
                      </p>
                    </div>

                    <div className="pt-0.5">
                      {isSelected ? (
                        <CheckCircle2 size={20} className="text-orange-600 fill-orange-100" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-zinc-300" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Opening Cash Input Field */}
          <div className="pt-1">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider flex items-center gap-1.5">
                <Banknote size={15} className="text-emerald-600" />
                <span>2. Tiền trong két nhận bàn giao (VNĐ)</span>
              </label>
              <span className="text-[10px] text-zinc-400 font-medium italic">Tiền thối đầu ca</span>
            </div>

            <div className="relative">
              <input
                type="text"
                value={initialCashStr}
                onChange={handleCashChange}
                onKeyDown={handleKeyDown}
                onFocus={handleFocusOrClick}
                onClick={handleFocusOrClick}
                placeholder="0 đ"
                className="w-full px-4 py-3 bg-zinc-50 border-2 border-zinc-200 focus:border-emerald-500 focus:bg-white rounded-2xl text-base font-bold text-zinc-900 focus:outline-none transition-all shadow-inner"
              />
            </div>

            <p className="text-[11px] text-zinc-400 mt-2 flex items-start gap-1">
              <HelpCircle size={13} className="shrink-0 mt-0.5 text-zinc-400" />
              <span>Số tiền này sẽ được cộng vào tiền mặt thu trong ca để đối chiếu tổng tiền két khi kết ca.</span>
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex items-center gap-3 shrink-0">
          {canDismiss && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 py-3 px-4 rounded-2xl border border-zinc-300 font-bold text-zinc-600 text-xs hover:bg-zinc-200 transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
          )}
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 py-3 px-5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-orange-600/25 transition-all cursor-pointer"
          >
            <span>Bắt đầu ca làm</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
