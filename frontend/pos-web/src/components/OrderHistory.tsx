import React, { useState, useEffect } from 'react';
import { FileText, Eye, X } from 'lucide-react';
import api from '../lib/axios';
import { formatCurrency, formatDate } from '../lib/utils';

export const OrderHistory: React.FC<{ branchId: string }> = ({ branchId }) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const res = await api.get(`/orders?branchId=${branchId}`);
      setOrders(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [branchId]);

  return (
    <div className="flex-1 p-6 overflow-y-auto bg-zinc-50">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
          <FileText className="text-orange-600" />
          Lịch sử Đơn hàng
        </h2>
        <button onClick={fetchOrders} className="px-4 py-2 bg-white border border-zinc-200 rounded-xl text-sm font-semibold text-zinc-600 hover:bg-zinc-100">
          Làm mới
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-100 text-zinc-600 font-semibold border-b border-zinc-200">
            <tr>
              <th className="px-6 py-4">Mã đơn (Rút gọn)</th>
              <th className="px-6 py-4">Thời gian</th>
              <th className="px-6 py-4">Loại đơn</th>
              <th className="px-6 py-4">Tổng tiền</th>
              <th className="px-6 py-4">Trạng thái</th>
              <th className="px-6 py-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {isLoading ? (
              <tr><td colSpan={6} className="text-center py-8 text-zinc-500">Đang tải dữ liệu...</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-zinc-500">Chưa có đơn hàng nào</td></tr>
            ) : (
              orders.map(order => (
                <tr key={order.id} className="hover:bg-orange-50/50 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs font-bold text-zinc-700">{order.id.split('-')[0]}</td>
                  <td className="px-6 py-4 text-zinc-600">{formatDate(order.createdAt)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-md text-xs font-bold ${order.orderType === 'AT_TABLE' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                      {order.orderType === 'AT_TABLE' ? `Tại Bàn ${order.tableId}` : 'Mang về'}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold text-zinc-900">{formatCurrency(order.finalAmount)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-md text-xs font-bold ${order.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => setSelectedOrder(order)} className="p-2 text-orange-600 hover:bg-orange-100 rounded-lg inline-flex items-center gap-1 font-semibold text-xs transition-colors">
                      <Eye size={16} /> Chi tiết
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-zinc-200 flex justify-between items-center bg-orange-50">
              <h3 className="font-bold text-lg text-orange-900">Chi tiết đơn: {selectedOrder.id.split('-')[0]}</h3>
              <button onClick={() => setSelectedOrder(null)} className="p-1 text-zinc-400 hover:text-zinc-900"><X size={20} /></button>
            </div>
            
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <div className="flex justify-between mb-4 pb-4 border-b border-zinc-100 text-sm">
                <div>
                  <p className="text-zinc-500 mb-1">Thời gian tạo:</p>
                  <p className="font-semibold">{formatDate(selectedOrder.createdAt)}</p>
                </div>
                <div className="text-right">
                  <p className="text-zinc-500 mb-1">Phương thức TT:</p>
                  <p className="font-semibold text-emerald-600">{selectedOrder.payment?.paymentMethod || 'Chưa TT'}</p>
                </div>
              </div>

              <h4 className="font-bold text-zinc-900 mb-3">Danh sách món ({selectedOrder.items.length})</h4>
              <div className="flex flex-col gap-3">
                {selectedOrder.items.map((item: any) => (
                  <div key={item.id} className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl flex justify-between">
                    <div>
                      <div className="font-bold text-zinc-900 text-sm">{item.quantity}x {item.productName}</div>
                      <div className="text-xs text-zinc-500 mt-1">
                        {item.size && <span>Size: {item.size}</span>}
                        {item.toppings?.length > 0 && <span> | {item.toppings.map((t: any) => t.toppingName).join(', ')}</span>}
                      </div>
                      {item.note && <div className="text-xs text-orange-600 mt-1">Ghi chú: {item.note}</div>}
                    </div>
                    <div className="font-bold text-sm">{formatCurrency(item.unitPrice * item.quantity + (item.toppings?.reduce((acc: number, t: any) => acc + t.price * t.quantity, 0) || 0) * item.quantity)}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 bg-zinc-50 border-t border-zinc-200 flex justify-between items-center">
              <span className="font-bold text-zinc-600">Tổng thanh toán:</span>
              <span className="text-2xl font-bold text-orange-600">{formatCurrency(selectedOrder.finalAmount)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
