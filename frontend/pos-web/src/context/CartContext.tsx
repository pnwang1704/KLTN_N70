import React, { createContext, useContext, useState, useMemo } from 'react';
import type { CartItem } from '../types';

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, delta: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalAmount: number;
  
  orderType: 'AT_TABLE' | 'TAKE_AWAY';
  setOrderType: (type: 'AT_TABLE' | 'TAKE_AWAY') => void;
  tableId: string;
  setTableId: (id: string) => void;
  discountType: 'PERCENT' | 'AMOUNT';
  setDiscountType: (type: 'PERCENT' | 'AMOUNT') => void;
  discountInput: string;
  setDiscountInput: (val: string) => void;
  loadOrderToCart: (order: {
    items: CartItem[];
    orderType?: 'AT_TABLE' | 'TAKE_AWAY';
    tableId?: string;
    discountType?: 'PERCENT' | 'AMOUNT';
    discountInput?: string;
  }) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<'AT_TABLE' | 'TAKE_AWAY'>('TAKE_AWAY');
  const [tableId, setTableId] = useState('');
  const [discountType, setDiscountType] = useState<'PERCENT' | 'AMOUNT'>('PERCENT');
  const [discountInput, setDiscountInput] = useState<string>('');

  const addToCart = (item: CartItem) => {
    setCart((prev) => [...prev, item]);
  };

  const removeFromCart = (cartItemId: string) => {
    setCart((prev) => prev.filter((item) => item.cartItemId !== cartItemId));
  };

  const updateQuantity = (cartItemId: string, delta: number) => {
    setCart((prev) => prev.map(item => {
      if (item.cartItemId === cartItemId) {
        const newQty = item.quantity + delta;
        if (newQty < 1) return item;
        return { 
          ...item, 
          quantity: newQty,
          totalPrice: (item.unitPrice + item.toppings.reduce((acc, t) => acc + t.price * t.quantity, 0)) * newQty
        };
      }
      return item;
    }));
  };

  const clearCart = () => {
    setCart([]);
    setTableId('');
    setDiscountInput('');
  };

  const loadOrderToCart = (order: {
    items: CartItem[];
    orderType?: 'AT_TABLE' | 'TAKE_AWAY';
    tableId?: string;
    discountType?: 'PERCENT' | 'AMOUNT';
    discountInput?: string;
  }) => {
    setCart(order.items || []);
    if (order.orderType) setOrderType(order.orderType);
    setTableId(order.tableId || '');
    if (order.discountType) setDiscountType(order.discountType);
    setDiscountInput(order.discountInput || '');
  };

  const totalItems = useMemo(() => cart.reduce((acc, item) => acc + item.quantity, 0), [cart]);
  const totalAmount = useMemo(() => cart.reduce((acc, item) => acc + item.totalPrice, 0), [cart]);

  return (
    <CartContext.Provider value={{ 
      cart, 
      addToCart, 
      removeFromCart, 
      updateQuantity, 
      clearCart, 
      totalItems, 
      totalAmount,
      orderType,
      setOrderType,
      tableId,
      setTableId,
      discountType,
      setDiscountType,
      discountInput,
      setDiscountInput,
      loadOrderToCart
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
};
