import React, { useState, useEffect, useCallback } from 'react';
import {
  FileEdit,
  RotateCw,
  Search,
  X,
  Plus,
  Minus,
  Trash2,
  Ban,
  ShieldAlert,
  ArrowLeftRight,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Clock,
  UtensilsCrossed,
  Receipt,
  CreditCard,
  Banknote,
  Lock,
  Save,
} from 'lucide-react';
import { io } from 'socket.io-client';
import api from '../lib/axios';
import {
  cn,
  formatCurrency,
  formatDate,
  formatDateTimeFull,
  formatPaymentMethod,
} from '../lib/utils';
import { Receipt as PrintableReceipt } from './Receipt';
import type { ShiftSession } from './ShiftSelectModal';
import { mockProducts } from '../data/mockData';
import type { Product } from '../types';

interface OrderManagementProps {
  branchId: string;
  user: any;
  currentShift?: ShiftSession | null;
  initialTableIdFilter?: string | null;
  onClearInitialTableFilter?: () => void;
}

const CANCEL_REASONS_PRESETS = [
  'Khách đổi ý / Hủy món',
  'Nhân viên bấm nhầm món',
  'Hết nguyên liệu chế biến',
  'Khách rời quán do chờ lâu',
  'Đơn đặt thử / Đơn trùng',
];

const VOID_REASONS_PRESETS = [
  'Thu ngân bấm nhầm số tiền / món',
  'Khách trả lại món / Hoàn tiền',
  'Đổi sang hóa đơn khác',
  'Thanh toán nhầm bàn',
];

