import React from 'react';
import { 
  CheckCircle2, 
  Utensils, 
  Receipt, 
  Clock, 
  ChefHat, 
  Plus, 
  Hash,
  Store
} from 'lucide-react';
import { formatCurrency } from '../lib/utils';

interface SuccessScreenProps {
  order: any;
  onBackToMenu: () => void;
}

export const SuccessScreen: React.FC<SuccessScreenProps> = ({ order, onBackToMenu }) => {
  const items = order?.items || [];
  const orderTime = order?.createdAt 
    ? new Date(order.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

  const totalAmount = order?.finalAmount ?? order?.totalAmount ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-50 animate-in fade-in duration-300">
      {/* Scrollable Container */}
      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-md mx-auto w-full pb-28">
        
        {/* Header Icon & Message */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-20 h-20 bg-emerald-100/80 rounded-full flex items-center justify-center mb-4 ring-8 ring-emerald-50">
            <CheckCircle2 size={44} className="text-emerald-600 animate-in zoom-in-50 duration-300" strokeWidth={2} />
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 mb-2">
            <ChefHat size={14} /> Đã gửi món vào bếp
          </span>
          <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Đặt món thành công!</h1>
          <p className="text-zinc-500 text-sm mt-1 max-w-[280px]">
            Đơn của bạn đã được chuyển tới Bếp và quầy Thu ngân.
          </p>
        </div>

        {/* Thông tin Bàn & Đơn hàng Card */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-zinc-200/80 mb-4">
          <div className="grid grid-cols-2 gap-3 divide-x divide-zinc-100">
            {/* Bàn số */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 shrink-0">
                <Store size={20} />
              </div>
              <div>
                <div className="text-xs text-zinc-500 font-medium">Bàn phục vụ</div>
                <div className="text-lg font-bold text-zinc-900">Bàn {order?.tableId || '1'}</div>
              </div>
            </div>

            {/* Mã đơn hàng */}
            <div className="flex items-center gap-3 pl-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                <Hash size={20} />
              </div>
              <div className="overflow-hidden">
                <div className="text-xs text-zinc-500 font-medium">Mã đơn</div>
                <div className="text-sm font-bold text-zinc-900 font-mono truncate">
                  #{order?.orderCode || (order?.id ? order.id.slice(0, 8).toUpperCase() : '---')}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
            <span className="flex items-center gap-1">
              <Clock size={13} /> Thời gian gọi: <strong className="text-zinc-700">{orderTime}</strong>
            </span>
            <span className="px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 font-medium">
              Ăn tại bàn
            </span>
          </div>
        </div>

        {/* Thông báo Thanh toán Sau (Post-pay Banner) */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-2xl p-4 mb-4 flex items-start gap-3 shadow-xs">
          <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0 mt-0.5">
            <Receipt size={20} />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-amber-900 mb-1">Thanh toán tại quầy khi kết thúc bữa ăn</h3>
            <p className="text-xs text-amber-800 leading-relaxed">
              Bếp đã tiếp nhận đơn và đang chuẩn bị món. Quý khách vui lòng thanh toán tại quầy thu ngân khi dùng bữa xong.
            </p>
            <p className="text-[11px] text-amber-700 mt-1.5 italic">
              * Quý khách chỉ cần báo <strong>Bàn {order?.tableId || '1'}</strong> cho nhân viên thu ngân.
            </p>
          </div>
        </div>

        {/* Bảng tóm tắt danh sách món */}
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200/80 overflow-hidden mb-4">
          <div className="px-4 py-3 bg-zinc-50/70 border-b border-zinc-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Utensils size={16} className="text-zinc-500" />
              <h3 className="font-bold text-sm text-zinc-800">Chi tiết món đã gọi</h3>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-zinc-200 text-zinc-700">
              {items.length} món
            </span>
          </div>

          <div className="divide-y divide-zinc-100 px-4">
            {items.length === 0 ? (
              <div className="py-4 text-center text-xs text-zinc-400">
                Đơn hàng đã được tiếp nhận
              </div>
            ) : (
              items.map((item: any, index: number) => {
                const toppingTotal = (item.toppings || []).reduce(
                  (sum: number, t: any) => sum + (Number(t.price || 0) * Number(t.quantity || 1)),
                  0
                );
                const itemTotal = (Number(item.unitPrice || 0) + toppingTotal) * Number(item.quantity || 1);

                return (
                  <div key={item.id || index} className="py-3 flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-zinc-900 leading-snug">
                          {item.productName}
                        </span>
                      </div>

                      <div className="text-xs text-zinc-500 mt-0.5 space-x-1">
                        {item.size && (
                          <span className="inline-block bg-zinc-100 px-1.5 py-0.5 rounded text-[11px] font-medium text-zinc-700">
                            Size {item.size}
                          </span>
                        )}
                        {(item.toppings || []).map((t: any, tIdx: number) => (
                          <span key={tIdx} className="inline-block text-zinc-500 text-[11px]">
                            + {t.toppingName} {t.quantity > 1 ? `(x${t.quantity})` : ''}
                          </span>
                        ))}
                      </div>

                      {item.note && (
                        <div className="text-[11px] text-orange-600 mt-1 italic">
                          Ghi chú: {item.note}
                        </div>
                      )}

                      <div className="text-xs text-zinc-400 mt-1">
                        Đơn giá: {formatCurrency(item.unitPrice)}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md inline-block mb-1">
                        x{item.quantity}
                      </div>
                      <div className="text-sm font-bold text-zinc-900">
                        {formatCurrency(itemTotal)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Tổng tiền tạm tính */}
          <div className="px-4 py-3 bg-zinc-50 border-t border-zinc-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-zinc-700">Tổng tiền tạm tính:</span>
            <span className="text-lg font-black text-orange-600">
              {formatCurrency(totalAmount)}
            </span>
          </div>
        </div>

      </div>

      {/* Fixed Sticky Footer Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-zinc-200 shadow-lg z-10">
        <div className="max-w-md mx-auto">
          <button 
            onClick={onBackToMenu}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white rounded-xl py-3.5 px-4 font-bold flex items-center justify-center gap-2 active:scale-98 transition-all shadow-sm cursor-pointer"
          >
            <Plus size={20} strokeWidth={2.5} />
            <span>Đặt thêm món</span>
          </button>
        </div>
      </div>
    </div>
  );
};
