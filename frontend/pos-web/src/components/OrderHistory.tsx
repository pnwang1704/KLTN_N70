import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Eye, 
  X, 
  Printer, 
  RotateCw, 
  Search, 
  Clock, 
  User
} from 'lucide-react';
import api from '../lib/axios';
import { formatCurrency, formatDate, formatDateTimeFull, formatPaymentMethod } from '../lib/utils';
import { Receipt } from './Receipt';
import type { ShiftSession } from './ShiftSelectModal';

interface OrderHistoryProps {
  branchId: string;
  currentShift?: ShiftSession | null;
}

export const OrderHistory: React.FC<OrderHistoryProps> = ({ branchId, currentShift }) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [onlyCurrentShift, setOnlyCurrentShift] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLETED' | 'PENDING'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const activeShift = currentShift || (localStorage.getItem('pos_shift') ? JSON.parse(localStorage.getItem('pos_shift')!) : null);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const params: any = { branchId };
      if (onlyCurrentShift && activeShift?.openedAt) {
        params.fromDate = activeShift.openedAt;
      }
      const res = await api.get('/orders', { params });
      setOrders(res.data);
    } catch (err) {
      console.error('Lỗi khi tải lịch sử đơn hàng:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [branchId, onlyCurrentShift, activeShift?.openedAt]);

  const filteredOrders = orders.filter((o) => {
    if (statusFilter !== 'ALL' && o.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const codeStr = String(o.orderCode || '').toLowerCase();
      const idStr = String(o.id || '').toLowerCase();
      const tableStr = String(o.tableId || '').toLowerCase();
      return codeStr.includes(q) || idStr.includes(q) || tableStr.includes(q);
    }
    return true;
  });

  const completedOrders = filteredOrders.filter(o => o.status === 'COMPLETED');
  const totalRevenue = completedOrders.reduce((acc, o) => acc + Number(o.finalAmount || 0), 0);

  return (
    <div className="flex-1 p-6 overflow-y-auto bg-zinc-50">
      {/* Top Header */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 flex items-center gap-2.5">
            <FileText className="text-orange-600" size={26} />
            Lịch sử Đơn hàng
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Theo dõi và tra cứu danh sách hóa đơn theo ca làm việc của thu ngân
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Shift Toggle Button */}
          {activeShift && (
            <button
              onClick={() => setOnlyCurrentShift(!onlyCurrentShift)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                onlyCurrentShift
                  ? 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100 shadow-xs'
                  : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              <Clock size={14} className={onlyCurrentShift ? 'text-orange-600' : 'text-zinc-400'} />
              <span>{onlyCurrentShift ? 'Đang lọc theo ca' : 'Tất cả ca'}</span>
            </button>
          )}

          <button 
            onClick={fetchOrders} 
            disabled={isLoading}
            className="px-4 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-bold text-zinc-700 hover:bg-zinc-100 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
          >
            <RotateCw size={14} className={isLoading ? 'animate-spin text-orange-600' : ''} />
            <span>{isLoading ? 'Đang tải...' : 'Làm mới'}</span>
          </button>
        </div>
      </div>

      {/* Shift Information Banner */}
      {activeShift && onlyCurrentShift ? (
        <div className="mb-5 bg-gradient-to-r from-orange-50/90 via-amber-50/70 to-orange-50/90 border border-orange-200/80 rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-base shrink-0 shadow-inner">
              📋
            </div>
            <div>
              <div className="font-bold text-zinc-900 text-sm flex items-center gap-2">
                <span>Đang hiển thị đơn trong ca:</span>
                <span className="px-2.5 py-0.5 rounded-full bg-orange-500 text-white font-bold text-xs shadow-xs">
                  {activeShift.shiftName}
                </span>
              </div>
              <div className="text-zinc-500 text-xs mt-0.5 flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-1">
                  <Clock size={12} className="text-orange-600" />
                  Mở ca: <strong>{formatDateTimeFull(activeShift.openedAt)}</strong>
                </span>
                <span className="flex items-center gap-1">
                  <User size={12} className="text-orange-600" />
                  Thu ngân: <strong>{activeShift.cashierName}</strong>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block bg-white/70 px-3 py-1.5 rounded-xl border border-orange-200/50">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold block">Doanh thu trong ca</span>
              <span className="font-black text-sm text-orange-600">{formatCurrency(totalRevenue)}</span>
            </div>
            <button
              onClick={() => setOnlyCurrentShift(false)}
              className="px-3 py-2 bg-white hover:bg-orange-100 text-orange-700 border border-orange-300/80 rounded-xl font-bold text-xs transition-colors cursor-pointer shadow-xs"
            >
              Xem tất cả đơn
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-5 bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-zinc-100 text-zinc-600 flex items-center justify-center font-bold text-base shrink-0">
              🌐
            </div>
            <div>
              <div className="font-bold text-zinc-900 text-sm">
                Đang hiển thị toàn bộ lịch sử đơn hàng
              </div>
              <div className="text-zinc-500 text-xs mt-0.5">
                Bao gồm cả các đơn hàng thuộc những ca trực trước đó tại chi nhánh
              </div>
            </div>
          </div>

          {activeShift && (
            <button
              onClick={() => setOnlyCurrentShift(true)}
              className="px-3.5 py-2 bg-orange-600 text-white hover:bg-orange-700 rounded-xl font-bold text-xs transition-colors cursor-pointer shadow-xs"
            >
              Chỉ xem đơn ca hiện tại ({activeShift.shiftName})
            </button>
          )}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm mb-4 flex flex-wrap items-center justify-between gap-3">
        {/* Status Filters */}
        <div className="flex items-center gap-1.5 bg-zinc-100 p-1 rounded-xl">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            Tất cả ({orders.length})
          </button>

          <button
            onClick={() => setStatusFilter('COMPLETED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'COMPLETED'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-zinc-500 hover:text-emerald-700'
            }`}
          >
            Đã thanh toán ({orders.filter(o => o.status === 'COMPLETED').length})
          </button>

          <button
            onClick={() => setStatusFilter('PENDING')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'PENDING'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-zinc-500 hover:text-orange-700'
            }`}
          >
            Đang phục vụ ({orders.filter(o => o.status === 'PENDING').length})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo mã đơn, số bàn..."
            className="w-full pl-9 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-medium text-zinc-900 focus:outline-none focus:border-orange-500 focus:bg-white transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-100 text-zinc-600 font-semibold border-b border-zinc-200">
            <tr>
              <th className="px-6 py-4">Mã đơn</th>
              <th className="px-6 py-4">Thời gian</th>
              <th className="px-6 py-4">Loại đơn</th>
              <th className="px-6 py-4">PT Thanh toán</th>
              <th className="px-6 py-4">Tổng tiền</th>
              <th className="px-6 py-4">Trạng thái</th>
              <th className="px-6 py-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {isLoading ? (
              <tr><td colSpan={7} className="text-center py-10 text-zinc-500">Đang tải dữ liệu đơn hàng...</td></tr>
            ) : filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-zinc-400">
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <FileText size={32} className="text-zinc-300 mb-1" />
                    <span className="font-semibold text-zinc-600">Không có đơn hàng nào phù hợp</span>
                    <span className="text-xs text-zinc-400">
                      {onlyCurrentShift ? 'Chưa có đơn hàng nào phát sinh trong ca trực này' : 'Không tìm thấy đơn hàng với bộ lọc hiện tại'}
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredOrders.map(order => (
                <tr key={order.id} className="hover:bg-orange-50/40 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs font-bold text-zinc-800">
                    {order.orderCode ? `#${order.orderCode}` : order.id.split('-')[0]}
                  </td>
                  <td className="px-6 py-4 text-zinc-600 text-xs">{formatDate(order.createdAt)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                      order.orderType === 'AT_TABLE' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
                    }`}>
                      {order.orderType === 'AT_TABLE' ? `Tại Bàn ${order.tableId}` : 'Mang về'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-zinc-700 text-xs">
                    {formatPaymentMethod(order.payment?.paymentMethod || order.paymentMethod)}
                  </td>
                  <td className="px-6 py-4 font-bold text-zinc-900">{formatCurrency(order.finalAmount)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold ${
                      order.status === 'COMPLETED' 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                        : 'bg-orange-50 text-orange-700 border border-orange-200'
                    }`}>
                      {order.status === 'COMPLETED' ? 'Đã thanh toán' : order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => setSelectedOrder(order)} 
                      className="p-2 text-orange-600 hover:bg-orange-100 rounded-lg inline-flex items-center gap-1 font-semibold text-xs transition-colors cursor-pointer"
                    >
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 print:bg-white print:static print:inset-auto print:p-0">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 print:hidden">
            <div className="px-6 py-4 border-b border-zinc-200 flex justify-between items-center bg-orange-50">
              <div>
                <h3 className="font-bold text-lg text-orange-900">
                  Chi tiết đơn: {selectedOrder.orderCode ? `#${selectedOrder.orderCode}` : selectedOrder.id.split('-')[0]}
                </h3>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-1 text-zinc-400 hover:text-zinc-900 cursor-pointer"><X size={20} /></button>
            </div>
            
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <div className="flex justify-between mb-4 pb-4 border-b border-zinc-100 text-sm">
                <div>
                  <p className="text-zinc-500 mb-1 text-xs">Thời gian tạo:</p>
                  <p className="font-semibold text-xs">{formatDateTimeFull(selectedOrder.createdAt)}</p>
                </div>
                <div className="text-right">
                  <p className="text-zinc-500 mb-1 text-xs">Phương thức TT:</p>
                  <p className="font-semibold text-xs text-emerald-600">{formatPaymentMethod(selectedOrder.payment?.paymentMethod || selectedOrder.paymentMethod)}</p>
                </div>
              </div>

              <h4 className="font-bold text-zinc-900 mb-3 text-xs uppercase tracking-wider">Danh sách món ({selectedOrder.items?.length || 0})</h4>
              <div className="flex flex-col gap-2.5">
                {selectedOrder.items?.map((item: any, idx: number) => (
                  <div key={item.id || idx} className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl flex justify-between items-start text-xs">
                    <div>
                      <div className="font-bold text-zinc-900">{item.quantity}x {item.productName}</div>
                      <div className="text-[11px] text-zinc-500 mt-0.5">
                        {item.size && <span>Size: {item.size}</span>}
                        {item.toppings?.length > 0 && <span> | {item.toppings.map((t: any) => t.toppingName).join(', ')}</span>}
                      </div>
                      {item.note && <div className="text-[11px] text-orange-600 mt-0.5">Ghi chú: {item.note}</div>}
                    </div>
                    <div className="font-bold text-zinc-900">
                      {formatCurrency(Number(item.unitPrice || 0) * Number(item.quantity || 1) + (item.toppings?.reduce((acc: number, t: any) => acc + Number(t.price || 0) * Number(t.quantity || 1), 0) || 0) * Number(item.quantity || 1))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-5 bg-zinc-50 border-t border-zinc-200 flex justify-between items-center">
              <div>
                <span className="block font-bold text-zinc-500 text-xs mb-0.5">Tổng thanh toán:</span>
                <span className="text-xl font-black text-orange-600">{formatCurrency(selectedOrder.finalAmount)}</span>
              </div>
              <button 
                onClick={() => window.print()}
                className="px-5 py-2.5 bg-zinc-900 text-white font-bold text-xs rounded-xl flex items-center gap-2 hover:bg-zinc-800 transition-colors cursor-pointer shadow-md"
              >
                <Printer size={16} /> In Hóa Đơn
              </button>
            </div>
          </div>

          <Receipt order={selectedOrder} user={JSON.parse(localStorage.getItem('pos_user') || '{}')} />
        </div>
      )}
    </div>
  );
};
