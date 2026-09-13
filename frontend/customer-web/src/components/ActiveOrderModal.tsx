import React from 'react';
import { X, Receipt, AlertCircle, RefreshCw, Clock, CheckCircle2 } from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';

interface ActiveOrderModalProps {
  orders: any[];
  tableId: string;
  onClose: () => void;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export const ActiveOrderModal: React.FC<ActiveOrderModalProps> = ({
  orders,
  tableId,
  onClose,
  onRefresh,
  isLoading = false,
}) => {
  // Aggregate total items and total amount across all active orders
  const totalItemsCount = orders.reduce((sum, o) => {
    return sum + (o.items?.reduce((itemSum: number, item: any) => itemSum + Number(item.quantity || 1), 0) || 0);
  }, 0);

  const grandTotal = orders.reduce((sum, o) => {
    return sum + Number(o.finalAmount || o.totalAmount || 0);
  }, 0);

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock size={10} /> Đang pha chế
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={10} /> Đã xong
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock size={10} /> Đã gửi bếp
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full sm:max-w-md h-full sm:h-[92vh] sm:max-h-[820px] sm:rounded-3xl bg-zinc-50 flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-white border-b border-zinc-200 px-4 py-3 flex items-center justify-between shadow-xs sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <button 
            onClick={onClose} 
            className="p-1.5 -ml-1.5 text-zinc-600 hover:text-zinc-900 rounded-full hover:bg-zinc-100 transition-colors"
            aria-label="Đóng"
          >
            <X size={22} />
          </button>
          <div>
            <h2 className="text-base font-bold text-zinc-900 flex items-center gap-1.5">
              <Receipt size={18} className="text-orange-600" />
              Món đã gọi • Bàn {tableId}
            </h2>
            <p className="text-[11px] text-zinc-500">
              {orders.length > 1 ? `${orders.length} đợt gọi món` : 'Đơn hàng hiện tại của bàn'}
            </p>
          </div>
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2 text-zinc-500 hover:text-orange-600 rounded-full hover:bg-orange-50 transition-colors cursor-pointer"
            title="Tải lại danh sách"
          >
            <RefreshCw size={18} className={cn(isLoading && 'animate-spin text-orange-600')} />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 pb-32">
        {orders.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-400 py-16">
            <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center mb-3">
              <Receipt size={32} className="text-orange-400" />
            </div>
            <p className="text-base font-bold text-zinc-800">Chưa có món nào được gọi</p>
            <p className="text-xs text-zinc-500 mt-1 max-w-xs text-center">
              Các món bạn đã xác nhận đặt sẽ xuất hiện tại đây để bạn tiện theo dõi.
            </p>
            <button
              onClick={onClose}
              className="mt-5 px-6 py-2.5 bg-orange-600 text-white text-xs font-bold rounded-xl shadow-xs hover:bg-orange-700 transition-colors"
            >
              Chọn món ngay
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Orders list (grouped by round) */}
            {orders.map((order, orderIndex) => {
              const orderTime = order.createdAt 
                ? new Date(order.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                : '';
              
              return (
                <div key={order.id || orderIndex} className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs overflow-hidden">
                  {/* Order header */}
                  <div className="bg-zinc-50/80 px-3.5 py-2 border-b border-zinc-100 flex items-center justify-between text-xs">
                    <span className="font-bold text-zinc-700">
                      Đợt {orderIndex + 1} {orderTime && <span className="text-[11px] font-normal text-zinc-400">• {orderTime}</span>}
                    </span>
                    <span className="text-[11px] font-mono text-zinc-400">
                      #{order.id?.split('-')[0]}
                    </span>
                  </div>

                  {/* Order items */}
                  <div className="divide-y divide-zinc-100 p-1">
                    {order.items?.map((item: any, itemIdx: number) => {
                      const toppingsTotal = item.toppings?.reduce(
                        (tSum: number, t: any) => tSum + Number(t.price || 0) * Number(t.quantity || 1),
                        0
                      ) || 0;
                      const itemSubtotal = (Number(item.unitPrice || 0) + toppingsTotal) * Number(item.quantity || 1);

                      return (
                        <div key={item.id || itemIdx} className="p-3 flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-sm text-zinc-900">
                                {item.productName}
                              </span>
                              {item.size && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-zinc-100 text-zinc-600">
                                  Size {item.size}
                                </span>
                              )}
                            </div>

                            {/* Toppings list */}
                            {item.toppings && item.toppings.length > 0 && (
                              <div className="mt-1 space-y-0.5">
                                {item.toppings.map((t: any, tIdx: number) => (
                                  <div key={t.id || tIdx} className="text-xs text-zinc-500 flex items-center gap-1">
                                    <span className="text-orange-500 font-bold">+</span>
                                    <span>{t.toppingName}</span>
                                    {t.quantity > 1 && <span className="font-bold text-zinc-700">x{t.quantity}</span>}
                                    <span className="text-zinc-400">({formatCurrency(Number(t.price))})</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Note */}
                            {item.note && (
                              <p className="text-xs text-orange-600 italic mt-1">
                                Ghi chú: {item.note}
                              </p>
                            )}

                            {/* Status tag */}
                            <div className="mt-1.5">
                              {renderStatusBadge(item.itemStatus || order.status)}
                            </div>
                          </div>

                          {/* Quantity & Price */}
                          <div className="text-right shrink-0 flex flex-col items-end justify-between self-stretch">
                            <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                              x{item.quantity}
                            </span>
                            <span className="text-sm font-bold text-zinc-900 mt-2">
                              {formatCurrency(itemSubtotal)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Order round footer (if multiple orders) */}
                  {orders.length > 1 && (
                    <div className="bg-zinc-50/50 px-3 py-2 border-t border-zinc-100 flex justify-between items-center text-xs">
                      <span className="text-zinc-500">Tạm tính đợt {orderIndex + 1}</span>
                      <span className="font-bold text-zinc-700">
                        {formatCurrency(Number(order.finalAmount || order.totalAmount || 0))}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Note box */}
            <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-3.5 flex items-start gap-3 text-amber-900 shadow-xs">
              <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed">
                <p className="font-bold text-amber-950">Lưu ý thanh toán:</p>
                <p className="mt-0.5 text-amber-800">
                  Vui lòng báo <strong>số bàn ({tableId})</strong> và thanh toán tại quầy thu ngân khi ra về.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sticky Bottom Summary */}
      {orders.length > 0 && (
        <div className="absolute bottom-0 left-0 w-full bg-white border-t border-zinc-200 p-4 pb-6 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] z-20">
          <div className="flex justify-between items-center mb-3 px-1">
            <div>
              <span className="text-xs text-zinc-500 block">Tổng tiền tạm tính</span>
              <span className="text-xs font-semibold text-zinc-700">({totalItemsCount} món đã gọi)</span>
            </div>
            <span className="text-2xl font-black text-orange-600">
              {formatCurrency(grandTotal)}
            </span>
          </div>
          <button 
            onClick={onClose}
            className="w-full bg-orange-600 text-white rounded-xl py-3 text-sm font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform hover:bg-orange-700 shadow-xs cursor-pointer"
          >
            Tiếp tục gọi món
          </button>
        </div>
      )}
      </div>
    </div>
  );
};

