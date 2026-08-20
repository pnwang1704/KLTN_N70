import React, { useState, useEffect } from 'react';
import type { Order, OrderItem } from '../types';
import { cn } from '../lib/utils';
import { Clock, ChefHat, CheckCircle2 } from 'lucide-react';

interface OrderCardProps {
  order: Order;
  onUpdateItemStatus: (orderId: string, itemId: string, status: string) => void;
}

export const OrderCard: React.FC<OrderCardProps> = ({ order, onUpdateItemStatus }) => {
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    const calcElapsed = () => {
      const diff = Math.floor((new Date().getTime() - new Date(order.createdAt).getTime()) / 1000);
      const m = Math.floor(diff / 60).toString().padStart(2, '0');
      const s = (diff % 60).toString().padStart(2, '0');
      setElapsed(`${m}:${s}`);
    };
    calcElapsed();
    const interval = setInterval(calcElapsed, 1000);
    return () => clearInterval(interval);
  }, [order.createdAt]);

  const allCompleted = order.items.every(i => i.itemStatus === 'COMPLETED');

  if (allCompleted) return null;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col shadow-lg">
      {/* Card Header */}
      <div className="bg-zinc-800/50 p-4 border-b border-zinc-800 flex justify-between items-start">
        <div>
          <h3 className="font-bold text-lg text-zinc-100">
            #{order.id.slice(0, 6).toUpperCase()}
          </h3>
          <span className={cn(
            "text-xs font-semibold px-2 py-0.5 rounded mt-1 inline-block",
            order.orderType === 'AT_TABLE' ? "bg-blue-500/20 text-blue-400" : "bg-orange-500/20 text-orange-400"
          )}>
            {order.orderType === 'AT_TABLE' ? `Tại Bàn ${order.tableId || ''}` : 'Mang Về'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-zinc-400 bg-zinc-950 px-2 py-1 rounded-md text-sm font-mono">
          <Clock size={14} className={elapsed.startsWith('1') || elapsed.startsWith('2') ? "text-red-400" : "text-emerald-400"} />
          <span className={elapsed.startsWith('1') || elapsed.startsWith('2') ? "text-red-400" : "text-emerald-400"}>{elapsed}</span>
        </div>
      </div>

      {/* Items List */}
      <div className="p-4 flex-1 flex flex-col gap-3">
        {order.items.map((item) => (
          item.itemStatus !== 'COMPLETED' && (
            <div key={item.id} className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="font-semibold text-zinc-200">
                    <span className="text-emerald-500 mr-2">{item.quantity}x</span>
                    {item.productName} {item.size && `(${item.size})`}
                  </div>
                  {item.toppings && item.toppings.length > 0 && (
                    <div className="text-xs text-zinc-500 mt-1 pl-6">
                      + {item.toppings.map(t => t.toppingName).join(', ')}
                    </div>
                  )}
                  {item.note && (
                    <div className="text-xs text-orange-400 mt-1 pl-6 italic">
                      Ghi chú: {item.note}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-3 flex justify-end">
                {item.itemStatus === 'PENDING' && (
                  <button 
                    onClick={() => onUpdateItemStatus(order.id, item.id, 'IN_PROGRESS')}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 rounded transition-colors"
                  >
                    <ChefHat size={14} /> Bắt đầu làm
                  </button>
                )}
                {item.itemStatus === 'IN_PROGRESS' && (
                  <button 
                    onClick={() => onUpdateItemStatus(order.id, item.id, 'COMPLETED')}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded transition-colors"
                  >
                    <CheckCircle2 size={14} /> Hoàn thành
                  </button>
                )}
              </div>
            </div>
          )
        ))}
      </div>
    </div>
  );
};
