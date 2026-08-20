import React from 'react';
import type { Order } from '../types';
import { OrderCard } from './OrderCard';

interface OrderGridProps {
  orders: Order[];
  filter: string;
  onUpdateItemStatus: (orderId: string, itemId: string, status: string) => void;
}

export const OrderGrid: React.FC<OrderGridProps> = ({ orders, filter, onUpdateItemStatus }) => {
  const filteredOrders = orders.filter(order => {
    // If all items are completed, don't show the order
    if (order.items.every(i => i.itemStatus === 'COMPLETED')) return false;
    
    if (filter === 'ALL') return true;
    
    // If filter is PENDING, show orders that have at least one PENDING item
    if (filter === 'PENDING') return order.items.some(i => i.itemStatus === 'PENDING');
    
    // If filter is IN_PROGRESS, show orders that have at least one IN_PROGRESS item
    if (filter === 'IN_PROGRESS') return order.items.some(i => i.itemStatus === 'IN_PROGRESS');
    
    return true;
  });

  if (filteredOrders.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-zinc-500">
        <div className="text-4xl mb-4">🍳</div>
        <h2 className="text-xl font-semibold">Bếp đang rảnh rỗi</h2>
        <p className="text-sm">Chưa có đơn hàng nào cần chuẩn bị lúc này.</p>
      </div>
    );
  }

  return (
    <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-max items-start">
      {filteredOrders.map(order => (
        <OrderCard 
          key={order.id} 
          order={order} 
          onUpdateItemStatus={onUpdateItemStatus} 
        />
      ))}
    </div>
  );
};
