import React from 'react';
import { ShoppingBag, Store, Receipt } from 'lucide-react';
import { useCart } from '../context/CartContext';

interface HeaderProps {
  branchId: string;
  tableId: string;
  onOpenCart: () => void;
  onOpenActiveOrders?: () => void;
  activeItemsCount?: number;
  onChangeTable?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  branchId,
  tableId,
  onOpenCart,
  onOpenActiveOrders,
  activeItemsCount = 0,
  onChangeTable,
}) => {
  const { totalItems } = useCart();

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-zinc-200/80 shadow-xs">
      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <h1 className="text-xl font-black text-orange-600 tracking-tight">N70 Cafe</h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[11px] text-zinc-500 font-medium">CN {branchId || '1'}</span>
            <span className="text-zinc-300 text-xs">•</span>
            <button 
              type="button"
              onClick={onChangeTable}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-50 border border-orange-200/70 text-orange-700 text-[11px] font-bold hover:bg-orange-100 transition-colors cursor-pointer"
              title="Nhấn để đổi số bàn"
            >
              <Store size={12} className="text-orange-600" />
              <span>Bàn {tableId}</span>
              {onChangeTable && <span className="text-[10px] text-orange-500 font-normal underline ml-0.5">(Đổi)</span>}
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Món đã gọi button */}
          <button 
            type="button"
            onClick={onOpenActiveOrders}
            className="relative p-2.5 text-zinc-700 bg-zinc-100/90 rounded-full hover:bg-orange-50 hover:text-orange-600 transition-all cursor-pointer active:scale-95"
            aria-label="Món đã gọi"
            title="Lịch sử món đã gọi tại bàn"
          >
            <Receipt size={21} />
            {activeItemsCount > 0 && (
              <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1 text-[10px] font-black text-white bg-orange-600 rounded-full border-2 border-white animate-in zoom-in-50 shadow-xs">
                {activeItemsCount}
              </span>
            )}
          </button>

          {/* Giỏ hàng button */}
          <button 
            type="button"
            onClick={onOpenCart}
            className="relative p-2.5 text-zinc-700 bg-zinc-100/90 rounded-full hover:bg-orange-50 hover:text-orange-600 transition-all cursor-pointer active:scale-95"
            aria-label="Giỏ hàng"
            title="Giỏ hàng hiện tại"
          >
            <ShoppingBag size={21} />
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1 text-[10px] font-black text-white bg-red-500 rounded-full border-2 border-white animate-in zoom-in-50 shadow-xs">
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

