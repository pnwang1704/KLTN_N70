import React, { useState } from 'react';
import { X, ChevronRight, FileText, QrCode, Store } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { formatCurrency } from '../lib/utils';
import { getStoredTableSession, formatTableBadge } from '../hooks/useTableSession';
import api from '../lib/axios';

interface CartModalProps {
  branchId: string;
  tableId: string;
  onClose: () => void;
  onSuccess: (order: any) => void;
  onRequestSelectTable?: () => void;
}

export const CartModal: React.FC<CartModalProps> = ({
  branchId,
  tableId,
  onClose,
  onSuccess,
  onRequestSelectTable,
}) => {
  const { cart, updateQuantity, removeFromCart, totalAmount, clearCart } = useCart();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>('');

  // Ưu tiên lấy tableId trực tiếp từ sessionStorage để đảm bảo chính xác khi gọi POST /orders
  const storedSession = getStoredTableSession();
  const resolvedTableId = storedSession.tableId || tableId;
  const tableBadge = formatTableBadge(resolvedTableId);

  const handleSubmitOrder = async () => {
    if (cart.length === 0) return;

    const latestStored = getStoredTableSession();
    const targetTableId = latestStored.tableId || tableId;
    const targetBranchId = latestStored.branchId || branchId || '1';

    if (!targetTableId) {
      setSubmitError('Vui lòng quét mã QR tại bàn để đặt món!');
      return;
    }

    setSubmitError('');
    setIsSubmitting(true);
    try {
      const safeTotal = Math.round(Number(totalAmount) || 0);
      const payload = {
        branchId: targetBranchId,
        tableId: targetTableId,
        orderType: 'AT_TABLE',
        source: 'QR',
        totalAmount: safeTotal,
        finalAmount: safeTotal,
        items: cart.map(item => ({
          productId: item.productId,
          productName: item.productName,
          size: item.size || undefined,
          quantity: item.quantity,
          unitPrice: Math.round(Number(item.unitPrice) || 0),
          note: item.note || undefined,
          toppings: item.toppings.map(t => ({
            toppingId: t.toppingId,
            toppingName: t.toppingName,
            price: Math.round(Number(t.price) || 0),
            quantity: t.quantity
          }))
        }))
      };

      const res = await api.post('/orders', payload);
      clearCart();
      onSuccess(res.data);
    } catch (error: any) {
      console.error(error);
      const serverMsg = error?.response?.data?.message;
      setSubmitError(
        typeof serverMsg === 'string'
          ? serverMsg
          : Array.isArray(serverMsg)
          ? serverMsg.join(', ')
          : 'Có lỗi xảy ra khi gửi đơn hàng về quầy. Vui lòng thử lại!'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full sm:max-w-md h-full sm:h-[92vh] sm:max-h-[820px] sm:rounded-3xl bg-zinc-50 flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-white border-b border-zinc-200 px-4 py-3 flex items-center shadow-sm shrink-0">
          <button onClick={onClose} className="p-2 -ml-2 text-zinc-600 hover:text-zinc-900 rounded-full cursor-pointer">
            <X size={24} />
          </button>

          <div className="flex-1 text-center pr-8">
            <h2 className="text-lg font-bold text-zinc-900">Giỏ hàng của bạn</h2>
            {tableBadge && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-600">
                <Store size={11} /> Bàn số: {tableBadge}
              </span>
            )}
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 pb-36">
          {!resolvedTableId && (
            <div className="mb-4 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-3 text-amber-900">
              <div className="flex items-start gap-2.5 text-xs">
                <QrCode size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Chưa xác định số bàn</p>
                  <p className="text-amber-800 mt-0.5">Vui lòng quét mã QR tại bàn để đặt món.</p>
                </div>
              </div>
              {onRequestSelectTable && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onRequestSelectTable();
                  }}
                  className="shrink-0 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Chọn bàn
                </button>
              )}
            </div>
          )}

          {submitError && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-600">
              {submitError}
            </div>
          )}

          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-400">
              <FileText size={64} className="mb-4 text-zinc-300" strokeWidth={1.5} />
              <p className="text-lg font-medium">Giỏ hàng đang trống</p>
              <p className="text-sm mt-1">Hãy chọn vài món ngon nhé!</p>
              <button onClick={onClose} className="mt-6 px-6 py-2 bg-orange-100 text-orange-600 font-semibold rounded-full cursor-pointer">
                Xem menu
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {cart.map((item) => (
                <div key={item.cartItemId} className="bg-white p-4 rounded-2xl shadow-sm border border-zinc-100 flex gap-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-zinc-900">{item.productName}</h3>
                    <div className="text-sm text-zinc-500 mt-1">
                      {item.size && <span>Size {item.size}</span>}
                      {item.toppings.map(t => (
                        <span key={t.toppingId}> • Thêm {t.toppingName}</span>
                      ))}
                    </div>
                    {item.note && (
                      <div className="text-xs text-orange-600 mt-1 italic">
                        Ghi chú: {item.note}
                      </div>
                    )}
                    <div className="font-bold text-zinc-900 mt-2">{formatCurrency(item.totalPrice)}</div>
                  </div>

                  <div className="flex flex-col items-end justify-between">
                    <button
                      onClick={() => removeFromCart(item.cartItemId)}
                      className="text-xs text-zinc-400 hover:text-red-500 p-1 cursor-pointer"
                    >
                      Xóa
                    </button>
                    <div className="flex items-center border border-zinc-200 rounded-lg bg-zinc-50 overflow-hidden">
                      <button onClick={() => updateQuantity(item.cartItemId, -1)} className="w-8 h-8 flex items-center justify-center text-lg font-medium text-zinc-600 active:bg-zinc-200 cursor-pointer">-</button>
                      <span className="w-6 text-center text-sm font-semibold text-zinc-900">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.cartItemId, 1)} className="w-8 h-8 flex items-center justify-center text-lg font-medium text-orange-600 active:bg-zinc-200 cursor-pointer">+</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div className="absolute bottom-0 left-0 w-full bg-white border-t border-zinc-200 p-4 pb-6 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
            <div className="flex justify-between items-center mb-4 px-1">
              <span className="font-medium text-zinc-600">Tổng cộng</span>
              <span className="text-xl font-bold text-orange-600">{formatCurrency(totalAmount)}</span>
            </div>
            <button
              onClick={handleSubmitOrder}
              disabled={isSubmitting || !resolvedTableId}
              className="w-full bg-orange-600 text-white rounded-xl py-3.5 font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting
                ? 'Đang gửi đơn...'
                : resolvedTableId
                ? `Xác nhận Đặt món (${tableBadge})`
                : 'Vui lòng quét mã QR tại bàn'}
              {!isSubmitting && resolvedTableId && <ChevronRight size={20} />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
