import React, { useState, useEffect } from 'react';
import { CheckCircle, Coffee } from 'lucide-react';
import { io } from 'socket.io-client';
import axios from 'axios';

import { formatCurrency } from '../lib/utils';

interface SuccessScreenProps {
  order: any;
  onBackToMenu: () => void;
}

export const SuccessScreen: React.FC<SuccessScreenProps> = ({ order, onBackToMenu }) => {
  const [payOsQr, setPayOsQr] = useState<string>('');
  const [isPaid, setIsPaid] = useState<boolean>(false);

  useEffect(() => {
    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3004';
    const socket = io(socketUrl);

    // Customer web joins the branch room (order.branchId) to receive events
    socket.on('connect', () => {
      socket.emit('joinBranchRoom', order.branchId?.toString() || '1');
    });

    socket.on('order:paid', (data: any) => {
      if (data.orderId === order.id && data.status === 'COMPLETED') {
        setIsPaid(true);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [order]);

  useEffect(() => {
    const initPayOs = async () => {
      try {
        if (order && order.orderCode) {
          const res = await axios.post('http://localhost:3000/payments/payos/create', {
            orderId: order.id,
            orderCode: order.orderCode,
            totalAmount: order.totalAmount
          });
          const data = res.data;
          const qrUrl = `https://img.vietqr.io/image/${data.bin}-${data.accountNumber}-compact2.png?amount=${data.amount}&addInfo=${data.description}&accountName=${encodeURIComponent(data.accountName)}`;
          setPayOsQr(qrUrl);
        }
      } catch (e) {
        console.error('Failed to init PayOS', e);
      }
    };
    if (!isPaid) {
      initPayOs();
    }
  }, [order, isPaid]);

  // Fallback Polling
  useEffect(() => {
    if (!isPaid && order && order.orderCode) {
      const interval = setInterval(async () => {
        try {
          const res = await axios.post('http://localhost:3000/payments/payos/status', { orderCode: order.orderCode });
          if (res.data && res.data.paid) {
            setIsPaid(true);
          }
        } catch (e) {
          console.error('Polling status failed', e);
        }
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isPaid, order]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white p-6 animate-in fade-in duration-500">
      <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
        <CheckCircle size={48} className="text-emerald-500" strokeWidth={1.5} />
      </div>
      
      <h2 className="text-2xl font-bold text-zinc-900 mb-2 text-center">Đặt món thành công!</h2>
      <p className="text-zinc-500 text-center mb-8 max-w-[280px]">
        Bếp đang chuẩn bị những món ăn tuyệt vời nhất cho bạn. Vui lòng chờ trong chốc lát nhé.
      </p>

      <div className="p-4 bg-orange-50 rounded-2xl flex items-center gap-3 mb-6 w-full">
        <Coffee className="text-orange-500 shrink-0" />
        <span className="text-sm font-medium text-orange-800">Bếp đang chuẩn bị món. Bạn có thể thanh toán tại quầy hoặc chuyển khoản ngay dưới đây.</span>
      </div>

      {isPaid ? (
        <div className="w-full bg-emerald-50 border border-emerald-200 rounded-3xl p-5 mb-8 flex flex-col items-center">
          <CheckCircle size={40} className="text-emerald-500 mb-2" />
          <h3 className="font-bold text-emerald-700 text-lg">Đã thanh toán thành công</h3>
          <p className="text-emerald-600 text-sm mt-1">Cảm ơn bạn. Bếp sẽ ưu tiên món của bạn!</p>
        </div>
      ) : (
        <div className="w-full bg-zinc-50 border border-zinc-200 rounded-3xl p-5 mb-8 flex flex-col items-center">
          <h3 className="font-bold text-zinc-900 mb-4">Thanh toán Online (Tùy chọn)</h3>
          <div className="p-2 bg-white rounded-2xl shadow-sm border border-zinc-100 mb-3 min-h-[192px] flex items-center justify-center">
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
          <p className="text-center font-bold text-orange-600 text-lg mb-1">{formatCurrency(order.totalAmount)}</p>
          <p className="text-center text-xs text-zinc-500">Quét mã bằng App Ngân hàng hoặc Zalo. Nhân viên sẽ tự động xác nhận đơn.</p>
        </div>
      )}

      <button 
        onClick={onBackToMenu}
        className="w-full bg-orange-600 text-white rounded-xl py-3.5 font-bold active:scale-95 transition-transform"
      >
        Đặt thêm món
      </button>
    </div>
  );
};