export const OrderManagement: React.FC<OrderManagementProps> = ({
  branchId,
  user,
  currentShift,
  initialTableIdFilter,
  onClearInitialTableFilter,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'ACTIVE' | 'PAID'>('ACTIVE');
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [isLoading, setIsLoading] = useState(false);
  const [onlyCurrentShift, setOnlyCurrentShift] = useState<boolean>(false);
  const [selectedTableFilter, setSelectedTableFilter] = useState<string>(
    initialTableIdFilter || 'ALL',
  );
  const [searchQuery, setSearchQuery] = useState('');

  // State cho Sửa đơn đang phục vụ (Edit Active Order Modal)
  const [editingOrder, setEditingOrder] = useState<any | null>(null);
  const [editTableId, setEditTableId] = useState<string>('');
  const [editOrderType, setEditOrderType] = useState<'AT_TABLE' | 'TAKE_AWAY'>('AT_TABLE');
  const [editItems, setEditItems] = useState<any[]>([]);
  const [editReason, setEditReason] = useState<string>('');
  const [selectedAddProductId, setSelectedAddProductId] = useState<string>('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // State cho Hủy đơn chưa thanh toán (Cancel Unpaid Order Modal)
  const [cancellingOrder, setCancellingOrder] = useState<any | null>(null);
  const [cancelReasonInput, setCancelReasonInput] = useState<string>('');
  const [isCancelling, setIsCancelling] = useState(false);

  // State cho Void Hóa đơn đã thanh toán (Void Paid Bill Modal - yêu cầu PIN Quản lý)
  const [voidingOrder, setVoidingOrder] = useState<any | null>(null);
  const [voidReasonInput, setVoidReasonInput] = useState<string>('');
  const [managerPinInput, setManagerPinInput] = useState<string>('');
  const [voidErrorMsg, setVoidErrorMsg] = useState<string | null>(null);
  const [isVoiding, setIsVoiding] = useState(false);

  // State cho Đổi phương thức thanh toán
  const [switchingPaymentOrderId, setSwitchingPaymentOrderId] = useState<string | null>(null);

  // State xem chi tiết & in lại hóa đơn
  const [viewingOrder, setViewingOrder] = useState<any | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const activeShift =
    currentShift ||
    (localStorage.getItem('pos_shift')
      ? JSON.parse(localStorage.getItem('pos_shift')!)
      : null);

  useEffect(() => {
    if (initialTableIdFilter) {
      setActiveSubTab('ACTIVE');
      setSelectedTableFilter(initialTableIdFilter);
    }
  }, [initialTableIdFilter]);

  // Tải danh sách món ăn để hỗ trợ "Thêm món" khi sửa đơn
  useEffect(() => {
    api
      .get('/products')
      .then((res) => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setProducts(
            res.data.map((p: any) => ({
              id: String(p.id),
              categoryId: String(p.categoryId),
              name: p.name,
              description: p.description || '',
              basePrice: Number(p.basePrice) || 0,
              imageUrl: p.imageUrl || '',
              sizes: Array.isArray(p.sizes) ? p.sizes : [],
              availableToppings: Array.isArray(p.availableToppings)
                ? p.availableToppings
                : [],
            })),
          );
        }
      })
      .catch(() => {});
  }, []);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: any = { branchId };
      if (onlyCurrentShift && activeShift?.openedAt) {
        params.fromDate = activeShift.openedAt;
      } else {
        // Mặc định lấy các đơn trong ngày hôm nay
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        params.fromDate = startOfToday.toISOString();
      }
      const res = await api.get('/orders', { params });
      setOrders(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Lỗi tải danh sách đơn hàng:', err);
    } finally {
      setIsLoading(false);
    }
  }, [branchId, onlyCurrentShift, activeShift?.openedAt]);

  useEffect(() => {
    fetchOrders();

    const socket = io(
      import.meta.env.VITE_SOCKET_URL ||
        import.meta.env.VITE_API_GATEWAY_URL ||
        'http://localhost:3000',
      { transports: ['websocket', 'polling'] },
    );
    socket.emit('joinBranchRoom', String(branchId));

    const handleRealtimeRefresh = () => fetchOrders();
    socket.on('NEW_ORDER_CREATED', handleRealtimeRefresh);
    socket.on('QR_ORDER_PENDING', handleRealtimeRefresh);
    socket.on('QR_ORDER_UPDATED', handleRealtimeRefresh);
    socket.on('orderUpdated', handleRealtimeRefresh);
    socket.on('orderCancelled', handleRealtimeRefresh);
    socket.on('order:paid', handleRealtimeRefresh);
    socket.on('table:completed', handleRealtimeRefresh);

    return () => {
      socket.disconnect();
    };
  }, [branchId, fetchOrders]);

  const showBanner = (type: 'success' | 'error', text: string) => {
    setFeedbackBanner({ type, text });
    setTimeout(() => setFeedbackBanner(null), 4000);
  };

  // Phân loại đơn:
  // 1. Đơn đang phục vụ (Chưa thanh toán): PENDING, CONFIRMED, PREPARING, IN_PROGRESS, WAITING_CONFIRM
  const activeServingOrders = orders.filter(
    (o) =>
      o.status !== 'COMPLETED' &&
      o.status !== 'PAID' &&
      o.status !== 'CANCELLED' &&
      o.status !== 'VOIDED',
  );

  // 2. Hóa đơn đã thanh toán & đã hủy (Lịch sử Bill): COMPLETED, PAID, VOIDED, CANCELLED
  const historyBillOrders = orders.filter(
    (o) =>
      o.status === 'COMPLETED' ||
      o.status === 'PAID' ||
      o.status === 'VOIDED' ||
      o.status === 'CANCELLED',
  );

  // Tính toán thống kê nhanh cho Tab 2:
  const validPaidBills = orders.filter(
    (o) => o.status === 'COMPLETED' || o.status === 'PAID',
  );
  const voidedAndCancelledBills = orders.filter(
    (o) => o.status === 'VOIDED' || o.status === 'CANCELLED',
  );

  const getOrderMethod = (o: any): 'CASH' | 'TRANSFER' => {
    const raw = o.payment?.paymentMethod || o.paymentMethod || 'CASH';
    if (raw === 'BANK_TRANSFER' || raw === 'TRANSFER' || raw === 'QR') {
      return 'TRANSFER';
    }
    return 'CASH';
  };

  const totalNetRevenue = validPaidBills.reduce(
    (sum, o) => sum + Number(o.finalAmount ?? o.totalAmount ?? 0),
    0,
  );
  const totalCashRevenue = validPaidBills
    .filter((o) => getOrderMethod(o) === 'CASH')
    .reduce((sum, o) => sum + Number(o.finalAmount ?? o.totalAmount ?? 0), 0);
  const totalTransferRevenue = validPaidBills
    .filter((o) => getOrderMethod(o) === 'TRANSFER')
    .reduce((sum, o) => sum + Number(o.finalAmount ?? o.totalAmount ?? 0), 0);
  const totalVoidedAmount = voidedAndCancelledBills.reduce(
    (sum, o) => sum + Number(o.finalAmount ?? o.totalAmount ?? 0),
    0,
  );

  // Danh sách các bàn đang có đơn phục vụ để lọc nhanh
  const activeTablesList = Array.from(
    new Set(
      activeServingOrders
        .map((o) => o.tableId)
        .filter((t): t is string => Boolean(t)),
    ),
  ).sort((a, b) => Number(a) - Number(b));

  const filterOrderBySearchAndTable = (list: any[]) => {
    return list.filter((o) => {
      if (selectedTableFilter !== 'ALL') {
        if (String(o.tableId || '') !== String(selectedTableFilter)) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const codeStr = String(o.orderCode || '').toLowerCase();
        const idStr = String(o.id || '').toLowerCase();
        const tableStr = String(o.tableId || '').toLowerCase();
        const reasonStr = String(o.cancelReason || '').toLowerCase();
        return (
          codeStr.includes(q) ||
          idStr.includes(q) ||
          tableStr.includes(q) ||
          reasonStr.includes(q)
        );
      }
      return true;
    });
  };

  const displayedActiveOrders = filterOrderBySearchAndTable(activeServingOrders);
  const displayedPaidOrders = filterOrderBySearchAndTable(historyBillOrders);

  // Mở modal Sửa đơn đang phục vụ
  const handleOpenEditModal = (order: any) => {
    setEditingOrder(order);
    setEditTableId(order.tableId || '');
    setEditOrderType(order.orderType || 'AT_TABLE');
    setEditReason(order.cancelReason || '');
    setEditItems(
      (order.items || []).map((it: any) => ({
        ...it,
        quantity: Number(it.quantity || 1),
        unitPrice: Number(it.unitPrice || 0),
        note: it.note || '',
        toppings: Array.isArray(it.toppings) ? it.toppings : [],
      })),
    );
    setSelectedAddProductId(products[0]?.id || '');
  };

  const handleChangeEditItemQty = (idx: number, delta: number) => {
    setEditItems((prev) =>
      prev
        .map((it, i) =>
          i === idx ? { ...it, quantity: Math.max(0, it.quantity + delta) } : it,
        )
        .filter((it) => it.quantity > 0),
    );
  };

  const handleRemoveEditItem = (idx: number) => {
    setEditItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleChangeEditItemNote = (idx: number, note: string) => {
    setEditItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, note } : it)),
    );
  };

  const handleAddProductToEditOrder = () => {
    const prod = products.find((p) => p.id === selectedAddProductId);
    if (!prod) return;
    setEditItems((prev) => [
      ...prev,
      {
        productId: prod.id,
        productName: prod.name,
        size: prod.sizes?.[0]?.id || 'M',
        quantity: 1,
        unitPrice: Number(prod.basePrice || 0),
        note: '',
        toppings: [],
      },
    ]);
  };

  const calculateEditOrderTotal = () => {
    const rawTotal = editItems.reduce((sum, item) => {
      const topSum = (item.toppings || []).reduce(
        (tAcc: number, t: any) =>
          tAcc + Number(t.price || 0) * Number(t.quantity || 1),
        0,
      );
      return sum + (Number(item.unitPrice || 0) + topSum) * Number(item.quantity || 1);
    }, 0);
    const pct = Number(editingOrder?.discountPercent || 0);
    const disc = Math.round((rawTotal * pct) / 100);
    return Math.max(0, rawTotal - disc);
  };

  const handleSaveEditedOrder = async () => {
    if (!editingOrder) return;
    if (editItems.length === 0) {
      alert(
        'Đơn hàng phải còn ít nhất 1 món! Nếu muốn xóa hết món, vui lòng bấm "Hủy đơn".',
      );
      return;
    }

    setIsSavingEdit(true);
    try {
      await api.put(`/orders/${editingOrder.id}/items`, {
        tableId: editOrderType === 'AT_TABLE' ? editTableId : null,
        orderType: editOrderType,
        cancelReason: editReason.trim() || undefined,
        updatedBy: user?.fullName || user?.username || 'Thu ngân',
        items: editItems,
      });
      setEditingOrder(null);
      await fetchOrders();
      showBanner('success', 'Đã cập nhật danh sách món & đồng bộ xuống bếp KDS!');
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || 'Không thể lưu thay đổi đơn hàng.';
      showBanner('error', Array.isArray(msg) ? msg.join(', ') : String(msg));
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Xử lý Hủy đơn chưa thanh toán (PATCH /orders/:id/cancel)
  const handleConfirmCancelUnpaid = async () => {
    if (!cancellingOrder) return;
    if (!cancelReasonInput.trim()) {
      alert('Vui lòng chọn hoặc nhập lý do hủy đơn!');
      return;
    }

    setIsCancelling(true);
    try {
      await api.patch(`/orders/${cancellingOrder.id}/cancel`, {
        cancelReason: cancelReasonInput.trim(),
        cancelledBy: user?.fullName || user?.username || 'Thu ngân',
      });
      const cancelledTable = cancellingOrder.tableId;
      setCancellingOrder(null);
      setCancelReasonInput('');
      await fetchOrders();
      showBanner(
        'success',
        `Đã hủy đơn ${cancelledTable ? `Bàn ${cancelledTable}` : ''} và giải phóng bàn về trạng thái trống!`,
      );
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Không thể hủy đơn hàng này.';
      showBanner('error', Array.isArray(msg) ? msg.join(', ') : String(msg));
    } finally {
      setIsCancelling(false);
    }
  };

  // Xử lý Hủy hoàn tiền hóa đơn đã thanh toán - Void Bill (PATCH /orders/:id/void)
  const handleConfirmVoidBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voidingOrder) return;
    if (!managerPinInput.trim()) {
      setVoidErrorMsg('Vui lòng nhập Mã PIN Quản lý (mặc định: 1234)');
      return;
    }
    if (!voidReasonInput.trim()) {
      setVoidErrorMsg('Vui lòng chọn hoặc nhập lý do hủy hóa đơn (Void Bill)');
      return;
    }

    setIsVoiding(true);
    setVoidErrorMsg(null);
    try {
      await api.patch(`/orders/${voidingOrder.id}/void`, {
        managerPin: managerPinInput.trim(),
        cancelReason: voidReasonInput.trim(),
        cancelledBy: user?.fullName || user?.username || 'Quản lý',
      });
      setVoidingOrder(null);
      setVoidReasonInput('');
      setManagerPinInput('');
      await fetchOrders();
      showBanner(
        'success',
        'Đã hủy hóa đơn (VOIDED) thành công và tự động khấu trừ khỏi doanh thu thực thu!',
      );
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        'Mã PIN Quản lý không đúng hoặc không thể hủy hóa đơn.';
      setVoidErrorMsg(Array.isArray(msg) ? msg.join(', ') : String(msg));
    } finally {
      setIsVoiding(false);
    }
  };

  // Xử lý Đổi nhanh Phương thức thanh toán (CASH <-> TRANSFER)
  const handleTogglePaymentMethod = async (order: any) => {
    const currentMethod = getOrderMethod(order);
    const nextMethod = currentMethod === 'CASH' ? 'TRANSFER' : 'CASH';

    setSwitchingPaymentOrderId(order.id);
    try {
      await api.patch(`/orders/${order.id}/payment-method`, {
        paymentMethod: nextMethod,
        updatedBy: user?.fullName || user?.username || 'Thu ngân',
      });
      await fetchOrders();
      showBanner(
        'success',
        `Đã đổi PTTT của đơn #${order.orderCode || order.id.split('-')[0]} sang ${
          nextMethod === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản'
        }!`,
      );
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || 'Không thể đổi phương thức thanh toán.';
      showBanner('error', Array.isArray(msg) ? msg.join(', ') : String(msg));
    } finally {
      setSwitchingPaymentOrderId(null);
    }
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto bg-zinc-50">
      {/* Feedback Toast Banner */}
      {feedbackBanner && (
        <div
          className={cn(
            'mb-4 px-4 py-3 rounded-2xl border flex items-center justify-between shadow-sm animate-in fade-in duration-150 text-xs sm:text-sm font-bold',
            feedbackBanner.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
              : 'bg-red-50 border-red-300 text-red-800',
          )}
        >
          <div className="flex items-center gap-2">
            {feedbackBanner.type === 'success' ? (
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle size={18} className="text-red-600 shrink-0" />
            )}
            <span>{feedbackBanner.text}</span>
          </div>
          <button
            onClick={() => setFeedbackBanner(null)}
            className="text-zinc-400 hover:text-zinc-700 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-5">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 flex items-center gap-2.5">
            <FileEdit className="text-blue-600" size={26} />
            Sửa / Hủy Đơn Hàng & Hóa Đơn (Void Bill)
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Điều chỉnh món ăn cho bàn đang ngồi, hủy đơn trả bàn hoặc hủy hoàn tiền hóa đơn đã thanh toán (có kiểm soát PIN Quản lý)
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeShift && (
            <button
              type="button"
              onClick={() => setOnlyCurrentShift(!onlyCurrentShift)}
              className={cn(
                'px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border',
                onlyCurrentShift
                  ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-xs'
                  : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-100',
              )}
            >
              <Clock size={14} className={onlyCurrentShift ? 'text-blue-600' : 'text-zinc-400'} />
              <span>{onlyCurrentShift ? `Theo ca (${activeShift.shiftName})` : 'Trong ngày hôm nay'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={fetchOrders}
            disabled={isLoading}
            className="px-4 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-bold text-zinc-700 hover:bg-zinc-100 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
          >
            <RotateCw size={14} className={cn(isLoading && 'animate-spin text-blue-600')} />
            <span>{isLoading ? 'Đang tải...' : 'Làm mới'}</span>
          </button>
        </div>
      </div>

      {/* 2 Main Sub-Tabs Switcher */}
      <div className="bg-white p-2 rounded-2xl border border-zinc-200 shadow-xs mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab('ACTIVE')}
            className={cn(
              'px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer',
              activeSubTab === 'ACTIVE'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200',
            )}
          >
            <UtensilsCrossed size={16} />
            <span>1. Đơn đang phục vụ (Chưa thanh toán)</span>
            <span
              className={cn(
                'px-2 py-0.5 rounded-full text-xs font-extrabold',
                activeSubTab === 'ACTIVE'
                  ? 'bg-white/20 text-white'
                  : 'bg-blue-100 text-blue-700',
              )}
            >
              {activeServingOrders.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('PAID')}
            className={cn(
              'px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer',
              activeSubTab === 'PAID'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200',
            )}
          >
            <Receipt size={16} />
            <span>2. Hóa đơn đã thanh toán (Lịch sử Bill & Void)</span>
            <span
              className={cn(
                'px-2 py-0.5 rounded-full text-xs font-extrabold',
                activeSubTab === 'PAID'
                  ? 'bg-white/20 text-white'
                  : 'bg-emerald-100 text-emerald-700',
              )}
            >
              {historyBillOrders.length}
            </span>
          </button>
        </div>

        {/* Search & Table Filter */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedTableFilter}
            onChange={(e) => {
              setSelectedTableFilter(e.target.value);
              onClearInitialTableFilter?.();
            }}
            className="px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-800 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">Tất cả bàn ({activeTablesList.length} bàn đang ngồi)</option>
            {Array.from({ length: 20 }, (_, i) => String(i + 1)).map((tNum) => (
              <option key={tNum} value={tNum}>
                Bàn {tNum} {activeTablesList.includes(tNum) ? '• (Đang phục vụ)' : ''}
              </option>
            ))}
          </select>

          <div className="relative flex-1 sm:w-60">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm mã đơn, số bàn, lý do..."
              className="w-full pl-8 pr-7 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-medium text-zinc-900 focus:outline-none focus:border-blue-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: ĐƠN ĐANG PHỤC VỤ (CHƯA THANH TOÁN)                             */}
      {/* ===================================================================== */}
      {activeSubTab === 'ACTIVE' && (
        <div className="space-y-4">
          {/* Quick Table Pills if there are active tables */}
          {activeTablesList.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <span className="text-xs font-bold text-zinc-500 shrink-0">
                Chọn nhanh bàn đang ngồi:
              </span>
              <button
                type="button"
                onClick={() => setSelectedTableFilter('ALL')}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer',
                  selectedTableFilter === 'ALL'
                    ? 'bg-zinc-900 text-white border-zinc-900'
                    : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-100',
                )}
              >
                Tất cả ({activeServingOrders.length})
              </button>
              {activeTablesList.map((tId) => (
                <button
                  key={tId}
                  type="button"
                  onClick={() => setSelectedTableFilter(tId)}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer',
                    selectedTableFilter === tId
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
                  )}
                >
                  Bàn {tId}
                </button>
              ))}
            </div>
          )}

          {displayedActiveOrders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-zinc-200 p-12 text-center">
              <UtensilsCrossed size={36} className="mx-auto text-zinc-300 mb-2" />
              <p className="font-bold text-zinc-700 text-sm">
                Hiện không có đơn hàng nào đang phục vụ
              </p>
              <p className="text-xs text-zinc-400 mt-1">
                Khi khách gọi món tại bàn hoặc thu ngân gửi bếp, đơn sẽ hiển thị tại đây để bạn sửa món hoặc hủy đơn.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {displayedActiveOrders.map((order) => {
                const totalQty = (order.items || []).reduce(
                  (s: number, it: any) => s + Number(it.quantity || 1),
                  0,
                );
                return (
                  <div
                    key={order.id}
                    className="bg-white rounded-2xl border border-zinc-200 shadow-xs hover:border-blue-300 transition-all flex flex-col overflow-hidden"
                  >
                    {/* Card Header */}
                    <div className="px-5 py-3.5 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={cn(
                            'px-3 py-1 rounded-xl text-xs font-black',
                            order.orderType === 'AT_TABLE'
                              ? 'bg-blue-600 text-white'
                              : 'bg-purple-600 text-white',
                          )}
                        >
                          {order.orderType === 'AT_TABLE'
                            ? `Bàn ${order.tableId}`
                            : 'Mang về'}
                        </span>
                        <div>
                          <div className="text-xs font-bold text-zinc-900 font-mono">
                            #{order.orderCode || order.id.split('-')[0]}
                          </div>
                          <div className="text-[11px] text-zinc-500">
                            {formatDate(order.createdAt)} • {totalQty} món
                          </div>
                        </div>
                      </div>

                      <span
                        className={cn(
                          'px-2.5 py-1 rounded-full text-[11px] font-bold border',
                          order.status === 'WAITING_CONFIRM'
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : 'bg-blue-50 text-blue-700 border-blue-200',
                        )}
                      >
                        {order.status === 'WAITING_CONFIRM'
                          ? 'Chờ duyệt QR'
                          : 'Đang phục vụ'}
                      </span>
                    </div>

                    {/* Items List */}
                    <div className="p-4 flex-1 space-y-2 max-h-56 overflow-y-auto divide-y divide-zinc-100">
                      {(order.items || []).map((it: any, i: number) => {
                        const topSum = (it.toppings || []).reduce(
                          (acc: number, t: any) =>
                            acc + Number(t.price || 0) * Number(t.quantity || 1),
                          0,
                        );
                        const lineTotal =
                          (Number(it.unitPrice || 0) + topSum) *
                          Number(it.quantity || 1);
                        return (
                          <div
                            key={it.id || i}
                            className="pt-2 first:pt-0 flex justify-between items-start text-xs"
                          >
                            <div className="pr-2">
                              <div className="font-bold text-zinc-900">
                                <span className="text-blue-600 font-extrabold mr-1">
                                  {it.quantity}x
                                </span>
                                {it.productName}
                                {it.size && (
                                  <span className="ml-1.5 px-1.5 py-0.5 bg-zinc-100 rounded text-[10px] text-zinc-600">
                                    Size {it.size}
                                  </span>
                                )}
                              </div>
                              {it.toppings?.length > 0 && (
                                <div className="text-[11px] text-zinc-500 mt-0.5">
                                  +{' '}
                                  {it.toppings
                                    .map((t: any) => t.toppingName)
                                    .join(', ')}
                                </div>
                              )}
                              {it.note && (
                                <div className="text-[11px] text-blue-600 italic mt-0.5">
                                  Ghi chú: {it.note}
                                </div>
                              )}
                            </div>
                            <span className="font-bold text-zinc-900 shrink-0">
                              {formatCurrency(lineTotal)}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Card Footer */}
                    <div className="px-5 py-3.5 bg-zinc-50/80 border-t border-zinc-200 flex items-center justify-between gap-3">
                      <div>
                        <span className="text-[11px] text-zinc-500 block">
                          Tổng tạm tính:
                        </span>
                        <span className="text-base font-black text-blue-600">
                          {formatCurrency(order.finalAmount ?? order.totalAmount)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(order)}
                          className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95"
                        >
                          <FileEdit size={14} />
                          <span>Sửa món / Đổi bàn</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCancellingOrder(order);
                            setCancelReasonInput(CANCEL_REASONS_PRESETS[0]);
                          }}
                          className="px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                        >
                          <Ban size={14} />
                          <span>Hủy đơn</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: HÓA ĐƠN ĐÃ THANH TOÁN (LỊCH SỬ BILL & VOID BILL)               */}
      {/* ===================================================================== */}
      {activeSubTab === 'PAID' && (
        <div className="space-y-5">
          {/* Thanh thống kê nhanh Doanh thu thực thu vs. Đơn đã hủy (VOIDED) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-blue-200 shadow-xs">
              <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                Tổng doanh thu thực thu
              </div>
              <div className="text-2xl font-black text-blue-600 mt-1">
                {formatCurrency(totalNetRevenue)}
              </div>
              <div className="text-[11px] text-zinc-500 mt-1">
                {validPaidBills.length} hóa đơn hợp lệ (Không cộng đơn VOIDED)
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-xs">
              <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
                <Banknote size={14} /> Tiền mặt thực thu
              </div>
              <div className="text-xl font-black text-emerald-600 mt-1">
                {formatCurrency(totalCashRevenue)}
              </div>
              <div className="text-[11px] text-zinc-500 mt-1">
                {validPaidBills.filter((o) => getOrderMethod(o) === 'CASH').length} đơn tiền mặt
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-sky-200 shadow-xs">
              <div className="text-[11px] font-bold text-sky-700 uppercase tracking-wider flex items-center gap-1">
                <CreditCard size={14} /> Chuyển khoản / QR
              </div>
              <div className="text-xl font-black text-sky-600 mt-1">
                {formatCurrency(totalTransferRevenue)}
              </div>
              <div className="text-[11px] text-zinc-500 mt-1">
                {validPaidBills.filter((o) => getOrderMethod(o) === 'TRANSFER').length} đơn chuyển khoản
              </div>
            </div>

            <div className="bg-red-50/70 p-4 rounded-2xl border border-red-200 shadow-xs">
              <div className="text-[11px] font-bold text-red-700 uppercase tracking-wider flex items-center gap-1">
                <ShieldAlert size={14} /> Tổng tiền đơn đã hủy / Void
              </div>
              <div className="text-xl font-black text-red-600 mt-1">
                {formatCurrency(totalVoidedAmount)}
              </div>
              <div className="text-[11px] text-red-700/80 mt-1">
                {voidedAndCancelledBills.length} đơn đã hủy / hoàn tiền
              </div>
            </div>
          </div>

          {/* Bảng danh sách hóa đơn */}
          <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-100 text-zinc-600 font-semibold border-b border-zinc-200 text-xs uppercase">
                <tr>
                  <th className="px-5 py-3.5">Mã HĐ</th>
                  <th className="px-5 py-3.5">Thời gian</th>
                  <th className="px-5 py-3.5">Phục vụ</th>
                  <th className="px-5 py-3.5">PT Thanh toán</th>
                  <th className="px-5 py-3.5">Tổng tiền</th>
                  <th className="px-5 py-3.5">Trạng thái & Lý do hủy</th>
                  <th className="px-5 py-3.5 text-right">Thao tác nghiệp vụ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {displayedPaidOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-zinc-400 text-xs">
                      Chưa có hóa đơn nào trong danh sách
                    </td>
                  </tr>
                ) : (
                  displayedPaidOrders.map((order) => {
                    const isPaid =
                      order.status === 'COMPLETED' || order.status === 'PAID';
                    const isVoided = order.status === 'VOIDED';
                    const isCancelled = order.status === 'CANCELLED';
                    const method = getOrderMethod(order);

                    return (
                      <tr
                        key={order.id}
                        className={cn(
                          'transition-colors',
                          isVoided || isCancelled
                            ? 'bg-red-50/40 hover:bg-red-50/70'
                            : 'hover:bg-blue-50/30',
                        )}
                      >
                        <td className="px-5 py-4 font-mono text-xs font-bold text-zinc-800">
                          {order.orderCode
                            ? `#${order.orderCode}`
                            : `#${order.id.split('-')[0]}`}
                        </td>
                        <td className="px-5 py-4 text-xs text-zinc-600">
                          {formatDate(order.createdAt)}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={cn(
                              'px-2.5 py-0.5 rounded-md text-xs font-bold',
                              order.orderType === 'AT_TABLE'
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-purple-50 text-purple-700',
                            )}
                          >
                            {order.orderType === 'AT_TABLE'
                              ? `Bàn ${order.tableId}`
                              : 'Mang về'}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-xs">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold',
                              method === 'CASH'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-sky-50 text-sky-700 border border-sky-200',
                            )}
                          >
                            {method === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản'}
                          </span>
                        </td>
                        <td
                          className={cn(
                            'px-5 py-4 font-black text-sm',
                            isVoided || isCancelled
                              ? 'line-through text-red-500'
                              : 'text-zinc-900',
                          )}
                        >
                          {formatCurrency(order.finalAmount ?? order.totalAmount)}
                        </td>
                        <td className="px-5 py-4">
                          {isPaid && (
                            <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Đã thanh toán (PAID)
                            </span>
                          )}
                          {isVoided && (
                            <div>
                              <span className="px-2.5 py-0.5 rounded-md text-xs font-black bg-red-600 text-white">
                                ĐÃ HỦY BILL (VOIDED)
                              </span>
                              {order.cancelReason && (
                                <p className="text-[11px] text-red-700 font-semibold mt-1">
                                  Lý do: {order.cancelReason}
                                  {order.cancelledBy ? ` (${order.cancelledBy})` : ''}
                                </p>
                              )}
                            </div>
                          )}
                          {isCancelled && (
                            <div>
                              <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                Đã hủy trước TT (CANCELLED)
                              </span>
                              {order.cancelReason && (
                                <p className="text-[11px] text-rose-700 mt-1">
                                  Lý do: {order.cancelReason}
                                </p>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="inline-flex items-center justify-end gap-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={() => setViewingOrder(order)}
                              className="px-2.5 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold transition-colors cursor-pointer"
                            >
                              Xem / In
                            </button>

                            {isPaid && (
                              <>
                                {/* Nút Sửa PTTT nhanh */}
                                <button
                                  type="button"
                                  disabled={switchingPaymentOrderId === order.id}
                                  onClick={() => handleTogglePaymentMethod(order)}
                                  title="Đổi nhanh giữa Tiền mặt và Chuyển khoản"
                                  className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold inline-flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  <ArrowLeftRight size={13} />
                                  <span>Sửa PTTT</span>
                                </button>

                                {/* Nút Hủy Hóa Đơn (Void Bill) */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setVoidingOrder(order);
                                    setVoidReasonInput(VOID_REASONS_PRESETS[0]);
                                    setManagerPinInput('');
                                    setVoidErrorMsg(null);
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-600 text-red-700 hover:text-white border border-red-200 hover:border-red-600 text-xs font-bold inline-flex items-center gap-1 transition-all cursor-pointer"
                                >
                                  <Ban size={13} />
                                  <span>Hủy HĐ (Void)</span>
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 1: SỬA MÓN / ĐỔI BÀN CHO ĐƠN ĐANG PHỤC VỤ                       */}
      {/* ===================================================================== */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-zinc-200">
            <div className="px-6 py-4 bg-blue-600 text-white flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-lg font-extrabold">
                  Sửa đơn hàng #{editingOrder.orderCode || editingOrder.id.split('-')[0]}
                </h3>
                <p className="text-xs text-blue-100">
                  Tăng/giảm số lượng, xóa món, thêm món hoặc chuyển bàn (Tự động cập nhật KDS Bếp)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingOrder(null)}
                className="p-1.5 rounded-full text-blue-100 hover:text-white hover:bg-white/20 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {/* Đổi loại đơn & Số bàn */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1">
                    Hình thức phục vụ
                  </label>
                  <select
                    value={editOrderType}
                    onChange={(e) =>
                      setEditOrderType(e.target.value as 'AT_TABLE' | 'TAKE_AWAY')
                    }
                    className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-xl text-xs font-bold"
                  >
                    <option value="AT_TABLE">Phục vụ tại bàn</option>
                    <option value="TAKE_AWAY">Khách mang về</option>
                  </select>
                </div>

                {editOrderType === 'AT_TABLE' && (
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1">
                      Chuyển sang bàn số
                    </label>
                    <select
                      value={editTableId}
                      onChange={(e) => setEditTableId(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-xl text-xs font-bold text-blue-700"
                    >
                      {Array.from({ length: 20 }, (_, i) => String(i + 1)).map(
                        (num) => (
                          <option key={num} value={num}>
                            Bàn {num}
                          </option>
                        ),
                      )}
                    </select>
                  </div>
                )}
              </div>

              {/* Thêm món nhanh vào đơn */}
              <div className="flex items-center gap-2 p-3 bg-blue-50/60 border border-blue-200 rounded-2xl">
                <select
                  value={selectedAddProductId}
                  onChange={(e) => setSelectedAddProductId(e.target.value)}
                  className="flex-1 px-3 py-2 bg-white border border-zinc-300 rounded-xl text-xs font-semibold"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {formatCurrency(p.basePrice)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddProductToEditOrder}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <Plus size={14} /> Thêm món
                </button>
              </div>

              {/* Danh sách các món trong đơn */}
              <div className="space-y-2.5">
                <div className="text-xs font-bold uppercase text-zinc-500">
                  Danh sách món trong đơn ({editItems.length} dòng)
                </div>
                {editItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-white border border-zinc-200 rounded-2xl flex flex-col gap-2 shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="font-bold text-zinc-900 text-sm">
                          {item.productName}
                        </span>
                        {item.size && (
                          <span className="ml-2 px-2 py-0.5 bg-zinc-100 rounded text-xs font-semibold text-zinc-600">
                            Size {item.size}
                          </span>
                        )}
                        <div className="text-xs text-blue-600 font-bold mt-0.5">
                          Đơn giá: {formatCurrency(item.unitPrice)}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center bg-zinc-100 rounded-xl border border-zinc-200">
                          <button
                            type="button"
                            onClick={() => handleChangeEditItemQty(idx, -1)}
                            className="w-8 h-8 flex items-center justify-center text-zinc-700 hover:bg-zinc-200 rounded-l-xl cursor-pointer"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="w-8 text-center text-xs font-black text-zinc-900">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleChangeEditItemQty(idx, 1)}
                            className="w-8 h-8 flex items-center justify-center text-zinc-700 hover:bg-zinc-200 rounded-r-xl cursor-pointer"
                          >
                            <Plus size={14} />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveEditItem(idx)}
                          title="Xóa món này khỏi đơn"
                          className="p-2 text-red-500 hover:bg-red-50 rounded-xl cursor-pointer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <input
                      type="text"
                      value={item.note || ''}
                      onChange={(e) => handleChangeEditItemNote(idx, e.target.value)}
                      placeholder="Ghi chú món (VD: Ít đá, 50% đường...)"
                      className="w-full px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs"
                    />
                  </div>
                ))}
              </div>

              {/* Ghi chú lý do sửa */}
              <div>
                <label className="block text-xs font-bold text-zinc-600 mb-1">
                  Lý do chỉnh sửa đơn (tùy chọn):
                </label>
                <input
                  type="text"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="VD: Khách đổi bàn / Khách giảm 1 ly trà sữa..."
                  className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-200 flex items-center justify-between">
              <div>
                <span className="text-xs text-zinc-500 block">
                  Tổng tiền sau điều chỉnh:
                </span>
                <span className="text-xl font-black text-blue-600">
                  {formatCurrency(calculateEditOrderTotal())}
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingOrder(null)}
                  className="px-4 py-2.5 rounded-xl border border-zinc-300 text-zinc-700 text-xs font-bold hover:bg-zinc-100 cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  disabled={isSavingEdit}
                  onClick={handleSaveEditedOrder}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Save size={15} />
                  <span>{isSavingEdit ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 2: HỦY ĐƠN CHƯA THANH TOÁN (TRẢ BÀN VỀ TRỐNG)                   */}
      {/* ===================================================================== */}
      {cancellingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-zinc-200">
            <div className="px-6 py-4 bg-red-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ban size={20} />
                <h3 className="font-bold text-base">
                  Hủy đơn chưa thanh toán
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCancellingOrder(null)}
                className="text-red-100 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-900">
                Bạn đang yêu cầu hủy đơn{' '}
                <strong>
                  #{cancellingOrder.orderCode || cancellingOrder.id.split('-')[0]}
                </strong>{' '}
                {cancellingOrder.tableId && (
                  <span>(Bàn {cancellingOrder.tableId})</span>
                )}{' '}
                trị giá{' '}
                <strong>
                  {formatCurrency(
                    cancellingOrder.finalAmount ?? cancellingOrder.totalAmount,
                  )}
                </strong>
                . Sau khi hủy, bàn sẽ được giải phóng về trạng thái trống và thông báo hủy xuống bếp KDS.
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-2">
                  Chọn nhanh lý do hủy đơn *
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {CANCEL_REASONS_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setCancelReasonInput(preset)}
                      className={cn(
                        'px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer',
                        cancelReasonInput === preset
                          ? 'bg-red-600 text-white border-red-600'
                          : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100',
                      )}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <textarea
                  rows={2}
                  value={cancelReasonInput}
                  onChange={(e) => setCancelReasonInput(e.target.value)}
                  placeholder="Hoặc nhập chi tiết lý do hủy đơn..."
                  className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-xs focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCancellingOrder(null)}
                  className="px-4 py-2.5 rounded-xl border border-zinc-300 text-zinc-700 text-xs font-bold hover:bg-zinc-100 cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  disabled={isCancelling}
                  onClick={handleConfirmCancelUnpaid}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  {isCancelling ? 'Đang hủy...' : 'Xác nhận Hủy đơn'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 3: HỦY HÓA ĐƠN ĐÃ THANH TOÁN - VOID BILL (YÊU CẦU PIN QUẢN LÝ)  */}
      {/* ===================================================================== */}
      {voidingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <form
            onSubmit={handleConfirmVoidBill}
            className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-zinc-200"
          >
            <div className="px-6 py-4 bg-gradient-to-r from-red-600 to-rose-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert size={20} />
                <h3 className="font-bold text-base">
                  Hủy Hóa Đơn Đã Thanh Toán (Void Bill)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setVoidingOrder(null)}
                className="text-red-100 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                Hóa đơn{' '}
                <strong>
                  #{voidingOrder.orderCode || voidingOrder.id.split('-')[0]}
                </strong>{' '}
                ({formatCurrency(voidingOrder.finalAmount ?? voidingOrder.totalAmount)}) sẽ chuyển sang trạng thái{' '}
                <strong className="text-red-600">VOIDED</strong> và tự động trừ khỏi doanh thu thực thu trong ca. Bản ghi vẫn được lưu vết kiểm toán.
              </div>

              {voidErrorMsg && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
                  {voidErrorMsg}
                </div>
              )}

              {/* Nhập Mã PIN Quản lý */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5 flex items-center gap-1.5">
                  <Lock size={14} className="text-red-600" />
                  Mã PIN Quản lý xác nhận * (Mặc định: 1234)
                </label>
                <input
                  type="password"
                  required
                  autoFocus
                  value={managerPinInput}
                  onChange={(e) => setManagerPinInput(e.target.value)}
                  placeholder="Nhập mã PIN quản lý (1234)..."
                  className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-300 rounded-xl text-sm font-black tracking-widest text-center focus:outline-none focus:border-red-500"
                />
              </div>

              {/* Chọn / Nhập lý do Void */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                  Lý do hủy hoàn tiền hóa đơn *
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {VOID_REASONS_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setVoidReasonInput(preset)}
                      className={cn(
                        'px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer',
                        voidReasonInput === preset
                          ? 'bg-red-600 text-white border-red-600'
                          : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100',
                      )}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <textarea
                  rows={2}
                  required
                  value={voidReasonInput}
                  onChange={(e) => setVoidReasonInput(e.target.value)}
                  placeholder="Nhập lý do hủy hóa đơn..."
                  className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-xs focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setVoidingOrder(null)}
                  className="px-4 py-2.5 rounded-xl border border-zinc-300 text-zinc-700 text-xs font-bold hover:bg-zinc-100 cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isVoiding}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  {isVoiding ? 'Đang xử lý...' : 'Xác nhận Void Hóa Đơn'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 4: XEM CHI TIẾT & IN LẠI HÓA ĐƠN                                */}
      {/* ===================================================================== */}
      {viewingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 print:bg-white print:static print:inset-auto print:p-0">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 print:hidden">
            <div className="px-6 py-4 border-b border-zinc-200 flex justify-between items-center bg-blue-50">
              <div>
                <h3 className="font-bold text-lg text-blue-900">
                  Chi tiết hóa đơn:{' '}
                  {viewingOrder.orderCode
                    ? `#${viewingOrder.orderCode}`
                    : viewingOrder.id.split('-')[0]}
                </h3>
              </div>
              <button
                onClick={() => setViewingOrder(null)}
                className="p-1 text-zinc-400 hover:text-zinc-900 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
              <div className="flex justify-between pb-3 border-b border-zinc-100 text-xs">
                <div>
                  <p className="text-zinc-500 mb-0.5">Thời gian tạo:</p>
                  <p className="font-semibold">
                    {formatDateTimeFull(viewingOrder.createdAt)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-zinc-500 mb-0.5">Phương thức TT:</p>
                  <p className="font-bold text-emerald-600">
                    {formatPaymentMethod(
                      viewingOrder.payment?.paymentMethod ||
                        viewingOrder.paymentMethod,
                    )}
                  </p>
                </div>
              </div>

              {viewingOrder.cancelReason && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
                  <strong>Lý do hủy / chỉnh sửa:</strong> {viewingOrder.cancelReason}
                  {viewingOrder.cancelledBy && (
                    <span> • Thực hiện bởi: {viewingOrder.cancelledBy}</span>
                  )}
                </div>
              )}

              <div className="space-y-2">
                {(viewingOrder.items || []).map((item: any, idx: number) => (
                  <div
                    key={item.id || idx}
                    className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl flex justify-between items-start text-xs"
                  >
                    <div>
                      <div className="font-bold text-zinc-900">
                        {item.quantity}x {item.productName}
                      </div>
                      <div className="text-[11px] text-zinc-500 mt-0.5">
                        {item.size && <span>Size: {item.size}</span>}
                        {item.toppings?.length > 0 && (
                          <span>
                            {' '}
                            |{' '}
                            {item.toppings
                              .map((t: any) => t.toppingName)
                              .join(', ')}
                          </span>
                        )}
                      </div>
                      {item.note && (
                        <div className="text-[11px] text-blue-600 mt-0.5">
                          Ghi chú: {item.note}
                        </div>
                      )}
                    </div>
                    <div className="font-bold text-zinc-900">
                      {formatCurrency(
                        Number(item.unitPrice || 0) * Number(item.quantity || 1) +
                          (item.toppings?.reduce(
                            (acc: number, t: any) =>
                              acc +
                              Number(t.price || 0) * Number(t.quantity || 1),
                            0,
                          ) || 0) *
                            Number(item.quantity || 1),
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-5 bg-zinc-50 border-t border-zinc-200 flex justify-between items-center">
              <div>
                <span className="block font-bold text-zinc-500 text-xs mb-0.5">
                  Tổng thanh toán:
                </span>
                <span className="text-xl font-black text-blue-600">
                  {formatCurrency(viewingOrder.finalAmount ?? viewingOrder.totalAmount)}
                </span>
              </div>
              <button
                onClick={() => window.print()}
                className="px-5 py-2.5 bg-zinc-900 text-white font-bold text-xs rounded-xl flex items-center gap-2 hover:bg-zinc-800 transition-colors cursor-pointer shadow-md"
              >
                <Printer size={16} /> In Hóa Đơn
              </button>
            </div>
          </div>

          <PrintableReceipt order={viewingOrder} user={user || {}} />
        </div>
      )}
    </div>
  );
};
