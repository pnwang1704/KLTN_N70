import React from 'react';
import { CheckCircle, Coffee } from 'lucide-react';

import { formatCurrency } from '../lib/utils';

interface SuccessScreenProps {
  order: any;
  onBackToMenu: () => void;
}

export const SuccessScreen: React.FC<SuccessScreenProps> = ({ order, onBackToMenu }) => {
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

      <div className="w-full bg-zinc-50 border border-zinc-200 rounded-3xl p-5 mb-8 flex flex-col items-center">
        <h3 className="font-bold text-zinc-900 mb-4">Thanh toán Online (Tùy chọn)</h3>
        <div className="p-2 bg-white rounded-2xl shadow-sm border border-zinc-100 mb-3">
          <img 
            src={`https://img.vietqr.io/image/VCB-1028824850-compact2.png?amount=${order.totalAmount}&addInfo=${order.id}&accountName=PHAN NHAT QUANG`}
            alt="VietQR"
            className="w-48 h-48 object-contain"
          />
        </div>
        <p className="text-center font-bold text-orange-600 text-lg mb-1">{formatCurrency(order.totalAmount)}</p>
        <p className="text-center text-xs text-zinc-500">Quét mã bằng App Ngân hàng hoặc Zalo. Nhân viên sẽ tự động xác nhận đơn.</p>
      </div>

      <button 
        onClick={onBackToMenu}
        className="w-full bg-orange-600 text-white rounded-xl py-3.5 font-bold active:scale-95 transition-transform"
      >
        Đặt thêm món
      </button>
    </div>
  );
};
