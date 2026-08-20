import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { formatCurrency, cn } from '../lib/utils';
import { Trash2, Send, CreditCard } from 'lucide-react';
import axios from 'axios';

interface OrderPanelProps {
  onOpenPayment: (orderId: string, totalAmount: number) => void;
}

export const OrderPanel: React.FC<OrderPanelProps> = ({ onOpenPayment }) => {
  const { cart, updateQuantity, removeFromCart, totalAmount, clearCart } = useCart();
  const [orderType, setOrderType] = useState<'AT_TABLE' | 'TAKE_AWAY'>('TAKE_AWAY');
  const [tableId, setTableId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (cart.length === 0) {
      setCreatedOrderId(null);
    }
  }, [cart.length]);

  const handleCreateOrder = async (autoPay: boolean = false) => {
    if (cart.length === 0) return alert('Giỏ hàng trống!');
    if (orderType === 'AT_TABLE' && !tableId) return alert('Vui lòng nhập số bàn!');
    
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('pos_token') || '';
      
      const payload = {
        branchId: '1', // Hardcode for MVP
        tableId: orderType === 'AT_TABLE' ? tableId : undefined,
        orderType,
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

      const res = await axios.post('http://localhost:3000/orders', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const newOrder = res.data;
      setCreatedOrderId(newOrder.id);
      
      if (!autoPay) {
        alert('Đã gửi đơn cho bếp thành công!');
        // Keep the items in cart so cashier can see, or clear it if they want to serve next customer.
        // For typical POS, we might clear it or keep it until paid.
        clearCart();
        setCreatedOrderId(null);
        setTableId('');
      } else {
        // Open payment modal
        onOpenPayment(newOrder.id, totalAmount);
      }
    } catch (error) {
      console.error(error);
      alert('Có lỗi xảy ra khi tạo đơn!');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaymentClick = () => {
    if (cart.length === 0 && !createdOrderId) return alert('Giỏ hàng trống!');
    
    if (createdOrderId) {
      // Already created, just pay
      onOpenPayment(createdOrderId, totalAmount);
    } else {
      // Not created yet (Take away flow), create then pay
      handleCreateOrder(true);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Type Toggle */}
      <div className="p-4 border-b border-zinc-200">
        <div className="flex bg-zinc-100 p-1 rounded-xl mb-3">
          <button 
            onClick={() => setOrderType('TAKE_AWAY')}
            className={cn("flex-1 py-2 text-sm font-semibold rounded-lg transition-colors", orderType === 'TAKE_AWAY' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500")}
          >
            Mang về
          </button>
          <button 
            onClick={() => setOrderType('AT_TABLE')}
            className={cn("flex-1 py-2 text-sm font-semibold rounded-lg transition-colors", orderType === 'AT_TABLE' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500")}
          >
            Tại bàn
          </button>
        </div>
        {orderType === 'AT_TABLE' && (
          <input 
            type="text" 
            placeholder="Nhập số bàn (VD: 12)" 
            value={tableId}
            onChange={e => setTableId(e.target.value)}
            className="w-full px-4 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-orange-500"
          />
        )}
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto p-4 bg-zinc-50/50">
        {cart.length === 0 ? (
          <div className="h-full flex items-center justify-center text-zinc-400 text-sm font-medium">
            Chưa có món nào được chọn
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {cart.map((item) => (
              <div key={item.cartItemId} className="bg-white border border-zinc-200 p-3 rounded-xl flex gap-3">
                <div className="flex-1">
                  <div className="font-semibold text-zinc-900 text-sm leading-tight">{item.productName}</div>
                  <div className="text-xs text-zinc-500 mt-1">
                    {item.size && <span>{item.size}</span>}
                    {item.toppings.length > 0 && <span> + {item.toppings.map(t => t.toppingName).join(', ')}</span>}
                  </div>
                  {item.note && <div className="text-xs text-orange-600 mt-1">Ghi chú: {item.note}</div>}
                  <div className="font-bold text-zinc-900 text-sm mt-2">{formatCurrency(item.totalPrice)}</div>
                </div>

                <div className="flex flex-col justify-between items-end">
                  <button onClick={() => removeFromCart(item.cartItemId)} className="p-1 text-zinc-400 hover:text-red-500">
                    <Trash2 size={16} />
                  </button>
                  <div className="flex items-center bg-zinc-100 rounded-lg border border-zinc-200">
                    <button onClick={() => updateQuantity(item.cartItemId, -1)} className="w-7 h-7 flex items-center justify-center font-bold text-zinc-600">-</button>
                    <span className="w-6 text-center text-xs font-semibold text-zinc-900">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.cartItemId, 1)} className="w-7 h-7 flex items-center justify-center font-bold text-zinc-600">+</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="border-t border-zinc-200 p-4 bg-white shadow-[0_-10px_30px_rgba(0,0,0,0.03)]">
        <div className="flex justify-between items-center mb-1 text-zinc-500 text-sm">
          <span>Tạm tính</span>
          <span>{formatCurrency(totalAmount)}</span>
        </div>
        <div className="flex justify-between items-center mb-4 text-zinc-500 text-sm">
          <span>Giảm giá</span>
          <span>0 ₫</span>
        </div>
        <div className="flex justify-between items-center mb-6">
          <span className="font-bold text-lg text-zinc-900">Tổng thanh toán</span>
          <span className="text-2xl font-bold text-orange-600">{formatCurrency(totalAmount)}</span>
        </div>

        <div className="flex gap-3">
          <button 
            onClick={() => handleCreateOrder(false)}
            disabled={isSubmitting || cart.length === 0}
            className="flex-1 py-3.5 bg-zinc-100 text-zinc-900 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-zinc-200 transition-colors disabled:opacity-50"
          >
            <Send size={18} /> Gửi bếp
          </button>
          <button 
            onClick={handlePaymentClick}
            disabled={isSubmitting || (cart.length === 0 && !createdOrderId)}
            className="flex-[2] py-3.5 bg-orange-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-orange-700 transition-colors disabled:opacity-50"
          >
            <CreditCard size={18} /> Thanh toán
          </button>
        </div>
      </div>
    </div>
  );
};
