import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, Percent } from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import api from '../lib/axios';
import { useCart } from '../context/CartContext';
import { Receipt } from './Receipt';
import { io } from 'socket.io-client';
import { ErrorModal, WarningModal } from './ui/Modals';

interface PaymentModalProps {
  orderId: string;
  totalAmount: number;
  onClose: () => void;
  onSuccess: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ orderId, totalAmount, onClose, onSuccess }) => {
  const normalizedTotal = Math.round(Number(totalAmount) || 0);
  const [discountPercent, setDiscountPercent] = useState<number>(0);

  const discountAmount = Math.round((normalizedTotal * (discountPercent || 0)) / 100);
  const finalTotal = Math.max(0, normalizedTotal - discountAmount);

  const formatAmountInput = (val: number | string): string => {
    const digits = val.toString().replace(/\D/g, '');
    if (!digits) return '';
    return Number(digits).toLocaleString('vi-VN') + ' đ';
  };

  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER'>('CASH');
  const [amountPaidStr, setAmountPaidStr] = useState(formatAmountInput(finalTotal));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<any>(null);
  const [payOsQr, setPayOsQr] = useState<string>('');
  const [orderCode, setOrderCode] = useState<number | null>(null);
  const [warningMsg, setWarningMsg] = useState<{ title?: string; message: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<{ title?: string; error: string } | null>(null);
  const { clearCart } = useCart();

  useEffect(() => {
    setAmountPaidStr(formatAmountInput(finalTotal));
  }, [finalTotal]);

  const amountPaid = parseInt(amountPaidStr.replace(/\D/g, '') || '0', 10);
  const changeAmount = amountPaid - finalTotal;

  useEffect(() => {
    const userStr = localStorage.getItem('pos_user');
    const user = userStr ? JSON.parse(userStr) : null;
    const branchId = user?.branchId || 1;
    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3004';
    const socket = io(socketUrl);

    socket.on('connect', () => {
      socket.emit('joinBranchRoom', branchId.toString());
    });

    socket.on('order:paid', async (data: any) => {
      if (data.orderId === orderId && data.status === 'COMPLETED') {
        try {
          const res = await api.get(`/orders?branchId=${branchId}`);
          const foundOrder = res.data.find((o: any) => o.id === orderId);
          if (foundOrder) setCompletedOrder({ ...foundOrder, discountPercent, finalAmount: finalTotal, payment: { paymentMethod: 'BANK_TRANSFER', amount: finalTotal } });
        } catch (e) {
          console.error("Could not fetch order for receipt", e);
        }
        setIsSuccess(true);
        clearCart();
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [orderId, totalAmount, clearCart, discountPercent, finalTotal]);

  // Auto set amount paid to total if bank transfer
  useEffect(() => {
    if (paymentMethod === 'BANK_TRANSFER') {
      setAmountPaidStr(formatAmountInput(finalTotal));
      
      // Initialize PayOS link
      const initPayOs = async () => {
        try {
          const userStr = localStorage.getItem('pos_user');
          const user = userStr ? JSON.parse(userStr) : null;
          const resOrder = await api.get(`/orders?branchId=${user?.branchId || 1}`);
          const foundOrder = resOrder.data.find((o: any) => o.id === orderId);
          
          if (foundOrder && foundOrder.orderCode) {
            setOrderCode(foundOrder.orderCode);
            const res = await api.post('/payments/payos/create', {
              orderId,
              orderCode: foundOrder.orderCode,
              totalAmount: finalTotal
            });
            const data = res.data;
            // Generate VietQR image from PayOS response
            const qrUrl = `https://img.vietqr.io/image/${data.bin}-${data.accountNumber}-compact2.png?amount=${data.amount}&addInfo=${data.description}&accountName=${encodeURIComponent(data.accountName)}`;
            setPayOsQr(qrUrl);
          }
        } catch (e) {
          console.error('Failed to init PayOS', e);
        }
      };
      initPayOs();
    }
  }, [paymentMethod, finalTotal, orderId]);

  // Fallback Polling for PayOS
  useEffect(() => {
    if (paymentMethod === 'BANK_TRANSFER' && orderCode && !isSuccess) {
      const interval = setInterval(async () => {
        try {
          const res = await api.post('/payments/payos/status', { orderCode });
          if (res.data && res.data.paid) {
            const userStr = localStorage.getItem('pos_user');
            const user = userStr ? JSON.parse(userStr) : null;
            const branchId = user?.branchId || 1;
            const resOrder = await api.get(`/orders?branchId=${branchId}`);
            const foundOrder = resOrder.data.find((o: any) => o.id === orderId);
            if (foundOrder) setCompletedOrder({ ...foundOrder, discountPercent, finalAmount: finalTotal, payment: { paymentMethod: 'BANK_TRANSFER', amount: finalTotal } });
            setIsSuccess(true);
            clearCart();
          }
        } catch (e) {
          console.error('Polling payment status failed', e);
        }
      }, 3000); // Check every 3 seconds
      return () => clearInterval(interval);
    }
  }, [paymentMethod, orderCode, isSuccess, orderId, finalTotal, clearCart, discountPercent]);

  const handlePayment = async () => {
    if (amountPaid < finalTotal) {
      setWarningMsg({
        title: 'Chưa đủ tiền',
        message: 'Số tiền khách đưa chưa đủ so với tổng giá trị đơn hàng sau chiết khấu!'
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      await api.post(`/orders/${orderId}/pay`, {
        paymentMethod,
        amountPaid,
        discountPercent,
        finalAmount: finalTotal
      });
      
      // Fetch the order to get full details for the receipt
      try {
        const userStr = localStorage.getItem('pos_user');
        const user = userStr ? JSON.parse(userStr) : null;
        const res = await api.get(`/orders?branchId=${user?.branchId || 1}`);
        const foundOrder = res.data.find((o: any) => o.id === orderId);
        if (foundOrder) {
          setCompletedOrder({
            ...foundOrder,
            discountPercent,
            finalAmount: finalTotal,
            payment: { paymentMethod, amount: amountPaid }
          });
        }
      } catch (e) {
        console.error("Could not fetch order for receipt", e);
      }

      setIsSuccess(true);
      clearCart();
    } catch (error) {
      console.error(error);
      setErrorMsg({
        title: 'Thanh toán thất bại',
        error: 'Thanh toán thất bại! Vui lòng kiểm tra lại quyền thu ngân hoặc kết nối máy chủ.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    const user = JSON.parse(localStorage.getItem('pos_user') || '{}');
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm print:bg-white print:static print:inset-auto">
        <div className="bg-white rounded-2xl w-full max-w-sm p-8 flex flex-col items-center shadow-2xl print:hidden">
          <CheckCircle2 size={64} className="text-emerald-500 mb-4" strokeWidth={1.5} />
          <h2 className="text-2xl font-bold text-zinc-900 mb-2">Thanh toán thành công!</h2>
          <p className="text-zinc-500 mb-6 text-center">Hóa đơn đã được ghi nhận vào hệ thống.</p>
          <div className="flex flex-col gap-3 w-full">
            <button 
              onClick={() => {
                if (completedOrder) {
                  setTimeout(() => window.print(), 150);
                } else {
                  setWarningMsg({
                    title: 'Đang tải hóa đơn',
                    message: 'Đang tải dữ liệu hóa đơn, vui lòng thử lại sau giây lát!'
                  });
                }
              }}
              className="w-full py-3 bg-zinc-100 text-zinc-700 font-bold rounded-xl active:scale-95 transition-transform hover:bg-zinc-200 disabled:opacity-50"
            >
              In Hóa Đơn
            </button>
            <button 
              onClick={onSuccess}
              className="w-full py-3 bg-orange-600 text-white font-bold rounded-xl active:scale-95 transition-transform hover:bg-orange-700"
            >
              Đóng & Bắt đầu đơn mới
            </button>
          </div>
        </div>

        {/* Hidden printable receipt */}
        {completedOrder && <Receipt order={completedOrder} user={user} />}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between shrink-0">
          <h2 className="text-lg font-bold text-zinc-900">Thanh Toán Đơn Hàng</h2>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-900">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* Summary Card with Discount */}
          <div className="bg-orange-50/70 p-4 rounded-2xl border border-orange-100 space-y-3">
            <div className="flex justify-between items-center text-sm text-zinc-600">
              <span className="font-medium">Tạm tính:</span>
              <span className="font-semibold text-zinc-800">{formatCurrency(normalizedTotal)}</span>
            </div>

            {/* Discount input & quick chips */}
            <div className="space-y-2 pt-1 border-t border-orange-100/80">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-zinc-700 flex items-center gap-1">
                  <Percent size={14} className="text-orange-600" />
                  Chiết khấu đơn hàng:
                </label>
                <div className="relative w-24">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={discountPercent === 0 ? '' : discountPercent}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (isNaN(val) || val < 0) {
                        setDiscountPercent(0);
                      } else {
                        setDiscountPercent(Math.min(100, val));
                      }
                    }}
                    placeholder="0"
                    className="w-full pl-3 pr-7 py-1 text-right text-sm font-bold bg-white border border-orange-200 rounded-lg focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 text-zinc-900"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400 pointer-events-none">
                    %
                  </span>
                </div>
              </div>

              {/* Quick % chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
                {[0, 5, 10, 15, 20, 50].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setDiscountPercent(pct)}
                    className={cn(
                      "px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer shrink-0",
                      discountPercent === pct
                        ? "bg-orange-500 border-orange-500 text-white shadow-xs font-bold"
                        : "bg-white border-orange-200 text-zinc-600 hover:bg-orange-50 hover:text-orange-700"
                    )}
                  >
                    {pct === 0 ? '0%' : `${pct}%`}
                  </button>
                ))}
              </div>

              {discountPercent > 0 && (
                <div className="flex justify-between items-center text-xs text-emerald-600 font-semibold pt-1">
                  <span>Giảm giá ({discountPercent}%):</span>
                  <span>-{formatCurrency(discountAmount)}</span>
                </div>
              )}
            </div>

            {/* Final Total */}
            <div className="pt-2 border-t border-orange-200 flex justify-between items-center">
              <span className="font-bold text-orange-950">Tổng Cần Thu</span>
              <span className="text-2xl font-extrabold text-orange-600">{formatCurrency(finalTotal)}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-zinc-900 mb-3">Phương thức thanh toán</label>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setPaymentMethod('CASH')}
                className={cn("py-3 rounded-xl font-semibold border-2 transition-colors", paymentMethod === 'CASH' ? "border-orange-500 bg-orange-50 text-orange-700" : "border-zinc-200 bg-white text-zinc-600")}
              >
                Tiền mặt
              </button>
              <button 
                onClick={() => setPaymentMethod('BANK_TRANSFER')}
                className={cn("py-3 rounded-xl font-semibold border-2 transition-colors", paymentMethod === 'BANK_TRANSFER' ? "border-orange-500 bg-orange-50 text-orange-700" : "border-zinc-200 bg-white text-zinc-600")}
              >
                Chuyển khoản (QR)
              </button>
            </div>
          </div>

          {paymentMethod === 'CASH' ? (
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-semibold text-zinc-900">Tiền khách đưa</label>
                <button
                  type="button"
                  onClick={() => setAmountPaidStr(formatAmountInput(finalTotal))}
                  className={cn(
                    "px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer",
                    amountPaid === finalTotal
                      ? "bg-orange-600 text-white shadow-sm"
                      : "bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200"
                  )}
                >
                  Đúng số tiền ({formatCurrency(finalTotal)})
                </button>
              </div>
              <input 
                type="text" 
                value={amountPaidStr}
                onChange={(e) => {
                  const inputVal = e.target.value;
                  let digits = inputVal.replace(/\D/g, '');
                  if (inputVal.length < amountPaidStr.length && digits === amountPaidStr.replace(/\D/g, '')) {
                    digits = digits.slice(0, -1);
                  }
                  if (!digits) {
                    setAmountPaidStr('');
                  } else {
                    setAmountPaidStr(formatAmountInput(digits));
                  }
                }}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-lg font-bold text-zinc-900 focus:outline-none focus:border-orange-500 focus:bg-white"
                placeholder="0 đ"
              />
              <div className="mt-3">
                <p className="text-xs font-semibold text-zinc-500 mb-2">Chọn nhanh mệnh giá tiền mặt:</p>
                <div className="grid grid-cols-3 gap-2">
                  {[10000, 20000, 50000, 100000, 200000, 500000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAmountPaidStr(formatAmountInput(val))}
                      className={cn(
                        "py-2.5 px-2 text-xs font-bold rounded-xl border transition-all text-center cursor-pointer active:scale-95",
                        amountPaid === val
                          ? "bg-orange-500 border-orange-500 text-white shadow-sm"
                          : "bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100 hover:border-zinc-300"
                      )}
                    >
                      {formatCurrency(val)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-6 flex flex-col items-center">
              <div className="p-3 bg-white border-2 border-orange-100 rounded-2xl shadow-sm mb-3 min-h-[192px] flex items-center justify-center">
                {payOsQr ? (
                  <img 
                    src={payOsQr}
                    alt="VietQR"
                    className="w-48 h-48 object-contain"
                  />
                ) : (
                  <div className="text-sm text-zinc-500 animate-pulse">Đang tạo mã thanh toán...</div>
                )}
              </div>
              <p className="text-sm font-medium text-zinc-600 text-center px-4">
                Quét mã để thanh toán. Hệ thống sẽ tự động chốt đơn khi nhận được tiền.
              </p>
            </div>
          )}

          <div className="flex justify-between items-center mb-8 px-1">
            <span className="text-sm font-medium text-zinc-500">Tiền thối lại</span>
            <span className={cn("text-lg font-bold", changeAmount < 0 ? "text-red-500" : "text-emerald-600")}>
              {changeAmount < 0 ? 'Chưa đủ tiền' : formatCurrency(changeAmount)}
            </span>
          </div>

          <button 
            onClick={handlePayment}
            disabled={isSubmitting || changeAmount < 0}
            className="w-full py-4 bg-orange-600 text-white font-bold text-lg rounded-xl flex items-center justify-center disabled:opacity-50 active:scale-95 transition-transform"
          >
            {isSubmitting ? 'Đang xử lý...' : (paymentMethod === 'BANK_TRANSFER' ? 'Xác nhận đã nhận tiền' : 'Xác nhận Thanh toán')}
          </button>
        </div>
      </div>

      <WarningModal
        isOpen={!!warningMsg}
        onClose={() => setWarningMsg(null)}
        title={warningMsg?.title}
        message={warningMsg?.message || ''}
      />

      <ErrorModal
        isOpen={!!errorMsg}
        onClose={() => setErrorMsg(null)}
        title={errorMsg?.title}
        error={errorMsg?.error || ''}
      />
    </div>
  );
};
