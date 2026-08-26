import React, { useState, useEffect } from 'react';
import { X, CheckCircle2 } from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import api from '../lib/axios';
import { useCart } from '../context/CartContext';
import { Receipt } from './Receipt';
import { io } from 'socket.io-client';

interface PaymentModalProps {
  orderId: string;
  totalAmount: number;
  onClose: () => void;
  onSuccess: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ orderId, totalAmount, onClose, onSuccess }) => {
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER'>('CASH');
  const [amountPaidStr, setAmountPaidStr] = useState(totalAmount.toString());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<any>(null);
  const [payOsQr, setPayOsQr] = useState<string>('');
  const [orderCode, setOrderCode] = useState<number | null>(null);
  const { clearCart } = useCart();

  const amountPaid = parseInt(amountPaidStr.replace(/\D/g, '') || '0', 10);
  const changeAmount = amountPaid - totalAmount;

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
          if (foundOrder) setCompletedOrder({ ...foundOrder, payment: { paymentMethod: 'BANK_TRANSFER', amount: totalAmount } });
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
  }, [orderId, totalAmount, clearCart]);

  // Auto set amount paid to total if bank transfer
  useEffect(() => {
    if (paymentMethod === 'BANK_TRANSFER') {
      setAmountPaidStr(totalAmount.toString());
      
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
              totalAmount
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
  }, [paymentMethod, totalAmount, orderId]);

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
            if (foundOrder) setCompletedOrder({ ...foundOrder, payment: { paymentMethod: 'BANK_TRANSFER', amount: totalAmount } });
            setIsSuccess(true);
            clearCart();
          }
        } catch (e) {
          console.error('Polling payment status failed', e);
        }
      }, 3000); // Check every 3 seconds
      return () => clearInterval(interval);
    }
  }, [paymentMethod, orderCode, isSuccess, orderId, totalAmount, clearCart]);

  const handlePayment = async () => {
    if (amountPaid < totalAmount) return alert('Khách đưa chưa đủ tiền!');
    
    setIsSubmitting(true);
    try {
      await api.post(`/orders/${orderId}/pay`, {
        paymentMethod,
        amountPaid
      });
      
      // Fetch the order to get full details for the receipt
      try {
        const userStr = localStorage.getItem('pos_user');
        const user = userStr ? JSON.parse(userStr) : null;
        const res = await api.get(`/orders?branchId=${user?.branchId || 1}`);
        const foundOrder = res.data.find((o: any) => o.id === orderId);
        if (foundOrder) setCompletedOrder({ ...foundOrder, payment: { paymentMethod, amount: amountPaid } });
      } catch (e) {
        console.error("Could not fetch order for receipt", e);
      }

      setIsSuccess(true);
      clearCart();
    } catch (error) {
      console.error(error);
      alert('Thanh toán thất bại! Vui lòng kiểm tra lại JWT Token Thu ngân hoặc Server.');
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
                  alert('Đang tải dữ liệu hóa đơn, vui lòng thử lại sau giây lát!');
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
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-zinc-900">Thanh Toán Đơn Hàng</h2>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-900">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6 flex justify-between items-center bg-orange-50 p-4 rounded-xl border border-orange-100">
            <span className="font-semibold text-orange-900">Tổng Cần Thu</span>
            <span className="text-2xl font-bold text-orange-600">{formatCurrency(totalAmount)}</span>
          </div>

          <div className="mb-6">
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
            <div className="mb-4">
              <label className="block text-sm font-semibold text-zinc-900 mb-2">Tiền khách đưa</label>
              <input 
                type="text" 
                value={amountPaidStr}
                onChange={(e) => setAmountPaidStr(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-lg font-bold text-zinc-900 focus:outline-none focus:border-orange-500 focus:bg-white"
              />
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
    </div>
  );
};
