import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { Order } from '../types';

const SOCKET_URL = 'http://localhost:3004';

export const useSocket = (branchId: string) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (!branchId) return;

    const newSocket = io(SOCKET_URL);
    
    newSocket.on('connect', () => {
      setIsConnected(true);
      newSocket.emit('joinBranchRoom', branchId);
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
      
      // Optional: Play sound here
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
