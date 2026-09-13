import React, { useState } from 'react';
import { 
  UtensilsCrossed, 
  MapPin, 
  Sparkles, 
  QrCode, 
  Coffee, 
  ArrowRight, 
  X,
  Store
} from 'lucide-react';
import { cn } from '../lib/utils';

interface TableSelectScreenProps {
  initialTableId?: string;
  branchName?: string;
  onConfirmTable: (tableId: string) => void;
}

const QUICK_TABLES = ['1', '2', '3', '5', '6', '8', '10', '12'];

export const TableSelectScreen: React.FC<TableSelectScreenProps> = ({
  initialTableId = '',
  branchName = 'Chi nhánh: Quận Gò Vấp (12 Nguyễn Văn Bảo)',
  onConfirmTable,
}) => {
  const [tableInput, setTableInput] = useState<string>(initialTableId);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let trimmed = tableInput.trim();
    if (!trimmed) {
      setErrorMessage('Vui lòng nhập hoặc chọn số bàn của bạn!');
      return;
    }
    // Chuẩn hóa số bàn nếu người dùng gõ số có số 0 ở đầu (ví dụ "01" -> "1")
    if (/^\d+$/.test(trimmed)) {
      trimmed = String(parseInt(trimmed, 10));
    }
    setErrorMessage('');
    onConfirmTable(trimmed);
  };

  const handleSelectQuickTable = (table: string) => {
    setTableInput(table);
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen bg-zinc-900/90 sm:bg-zinc-100 flex items-center justify-center sm:py-6 sm:px-4">
      {/* Mobile-first frame container */}
      <div className="w-full max-w-md min-h-screen sm:min-h-[720px] sm:max-h-[92vh] sm:rounded-3xl bg-white shadow-2xl flex flex-col overflow-y-auto relative animate-in fade-in duration-300">
        
        {/* Banner Header with Coffee Imagery & Logo */}
        <div className="relative h-64 w-full shrink-0 overflow-hidden bg-zinc-900">
          <img
            src="https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&q=80&w=800"
            alt="N70 Coffee & Tea Ambiance"
            className="w-full h-full object-cover opacity-85 scale-105 transition-transform duration-700 hover:scale-100"
          />
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/50 to-black/30" />

          {/* Top Pill / Badge */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/15 text-white/90 text-[11px] font-semibold">
              <Sparkles size={12} className="text-amber-400" /> Gọi món thông minh
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 backdrop-blur-md border border-emerald-400/30 text-emerald-300 text-[11px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Đang phục vụ
            </span>
          </div>

          {/* Logo & Brand identity */}
          <div className="absolute bottom-5 left-5 right-5 z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-600 via-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-600/30 text-white ring-2 ring-white/20">
                <Coffee size={24} strokeWidth={2.2} />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white tracking-wide drop-shadow-md">
                  N70 COFFEE & TEA
                </h1>
                <p className="text-xs text-orange-200/90 font-medium">
                  Hương vị nguyên bản • Tự phục vụ tại bàn
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Form & Table Selection Section */}
        <div className="flex-1 p-6 flex flex-col justify-between">
          <div>
            {/* Branch info badge */}
            <div className="mb-5 flex justify-center">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-orange-50 border border-orange-200/80 text-orange-900 text-xs font-semibold shadow-xs">
                <MapPin size={13} className="text-orange-600 shrink-0" />
                <span className="truncate max-w-[280px]">{branchName}</span>
              </div>
            </div>

            {/* Input Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2 px-1">
                  <label htmlFor="table-input" className="text-xs font-bold uppercase tracking-wider text-zinc-700 flex items-center gap-1.5">
                    <Store size={14} className="text-orange-600" />
                    Số bàn của bạn
                  </label>
                  <span className="text-[11px] text-zinc-400 font-medium">
                    (In trên tem dán tại bàn)
                  </span>
                </div>

                {/* Big rounded input with table icon */}
                <div className="relative flex items-center">
                  <div className="absolute left-4 pointer-events-none text-orange-600 flex items-center justify-center">
                    <UtensilsCrossed size={22} />
                  </div>
                  
                  <input
                    id="table-input"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoFocus
                    value={tableInput}
                    onChange={(e) => {
                      setTableInput(e.target.value);
                      if (errorMessage) setErrorMessage('');
                    }}
                    placeholder="VD: 5, 12,..."
                    className={cn(
                      "w-full text-center text-2xl sm:text-3xl font-extrabold tracking-wider text-zinc-900 bg-zinc-50 border-2 rounded-2xl py-4 px-12 focus:outline-none focus:bg-white transition-all shadow-inner",
                      errorMessage 
                        ? "border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-100" 
                        : "border-zinc-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/15"
                    )}
                  />

                  {tableInput && (
                    <button
                      type="button"
                      onClick={() => setTableInput('')}
                      className="absolute right-4 p-1.5 rounded-full text-zinc-400 hover:text-zinc-600 hover:bg-zinc-200 transition-colors"
                      title="Xóa số bàn"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>

                {errorMessage && (
                  <p className="text-xs font-semibold text-red-500 mt-2 px-1 animate-in fade-in slide-in-from-top-1">
                    ⚠️ {errorMessage}
                  </p>
                )}
              </div>

              {/* Quick Table Selection Chips */}
              <div>
                <p className="text-[11px] font-semibold text-zinc-500 mb-2 px-1">
                  Hoặc chọn nhanh bàn phổ biến:
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {QUICK_TABLES.map((tbl) => {
                    const isSelected = tableInput.trim() === tbl || tableInput.trim() === String(parseInt(tbl, 10));
                    return (
                      <button
                        key={tbl}
                        type="button"
                        onClick={() => handleSelectQuickTable(tbl)}
                        className={cn(
                          "py-2.5 px-2 text-xs font-bold rounded-xl border transition-all cursor-pointer active:scale-95 text-center",
                          isSelected
                            ? "bg-orange-500 border-orange-500 text-white shadow-sm shadow-orange-500/30 scale-[1.02]"
                            : "bg-zinc-50 border-zinc-200/80 text-zinc-700 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-700"
                        )}
                      >
                        Bàn {tbl}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={!tableInput.trim()}
                  className={cn(
                    "w-full py-4 rounded-2xl font-extrabold text-base flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-lg active:scale-[0.98]",
                    tableInput.trim()
                      ? "bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 text-white shadow-orange-500/30 hover:shadow-orange-500/40 hover:brightness-105"
                      : "bg-zinc-200 text-zinc-400 cursor-not-allowed shadow-none"
                  )}
                >
                  <UtensilsCrossed size={19} />
                  <span>Xem Thực Đơn & Gọi Món</span>
                  <ArrowRight size={18} />
                </button>
              </div>
            </form>

            {/* Hint / QR note */}
            <div className="mt-5 p-3.5 bg-amber-50/90 border border-amber-200/70 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900 leading-relaxed shadow-xs">
              <QrCode size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">💡 Mẹo nhỏ:</span> Bạn có thể quét trực tiếp mã QR dán trên bàn để tự động vào menu nhanh nhất mà không cần nhập tay.
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <div className="pt-6 pb-2 text-center">
            <p className="text-[11px] text-zinc-400 font-medium">
              N70 POS & Smart Dining System • Dự án KLTN
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
