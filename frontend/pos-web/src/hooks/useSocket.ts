import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:3004';

export const useSocket = (branchId: string) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

    newSocket.on('ITEM_READY', (itemData: any) => {
      // Show toast
      const tableInfo = itemData.order?.tableId ? `Bàn ${itemData.order.tableId}` : 'Mang về';
      setToastMessage(`Món ${itemData.productName} - ${tableInfo} đã xong!`);
      
      // Auto hide toast after 5s
      setTimeout(() => setToastMessage(null), 5000);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [branchId]);

  const clearToast = useCallback(() => setToastMessage(null), []);

  return { socket, isConnected, toastMessage, clearToast };
};
