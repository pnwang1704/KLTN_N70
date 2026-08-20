import React from 'react';
import { CheckCircle, Coffee } from 'lucide-react';

interface SuccessScreenProps {
  onBackToMenu: () => void;
}

export const SuccessScreen: React.FC<SuccessScreenProps> = ({ onBackToMenu }) => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white p-6 animate-in fade-in duration-500">
      <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
        <CheckCircle size={48} className="text-emerald-500" strokeWidth={1.5} />
      </div>
      
      <h2 className="text-2xl font-bold text-zinc-900 mb-2 text-center">Đặt món thành công!</h2>
      <p className="text-zinc-500 text-center mb-8 max-w-[280px]">
        Bếp đang chuẩn bị những món ăn tuyệt vời nhất cho bạn. Vui lòng chờ trong chốc lát nhé.
      </p>

      <div className="p-4 bg-orange-50 rounded-2xl flex items-center gap-3 mb-12">
        <Coffee className="text-orange-500" />
        <span className="text-sm font-medium text-orange-800">Bạn có muốn gọi thêm đồ uống?</span>
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
