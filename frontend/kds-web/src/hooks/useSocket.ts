import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { Order } from '../types';

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  import.meta.env.VITE_API_URL ||
  'http://localhost:3004';

export const useSocket = (branchId: string) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (!branchId) return;
    setOrders([]);

    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
    });
    
    newSocket.on('connect', () => {
      setIsConnected(true);
      newSocket.emit('joinBranchRoom', `branch_${String(branchId).replace(/^branch_/, '')}`);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('NEW_ORDER_CREATED', (order: Order) => {
      setOrders((prev) => {
        // Prevent duplicates
        if (prev.some((o) => o.id === order.id)) return prev;
        return [...prev, order];
      });
    });

    // Khi thu ngân sửa món / tăng giảm số lượng / đổi bàn từ POS
    newSocket.on('orderUpdated', (updatedOrder: Order) => {
      if (!updatedOrder?.id) return;
      setOrders((prev) => {
        const exists = prev.some((o) => o.id === updatedOrder.id);
        if (!exists) return prev;
        return prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o));
      });
    });

    // Khi thu ngân hủy đơn chưa thanh toán hoặc Void hóa đơn
    newSocket.on('orderCancelled', (payload: { orderId: string }) => {
      if (!payload?.orderId) return;
      setOrders((prev) => prev.filter((o) => o.id !== payload.orderId));
    });

    // Khi bàn hoàn tất thanh toán
    newSocket.on('table:completed', (payload: { orderId?: string; orderIds?: string[] }) => {
      setOrders((prev) =>
        prev.filter(
          (o) =>
            o.id !== payload?.orderId &&
            !(Array.isArray(payload?.orderIds) && payload.orderIds.includes(o.id)),
        ),
      );
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [branchId]);

  const updateItemStatusState = useCallback((orderId: string, itemId: string, newStatus: string) => {
    setOrders((prev) => 
      prev.map((order) => {
        if (order.id !== orderId) return order;
        
        return {
          ...order,
          items: order.items.map((item) => 
            item.id === itemId ? { ...item, itemStatus: newStatus as any } : item
          )
        };
      })
    );
  }, []);

  return { socket, isConnected, orders, updateItemStatusState };
};
