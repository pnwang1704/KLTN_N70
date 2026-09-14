import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { formatCurrency, cn } from '../lib/utils';
import { Trash2, Send, CreditCard, LayoutGrid, Tag } from 'lucide-react';
import api from '../lib/axios';
import { TableMap } from './TableMap';
import { SuccessModal, ErrorModal, WarningModal } from './ui/Modals';

export interface OpenPaymentParams {
  orderId?: string;
  orderData?: any;
  totalAmount: number;
}

interface OrderPanelProps {
  onOpenPayment: (params: OpenPaymentParams) => void;
}

export const OrderPanel: React.FC<OrderPanelProps> = ({ onOpenPayment }) => {
  const { cart, updateQuantity, removeFromCart, totalAmount, clearCart } = useCart();
  const [orderType, setOrderType] = useState<'AT_TABLE' | 'TAKE_AWAY'>('TAKE_AWAY');
  const [tableId, setTableId] = useState('');
  const [showTableMap, setShowTableMap] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [discountType, setDiscountType] = useState<'PERCENT' | 'AMOUNT'>('PERCENT');
  const [discountInput, setDiscountInput] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<{ title?: string; message: string; subMessage?: string } | null>(null);
  const [warningMsg, setWarningMsg] = useState<{ title?: string; message: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<{ title?: string; error: string } | null>(null);

  const subtotal = Math.round(Number(totalAmount) || 0);
  const parsedDiscountRaw = parseInt(discountInput.replace(/\D/g, '') || '0', 10);

  let discountAmount = 0;
  let discountPercent = 0;

  if (discountType === 'PERCENT') {
    discountPercent = Math.min(100, Math.max(0, parsedDiscountRaw));
    discountAmount = Math.round((subtotal * discountPercent) / 100);
  } else {
    discountAmount = Math.min(subtotal, Math.max(0, parsedDiscountRaw));
    discountPercent = subtotal > 0 ? Math.round((discountAmount / subtotal) * 100) : 0;
  }

  const finalTotal = Math.max(0, subtotal - discountAmount);

  useEffect(() => {
    if (cart.length === 0) {
      setTableId('');
      setDiscountInput('');
    }
  }, [cart.length]);

  const handleDiscountChange = (val: string) => {
    const digits = val.replace(/\D/g, '');
    if (!digits) {
      setDiscountInput('');
      return;
    }
    if (discountType === 'PERCENT') {
      const num = Math.min(100, parseInt(digits, 10));
      setDiscountInput(num.toString());
    } else {
      const num = parseInt(digits, 10);
      setDiscountInput(num.toLocaleString('vi-VN'));
    }
  };

  const handleSendToKitchen = async () => {
    if (cart.length === 0) {
      setWarningMsg({ title: 'Giỏ hàng trống', message: 'Vui lòng chọn món trước khi gửi đơn!' });
      return;
    }
    if (orderType === 'AT_TABLE' && !tableId) {
      setWarningMsg({ title: 'Chưa chọn bàn', message: 'Vui lòng nhập hoặc chọn số bàn phục vụ!' });
      return;
    }
    
    setIsSubmitting(true);
    try {
      const userStr = localStorage.getItem('pos_user');
      const user = userStr ? JSON.parse(userStr) : null;

      const payload = {
        branchId: user?.branchId || '1',
        cashierId: user?.id || user?.sub,
        tableId: orderType === 'AT_TABLE' ? tableId : undefined,
        orderType,
        totalAmount: subtotal,
        finalAmount: finalTotal,
        discountPercent,
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

      await api.post('/orders', payload);
      
      setSuccessMsg({
        title: 'Đã gửi đơn cho bếp',
        message: 'Đơn hàng đã được chuyển tới bếp thành công!',
        subMessage: 'Nhân viên bếp sẽ nhận được thông báo ngay lập tức.'
      });
      clearCart();
      setTableId('');
      setDiscountInput('');
    } catch (error) {
      console.error(error);
      setErrorMsg({
        title: 'Lỗi tạo đơn',
        error: 'Có lỗi xảy ra khi gửi đơn hàng cho bếp. Vui lòng thử lại!'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaymentClick = () => {
    if (cart.length === 0) {
      setWarningMsg({ title: 'Giỏ hàng trống', message: 'Vui lòng chọn món trước khi thanh toán!' });
      return;
    }
    if (orderType === 'AT_TABLE' && !tableId) {
      setWarningMsg({ title: 'Chưa chọn bàn', message: 'Vui lòng nhập hoặc chọn số bàn phục vụ!' });
      return;
    }

    const userStr = localStorage.getItem('pos_user');
    const user = userStr ? JSON.parse(userStr) : null;

    const orderData = {
      branchId: user?.branchId || '1',
      cashierId: user?.id || user?.sub,
      tableId: orderType === 'AT_TABLE' ? tableId : undefined,
      orderType,
      totalAmount: subtotal,
      finalAmount: finalTotal,
      discountPercent,
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

    onOpenPayment({ orderData, totalAmount: finalTotal });
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
          <div className="flex items-center gap-2">
            <input 
              type="text" 
              placeholder="Chọn bàn hoặc nhập..." 
              value={tableId ? `Bàn ${tableId}` : ''}
              readOnly
              className="w-full px-4 py-2 bg-white border border-zinc-200 rounded-lg text-sm font-semibold text-zinc-900 focus:outline-none focus:border-orange-500 cursor-pointer"
              onClick={() => setShowTableMap(true)}
            />
            <button 
              onClick={() => setShowTableMap(true)}
              className="p-2 bg-orange-100 text-orange-600 rounded-lg hover:bg-orange-200 transition-colors"
              title="Mở sơ đồ bàn"
            >
              <LayoutGrid size={20} />
            </button>
          </div>
        )}
      </div>

      {showTableMap && (
        <TableMap 
          branchId={JSON.parse(localStorage.getItem('pos_user') || '{}')?.branchId || '1'}
          onSelectTable={(id) => {
            setTableId(id);
            setShowTableMap(false);
          }}
          onPayTable={(id, total, orderObj) => {
            onOpenPayment({ orderId: id, totalAmount: Math.round(Number(total || 0)), orderData: orderObj });
            setShowTableMap(false);
          }}
          onClose={() => setShowTableMap(false)}
        />
      )}

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
      <div className="border-t border-zinc-200 p-4 bg-white shadow-[0_-10px_30px_rgba(0,0,0,0.03)] space-y-3">
        {/* Tạm tính */}
        <div className="flex justify-between items-center text-zinc-600 text-sm">
          <span>Tạm tính</span>
          <span className="font-semibold text-zinc-900">{formatCurrency(subtotal)}</span>
        </div>

        {/* Khối Chiết khấu (Discount) */}
        <div className="p-3 bg-zinc-50 border border-zinc-200/80 rounded-xl space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-zinc-700 flex items-center gap-1">
                <Tag size={13} className="text-orange-600" />
                Chiết khấu:
              </span>
              {/* Type Switcher: % or VNĐ */}
              <div className="inline-flex p-0.5 bg-zinc-200/70 rounded-lg text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setDiscountType('PERCENT');
                    setDiscountInput('');
                  }}
                  className={cn(
                    "px-2 py-0.5 rounded-md transition-all cursor-pointer",
                    discountType === 'PERCENT'
                      ? "bg-white text-orange-600 shadow-xs font-bold"
                      : "text-zinc-600 hover:text-zinc-900"
                  )}
                >
                  %
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDiscountType('AMOUNT');
                    setDiscountInput('');
                  }}
                  className={cn(
                    "px-2 py-0.5 rounded-md transition-all cursor-pointer",
                    discountType === 'AMOUNT'
                      ? "bg-white text-orange-600 shadow-xs font-bold"
                      : "text-zinc-600 hover:text-zinc-900"
                  )}
                >
                  VNĐ
                </button>
              </div>
            </div>

            {/* Input field */}
            <div className="relative w-32">
              <input
                type="text"
                value={discountInput}
                onChange={(e) => handleDiscountChange(e.target.value)}
                placeholder="0"
                className="w-full pl-2.5 pr-7 py-1 text-right text-xs font-bold bg-white border border-zinc-200 rounded-lg focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 text-zinc-900"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400 pointer-events-none">
                {discountType === 'PERCENT' ? '%' : '₫'}
              </span>
            </div>
          </div>

          {/* Quick chips when PERCENT */}
          {discountType === 'PERCENT' ? (
            <div className="flex items-center gap-1 overflow-x-auto py-0.5">
              {[0, 5, 10, 15, 20, 50].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => {
                    if (pct === 0) {
                      setDiscountInput('');
                    } else {
                      setDiscountInput(pct.toString());
                    }
                  }}
                  className={cn(
                    "px-2 py-0.5 text-[11px] font-semibold rounded-md border transition-all cursor-pointer shrink-0",
                    discountPercent === pct && discountInput !== ''
                      ? "bg-orange-500 border-orange-500 text-white shadow-xs font-bold"
                      : pct === 0 && (!discountInput || discountPercent === 0)
                      ? "bg-zinc-200 border-zinc-300 text-zinc-700 font-bold"
                      : "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-100"
                  )}
                >
                  {pct === 0 ? '0%' : `${pct}%`}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-1 overflow-x-auto py-0.5">
              {[0, 10000, 20000, 50000, 100000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => {
                    if (amt === 0) {
                      setDiscountInput('');
                    } else {
                      const capped = Math.min(subtotal, amt);
                      setDiscountInput(capped.toLocaleString('vi-VN'));
                    }
                  }}
                  className={cn(
                    "px-2 py-0.5 text-[11px] font-semibold rounded-md border transition-all cursor-pointer shrink-0",
                    discountAmount === amt && discountInput !== ''
                      ? "bg-orange-500 border-orange-500 text-white shadow-xs font-bold"
                      : amt === 0 && (!discountInput || discountAmount === 0)
                      ? "bg-zinc-200 border-zinc-300 text-zinc-700 font-bold"
                      : "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-100"
                  )}
                >
                  {amt === 0 ? '0 ₫' : `${(amt / 1000).toLocaleString('vi-VN')}k`}
                </button>
              ))}
            </div>
          )}

          {/* If discount applied, show discount deduction line */}
          {discountAmount > 0 && (
            <div className="flex justify-between items-center text-xs text-emerald-600 font-semibold pt-1 border-t border-zinc-200/60">
              <span>
                Giảm trừ {discountType === 'PERCENT' ? `(${discountPercent}%)` : ''}:
              </span>
              <span>-{formatCurrency(discountAmount)}</span>
            </div>
          )}
        </div>

        {/* Tổng thanh toán */}
        <div className="flex justify-between items-center pt-1">
          <span className="font-bold text-base text-zinc-900">Tổng thanh toán</span>
          <span className="text-2xl font-bold text-orange-600">{formatCurrency(finalTotal)}</span>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-1">
          <button 
            onClick={handleSendToKitchen}
            disabled={isSubmitting || cart.length === 0}
            className="flex-1 py-3.5 bg-zinc-100 text-zinc-900 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-zinc-200 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Send size={18} /> Gửi bếp
          </button>
          <button 
            onClick={handlePaymentClick}
            disabled={isSubmitting || cart.length === 0}
            className="flex-[2] py-3.5 bg-orange-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-orange-700 transition-colors disabled:opacity-50 cursor-pointer shadow-sm hover:shadow"
          >
            <CreditCard size={18} /> Thanh toán
          </button>
        </div>
      </div>

      <SuccessModal
        isOpen={!!successMsg}
        onClose={() => setSuccessMsg(null)}
        title={successMsg?.title}
        message={successMsg?.message || ''}
        subMessage={successMsg?.subMessage}
      />

      <WarningModal
        isOpen={!!warningMsg}
        onClose={() => setWarningMsg(null)}
        title={warningMsg?.title}
        message={warningMsg?.message || ''}
      />

      <ErrorModal
        isOpen={!!errorMsg}
        onClose={() => setErrorMsg(null)}
        title={errorMsg?.title}
        error={errorMsg?.error || ''}
      />
    </div>
  );
};
