import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { HeldOrder, CartItem } from '../types';
import { BookmarkCheck, X } from 'lucide-react';

interface HoldOrderParams {
  items: CartItem[];
  orderType: 'AT_TABLE' | 'TAKE_AWAY';
  tableId?: string;
  discountType?: 'PERCENT' | 'AMOUNT';
  discountInput?: string;
  discountPercent?: number;
  discountAmount?: number;
  subtotal: number;
  finalTotal: number;
  note?: string;
}

interface HeldOrdersContextType {
  heldOrders: HeldOrder[];
  isDrawerOpen: boolean;
  setIsDrawerOpen: (open: boolean) => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  holdOrder: (params: HoldOrderParams) => HeldOrder;
  deleteHeldOrder: (id: string) => void;
  clearAllHeldOrders: () => void;
  toastMessage: string | null;
  showToast: (msg: string) => void;
  clearToast: () => void;
}

const HeldOrdersContext = createContext<HeldOrdersContextType | undefined>(undefined);

const STORAGE_KEY = 'pos_held_orders';

export const HeldOrdersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('Lỗi khi đọc danh sách đơn tạm từ localStorage:', e);
      return [];
    }
  });

  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync to localStorage whenever heldOrders change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(heldOrders));
    } catch (e) {
      console.error('Lỗi khi lưu danh sách đơn tạm vào localStorage:', e);
    }
  }, [heldOrders]);

  const openDrawer = useCallback(() => setIsDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  const clearToast = useCallback(() => {
    setToastMessage(null);
  }, []);

  // Auto-clear toast after 3.5s
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 3500);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const generateNextCode = (orders: HeldOrder[]): string => {
    let max = 0;
    for (const o of orders) {
      const match = o.code?.match(/#TAM-(\d+)/);
      if (match) {
        const val = parseInt(match[1], 10);
        if (!isNaN(val) && val > max) {
          max = val;
        }
      }
    }
    const next = max + 1;
    return `#TAM-${next.toString().padStart(2, '0')}`;
  };

  const holdOrder = useCallback((params: HoldOrderParams): HeldOrder => {
    const code = generateNextCode(heldOrders);
    const newHeld: HeldOrder = {
      id: `held_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      code,
      createdAt: new Date().toISOString(),
      ...params,
    };

    setHeldOrders((prev) => [newHeld, ...prev]);
    showToast(`Đã lưu tạm đơn hàng ${code}`);
    return newHeld;
  }, [heldOrders, showToast]);

  const deleteHeldOrder = useCallback((id: string) => {
    setHeldOrders((prev) => prev.filter((o) => o.id !== id));
  }, []);

  const clearAllHeldOrders = useCallback(() => {
    setHeldOrders([]);
  }, []);

  return (
    <HeldOrdersContext.Provider
      value={{
        heldOrders,
        isDrawerOpen,
        setIsDrawerOpen,
        openDrawer,
        closeDrawer,
        holdOrder,
        deleteHeldOrder,
        clearAllHeldOrders,
        toastMessage,
        showToast,
        clearToast,
      }}
    >
      {children}

      {/* Floating Toast Notification for Held Orders */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-[70] bg-blue-600 text-white px-5 py-3 rounded-2xl shadow-2xl animate-in slide-in-from-right flex items-center gap-2.5 border border-blue-400 shadow-blue-600/30">
          <BookmarkCheck size={20} className="text-blue-100 shrink-0" />
          <span className="font-bold text-sm">{toastMessage}</span>
          <button
            onClick={clearToast}
            className="p-1 hover:bg-blue-700 rounded-lg text-blue-200 hover:text-white transition-colors cursor-pointer ml-1"
          >
            <X size={15} />
          </button>
        </div>
      )}
    </HeldOrdersContext.Provider>
  );
};

export const useHeldOrders = () => {
  const context = useContext(HeldOrdersContext);
  if (!context) throw new Error('useHeldOrders must be used within HeldOrdersProvider');
  return context;
};
