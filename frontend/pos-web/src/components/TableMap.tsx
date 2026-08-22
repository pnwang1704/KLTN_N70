import React, { useState, useEffect } from 'react';
import { X, Users, CheckCircle } from 'lucide-react';
import api from '../lib/axios';
import { formatCurrency } from '../lib/utils';
import { cn } from '../lib/utils';

interface TableMapProps {
  branchId: string;
  onSelectTable: (tableId: string) => void;
  onPayTable: (orderId: string, totalAmount: number) => void;
  onClose: () => void;
}

export const TableMap: React.FC<TableMapProps> = ({ branchId, onSelectTable, onPayTable, onClose }) => {
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedOccupiedTable, setSelectedOccupiedTable] = useState<any>(null);

  const fetchActiveOrders = async () => {
    setIsLoading(true);
    try {
      const res = await api.get(`/orders?branchId=${branchId}`);
      const pendingAtTable = res.data.filter((o: any) => o.status === 'PENDING' && o.orderType === 'AT_TABLE');
      setActiveOrders(pendingAtTable);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveOrders();
  }, [branchId]);

  const handleTableClick = (tableNum: number) => {
    const tableId = tableNum.toString();
    const order = activeOrders.find(o => o.tableId === tableId);
    
    if (order) {
      setSelectedOccupiedTable(order);
    } else {
      onSelectTable(tableId);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-zinc-100 rounded-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 bg-white border-b border-zinc-200 flex justify-between items-center shadow-sm z-10">
          <div>
            <h2 className="text-xl font-bold text-zinc-900">Sơ đồ bàn - Chi nhánh {branchId}</h2>
            <div className="flex gap-4 mt-2 text-sm">
              <span className="flex items-center gap-1.5 font-medium text-zinc-600"><span className="w-3 h-3 rounded-full bg-white border border-zinc-300"></span> Bàn trống</span>
              <span className="flex items-center gap-1.5 font-medium text-orange-600"><span className="w-3 h-3 rounded-full bg-orange-100 border border-orange-500"></span> Đang phục vụ</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-900 bg-zinc-50 hover:bg-zinc-200 rounded-full transition-colors"><X size={24} /></button>
        </div>

        <div className="flex-1 p-8 overflow-y-auto relative">
          {isLoading && (
            <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center backdrop-blur-sm">
              <span className="font-semibold text-zinc-600">Đang tải trạng thái bàn...</span>
            </div>
          )}

          <div className="grid grid-cols-5 gap-6">
            {Array.from({ length: 20 }, (_, i) => i + 1).map(num => {
              const tableId = num.toString();
              const order = activeOrders.find(o => o.tableId === tableId);
              const isOccupied = !!order;

              return (
                <button
                  key={num}
                  onClick={() => handleTableClick(num)}
                  className={cn(
                    "relative p-4 h-32 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all active:scale-95 group",
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
                      <span className="text-xs font-bold px-2 py-0.5 bg-orange-200 text-orange-800 rounded-full mb-1">
                        #{order.id.split('-')[0]}
                      </span>
                      <span className="text-sm font-bold text-zinc-900">{formatCurrency(order.finalAmount)}</span>
                    </div>
                  ) : (
                    <span className="text-xs font-semibold text-zinc-400 group-hover:text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity">Mở đơn</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Occupied Table Summary Modal */}
      {selectedOccupiedTable && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-zinc-200 flex justify-between items-center bg-orange-50">
              <h3 className="font-bold text-lg text-orange-900 flex items-center gap-2">
                <Users size={20} /> Bàn {selectedOccupiedTable.tableId}
              </h3>
              <button onClick={() => setSelectedOccupiedTable(null)} className="p-1 text-orange-400 hover:text-orange-900"><X size={20} /></button>
            </div>
            
            <div className="p-6">
              <div className="mb-4">
                <p className="text-sm text-zinc-500 mb-1">Mã đơn hàng</p>
                <p className="font-bold font-mono text-zinc-900">{selectedOccupiedTable.id}</p>
              </div>
              <div className="mb-6">
                <p className="text-sm text-zinc-500 mb-1">Tổng cộng ({selectedOccupiedTable.items?.length || 0} món)</p>
                <p className="text-2xl font-bold text-orange-600">{formatCurrency(selectedOccupiedTable.finalAmount)}</p>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setSelectedOccupiedTable(null)}
                  className="flex-1 py-3 bg-zinc-100 text-zinc-700 font-bold rounded-xl hover:bg-zinc-200 transition-colors"
                >
                  Đóng
                </button>
                <button 
                  onClick={() => {
                    onPayTable(selectedOccupiedTable.id, selectedOccupiedTable.finalAmount);
                    setSelectedOccupiedTable(null);
                    onClose();
                  }}
                  className="flex-[2] py-3 bg-orange-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-orange-700 transition-colors"
                >
                  <CheckCircle size={18} /> Thanh toán
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
