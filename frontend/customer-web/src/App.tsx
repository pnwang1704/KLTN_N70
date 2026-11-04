import { useState, useEffect, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';
import { CheckCircle2, Sparkles, QrCode } from 'lucide-react';
import api from './lib/axios';
import { Header } from './components/Header';
import { ProductCard } from './components/ProductCard';
import { ProductDetailModal } from './components/ProductDetailModal';
import { CartModal } from './components/CartModal';
import { ActiveOrderModal } from './components/ActiveOrderModal';
import { SuccessScreen } from './components/SuccessScreen';
import { TableSelectScreen } from './components/TableSelectScreen';
import { useCart } from './context/CartContext';
import { useTableSession, formatTableBadge } from './hooks/useTableSession';
import { mockCategories, mockProducts } from './data/mockData';
import type { Product } from './types';
import { cn } from './lib/utils';

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  import.meta.env.VITE_API_GATEWAY_URL ||
  'http://localhost:3000';

function MainApp() {
  const {
    branchId,
    tableId,
    tableBadge,
    hasTable,
    setTableSession,
    clearTableSession,
  } = useTableSession();

  const [showManualTableSelect, setShowManualTableSelect] = useState(false);
  const [activeCategoryId, setActiveCategoryId] = useState(mockCategories[0].id);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isActiveOrderOpen, setIsActiveOrderOpen] = useState(false);
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [isLoadingActiveOrders, setIsLoadingActiveOrders] = useState(false);
  const [successOrder, setSuccessOrder] = useState<any>(null);
  const [paymentSuccessNotice, setPaymentSuccessNotice] = useState<{ show: boolean; message: string } | null>(null);
  const [qrRejectedNotice, setQrRejectedNotice] = useState<string | null>(null);

  const { clearCart } = useCart();

  // Fetch active orders of current table
  const fetchActiveOrders = useCallback(async (bId?: string, tId?: string) => {
    const targetBranch = bId || branchId || '1';
    const targetTable = tId || tableId;
    if (!targetTable) {
      setActiveOrders([]);
      return;
    }

    setIsLoadingActiveOrders(true);
    try {
      const res = await api.get(`/orders/active?branchId=${targetBranch}&tableId=${targetTable}`);
      setActiveOrders(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.warn('Could not fetch active orders:', error);
    } finally {
      setIsLoadingActiveOrders(false);
    }
  }, [branchId, tableId]);

  useEffect(() => {
    if (hasTable && tableId) {
      fetchActiveOrders(branchId, tableId);
    } else {
      setActiveOrders([]);
    }
  }, [hasTable, branchId, tableId, fetchActiveOrders]);

  // Socket.IO real-time synchronization
  useEffect(() => {
    if (!hasTable || !tableId) return;

    const socket: Socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      socket.emit('joinBranchRoom', branchId || '1');
    });

    // Listen for table completion event from POS (cashier completed payment)
    socket.on('table:completed', (data: { branchId: string; tableId: string; orderId?: string }) => {
      if (String(data.branchId) === String(branchId) && String(data.tableId) === String(tableId)) {
        const currentBadge = formatTableBadge(tableId);
        setActiveOrders([]);
        clearCart();
        clearTableSession();
        setIsActiveOrderOpen(false);
        setSuccessOrder(null);
        setPaymentSuccessNotice({
          show: true,
          message: `Bàn số ${currentBadge} của bạn đã hoàn tất thanh toán. Cảm ơn quý khách!`
        });
      }
    });

    // Refresh when kitchen status updates or new order is created
    socket.on('NEW_ORDER_CREATED', (orderData: any) => {
      if (String(orderData?.branchId) === String(branchId) && String(orderData?.tableId) === String(tableId)) {
        fetchActiveOrders();
      }
    });

    // Listen for cashier confirming or rejecting QR order
    socket.on('QR_ORDER_UPDATED', (payload: { orderId: string; branchId: string; tableId?: string; status: string; reason?: string }) => {
      if (String(payload?.branchId) === String(branchId) && String(payload?.tableId) === String(tableId)) {
        fetchActiveOrders();
        if (payload.status === 'PENDING') {
          setSuccessOrder((prev: any) =>
            prev && prev.id === payload.orderId ? { ...prev, status: 'PENDING' } : prev
          );
        } else if (payload.status === 'CANCELLED') {
          setSuccessOrder((prev: any) => (prev && prev.id === payload.orderId ? null : prev));
          setQrRejectedNotice(
            payload.reason || 'Đơn đặt món vừa rồi chưa được quầy thu ngân xác nhận. Vui lòng liên hệ nhân viên nếu bạn đang ngồi tại bàn!'
          );
        }
      }
    });

    socket.on('ITEM_READY', (itemData: any) => {
      if (String(itemData?.order?.tableId) === String(tableId)) {
        fetchActiveOrders();
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [hasTable, branchId, tableId, clearCart, clearTableSession, fetchActiveOrders]);

  // Total active items count across all orders of this table
  const totalActiveItems = activeOrders.reduce((sum, o) => {
    return sum + (o.items?.reduce((itemSum: number, item: any) => itemSum + Number(item.quantity || 1), 0) || 0);
  }, 0);

  const handleConfirmManualTable = (manualTableId: string) => {
    setTableSession(branchId || '1', manualTableId, true);
    setShowManualTableSelect(false);
  };

  const handleAcknowledgePaymentCompleted = () => {
    setPaymentSuccessNotice(null);
  };

  const filteredProducts = mockProducts.filter(p => p.categoryId === activeCategoryId);

  if (showManualTableSelect) {
    return (
      <TableSelectScreen
        initialTableId={tableId}
        branchName="Chi nhánh 1: Quận Gò Vấp (12 Nguyễn Văn Bảo)"
        onConfirmTable={handleConfirmManualTable}
      />
    );
  }

  return (
    <div className="min-h-screen bg-zinc-900/90 sm:bg-zinc-100 flex items-start justify-center sm:py-6 sm:px-4">
      <div className="relative min-h-screen sm:min-h-[720px] sm:max-h-[92vh] sm:rounded-3xl w-full max-w-md bg-white shadow-2xl pb-24 flex flex-col overflow-y-auto animate-in fade-in duration-200">

        <Header
          branchId={branchId}
          tableId={tableId}
          onOpenCart={() => setIsCartOpen(true)}
          onOpenActiveOrders={() => setIsActiveOrderOpen(true)}
          activeItemsCount={totalActiveItems}
          onChangeTable={() => setShowManualTableSelect(true)}
        />

        {/* Gentle Reminder Banner when visiting without tableId in URL or sessionStorage */}
        {!hasTable && (
          <div className="mx-4 mt-3 px-3.5 py-3 rounded-2xl bg-amber-50 border border-amber-200/90 flex items-center justify-between gap-3 shadow-2xs animate-in fade-in duration-200">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <QrCode size={18} />
              </div>
              <p className="text-xs font-semibold text-amber-900 leading-snug">
                Vui lòng quét mã QR tại bàn để đặt món
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowManualTableSelect(true)}
              className="shrink-0 px-2.5 py-1.5 rounded-xl bg-white border border-amber-300 text-[11px] font-bold text-amber-800 hover:bg-amber-100 transition-colors cursor-pointer"
            >
              Nhập bàn
            </button>
          </div>
        )}

        {/* Category Horizontal Scroll */}
        <div className="sticky top-[61px] z-30 bg-white/90 backdrop-blur-md border-b border-zinc-100 py-3 shadow-xs">
          <div className="flex gap-2 overflow-x-auto px-4 hide-scrollbar snap-x">
            {mockCategories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategoryId(cat.id)}
                className={cn(
                  "whitespace-nowrap px-4 py-2 rounded-full text-xs sm:text-sm font-semibold snap-start transition-all cursor-pointer shrink-0 active:scale-95",
                  activeCategoryId === cat.id
                    ? "bg-zinc-900 text-white shadow-xs"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900"
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Product List */}
        <div className="p-4 grid grid-cols-2 gap-3.5 flex-1">
          {filteredProducts.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              onClick={setSelectedProduct}
            />
          ))}
        </div>

        {/* Modals */}
        {selectedProduct && (
          <ProductDetailModal
            product={selectedProduct}
            onClose={() => setSelectedProduct(null)}
          />
        )}

        {isCartOpen && (
          <CartModal
            branchId={branchId}
            tableId={tableId}
            onClose={() => setIsCartOpen(false)}
            onRequestSelectTable={() => setShowManualTableSelect(true)}
            onSuccess={(order) => {
              setIsCartOpen(false);
              setSuccessOrder(order);
              fetchActiveOrders();
            }}
          />
        )}

        {isActiveOrderOpen && (
          <ActiveOrderModal
            orders={activeOrders}
            tableId={tableBadge || tableId}
            onClose={() => setIsActiveOrderOpen(false)}
            onRefresh={() => fetchActiveOrders()}
            isLoading={isLoadingActiveOrders}
          />
        )}

        {successOrder && (
          <SuccessScreen
            order={successOrder}
            onBackToMenu={() => {
              setSuccessOrder(null);
              fetchActiveOrders();
            }}
          />
        )}

        {/* Real-time Payment Success Dialog when POS completes payment */}
        {paymentSuccessNotice?.show && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm text-center shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                <CheckCircle2 size={36} />
              </div>
              <div className="flex items-center justify-center gap-1 text-xs font-bold text-orange-600 uppercase tracking-wider mb-1">
                <Sparkles size={14} /> Hoàn tất thanh toán
              </div>
              <h3 className="text-xl font-black text-zinc-900 mb-2">Cảm ơn quý khách!</h3>
              <p className="text-sm text-zinc-600 mb-6 leading-relaxed">
                {paymentSuccessNotice.message} Chúc bạn một ngày tốt lành và hẹn gặp lại!
              </p>
              <button
                onClick={handleAcknowledgePaymentCompleted}
                className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-2xl shadow-md active:scale-95 transition-all cursor-pointer"
              >
                Về thực đơn
              </button>
            </div>
          </div>
        )}
        {/* Real-time QR Order Rejected Notice */}
        {qrRejectedNotice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm text-center shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-3 font-black text-2xl">
                !
              </div>
              <h3 className="text-lg font-extrabold text-zinc-900 mb-2">Đơn chưa được xác nhận</h3>
              <p className="text-sm text-zinc-600 mb-5 leading-relaxed">
                {qrRejectedNotice}
              </p>
              <button
                onClick={() => setQrRejectedNotice(null)}
                className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-white font-bold rounded-2xl transition-colors cursor-pointer"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MainApp;
