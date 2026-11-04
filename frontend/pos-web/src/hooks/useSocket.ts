import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import api from '../lib/axios';

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  import.meta.env.VITE_API_GATEWAY_URL ||
  'http://localhost:3000';

export interface NotificationItem {
  id: string;
  message: string;
  time: Date;
  read: boolean;
}

function playNotificationChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const playTone = (freq: number, startOffset: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + startOffset);
      gain.gain.setValueAtTime(0.15, ctx.currentTime + startOffset);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startOffset + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + startOffset);
      osc.stop(ctx.currentTime + startOffset + duration);
    };
    playTone(660, 0, 0.16);
    playTone(880, 0.18, 0.25);
  } catch {
    // Ignore audio autoplay restriction if user hasn't interacted yet
  }
}

export const useSocket = (branchId: string, isAuthenticated = false) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [pendingQrOrders, setPendingQrOrders] = useState<any[]>([]);
  const [qrAlertOrder, setQrAlertOrder] = useState<any | null>(null);

  const fetchPendingQrOrders = useCallback(async () => {
    if (!branchId || !isAuthenticated || !localStorage.getItem('pos_token')) {
      setPendingQrOrders([]);
      return;
    }
    try {
      const res = await api.get(`/orders/qr-pending?branchId=${branchId}`);
      setPendingQrOrders(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.warn('Could not load pending QR orders:', err);
    }
  }, [branchId, isAuthenticated]);

  useEffect(() => {
    fetchPendingQrOrders();
  }, [fetchPendingQrOrders]);

  useEffect(() => {
    if (!branchId || !isAuthenticated) return;

    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      newSocket.emit('joinBranchRoom', String(branchId));
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('ITEM_READY', (itemData: any) => {
      const tableInfo = itemData.order?.tableId ? `Bàn ${itemData.order.tableId}` : 'Mang về';
      const msg = `Món ${itemData.productName} - ${tableInfo} đã xong!`;
      setToastMessage(msg);

      setNotifications(prev => [
        { id: Math.random().toString(36).substring(7), message: msg, time: new Date(), read: false },
        ...prev,
      ]);

      setTimeout(() => setToastMessage(null), 5000);
    });

    // Nhận đơn mới từ khách quét QR (trạng thái WAITING_CONFIRM)
    newSocket.on('QR_ORDER_PENDING', (orderData: any) => {
      setPendingQrOrders(prev => {
        if (prev.some(o => o.id === orderData.id)) return prev;
        return [...prev, orderData];
      });
      setQrAlertOrder(orderData);
      playNotificationChime();
    });

    // Đồng bộ khi đơn QR đã được duyệt hoặc bị từ chối
    newSocket.on('QR_ORDER_UPDATED', (payload: { orderId: string }) => {
      setPendingQrOrders(prev => prev.filter(o => o.id !== payload.orderId));
      setQrAlertOrder((curr: any) => (curr?.id === payload.orderId ? null : curr));
    });

    newSocket.on('table:completed', () => {
      fetchPendingQrOrders();
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [branchId, isAuthenticated, fetchPendingQrOrders]);

  const confirmQrOrder = useCallback(async (orderId: string) => {
    await api.post(`/orders/${orderId}/confirm-qr`);
    setPendingQrOrders(prev => prev.filter(o => o.id !== orderId));
    setQrAlertOrder((curr: any) => (curr?.id === orderId ? null : curr));
  }, []);

  const rejectQrOrder = useCallback(async (orderId: string, reason?: string) => {
    await api.post(`/orders/${orderId}/reject-qr`, { reason });
    setPendingQrOrders(prev => prev.filter(o => o.id !== orderId));
    setQrAlertOrder((curr: any) => (curr?.id === orderId ? null : curr));
  }, []);

  const clearToast = useCallback(() => setToastMessage(null), []);
  const clearQrAlert = useCallback(() => setQrAlertOrder(null), []);

  const markAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  return {
    socket,
    isConnected,
    toastMessage,
    clearToast,
    notifications,
    markAsRead,
    pendingQrOrders,
    qrAlertOrder,
    clearQrAlert,
    confirmQrOrder,
    rejectQrOrder,
    refreshPendingQrOrders: fetchPendingQrOrders,
  };
};
