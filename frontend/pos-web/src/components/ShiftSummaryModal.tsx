import React, { useState, useEffect } from 'react';
import { 
  X, 
  RotateCw, 
  Printer, 
  Banknote, 
  CreditCard, 
  Coins, 
  ClipboardList, 
  Calendar, 
  User, 
  Building2, 
  Clock,
  ArrowRightLeft
} from 'lucide-react';
import api from '../lib/axios';
import { formatCurrency, formatDate, formatPaymentMethod } from '../lib/utils';
import type { ShiftSession } from './ShiftSelectModal';

interface ShiftSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  currentShift: ShiftSession | null;
  branchId: string;
  onSwitchShift: () => void;
}

export const ShiftSummaryModal: React.FC<ShiftSummaryModalProps> = ({
  isOpen,
  onClose,
  user,
  currentShift,
  branchId,
  onSwitchShift,
}) => {
  const [loading, setLoading] = useState(false);
  const [summaryData, setSummaryData] = useState<{
    totalRevenue: number;
    totalCash: number;
    totalBankTransfer: number;
    totalOrders: number;
    date: string;
    recentOrders?: any[];
  } | null>(null);

  const [printTime, setPrintTime] = useState<string>('');

  const fetchShiftSummary = async () => {
    setLoading(true);
    try {
      const fromDate = currentShift?.openedAt || new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
      const toDate = new Date().toISOString();
      
      const res = await api.get('/orders/shift-summary', {
        params: {
          branchId,
          from: fromDate,
          to: toDate,
        }
      });
      setSummaryData(res.data);
      setPrintTime(new Date().toISOString());
    } catch (err) {
      console.error('Lỗi khi tải báo cáo kết ca:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchShiftSummary();
    }
  }, [isOpen, currentShift, branchId]);

  if (!isOpen) return null;

  const handlePrint = () => {
    setPrintTime(new Date().toISOString());
    setTimeout(() => {
      window.print();
    }, 100);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 print:p-0 print:static print:bg-white print:backdrop-blur-none">
      {/* Printable Thermal Receipt (Visible ONLY when printing) */}
      <div className="hidden print:block w-[80mm] max-w-[80mm] mx-auto text-black font-mono text-xs p-3 leading-relaxed">
        <div className="text-center mb-3">
          <h2 className="text-base font-black uppercase tracking-wider">N70 COFFEE & TEA</h2>
          <p className="text-[10px] text-zinc-600">Chi nhánh {branchId} • Hệ thống F&B Chuỗi</p>
          <p className="text-[10px] text-zinc-600">12 Nguyễn Văn Bảo, P.4, Q.Gò Vấp, TP.HCM</p>
          <div className="border-b border-dashed border-black my-2" />
          <h3 className="text-sm font-bold uppercase tracking-wider">PHIẾU BÁO CÁO KẾT CA</h3>
          <p className="text-[10px] italic">Bàn giao doanh thu & tiền két</p>
        </div>

        <div className="space-y-1 mb-3 text-[11px]">
          <div className="flex justify-between">
            <span>Thu ngân:</span>
            <span className="font-bold">{currentShift?.cashierName || user?.fullName || user?.username}</span>
          </div>
          <div className="flex justify-between">
            <span>Ca làm việc:</span>
            <span className="font-bold">{currentShift?.shiftName || 'Ca trực'}</span>
          </div>
          <div className="flex justify-between">
            <span>Giờ mở ca:</span>
            <span>{currentShift?.openedAt ? formatDate(currentShift.openedAt) : 'Đầu ngày'}</span>
          </div>
          <div className="flex justify-between">
            <span>Giờ kết ca:</span>
            <span>{formatDate(printTime || new Date().toISOString())}</span>
          </div>
        </div>

        <div className="border-b border-dashed border-black my-2" />

        <div className="space-y-1.5 my-3 text-[11px]">
          <div className="flex justify-between items-center">
            <span>Tổng số đơn hoàn tất:</span>
            <span className="font-bold text-sm">{summaryData?.totalOrders || 0} đơn</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Tiền mặt (CASH):</span>
            <span className="font-bold text-sm">{formatCurrency(summaryData?.totalCash || 0)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Chuyển khoản (VietQR):</span>
            <span className="font-bold text-sm">{formatCurrency(summaryData?.totalBankTransfer || 0)}</span>
          </div>
        </div>

        <div className="border-b border-black my-2" />

        <div className="flex justify-between items-center my-2 text-sm font-black">
          <span>TỔNG DOANH THU:</span>
          <span>{formatCurrency(summaryData?.totalRevenue || 0)}</span>
        </div>

        <div className="border-b border-dashed border-black my-3" />

        {/* Signature lines */}
        <div className="grid grid-cols-2 gap-4 mt-6 text-center text-[10px]">
          <div>
            <p className="font-bold">Thu ngân bàn giao</p>
            <p className="italic text-[9px] text-zinc-500">(Ký & ghi rõ họ tên)</p>
            <div className="h-14"></div>
            <p className="font-bold">{currentShift?.cashierName || user?.fullName || user?.username}</p>
          </div>
          <div>
            <p className="font-bold">Người nhận bàn giao</p>
            <p className="italic text-[9px] text-zinc-500">(Ký & ghi rõ họ tên)</p>
            <div className="h-14"></div>
            <p className="font-bold">..................................</p>
          </div>
        </div>

        <div className="text-center mt-6 text-[9px] text-zinc-500 italic">
          Phiếu in tự động từ hệ thống N70 POS
        </div>
      </div>

      {/* Screen Interactive Modal (Hidden when printing) */}
      <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 border border-zinc-200 print:hidden flex flex-col max-h-[90vh]">
        {/* Modal Top Header */}
        <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-amber-700 p-6 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-inner">
              <Coins className="text-white" size={26} />
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight">Báo Cáo Kết Ca & Doanh Thu</h3>
              <p className="text-orange-100 text-xs mt-0.5">
                Đối chiếu tiền mặt trong két và tổng kết doanh thu ca trực
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
          >
            <X size={22} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-zinc-50/50">
          {/* Shift & Staff Metadata Banner */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center shrink-0">
                <User size={16} />
              </div>
              <div>
                <p className="text-zinc-400 font-medium">Thu ngân</p>
                <p className="font-bold text-zinc-800 truncate">{currentShift?.cashierName || user?.fullName || user?.username}</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <Clock size={16} />
              </div>
              <div>
                <p className="text-zinc-400 font-medium">Ca làm việc</p>
                <p className="font-bold text-zinc-800 truncate">{currentShift?.shiftName || 'Ca 1'}</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <Calendar size={16} />
              </div>
              <div>
                <p className="text-zinc-400 font-medium">Giờ mở ca</p>
                <p className="font-bold text-zinc-800">
                  {currentShift?.openedAt ? new Date(currentShift.openedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '06:00'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                <Building2 size={16} />
              </div>
              <div>
                <p className="text-zinc-400 font-medium">Chi nhánh</p>
                <p className="font-bold text-zinc-800">Chi nhánh {branchId}</p>
              </div>
            </div>
          </div>

          {/* 4 Financial Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 1. Cash Card - Emphasized for Cash Drawer Reconciliation */}
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white shadow-lg shadow-emerald-500/15 relative overflow-hidden">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-100">
                  💵 Tiền mặt trong két (CASH)
                </span>
                <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl">
                  <Banknote size={20} className="text-white" />
                </div>
              </div>
              <div className="text-2xl font-black tracking-tight mt-1">
                {formatCurrency(summaryData?.totalCash || 0)}
              </div>
              <p className="text-[11px] text-emerald-100 mt-1">
                Số tiền mặt thực tế cần kiểm đếm bàn giao
              </p>
            </div>

            {/* 2. Bank Transfer Card */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 text-white shadow-lg shadow-blue-500/15 relative overflow-hidden">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-100">
                  💳 Chuyển khoản (VietQR / PayOS)
                </span>
                <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl">
                  <CreditCard size={20} className="text-white" />
                </div>
              </div>
              <div className="text-2xl font-black tracking-tight mt-1">
                {formatCurrency(summaryData?.totalBankTransfer || 0)}
              </div>
              <p className="text-[11px] text-blue-100 mt-1">
                Tiền đã thanh toán qua tài khoản ngân hàng
              </p>
            </div>

            {/* 3. Total Revenue Card */}
            <div className="bg-white border-2 border-orange-200 rounded-2xl p-5 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  💰 Tổng doanh thu ca
                </span>
                <div className="p-2 bg-orange-100 rounded-xl text-orange-600">
                  <Coins size={20} />
                </div>
              </div>
              <div className="text-2xl font-black text-orange-600 tracking-tight mt-1">
                {formatCurrency(summaryData?.totalRevenue || 0)}
              </div>
              <p className="text-[11px] text-zinc-400 mt-1">
                Doanh thu lũy kế từ lúc mở ca đến nay
              </p>
            </div>

            {/* 4. Total Orders Served */}
            <div className="bg-white border-2 border-zinc-200 rounded-2xl p-5 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  📋 Đơn hàng đã phục vụ
                </span>
                <div className="p-2 bg-purple-100 rounded-xl text-purple-600">
                  <ClipboardList size={20} />
                </div>
              </div>
              <div className="text-2xl font-black text-zinc-900 tracking-tight mt-1">
                {summaryData?.totalOrders || 0} <span className="text-sm font-semibold text-zinc-500">đơn</span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-1">
                Các đơn đã thanh toán hoàn tất (COMPLETED)
              </p>
            </div>
          </div>

          {/* Detailed Orders Breakdown Table */}
          <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
            <div className="px-5 py-3.5 border-b border-zinc-200 bg-zinc-50/80 flex items-center justify-between">
              <h4 className="font-bold text-xs uppercase tracking-wider text-zinc-700">
                Chi tiết đơn hàng trong ca ({summaryData?.recentOrders?.length || 0})
              </h4>
              <span className="text-xs text-zinc-500 font-medium">Sắp xếp theo thời gian mới nhất</span>
            </div>

            <div className="max-h-56 overflow-y-auto">
              {!summaryData?.recentOrders || summaryData.recentOrders.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-400">
                  Chưa có đơn hàng nào hoàn tất trong ca này
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-100/60 text-zinc-500 font-semibold border-b border-zinc-200 sticky top-0">
                    <tr>
                      <th className="px-4 py-2.5">Thời gian</th>
                      <th className="px-4 py-2.5">Mã đơn</th>
                      <th className="px-4 py-2.5">Loại đơn</th>
                      <th className="px-4 py-2.5">PT Thanh toán</th>
                      <th className="px-4 py-2.5 text-right">Số tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {summaryData.recentOrders.map((o) => (
                      <tr key={o.id} className="hover:bg-orange-50/40 transition-colors">
                        <td className="px-4 py-2 text-zinc-600">{formatDate(o.createdAt)}</td>
                        <td className="px-4 py-2 font-mono font-bold text-zinc-800">
                          {o.orderCode ? `#${o.orderCode}` : o.id.split('-')[0]}
                        </td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            o.orderType === 'AT_TABLE' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
                          }`}>
                            {o.orderType === 'AT_TABLE' ? `Bàn ${o.tableId}` : 'Mang về'}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-zinc-700">
                          {formatPaymentMethod(o.paymentMethod)}
                        </td>
                        <td className="px-4 py-2 font-bold text-zinc-900 text-right">
                          {formatCurrency(o.finalAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Modal Bottom Footer Actions */}
        <div className="p-4 bg-white border-t border-zinc-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={fetchShiftSummary}
              disabled={loading}
              className="px-3.5 py-2.5 rounded-xl border border-zinc-200 text-zinc-700 hover:bg-zinc-100 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RotateCw size={14} className={loading ? 'animate-spin text-orange-600' : ''} />
              <span>{loading ? 'Đang tải...' : 'Làm mới dữ liệu'}</span>
            </button>

            <button
              onClick={() => {
                onClose();
                onSwitchShift();
              }}
              className="px-3.5 py-2.5 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowRightLeft size={14} className="text-amber-600" />
              <span>Đổi ca trực</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-100 text-xs font-bold transition-colors cursor-pointer"
            >
              Đóng
            </button>

            <button
              onClick={handlePrint}
              className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer"
            >
              <Printer size={15} />
              <span>In phiếu kết ca (80mm)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
