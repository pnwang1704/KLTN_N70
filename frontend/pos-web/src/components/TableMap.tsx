import React, { useState, useEffect, useCallback } from 'react';
import { X, Users, CheckCircle, RefreshCw, Receipt } from 'lucide-react';
import { io } from 'socket.io-client';
import api from '../lib/axios';
import { formatCurrency } from '../lib/utils';
import { cn } from '../lib/utils';

interface TableMapProps {
  branchId: string;
  onSelectTable: (tableId: string) => void;
  onPayTable: (orderId: string, totalAmount: number, orderData?: any) => void;
  onClose: () => void;
}

export const TableMap: React.FC<TableMapProps> = ({ branchId, onSelectTable, onPayTable, onClose }) => {
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedOccupiedTable, setSelectedOccupiedTable] = useState<any>(null);

  const fetchActiveOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get(`/orders?branchId=${branchId}`);
      // Filter all active orders that are not completed and not cancelled
      const activeAtTable = res.data.filter((o: any) => 
        o.status !== 'COMPLETED' && o.status !== 'CANCELLED' && o.orderType === 'AT_TABLE'
      );
      setActiveOrders(activeAtTable);
    } catch (error) {
      console.error('Error fetching active orders:', error);
    } finally {
      setIsLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    fetchActiveOrders();

    // Socket.IO real-time updates for table statuses
    const socket = io('http://localhost:3004');
    socket.emit('joinBranchRoom', branchId);

    socket.on('NEW_ORDER_CREATED', () => {
      fetchActiveOrders();
    });

    socket.on('table:completed', () => {
      fetchActiveOrders();
    });

    socket.on('order:paid', () => {
      fetchActiveOrders();
    });

    return () => {
      socket.disconnect();
    };
  }, [branchId, fetchActiveOrders]);

  const handleTableClick = (tableNum: number) => {
    const tableId = tableNum.toString();
    const tableOrders = activeOrders.filter(o => o.tableId === tableId);
    
    if (tableOrders.length > 0) {
      const allItems = tableOrders.flatMap(o => o.items || []);
      const combinedTotal = tableOrders.reduce(
        (sum, o) => sum + Number(o.finalAmount || o.totalAmount || 0),
        0
      );

      setSelectedOccupiedTable({
        tableId,
        orders: tableOrders,
        allOrderIds: tableOrders.map(o => o.id),
        primaryOrderId: tableOrders[0].id,
        allItems,
        totalAmount: Math.round(combinedTotal),
      });
    } else {
      onSelectTable(tableId);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-zinc-100 rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 bg-white border-b border-zinc-200 flex justify-between items-center shadow-sm z-10">
          <div>
            <h2 className="text-xl font-bold text-zinc-900">Sơ đồ bàn - Chi nhánh {branchId}</h2>
            <div className="flex gap-4 mt-1.5 text-xs">
              <span className="flex items-center gap-1.5 font-medium text-zinc-600">
                <span className="w-3 h-3 rounded-full bg-white border border-zinc-300"></span> Bàn trống
              </span>
              <span className="flex items-center gap-1.5 font-medium text-orange-600">
                <span className="w-3 h-3 rounded-full bg-orange-100 border border-orange-500"></span> Đang phục vụ
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => fetchActiveOrders()}
              className="p-2 text-zinc-500 hover:text-zinc-900 bg-zinc-50 hover:bg-zinc-200 rounded-full transition-colors cursor-pointer"
              title="Làm mới trạng thái bàn"
            >
              <RefreshCw size={18} className={cn(isLoading && 'animate-spin text-orange-600')} />
            </button>
            <button 
              onClick={onClose} 
              className="p-2 text-zinc-400 hover:text-zinc-900 bg-zinc-50 hover:bg-zinc-200 rounded-full transition-colors cursor-pointer"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        <div className="flex-1 p-6 overflow-y-auto relative">
          {isLoading && activeOrders.length === 0 && (
            <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center backdrop-blur-xs">
              <span className="font-semibold text-zinc-600 text-sm">Đang tải trạng thái bàn...</span>
            </div>
          )}

          <div className="grid grid-cols-5 gap-4 sm:gap-6">
            {Array.from({ length: 20 }, (_, i) => i + 1).map(num => {
              const tableId = num.toString();
              const tableOrders = activeOrders.filter(o => o.tableId === tableId);
              const isOccupied = tableOrders.length > 0;
              const tableTotal = tableOrders.reduce(
                (sum, o) => sum + Number(o.finalAmount || o.totalAmount || 0),
                0
              );
              const totalItemsCount = tableOrders.reduce(
                (sum, o) => sum + (o.items?.reduce((iSum: number, it: any) => iSum + Number(it.quantity || 1), 0) || 0),
                0
              );

              return (
                <button
                  key={num}
                  onClick={() => handleTableClick(num)}
                  className={cn(
                    "relative p-3 h-32 rounded-2xl border-2 flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 group cursor-pointer",
                    isOccupied 
                      ? "bg-orange-50 border-orange-400 hover:bg-orange-100 hover:border-orange-500 shadow-sm" 
                      : "bg-white border-zinc-200 hover:border-orange-300 hover:shadow-md"
                  )}
                >
                  <span className={cn("text-2xl font-black", isOccupied ? "text-orange-600" : "text-zinc-400 group-hover:text-zinc-600")}>
                    {num}
                  </span>
                  
                  {isOccupied ? (
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-orange-200 text-orange-900 rounded-full mb-1">
                        {tableOrders.length > 1 ? `${tableOrders.length} đợt • ${totalItemsCount} món` : `${totalItemsCount} món`}
                      </span>
                      <span className="text-xs font-bold text-zinc-900">{formatCurrency(tableTotal)}</span>
                    </div>
                  ) : (
                    <span className="text-xs font-semibold text-zinc-400 group-hover:text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      Mở đơn
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Occupied Table Summary Modal with 100% Items Breakdown */}
      {selectedOccupiedTable && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-zinc-200 flex justify-between items-center bg-orange-50/90 shrink-0">
              <div>
                <h3 className="font-bold text-lg text-orange-950 flex items-center gap-2">
                  <Users size={20} className="text-orange-600" /> Bàn {selectedOccupiedTable.tableId}
                </h3>
                <p className="text-xs text-orange-700 mt-0.5">
                  {selectedOccupiedTable.orders.length > 1
                    ? `${selectedOccupiedTable.orders.length} đợt gọi món từ khách`
                    : 'Đơn hàng đang phục vụ'}
                </p>
              </div>
              <button 
                onClick={() => setSelectedOccupiedTable(null)} 
                className="p-1.5 text-orange-400 hover:text-orange-900 rounded-full hover:bg-orange-100 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Modal Body: Complete Item List */}
            <div className="p-6 overflow-y-auto flex-1">
              <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Receipt size={14} className="text-orange-600" />
                Danh sách món khách đã gọi ({selectedOccupiedTable.allItems.length} món)
              </div>

              {/* Items container grouped by order */}
              <div className="divide-y divide-zinc-100 border border-zinc-200 rounded-2xl bg-zinc-50/60 p-2 mb-4 max-h-72 overflow-y-auto">
                {selectedOccupiedTable.orders.map((ord: any, ordIdx: number) => {
                  const ordTime = ord.createdAt 
                    ? new Date(ord.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                    : '';
                  
                  return (
                    <div key={ord.id || ordIdx} className="py-2.5 first:pt-1 last:pb-1">
                      {selectedOccupiedTable.orders.length > 1 && (
                        <div className="flex justify-between items-center text-[11px] font-bold text-zinc-500 mb-1.5 px-2 bg-zinc-100/70 py-1 rounded-lg">
                          <span>Đợt {ordIdx + 1} {ordTime && `• ${ordTime}`}</span>
                          <span className="font-mono text-[10px] text-zinc-400">#{ord.id.split('-')[0]}</span>
                        </div>
                      )}

                      <div className="space-y-2">
                        {ord.items?.map((item: any, itemIdx: number) => {
                          const toppingsSum = item.toppings?.reduce(
                            (tSum: number, t: any) => tSum + Number(t.price || 0) * Number(t.quantity || 1),
                            0
                          ) || 0;
                          const itemSubtotal = (Number(item.unitPrice || 0) + toppingsSum) * Number(item.quantity || 1);

                          return (
                            <div key={item.id || itemIdx} className="p-2 flex justify-between items-start text-xs hover:bg-white rounded-xl transition-colors">
                              <div className="flex-1 pr-3">
                                <div className="font-bold text-zinc-900 flex items-center gap-1.5 flex-wrap">
                                  <span className="text-orange-600 font-extrabold bg-orange-100 px-1.5 py-0.2 rounded text-[11px]">
                                    {item.quantity}x
                                  </span>
                                  <span>{item.productName}</span>
                                  {item.size && (
                                    <span className="text-[10px] px-1.5 py-0.2 bg-zinc-200 text-zinc-700 font-bold rounded">
                                      Size {item.size}
                                    </span>
                                  )}
                                </div>

                                {item.toppings && item.toppings.length > 0 && (
                                  <div className="text-[11px] text-zinc-500 mt-1 pl-6 space-y-0.5">
                                    {item.toppings.map((t: any, tIdx: number) => (
                                      <div key={t.id || tIdx}>
                                        + {t.toppingName} {t.quantity > 1 && `(x${t.quantity})`} • {formatCurrency(Number(t.price))}
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {item.note && (
                                  <div className="text-[11px] text-orange-600 italic mt-0.5 pl-6">
                                    Ghi chú: {item.note}
                                  </div>
                                )}
                              </div>

                              <div className="font-bold text-zinc-900 shrink-0 text-right">
                                {formatCurrency(itemSubtotal)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Total Summary */}
              <div className="bg-orange-50/70 border border-orange-200/80 rounded-2xl p-4 flex justify-between items-center">
                <div>
                  <span className="text-xs text-orange-800 font-medium block">Tổng tiền cần thanh toán</span>
                  <span className="text-xs text-orange-950 font-bold">
                    {selectedOccupiedTable.orders.length} đợt gọi • {selectedOccupiedTable.allItems.reduce((s: number, it: any) => s + Number(it.quantity || 1), 0)} món
                  </span>
                </div>
                <span className="text-2xl font-black text-orange-600">
                  {formatCurrency(selectedOccupiedTable.totalAmount)}
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-zinc-200 bg-zinc-50/50 flex gap-3 shrink-0">
              <button 
                onClick={() => setSelectedOccupiedTable(null)}
                className="flex-1 py-3 bg-zinc-100 text-zinc-700 font-bold rounded-xl hover:bg-zinc-200 transition-colors cursor-pointer text-sm"
              >
                Đóng
              </button>
              <button 
                onClick={() => {
                  const amount = Math.round(Number(selectedOccupiedTable.totalAmount || 0));
                  onPayTable(
                    selectedOccupiedTable.primaryOrderId,
                    amount,
                    {
                      tableId: selectedOccupiedTable.tableId,
                      branchId,
                      orderIds: selectedOccupiedTable.allOrderIds,
                      orders: selectedOccupiedTable.orders,
                      items: selectedOccupiedTable.allItems,
                      totalAmount: amount,
                      finalAmount: amount,
                      orderType: 'AT_TABLE',
                      orderCode: selectedOccupiedTable.orders?.[0]?.orderCode,
                    }
                  );
                  setSelectedOccupiedTable(null);
                  onClose();
                }}
                className="flex-[2] py-3 bg-orange-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-orange-700 active:scale-95 transition-all shadow-md cursor-pointer text-sm"
              >
                <CheckCircle size={18} /> Thanh toán bàn này
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
