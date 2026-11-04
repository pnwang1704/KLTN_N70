import React, { useState } from 'react';
import { X, QrCode, CheckCircle2, XCircle, Clock, Store, Utensils, ShieldAlert } from 'lucide-react';
import { formatCurrency } from '../lib/utils';

interface QrOrderApprovalModalProps {
  isOpen: boolean;
  orders: any[];
  onClose: () => void;
  onConfirm: (orderId: string) => Promise<void>;
  onReject: (orderId: string, reason?: string) => Promise<void>;
}

function formatTableLabel(tableId?: string) {
  const raw = String(tableId || '').trim();
  if (!raw) return 'Chưa rõ';
  if (/^\d+$/.test(raw)) {
    return `B${String(parseInt(raw, 10)).padStart(2, '0')}`;
  }
  return raw.toUpperCase();
}

export const QrOrderApprovalModal: React.FC<QrOrderApprovalModalProps> = ({
  isOpen,
  orders,
  onClose,
  onConfirm,
  onReject,
}) => {
  const [processingId, setProcessingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConfirmClick = async (orderId: string) => {
    setProcessingId(orderId);
    try {
      await onConfirm(orderId);
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectClick = async (orderId: string) => {
    setProcessingId(orderId);
    try {
      await onReject(orderId, 'Đơn QR không hợp lệ hoặc bàn chưa có khách ngồi');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-zinc-50 rounded-3xl w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden shadow-2xl border border-zinc-200 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-white border-b border-zinc-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <QrCode size={22} />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-zinc-900 flex items-center gap-2">
                <span>Duyệt đơn gọi món từ QR</span>
                {orders.length > 0 && (
                  <span className="px-2.5 py-0.5 text-xs font-black rounded-full bg-amber-500 text-white">
                    {orders.length} chờ duyệt
                  </span>
                )}
              </h2>
              <p className="text-xs text-zinc-500">
                Kiểm tra bàn có khách thực tế trước khi duyệt chuyển đơn xuống Bếp (KDS)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-900 rounded-full hover:bg-zinc-100 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {orders.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mb-3">
                <CheckCircle2 size={34} />
              </div>
              <p className="text-base font-bold text-zinc-800">Không có đơn QR nào đang chờ duyệt</p>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm">
                Khi khách quét mã QR tại bàn và bấm đặt món, yêu cầu sẽ xuất hiện tại đây kèm chuông báo để thu ngân xác nhận.
              </p>
            </div>
          ) : (
            orders.map((order) => {
              const isBusy = processingId === order.id;
              const timeStr = order.createdAt
                ? new Date(order.createdAt).toLocaleTimeString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })
                : '';
              const totalQty = (order.items || []).reduce(
                (s: number, it: any) => s + Number(it.quantity || 1),
                0
              );

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-2xl border-2 border-amber-200/90 shadow-xs overflow-hidden"
                >
                  {/* Card Top Bar */}
                  <div className="px-4 py-3 bg-amber-50/70 border-b border-amber-100 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-orange-600 text-white text-sm font-black shadow-2xs">
                        <Store size={14} /> Bàn {formatTableLabel(order.tableId)} (Số {order.tableId})
                      </span>
                      <span className="text-xs font-mono font-bold text-zinc-500">
                        #{order.orderCode || order.id?.slice(0, 8)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800">
                      <Clock size={13} />
                      <span>Gửi lúc {timeStr}</span>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="p-4 divide-y divide-zinc-100">
                    {(order.items || []).map((item: any, idx: number) => {
                      const toppingsSum = (item.toppings || []).reduce(
                        (acc: number, t: any) => acc + Number(t.price || 0) * Number(t.quantity || 1),
                        0
                      );
                      const lineTotal = (Number(item.unitPrice || 0) + toppingsSum) * Number(item.quantity || 1);

                      return (
                        <div key={item.id || idx} className="py-2.5 first:pt-0 last:pb-0 flex justify-between items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-xs font-black">
                                x{item.quantity}
                              </span>
                              <span className="text-sm font-bold text-zinc-900">{item.productName}</span>
                              {item.size && (
                                <span className="px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 text-[11px] font-bold">
                                  Size {item.size}
                                </span>
                              )}
                            </div>
                            {item.toppings && item.toppings.length > 0 && (
                              <div className="text-xs text-zinc-500 mt-1 pl-8">
                                + {item.toppings.map((t: any) => `${t.toppingName}${t.quantity > 1 ? ` (x${t.quantity})` : ''}`).join(', ')}
                              </div>
                            )}
                            {item.note && (
                              <div className="text-xs text-orange-600 italic mt-0.5 pl-8">
                                Ghi chú: {item.note}
                              </div>
                            )}
                          </div>
                          <span className="text-sm font-bold text-zinc-900 shrink-0">
                            {formatCurrency(lineTotal)}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Card Footer: Total + Approve / Reject Buttons */}
                  <div className="px-4 py-3 bg-zinc-50 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <span className="text-xs text-zinc-500 font-medium flex items-center gap-1">
                        <Utensils size={12} /> Tổng cộng ({totalQty} món):
                      </span>
                      <span className="text-lg font-black text-blue-600">
                        {formatCurrency(Number(order.finalAmount || order.totalAmount || 0))}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleRejectClick(order.id)}
                        className="px-3.5 py-2.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                        title="Từ chối nếu bàn trống hoặc đơn đặt ảo"
                      >
                        <XCircle size={16} />
                        <span>Từ chối (Đơn ảo)</span>
                      </button>

                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleConfirmClick(order.id)}
                        className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                      >
                        <CheckCircle2 size={16} />
                        <span>{isBusy ? 'Đang xử lý...' : 'Duyệt & Chuyển Bếp'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Info Footer */}
        <div className="px-6 py-3 bg-white border-t border-zinc-200 flex items-center justify-between text-xs text-zinc-500">
          <span className="flex items-center gap-1.5">
            <ShieldAlert size={14} className="text-amber-600 shrink-0" />
            Đơn từ chối sẽ không đẩy vào Bếp (KDS) và không làm hao hụt tồn kho.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

