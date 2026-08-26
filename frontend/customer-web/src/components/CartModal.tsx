import React, { useState } from 'react';
import { X, ChevronRight, FileText } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { formatCurrency } from '../lib/utils';
import axios from 'axios';

interface CartModalProps {
  branchId: string;
  tableId: string;
  onClose: () => void;
  onSuccess: (order: any) => void;
}

export const CartModal: React.FC<CartModalProps> = ({ branchId, tableId, onClose, onSuccess }) => {
  const { cart, updateQuantity, removeFromCart, totalAmount, clearCart } = useCart();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitOrder = async () => {
    if (cart.length === 0) return;
    setIsSubmitting(true);
    try {
      const payload = {
        branchId,
        tableId,
        orderType: 'AT_TABLE',
        totalAmount,
        finalAmount: totalAmount,
        items: cart.map(item => ({
          productId: item.productId,
          productName: item.productName,
          size: item.size || undefined,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          note: item.note || undefined,
          toppings: item.toppings.map(t => ({
            toppingId: t.toppingId,
            toppingName: t.toppingName,
            price: t.price,
            quantity: t.quantity
          }))
        }))
      };

      const res = await axios.post('http://localhost:3000/orders', payload);
      clearCart();
      onSuccess(res.data);
    } catch (error) {
      console.error(error);
      alert('Có lỗi xảy ra khi đặt món. Vui lòng thử lại!');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-50 animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="bg-white border-b border-zinc-200 px-4 py-3 flex items-center shadow-sm">
        <button onClick={onClose} className="p-2 -ml-2 text-zinc-600 hover:text-zinc-900 rounded-full">
          <X size={24} />
        </button>
        <h2 className="flex-1 text-center text-lg font-bold text-zinc-900 pr-8">Giỏ hàng của bạn</h2>
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto p-4 pb-24">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-400">
            <FileText size={64} className="mb-4 text-zinc-300" strokeWidth={1.5} />
            <p className="text-lg font-medium">Giỏ hàng đang trống</p>
            <p className="text-sm mt-1">Hãy chọn vài món ngon nhé!</p>
            <button onClick={onClose} className="mt-6 px-6 py-2 bg-orange-100 text-orange-600 font-semibold rounded-full">
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
                    className="text-xs text-zinc-400 hover:text-red-500 p-1"
                  >
                    Xóa
                  </button>
                  <div className="flex items-center border border-zinc-200 rounded-lg bg-zinc-50 overflow-hidden">
                    <button onClick={() => updateQuantity(item.cartItemId, -1)} className="w-8 h-8 flex items-center justify-center text-lg font-medium text-zinc-600 active:bg-zinc-200">-</button>
                    <span className="w-6 text-center text-sm font-semibold text-zinc-900">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.cartItemId, 1)} className="w-8 h-8 flex items-center justify-center text-lg font-medium text-orange-600 active:bg-zinc-200">+</button>
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
            disabled={isSubmitting}
            className="w-full bg-orange-600 text-white rounded-xl py-3.5 font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-70"
          >
            {isSubmitting ? 'Đang đặt...' : 'Xác nhận Đặt món'}
            {!isSubmitting && <ChevronRight size={20} />}
          </button>
        </div>
      )}
    </div>
  );
};
