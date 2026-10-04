import React, { useState } from 'react';
import { useHeldOrders } from '../context/HeldOrdersContext';
import { useCart } from '../context/CartContext';
import { formatCurrency } from '../lib/utils';
import type { HeldOrder } from '../types';
import { X, Clock, Trash2, ArrowRightCircle, FileText, ShoppingBag } from 'lucide-react';
import { ConfirmModal } from './ui/Modals';

interface HeldOrdersDrawerProps {
  onNavigatePOS?: () => void;
}

export const HeldOrdersDrawer: React.FC<HeldOrdersDrawerProps> = ({ onNavigatePOS }) => {
  const { heldOrders, isDrawerOpen, closeDrawer, deleteHeldOrder, clearAllHeldOrders, showToast } = useHeldOrders();
  const { cart, loadOrderToCart } = useCart();

  // Confirm modal states
  const [orderToRestore, setOrderToRestore] = useState<HeldOrder | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<HeldOrder | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState<boolean>(false);

  // Close on ESC key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (orderToRestore) setOrderToRestore(null);
        else if (orderToDelete) setOrderToDelete(null);
        else if (confirmClearAll) setConfirmClearAll(false);
        else closeDrawer();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [orderToRestore, orderToDelete, confirmClearAll, closeDrawer]);

  if (!isDrawerOpen) return null;

  const formatHeldTime = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      const timeStr = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      const now = new Date();
      const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

      if (diffSec < 60) return `${timeStr} (Vừa xong)`;
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${timeStr} (${diffMin} phút trước)`;
      const diffHours = Math.floor(diffMin / 60);
      return `${timeStr} (${diffHours} giờ trước)`;
    } catch {
      return isoString;
    }
  };

  const executeRestore = (order: HeldOrder) => {
    loadOrderToCart({
      items: order.items,
      orderType: order.orderType,
      tableId: order.tableId,
      discountType: order.discountType,
      discountInput: order.discountInput,
    });
    deleteHeldOrder(order.id);
    closeDrawer();
    onNavigatePOS?.();
    showToast(`Đã mở lại đơn tạm tính ${order.code}`);
  };

  const handleRestoreClick = (order: HeldOrder) => {
    // If cart already has items, prompt overwrite confirmation
    if (cart.length > 0) {
      setOrderToRestore(order);
    } else {
      executeRestore(order);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        onClick={closeDrawer}
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-300 border-l border-zinc-200">
        {/* Drawer Header */}
        <div className="px-5 py-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center border border-blue-200">
              <FileText size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-zinc-900">Hóa đơn tạm tính</h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-600 text-white shadow-xs">
                  {heldOrders.length}
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">Danh sách đơn đang giữ chờ xử lý</p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeDrawer}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200 rounded-full cursor-pointer transition-colors"
            title="Đóng danh sách"
          >
            <X size={20} />
          </button>
        </div>

        {/* Drawer Body: Scrollable list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-zinc-50/50">
          {heldOrders.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mb-3 shadow-inner">
                <ShoppingBag size={28} />
              </div>
              <h4 className="font-bold text-zinc-800 text-sm">Hiện không có hóa đơn tạm tính nào</h4>
              <p className="text-xs text-zinc-500 mt-1.5 max-w-xs leading-relaxed">
                Bấm nút <span className="font-semibold text-blue-700">"Lưu tạm"</span> tại đáy cột giỏ hàng để lưu đơn khi khách cần chờ hoặc bổ sung món.
              </p>
            </div>
          ) : (
            heldOrders.map((order) => {
              const totalItemsCount = order.items.reduce((sum, it) => sum + Number(it.quantity || 1), 0);

              return (
                <div 
                  key={order.id}
                  className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-xs hover:border-blue-300 hover:shadow-md transition-all flex flex-col gap-3 group"
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-xs text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-lg shadow-2xs">
                        {order.code}
                      </span>
                      <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                        <Clock size={12} className="text-zinc-400" />
                        {formatHeldTime(order.createdAt)}
                      </span>
                    </div>

                    <div>
                      {order.orderType === 'AT_TABLE' ? (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                          🪑 Bàn {order.tableId || 'Chưa chọn'}
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 flex items-center gap-1">
                          🛍️ Mang về
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Items summary */}
                  <div className="bg-zinc-50/90 rounded-xl p-2.5 border border-zinc-200/80 text-xs space-y-1.5 max-h-36 overflow-y-auto">
                    {order.items.map((item, idx) => (
                      <div key={item.cartItemId || idx} className="flex justify-between items-start text-zinc-700">
                        <div className="flex-1 pr-2">
                          <span className="font-bold text-zinc-900">{item.quantity}x </span>
                          <span>{item.productName}</span>
                          {item.size && (
                            <span className="text-[10px] text-zinc-500 font-semibold ml-1">
                              ({item.size})
                            </span>
                          )}
                          {item.toppings && item.toppings.length > 0 && (
                            <div className="text-[11px] text-zinc-500 pl-4 mt-0.5">
                              + {item.toppings.map(t => t.toppingName).join(', ')}
                            </div>
                          )}
                          {item.note && (
                            <div className="text-[11px] text-blue-600 italic pl-4">
                              Ghi chú: {item.note}
                            </div>
                          )}
                        </div>
                        <div className="font-semibold text-zinc-900 shrink-0">
                          {formatCurrency(item.totalPrice)}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Card Bottom: Total & Actions */}
                  <div className="flex items-center justify-between pt-1 border-t border-zinc-100">
                    <div>
                      <div className="text-[11px] text-zinc-500">
                        {totalItemsCount} món {order.discountPercent ? `• Giảm ${order.discountPercent}%` : ''}
                      </div>
                      <div className="text-base font-black text-blue-700">
                        {formatCurrency(order.finalTotal)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Delete button */}
                      <button
                        type="button"
                        onClick={() => setOrderToDelete(order)}
                        className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 border border-zinc-200 hover:border-rose-200 rounded-xl transition-all cursor-pointer"
                        title="Hủy đơn tạm này"
                      >
                        <Trash2 size={16} />
                      </button>

                      {/* Restore & Checkout button */}
                      <button
                        type="button"
                        onClick={() => handleRestoreClick(order)}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                      >
                        <ArrowRightCircle size={15} />
                        <span>Mở lại đơn</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-zinc-200 bg-zinc-50/80 flex items-center justify-between gap-3 shrink-0">
          {heldOrders.length > 0 ? (
            <button
              type="button"
              onClick={() => setConfirmClearAll(true)}
              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 text-xs font-bold px-3 py-2 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
            >
              <Trash2 size={14} />
              <span>Hủy tất cả ({heldOrders.length})</span>
            </button>
          ) : (
            <div className="text-xs text-zinc-400 font-medium">Hệ thống lưu trữ cục bộ</div>
          )}

          <button
            type="button"
            onClick={closeDrawer}
            className="px-5 py-2.5 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>

      {/* Confirmation: Ghi đè giỏ hàng khi khôi phục đơn */}
      {orderToRestore && (
        <ConfirmModal
          isOpen={!!orderToRestore}
          onClose={() => setOrderToRestore(null)}
          onConfirm={() => {
            if (orderToRestore) {
              executeRestore(orderToRestore);
              setOrderToRestore(null);
            }
          }}
          title="Xác nhận khôi phục đơn tạm"
          message={`Giỏ hàng hiện tại đang có ${cart.length} món chưa hoàn tất. Bạn có chắc chắn muốn ghi đè giỏ hàng bằng đơn tạm ${orderToRestore.code} không?`}
          confirmText="Ghi đè & Mở đơn này"
          cancelText="Bỏ qua"
        />
      )}

      {/* Confirmation: Hủy 1 đơn tạm */}
      {orderToDelete && (
        <ConfirmModal
          isOpen={!!orderToDelete}
          onClose={() => setOrderToDelete(null)}
          onConfirm={() => {
            if (orderToDelete) {
              deleteHeldOrder(orderToDelete.id);
              showToast(`Đã xóa đơn tạm ${orderToDelete.code}`);
              setOrderToDelete(null);
            }
          }}
          title="Xác nhận hủy đơn tạm"
          message={`Bạn có chắc chắn muốn hủy vĩnh viễn hóa đơn tạm ${orderToDelete.code} không?`}
          confirmText="Hủy đơn"
          cancelText="Giữ lại"
          isDestructive={true}
        />
      )}

      {/* Confirmation: Hủy toàn bộ đơn tạm */}
      {confirmClearAll && (
        <ConfirmModal
          isOpen={confirmClearAll}
          onClose={() => setConfirmClearAll(false)}
          onConfirm={() => {
            clearAllHeldOrders();
            showToast('Đã xóa toàn bộ hóa đơn tạm tính');
            setConfirmClearAll(false);
          }}
          title="Hủy toàn bộ đơn tạm"
          message={`Bạn có chắc chắn muốn xóa toàn bộ ${heldOrders.length} hóa đơn tạm tính không? Thao tác này không thể hoàn tác.`}
          confirmText="Hủy tất cả"
          cancelText="Quay lại"
          isDestructive={true}
        />
      )}
    </div>
  );
};
