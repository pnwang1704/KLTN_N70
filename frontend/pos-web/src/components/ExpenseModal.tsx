import React, { useState } from 'react';
import { X, Receipt, Banknote, FileText, User, Printer, Check, AlertCircle } from 'lucide-react';
import api from '../lib/axios';
import { formatCurrency, formatDateTimeFull } from '../lib/utils';
import type { ShiftSession } from './ShiftSelectModal';

export interface ExpenseReceiptData {
  id: string;
  branchId: string;
  cashierName: string;
  shiftName: string;
  amount: number;
  reason: string;
  note?: string;
  createdAt?: string | Date;
}

/**
 * High-reliability 80mm thermal receipt printing via isolated hidden iframe
 */
export const printExpenseReceipt = (data: ExpenseReceiptData) => {
  const shortId = data.id ? data.id.slice(0, 8).toUpperCase() : Date.now().toString().slice(-6);
  const timeStr = formatDateTimeFull(data.createdAt || new Date().toISOString());
  const cleanShift = data.shiftName.replace(/\s*\(.*?\)/, '').trim() || data.shiftName;

  const html = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Phiếu Chi Tiền Mặt - #EXP-${shortId}</title>
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
        margin-top: 3px;
      }
      .dashed {
        border-bottom: 1px dashed #000;
        margin: 6px 0;
      }
      .solid {
        border-bottom: 1.5px solid #000;
        margin: 6px 0;
      }
      .row {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin: 3px 0;
      }
      .row-label {
        font-weight: normal;
        color: #222;
        width: 40%;
        flex-shrink: 0;
      }
      .row-value {
        font-weight: bold;
        text-align: right;
        width: 60%;
        word-break: break-word;
      }
      .amount-box {
        margin: 6px 0;
        padding: 6px 0;
        text-align: center;
      }
      .amount-title {
        font-size: 11px;
        font-weight: bold;
        text-transform: uppercase;
      }
      .amount-val {
        font-size: 16px;
        font-weight: 900;
        margin-top: 2px;
      }
      .signatures {
        display: flex;
        justify-content: space-between;
        margin-top: 16px;
        page-break-inside: avoid;
      }
      .sign-col {
        width: 48%;
        text-align: center;
        font-size: 10px;
      }
      .sign-space {
        height: 48px;
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
      <div style="font-size: 10px; margin-top: 2px;">Chi nhánh ${data.branchId} • Hệ thống F&B Chuỗi</div>
      <div style="font-size: 9px; color: #444;">12 Nguyễn Văn Bảo, P.4, Q.Gò Vấp, TP.HCM</div>
      <div class="solid"></div>
      <div class="subtitle uppercase">PHIẾU CHI TIỀN MẶT</div>
      <div style="font-size: 10px; font-weight: bold; margin-top: 2px;">Mã phiếu: #EXP-${shortId}</div>
    </div>

    <div class="dashed"></div>

    <div>
      <div class="row">
        <span class="row-label">Thời gian:</span>
        <span class="row-value">${timeStr}</span>
      </div>
      <div class="row">
        <span class="row-label">Chi nhánh:</span>
        <span class="row-value">Chi nhánh ${data.branchId}</span>
      </div>
      <div class="row">
        <span class="row-label">Thu ngân:</span>
        <span class="row-value">${data.cashierName} (${cleanShift})</span>
      </div>
    </div>

    <div class="dashed"></div>

    <div>
      <div class="row">
        <span class="row-label">Lý do chi:</span>
        <span class="row-value">${data.reason}</span>
      </div>
      <div class="row">
        <span class="row-label">Người nhận:</span>
        <span class="row-value">${data.note || 'Không có ghi chú'}</span>
      </div>
    </div>

    <div class="solid"></div>

    <div class="amount-box">
      <div class="amount-title">SỐ TIỀN CHI</div>
      <div class="amount-val">${formatCurrency(data.amount)}</div>
    </div>

    <div class="solid"></div>

    <div class="signatures">
      <div class="sign-col">
        <div class="font-bold">Người nhận tiền</div>
        <div class="italic">(Ký, họ tên)</div>
        <div class="sign-space"></div>
        <div class="font-bold">${data.note ? data.note.slice(0, 25) : '....................'}</div>
      </div>
      <div class="sign-col">
        <div class="font-bold">Người lập phiếu</div>
        <div class="italic">(Ký, họ tên)</div>
        <div class="sign-space"></div>
        <div class="font-bold">${data.cashierName}</div>
      </div>
    </div>

    <div class="footer">
      Thời điểm in: ${formatDateTimeFull(new Date().toISOString())}<br/>
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
      console.error('Lỗi khi kích hoạt in phiếu chi:', e);
    } finally {
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1500);
    }
  }, 250);
};

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentShift: ShiftSession | null;
  branchId: string;
  onExpenseCreated?: (expense: any) => void;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  currentShift,
  branchId,
  onExpenseCreated,
}) => {
  const [amount, setAmount] = useState<number>(50000);
  const [amountStr, setAmountStr] = useState<string>('50.000 đ');
  const [reason, setReason] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  if (!isOpen) return null;

  // Handle typing numbers smoothly without cursor jumps
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const raw = input.value;
    const digits = raw.replace(/\D/g, '');

    if (!digits) {
      setAmount(0);
      setAmountStr('');
      return;
    }

    const num = parseInt(digits, 10);
    if (num > 100000000000) return; // Prevent overflow

    const formatted = `${num.toLocaleString('vi-VN')} đ`;
    setAmount(num);
    setAmountStr(formatted);

    // Keep cursor right before ' đ'
    requestAnimationFrame(() => {
      const pos = Math.max(0, formatted.length - 2);
      input.setSelectionRange(pos, pos);
    });
  };

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
            setAmount(0);
            setAmountStr('');
          } else {
            const newNum = parseInt(newDigits, 10);
            const formatted = `${newNum.toLocaleString('vi-VN')} đ`;
            setAmount(newNum);
            setAmountStr(formatted);
            requestAnimationFrame(() => {
              const pos = Math.max(0, formatted.length - 2);
              input.setSelectionRange(pos, pos);
            });
          }
        }
      }
    }
  };

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

  const handleSubmit = async (shouldPrint: boolean) => {
    if (!amount || amount <= 0) {
      setErrorMsg('Vui lòng nhập số tiền chi hợp lệ (> 0 VNĐ)');
      return;
    }
    if (!reason.trim()) {
      setErrorMsg('Vui lòng nhập lý do chi tiền mặt');
      return;
    }

    setErrorMsg('');
    setSubmitting(true);

    try {
      const payload = {
        branchId: branchId || '1',
        cashierId: currentShift?.cashierId,
        amount: Number(amount),
        reason: reason.trim(),
        note: note.trim() || undefined,
      };

      const res = await api.post('/orders/expenses', payload);
      const createdExpense = res.data;

      if (shouldPrint) {
        printExpenseReceipt({
          id: createdExpense?.id || '',
          branchId: branchId || '1',
          cashierName: currentShift?.cashierName || 'Thu ngân',
          shiftName: currentShift?.shiftName || 'Ca làm việc',
          amount: Number(amount),
          reason: reason.trim(),
          note: note.trim() || undefined,
          createdAt: createdExpense?.createdAt || new Date().toISOString(),
        });
      }

      if (onExpenseCreated) {
        onExpenseCreated(createdExpense);
      }

      // Reset & close
      setAmount(50000);
      setAmountStr('50.000 đ');
      setReason('');
      setNote('');
      onClose();
    } catch (err: any) {
      console.error('Lỗi khi tạo phiếu chi tiền mặt:', err);
      setErrorMsg(err.response?.data?.message || 'Không thể tạo phiếu chi, vui lòng thử lại');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-zinc-200 animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-rose-600 via-red-600 to-amber-600 p-5 text-white flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-inner">
              <Receipt className="text-white" size={22} />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight">Tạo Phiếu Chi Tiền Mặt</h3>
              <p className="text-rose-100 text-xs mt-0.5">
                Ghi nhận các khoản chi phát sinh từ két tiền mặt trong ca trực
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2.5 text-xs text-red-700 font-semibold animate-in fade-in">
              <AlertCircle size={16} className="shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Số tiền chi */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Banknote size={15} className="text-rose-600" />
              <span>Số tiền chi (VNĐ) <span className="text-red-500">*</span></span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={amountStr}
                onChange={handleAmountChange}
                onKeyDown={handleKeyDown}
                onFocus={handleFocusOrClick}
                onClick={handleFocusOrClick}
                placeholder="0 đ"
                className="w-full px-4 py-3 bg-zinc-50 border-2 border-zinc-200 focus:border-rose-500 focus:bg-white rounded-2xl text-lg font-black text-rose-600 focus:outline-none transition-all shadow-inner"
              />
            </div>
          </div>

          {/* 2. Lý do chi */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <FileText size={15} className="text-rose-600" />
              <span>Lý do chi tiền mặt <span className="text-red-500">*</span></span>
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ví dụ: Mua 2 bao đá viên, mua thêm sữa tươi TH..."
              className="w-full px-4 py-3 bg-zinc-50 border-2 border-zinc-200 focus:border-rose-500 focus:bg-white rounded-2xl text-sm font-semibold text-zinc-900 focus:outline-none transition-all shadow-inner"
            />
          </div>

          {/* 3. Người nhận / Ghi chú */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <User size={15} className="text-rose-600" />
              <span>Người nhận tiền / Ghi chú (Tùy chọn)</span>
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ví dụ: Anh Ba giao đá (0901234567), Hóa đơn số 012..."
              className="w-full px-4 py-2.5 bg-zinc-50 border-2 border-zinc-200 focus:border-rose-500 focus:bg-white rounded-2xl text-sm font-medium text-zinc-800 focus:outline-none transition-all shadow-inner"
            />
          </div>

          {/* Shift info note */}
          <div className="p-3 bg-rose-50/70 border border-rose-100 rounded-2xl text-xs text-rose-900 flex items-start gap-2">
            <span className="text-rose-500 font-bold">ℹ️</span>
            <div>
              Khoản tiền này sẽ được <strong>tự động khấu trừ</strong> vào tổng tiền mặt trong két khi kết ca làm việc của bạn.
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="w-1/4 py-3 px-3 rounded-2xl border border-zinc-300 font-bold text-zinc-600 text-xs hover:bg-zinc-200 transition-colors cursor-pointer"
          >
            Hủy
          </button>

          <button
            type="button"
            onClick={() => handleSubmit(false)}
            disabled={submitting}
            className="flex-1 py-3 px-4 bg-white border-2 border-rose-600 hover:bg-rose-50 text-rose-700 font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-50"
          >
            <Check size={16} />
            <span>{submitting ? 'Đang lưu...' : 'Lưu phiếu'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleSubmit(true)}
            disabled={submitting}
            className="flex-1 py-3 px-4 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-rose-600/25 transition-all cursor-pointer disabled:opacity-50"
          >
            <Printer size={16} />
            <span>{submitting ? 'Đang lưu & in...' : 'Lưu & In phiếu chi'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
