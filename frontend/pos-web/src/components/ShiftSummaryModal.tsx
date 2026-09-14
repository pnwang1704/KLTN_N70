import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
import { formatCurrency, formatDate, formatDateTimeFull, formatPaymentMethod } from '../lib/utils';
import type { ShiftSession } from './ShiftSelectModal';

interface ShiftSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  currentShift: ShiftSession | null;
  branchId: string;
  onSwitchShift: () => void;
}

/**
 * High-reliability 80mm thermal receipt printing via isolated hidden iframe
 */
export const printShiftReceipt = (params: {
  branchId: string;
  cashierName: string;
  shiftName: string;
  openedAt?: string;
  closedAt: string;
  initialCash: number;
  totalCash: number;
  closingCash: number;
  totalBankTransfer: number;
  totalRevenue: number;
  totalOrders: number;
}) => {
  const {
    branchId,
    cashierName,
    shiftName,
    openedAt,
    closedAt,
    initialCash,
    totalCash,
    closingCash,
    totalBankTransfer,
    totalRevenue,
    totalOrders,
  } = params;

  const openedAtStr = openedAt ? formatDateTimeFull(openedAt) : 'Đầu ngày';
  const closedAtStr = formatDateTimeFull(closedAt);

  const html = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Phiếu Bàn Giao Kết Ca - N70 POS</title>
    <style>
      @page {
        size: 80mm auto;
        margin: 0;
      }
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
      body {
        width: 80mm;
        max-width: 80mm;
        margin: 0 auto;
        padding: 8px 6px;
        font-family: 'Courier New', Courier, monospace, 'Segoe UI', Arial, sans-serif;
        font-size: 12px;
        line-height: 1.4;
        color: #000;
        background: #fff;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .text-center { text-align: center; }
      .text-right { text-align: right; }
      .font-bold { font-weight: bold; }
      .font-black { font-weight: 900; }
      .uppercase { text-transform: uppercase; }
      .italic { font-style: italic; }
      .title {
        font-size: 16px;
        font-weight: 900;
        letter-spacing: 0.5px;
      }
      .subtitle {
        font-size: 13px;
        font-weight: 800;
        margin-top: 4px;
      }
      .section-title {
        font-size: 11px;
        font-weight: 800;
        text-align: center;
        letter-spacing: 0.5px;
        margin-bottom: 4px;
      }
      .dashed {
        border-bottom: 1px dashed #000;
        margin: 7px 0;
      }
      .solid {
        border-bottom: 1.5px solid #000;
        margin: 7px 0;
      }
      .row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin: 3px 0;
      }
      .row-total {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 13px;
        font-weight: 900;
        margin: 5px 0;
      }
      .signatures {
        display: flex;
        justify-content: space-between;
        margin-top: 18px;
        page-break-inside: avoid;
      }
      .sign-col {
        width: 48%;
        text-align: center;
        font-size: 10px;
      }
      .sign-space {
        height: 50px;
      }
      .confirm-note {
        text-align: center;
        margin-top: 10px;
        font-size: 10px;
        font-weight: bold;
        line-height: 1.3;
      }
      .footer {
        text-align: center;
        margin-top: 14px;
        font-size: 9px;
        color: #444;
        font-style: italic;
      }
    </style>
  </head>
  <body>
    <div class="text-center">
      <div class="title uppercase">N70 COFFEE & TEA</div>
      <div style="font-size: 11px; margin-top: 2px;">Chi nhánh ${branchId} • Hệ thống F&B Chuỗi</div>
      <div style="font-size: 10px; color: #444;">12 Nguyễn Văn Bảo, P.4, Q.Gò Vấp, TP.HCM</div>
      <div class="dashed"></div>
      <div class="subtitle uppercase">PHIẾU BÀN GIAO KẾT CA</div>
      <div style="font-size: 10px; font-style: italic;">Bàn giao doanh thu & tiền két</div>
    </div>

    <div class="dashed"></div>

    <div>
      <div class="row">
        <span>Thu ngân:</span>
        <span class="font-bold">${cashierName}</span>
      </div>
      <div class="row">
        <span>Ca làm việc:</span>
        <span class="font-bold">${shiftName}</span>
      </div>
      <div class="row">
        <span>Giờ mở ca:</span>
        <span>${openedAtStr}</span>
      </div>
      <div class="row">
        <span>Giờ kết ca:</span>
        <span>${closedAtStr}</span>
      </div>
    </div>

    <div class="dashed"></div>

    <!-- Bảng đối soát tiền mặt trong két -->
    <div>
      <div class="section-title uppercase">ĐỐI SOÁT TIỀN MẶT TRONG KÉT</div>
      <div class="row">
        <span>Tiền đầu ca nhận:</span>
        <span class="font-bold">${formatCurrency(initialCash)}</span>
      </div>
      <div class="row">
        <span>Tiền mặt thu trong ca:</span>
        <span class="font-bold">${formatCurrency(totalCash)}</span>
      </div>
      <div class="solid"></div>
      <div class="row-total">
        <span>==> TỔNG TIỀN MẶT TRONG KÉT:</span>
        <span>${formatCurrency(closingCash)}</span>
      </div>
    </div>

    <div class="dashed"></div>

    <!-- Bảng doanh thu ca trực -->
    <div>
      <div class="section-title uppercase">DOANH THU BÁN HÀNG TRONG CA</div>
      <div class="row">
        <span>Số đơn đã phục vụ:</span>
        <span class="font-bold">${totalOrders} đơn</span>
      </div>
      <div class="row">
        <span>Doanh thu chuyển khoản:</span>
        <span class="font-bold">${formatCurrency(totalBankTransfer)}</span>
      </div>
      <div class="solid"></div>
      <div class="row-total">
        <span>TỔNG DOANH THU TRONG CA:</span>
        <span>${formatCurrency(totalRevenue)}</span>
      </div>
    </div>

    <div class="dashed"></div>

    <div class="signatures">
      <div class="sign-col">
        <div class="font-bold">Thu ngân bàn giao</div>
        <div class="italic">(Ký & ghi rõ họ tên)</div>
        <div class="sign-space"></div>
        <div class="font-bold">${cashierName}</div>
      </div>
      <div class="sign-col">
        <div class="font-bold">Người nhận bàn giao</div>
        <div class="italic">(Ký & ghi rõ họ tên)</div>
        <div class="sign-space"></div>
        <div class="font-bold">....................</div>
      </div>
    </div>

    <div class="confirm-note">
      Xác nhận bàn giao đúng số tiền mặt trong két: ${formatCurrency(closingCash)}
    </div>

    <div class="footer">
      Thời điểm in: ${closedAtStr}<br/>
      Hệ thống Quản lý Vận hành Chuỗi F&B N70 POS
    </div>
  </body>
</html>
  `;

  // Create invisible iframe
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0px';
  iframe.style.height = '0px';
  iframe.style.border = 'none';
  iframe.style.visibility = 'hidden';

  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    console.error('Không thể truy cập document của iframe in ấn');
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.error('Lỗi khi kích hoạt in phiếu kết ca:', e);
    } finally {
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1500);
    }
  }, 250);
};

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
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    let node = document.getElementById('print-root');
    if (!node) {
      node = document.createElement('div');
      node.id = 'print-root';
      node.className = 'hidden print:block';
      document.body.appendChild(node);
    }
    setMountNode(node);
  }, []);

  const fetchShiftSummary = async () => {
    setLoading(true);
    try {
      const fromDate = currentShift?.openedAt || new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
      const toDate = new Date().toISOString();
      
      const res = await api.get('/orders/shift-summary', {
        params: {
          branchId,
          fromDate,
          toDate,
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

  // Financial calculations including initialCash from currentShift or localStorage
  const initialCash = (() => {
    if (currentShift?.initialCash !== undefined) return Number(currentShift.initialCash);
    try {
      const stored = localStorage.getItem('pos_shift');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.initialCash !== undefined) return Number(parsed.initialCash);
      }
    } catch (e) {
      // ignore
    }
    return 0;
  })();
  const totalCash = Number(summaryData?.totalCash || 0);
  const closingCash = initialCash + totalCash;
  const totalBankTransfer = Number(summaryData?.totalBankTransfer || 0);
  const totalRevenue = Number(summaryData?.totalRevenue || 0);
  const totalOrders = Number(summaryData?.totalOrders || 0);

  const cashierDisplayName = currentShift?.cashierName || user?.fullName || user?.username || 'Thu ngân';
  const getShortShiftName = (shiftName?: string, shiftCode?: string) => {
    if (shiftCode === 'CA_1') return 'Ca 1';
    if (shiftCode === 'CA_2') return 'Ca 2';
    if (!shiftName) return 'Ca làm việc';
    return shiftName.replace(/\s*\(.*?\)/, '').trim() || shiftName;
  };
  const shortShiftName = getShortShiftName(currentShift?.shiftName, currentShift?.shiftCode);
  const openedAtDisplay = currentShift?.openedAt ? formatDateTimeFull(currentShift.openedAt) : 'Đầu ngày';
  const closedAtDisplay = formatDateTimeFull(printTime || new Date().toISOString());

  const handlePrint = () => {
    const now = new Date().toISOString();
    setPrintTime(now);

    printShiftReceipt({
      branchId: branchId || '1',
      cashierName: cashierDisplayName,
      shiftName: shortShiftName,
      openedAt: currentShift?.openedAt,
      closedAt: now,
      initialCash,
      totalCash,
      closingCash,
      totalBankTransfer,
      totalRevenue,
      totalOrders,
    });
  };

  return (
    <>
      {/* Printable Receipt Portal for standard @media print / Ctrl+P */}
      {mountNode && createPortal(
        <div id="shift-receipt-print" className="bg-white text-black p-3 mx-auto w-[80mm] max-w-[80mm] font-mono text-xs leading-relaxed">
          <div className="text-center mb-3">
            <h2 className="text-base font-black uppercase tracking-wider">N70 COFFEE & TEA</h2>
            <p className="text-[10px] text-zinc-600">Chi nhánh {branchId} • Hệ thống F&B Chuỗi</p>
            <p className="text-[10px] text-zinc-600">12 Nguyễn Văn Bảo, P.4, Q.Gò Vấp, TP.HCM</p>
            <div className="border-b border-dashed border-black my-2" />
            <h3 className="text-sm font-bold uppercase tracking-wider">PHIẾU BÀN GIAO KẾT CA</h3>
            <p className="text-[10px] italic">Bàn giao doanh thu & tiền két</p>
          </div>

          <div className="space-y-1 mb-3 text-[11px]">
            <div className="flex justify-between">
              <span>Thu ngân:</span>
              <span className="font-bold">{cashierDisplayName}</span>
            </div>
            <div className="flex justify-between">
              <span>Ca làm việc:</span>
              <span className="font-bold">{shortShiftName}</span>
            </div>
            <div className="flex justify-between">
              <span>Giờ mở ca:</span>
              <span>{openedAtDisplay}</span>
            </div>
            <div className="flex justify-between">
              <span>Giờ kết ca:</span>
              <span>{closedAtDisplay}</span>
            </div>
          </div>

          <div className="border-b border-dashed border-black my-2" />

          {/* Cash reconciliation */}
          <div className="space-y-1.5 my-2.5 text-[11px]">
            <div className="text-center font-bold uppercase text-[10px] tracking-wider mb-1">
              ĐỐI SOÁT TIỀN MẶT TRONG KÉT
            </div>
            <div className="flex justify-between items-center">
              <span>Tiền đầu ca nhận:</span>
              <span className="font-bold">{formatCurrency(initialCash)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Tiền mặt thu trong ca:</span>
              <span className="font-bold">{formatCurrency(totalCash)}</span>
            </div>
            <div className="border-b border-black my-1" />
            <div className="flex justify-between items-center font-black text-xs">
              <span>{'==>'} TỔNG TIỀN MẶT TRONG KÉT:</span>
              <span>{formatCurrency(closingCash)}</span>
            </div>
          </div>

          <div className="border-b border-dashed border-black my-2" />

          {/* Shift sales breakdown */}
          <div className="space-y-1.5 my-2.5 text-[11px]">
            <div className="text-center font-bold uppercase text-[10px] tracking-wider mb-1">
              DOANH THU BÁN HÀNG TRONG CA
            </div>
            <div className="flex justify-between items-center">
              <span>Số đơn đã phục vụ:</span>
              <span className="font-bold">{totalOrders} đơn</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Doanh thu chuyển khoản:</span>
              <span className="font-bold">{formatCurrency(totalBankTransfer)}</span>
            </div>
            <div className="border-b border-black my-1" />
            <div className="flex justify-between items-center font-black text-xs">
              <span>TỔNG DOANH THU TRONG CA:</span>
              <span>{formatCurrency(totalRevenue)}</span>
            </div>
          </div>

          <div className="border-b border-dashed border-black my-3" />

          <div className="grid grid-cols-2 gap-4 mt-5 text-center text-[10px]">
            <div>
              <p className="font-bold">Thu ngân bàn giao</p>
              <p className="italic text-[9px] text-zinc-500">(Ký & ghi rõ họ tên)</p>
              <div className="h-12"></div>
              <p className="font-bold">{cashierDisplayName}</p>
            </div>
            <div>
              <p className="font-bold">Người nhận bàn giao</p>
              <p className="italic text-[9px] text-zinc-500">(Ký & ghi rõ họ tên)</p>
              <div className="h-12"></div>
              <p className="font-bold">..................................</p>
            </div>
          </div>

          <div className="text-center mt-3 text-[10px] font-bold">
            Xác nhận bàn giao đúng số tiền mặt trong két: {formatCurrency(closingCash)}
          </div>

          <div className="text-center mt-4 text-[9px] text-zinc-500 italic">
            Thời điểm in: {closedAtDisplay}<br/>
            Hệ thống Quản lý Vận hành Chuỗi F&B N70 POS
          </div>
        </div>,
        mountNode
      )}

      {/* Screen Interactive Modal (Hidden when printing) */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 print:hidden">
        <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 border border-zinc-200 flex flex-col max-h-[90vh]">
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
                  <p className="font-bold text-zinc-800 truncate">{cashierDisplayName}</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <Clock size={16} />
                </div>
                <div>
                  <p className="text-zinc-400 font-medium">Ca làm việc</p>
                  <p className="font-bold text-zinc-800 truncate" title={currentShift?.shiftName || shortShiftName}>
                    {shortShiftName}
                  </p>
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
              {/* 1. Cash Card - Highlight Cash Reconciliation with initialCash */}
              <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-5 text-white shadow-lg shadow-emerald-600/20 relative overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-100 flex items-center gap-1.5">
                      💵 Tổng tiền mặt trong két
                    </span>
                    <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl">
                      <Banknote size={20} className="text-white" />
                    </div>
                  </div>
                  <div className="text-2xl font-black tracking-tight mt-0.5 text-white">
                    {formatCurrency(closingCash)}
                  </div>
                </div>

                <div className="mt-3.5 pt-3 border-t border-emerald-500/50 space-y-1.5 text-xs">
                  <div className="flex justify-between text-emerald-100">
                    <span>Tiền đầu ca nhận bàn giao:</span>
                    <span className="font-bold text-white">{formatCurrency(initialCash)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-100">
                    <span>Tiền mặt phát sinh trong ca:</span>
                    <span className="font-bold text-white">+{formatCurrency(totalCash)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-200 font-bold pt-1.5 border-t border-emerald-500/30 text-xs">
                    <span>Tổng tiền mặt trong két hiện tại:</span>
                    <span className="text-amber-300 font-black">{formatCurrency(closingCash)}</span>
                  </div>
                </div>
              </div>

              {/* 2. Bank Transfer Card */}
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 text-white shadow-lg shadow-blue-500/15 relative overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-100">
                      💳 Chuyển khoản (VietQR / PayOS)
                    </span>
                    <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl">
                      <CreditCard size={20} className="text-white" />
                    </div>
                  </div>
                  <div className="text-2xl font-black tracking-tight mt-1">
                    {formatCurrency(totalBankTransfer)}
                  </div>
                </div>
                <p className="text-[11px] text-blue-100 mt-3 pt-3 border-t border-blue-500/40">
                  Tiền đã thanh toán qua tài khoản ngân hàng (Napas 247)
                </p>
              </div>

              {/* 3. Total Revenue Card */}
              <div className="bg-white border-2 border-orange-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                      💰 Doanh thu bán hàng trong ca
                    </span>
                    <div className="p-2 bg-orange-100 rounded-xl text-orange-600">
                      <Coins size={20} />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-orange-600 tracking-tight mt-1">
                    {formatCurrency(totalRevenue)}
                  </div>
                </div>
                <p className="text-[11px] text-zinc-400 mt-3 pt-3 border-t border-zinc-100">
                  = Tiền mặt ({formatCurrency(totalCash)}) + Chuyển khoản ({formatCurrency(totalBankTransfer)})
                </p>
              </div>

              {/* 4. Total Orders Served */}
              <div className="bg-white border-2 border-zinc-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                      📋 Đơn hàng đã phục vụ
                    </span>
                    <div className="p-2 bg-purple-100 rounded-xl text-purple-600">
                      <ClipboardList size={20} />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-zinc-900 tracking-tight mt-1">
                    {totalOrders} <span className="text-sm font-semibold text-zinc-500">đơn</span>
                  </div>
                </div>
                <p className="text-[11px] text-zinc-400 mt-3 pt-3 border-t border-zinc-100">
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
    </>
  );
};
