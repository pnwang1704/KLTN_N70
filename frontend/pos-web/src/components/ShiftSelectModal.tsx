import React, { useState } from 'react';
import { Clock, CheckCircle2, User, Building2, ArrowRight } from 'lucide-react';

export interface ShiftSession {
  shiftName: string;
  shiftCode: string;
  openedAt: string;
  cashierName: string;
  cashierId?: string;
}

interface ShiftSelectModalProps {
  user: any;
  currentShift: ShiftSession | null;
  onSelectShift: (shift: ShiftSession) => void;
  canDismiss?: boolean;
  onClose?: () => void;
}

export const SHIFT_OPTIONS = [
  {
    code: 'CA_1',
    name: 'Ca 1 (06:00 - 14:00)',
    timeRange: '06:00 - 14:00',
    description: 'Ca sáng - Phục vụ bữa sáng & cà phê đầu ngày',
  },
  {
    code: 'CA_2',
    name: 'Ca 2 (14:00 - 22:00)',
    timeRange: '14:00 - 22:00',
    description: 'Ca chiều & tối - Giờ cao điểm & tổng kết ngày',
  },
];

export const ShiftSelectModal: React.FC<ShiftSelectModalProps> = ({
  user,
  currentShift,
  onSelectShift,
  canDismiss = false,
  onClose,
}) => {
  // Auto-detect shift based on current system hour
  const currentHour = new Date().getHours();
  const defaultCode = currentShift?.shiftCode || (currentHour >= 6 && currentHour < 14 ? 'CA_1' : 'CA_2');
  const [selectedCode, setSelectedCode] = useState<string>(defaultCode);

  const handleConfirm = () => {
    const option = SHIFT_OPTIONS.find(s => s.code === selectedCode) || SHIFT_OPTIONS[0];
    const session: ShiftSession = {
      shiftName: option.name,
      shiftCode: option.code,
      openedAt: currentShift?.shiftCode === option.code && currentShift.openedAt 
        ? currentShift.openedAt 
        : new Date().toISOString(),
      cashierName: user?.fullName || user?.username || 'Thu ngân',
      cashierId: user?.id || user?.sub,
    };
    localStorage.setItem('pos_shift', JSON.stringify(session));
    onSelectShift(session);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 border border-zinc-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-amber-600 p-6 text-white text-center relative">
          <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
            <Clock className="text-white" size={28} />
          </div>
          <h2 className="text-2xl font-black tracking-tight">Chọn Ca Làm Việc</h2>
          <p className="text-orange-100 text-xs mt-1">
            Vui lòng xác nhận ca trực để hệ thống ghi nhận doanh thu chính xác
          </p>
        </div>

        {/* User Info Card */}
        <div className="p-6">
          <div className="bg-orange-50/60 border border-orange-100 rounded-2xl p-3.5 mb-5 flex items-center justify-between text-xs text-zinc-700">
            <div className="flex items-center gap-2">
              <User size={16} className="text-orange-600" />
              <span className="font-semibold text-zinc-900">{user?.fullName || user?.username}</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-500">
              <Building2 size={15} />
              <span>Chi nhánh {user?.branchId || 1}</span>
            </div>
          </div>

          <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2.5">
            Danh sách ca trực hôm nay
          </label>

          <div className="space-y-3 mb-6">
            {SHIFT_OPTIONS.map((option) => {
              const isSelected = selectedCode === option.code;
              const isSuggested = (currentHour >= 6 && currentHour < 14 ? 'CA_1' : 'CA_2') === option.code;

              return (
                <div
                  key={option.code}
                  onClick={() => setSelectedCode(option.code)}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative flex items-start justify-between ${
                    isSelected
                      ? 'border-orange-500 bg-orange-50/40 shadow-md ring-2 ring-orange-200'
                      : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50/50'
                  }`}
                >
                  <div className="flex-1 pr-3">
                    <div className="flex items-center gap-2">
                      <h4 className={`font-bold text-sm ${isSelected ? 'text-orange-950' : 'text-zinc-800'}`}>
                        {option.name}
                      </h4>
                      {isSuggested && (
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                          Đúng giờ
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">{option.description}</p>
                  </div>

                  <div className="pt-0.5">
                    {isSelected ? (
                      <CheckCircle2 size={22} className="text-orange-600 fill-orange-100" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-zinc-300" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            {canDismiss && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="w-1/3 py-3 px-4 rounded-2xl border border-zinc-200 font-bold text-zinc-600 text-sm hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                Đóng
              </button>
            )}
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 py-3 px-5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold rounded-2xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-600/25 transition-all cursor-pointer"
            >
              <span>Vào ca làm việc</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
