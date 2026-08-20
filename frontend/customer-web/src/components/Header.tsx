import React from 'react';
import { ShoppingBag } from 'lucide-react';
import { useCart } from '../context/CartContext';

interface HeaderProps {
  branchId: string;
  tableId: string;
  onOpenCart: () => void;
}

export const Header: React.FC<HeaderProps> = ({ branchId, tableId, onOpenCart }) => {
  const { totalItems } = useCart();

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-zinc-200 shadow-sm">
      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <h1 className="text-xl font-bold text-orange-600">N70 Cafe</h1>
          <p className="text-xs text-zinc-500 font-medium">Chi nhánh {branchId} • Bàn {tableId}</p>
        </div>
        
        <button 
          onClick={onOpenCart}
          className="relative p-2 text-zinc-700 bg-zinc-100 rounded-full hover:bg-zinc-200 transition-colors"
        >
          <ShoppingBag size={24} />
          {totalItems > 0 && (
            <span className="absolute top-0 right-0 inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-red-500 rounded-full border-2 border-white -translate-y-1 translate-x-1">
              {totalItems}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
