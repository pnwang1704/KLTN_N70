import React, { useState, useEffect } from 'react';
import { X, CheckCircle2 } from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import api from '../lib/axios';
import { useCart } from '../context/CartContext';
import { Receipt } from './Receipt';
import { io } from 'socket.io-client';
import { ErrorModal, WarningModal } from './ui/Modals';

interface PaymentModalProps {
  orderId?: string;
  orderData?: any;
  totalAmount: number;
  onClose: () => void;
  onSuccess: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ orderId, orderData, totalAmount, onClose, onSuccess }) => {
  const normalizedTotal = Math.round(Number(totalAmount) || 0);

  const formatAmountInput = (val: number | string): string => {
    const digits = val.toString().replace(/\D/g, '');
    if (!digits) return '';
    return Number(digits).toLocaleString('vi-VN') + ' đ';
  };

  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER'>('CASH');
  const [amountPaidStr, setAmountPaidStr] = useState(formatAmountInput(normalizedTotal));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<any>(null);
  const [payOsQr, setPayOsQr] = useState<string>('');
  const [orderCode, setOrderCode] = useState<number | null>(null);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(orderId || null);
  const [tempQrCreatedId, setTempQrCreatedId] = useState<string | null>(null);
  const [warningMsg, setWarningMsg] = useState<{ title?: string; message: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<{ title?: string; error: string } | null>(null);
  const { clearCart } = useCart();

  useEffect(() => {
    if (orderId) {
      setActiveOrderId(orderId);
    }
  }, [orderId]);

  useEffect(() => {
    setAmountPaidStr(formatAmountInput(normalizedTotal));
  }, [normalizedTotal]);

  const amountPaid = parseInt(amountPaidStr.replace(/\D/g, '') || '0', 10);
  const changeAmount = amountPaid - normalizedTotal;

  const handleClose = async () => {
    if (tempQrCreatedId) {
      try {
        await api.delete(`/orders/${tempQrCreatedId}`);
      } catch (e) {
        console.warn('Could not delete temporary QR order', e);
      }
    }
    onClose();
  };

  const isSuccessRef = React.useRef(isSuccess);
  const paymentMethodRef = React.useRef(paymentMethod);
  const orderDataRef = React.useRef(orderData);
  const normalizedTotalRef = React.useRef(normalizedTotal);
  const orderCodeRef = React.useRef(orderCode);

  useEffect(() => {
    isSuccessRef.current = isSuccess;
  }, [isSuccess]);

  useEffect(() => {
    paymentMethodRef.current = paymentMethod;
  }, [paymentMethod]);

  useEffect(() => {
    orderDataRef.current = orderData;
  }, [orderData]);

  useEffect(() => {
    normalizedTotalRef.current = normalizedTotal;
  }, [normalizedTotal]);

  useEffect(() => {
    orderCodeRef.current = orderCode;
  }, [orderCode]);

  useEffect(() => {
    const userStr = localStorage.getItem('pos_user');
    const user = userStr ? JSON.parse(userStr) : null;
    const branchId = user?.branchId || 1;
    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3004';
    const socket = io(socketUrl);

    socket.on('connect', () => {
      socket.emit('joinBranchRoom', branchId.toString());
    });

    socket.on('order:paid', async (data: any) => {
      // If already marked success or cashier is processing CASH, do NOT overwrite!
      if (isSuccessRef.current || paymentMethodRef.current === 'CASH') {
        return;
      }

      const targetId = activeOrderId || orderId;
      if (targetId && data.orderId === targetId && data.status === 'COMPLETED') {
        setTempQrCreatedId(null);
        const curOrderData = orderDataRef.current;
        const curTotal = normalizedTotalRef.current;

        // If paying for a table with multiple orders, complete remaining table orders
        if (curOrderData?.orderIds && curOrderData.orderIds.length > 0) {
          try {
            await api.post('/orders/pay-table', {
              branchId,
              tableId: curOrderData.tableId,
              orderIds: curOrderData.orderIds,
              paymentMethod: 'BANK_TRANSFER',
              amountPaid: curTotal,
            });
          } catch (err) {
            console.warn('pay-table call during socket order:paid:', err);
          }

          setCompletedOrder({
            id: curOrderData.orderIds[0],
            orderCode: orderCodeRef.current || undefined,
            tableId: curOrderData.tableId,
            orderType: 'AT_TABLE',
            branchId,
            items: curOrderData.items,
            discountPercent: curOrderData.discountPercent || 0,
            totalAmount: curOrderData.totalAmount || curTotal,
            finalAmount: curTotal,
            createdAt: new Date().toISOString(),
            payment: { paymentMethod: 'BANK_TRANSFER', amount: curTotal }
          });
        } else if (curOrderData?.items && curOrderData.items.length > 0) {
          setCompletedOrder({
            id: targetId,
            orderCode: orderCodeRef.current || undefined,
            tableId: curOrderData.tableId,
            orderType: curOrderData.orderType || 'TAKE_AWAY',
            branchId: curOrderData.branchId || branchId,
            items: curOrderData.items,
            discountPercent: curOrderData.discountPercent || 0,
            totalAmount: curOrderData.totalAmount || curTotal,
            finalAmount: curTotal,
            createdAt: new Date().toISOString(),
            payment: { paymentMethod: 'BANK_TRANSFER', amount: curTotal }
          });
        } else {
          try {
            const res = await api.get(`/orders?branchId=${branchId}`);
            const foundOrder = res.data.find((o: any) => o.id === targetId);
            if (foundOrder) {
              setCompletedOrder({ 
                ...foundOrder, 
                discountPercent: foundOrder.discountPercent || curOrderData?.discountPercent || 0, 
                finalAmount: curTotal, 
                payment: { paymentMethod: 'BANK_TRANSFER', amount: curTotal } 
              });
            }
          } catch (e) {
            console.error("Could not fetch order for receipt", e);
          }
        }
        setIsSuccess(true);
        clearCart();
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [orderId, activeOrderId, clearCart]);

  // Auto set amount paid to total if bank transfer & generate PayOS QR
  useEffect(() => {
    if (paymentMethod === 'BANK_TRANSFER') {
      setAmountPaidStr(formatAmountInput(normalizedTotal));
      
      const initPayOs = async () => {
        try {
          let targetOrderId = activeOrderId || orderId;
          let targetOrderCode = orderCode;

          // If no order created yet and we have orderData, create it now for VietQR
          if (!targetOrderId && orderData) {
            const userStr = localStorage.getItem('pos_user');
            const user = userStr ? JSON.parse(userStr) : null;
            const branchId = user?.branchId || orderData.branchId || '1';

            const res = await api.post('/orders', {
              ...orderData,
              branchId,
              totalAmount: orderData.totalAmount || normalizedTotal,
              finalAmount: normalizedTotal,
              discountPercent: orderData.discountPercent || 0,
              paymentMethod: 'BANK_TRANSFER'
            });
            const newOrder = res.data;
            targetOrderId = newOrder.id;
            targetOrderCode = newOrder.orderCode;
            setActiveOrderId(newOrder.id);
            setTempQrCreatedId(newOrder.id);
            setOrderCode(newOrder.orderCode);
          }

          if (targetOrderId && !targetOrderCode) {
            const userStr = localStorage.getItem('pos_user');
            const user = userStr ? JSON.parse(userStr) : null;
            const resOrder = await api.get(`/orders?branchId=${user?.branchId || 1}`);
            const foundOrder = resOrder.data.find((o: any) => o.id === targetOrderId);
            if (foundOrder && foundOrder.orderCode) {
              targetOrderCode = foundOrder.orderCode;
              setOrderCode(targetOrderCode);
            }
          }

          if (targetOrderId && targetOrderCode) {
            const res = await api.post('/payments/payos/create', {
              orderId: targetOrderId,
              orderCode: targetOrderCode,
              totalAmount: normalizedTotal
            });
            const data = res.data;
            // Generate VietQR image from PayOS response
            const qrUrl = `https://img.vietqr.io/image/${data.bin}-${data.accountNumber}-compact2.png?amount=${data.amount}&addInfo=${data.description}&accountName=${encodeURIComponent(data.accountName)}`;
            setPayOsQr(qrUrl);
          }
        } catch (e) {
          console.error('Failed to init PayOS', e);
        }
      };
      initPayOs();
    }
  }, [paymentMethod, normalizedTotal, orderId, activeOrderId, orderData, orderCode]);

  // Fallback Polling for PayOS
  useEffect(() => {
    if (paymentMethod === 'BANK_TRANSFER' && orderCode && !isSuccess) {
      const interval = setInterval(async () => {
        try {
          const res = await api.post('/payments/payos/status', { orderCode });
          if (res.data && res.data.paid) {
            setTempQrCreatedId(null);
            const userStr = localStorage.getItem('pos_user');
            const user = userStr ? JSON.parse(userStr) : null;
            const branchId = user?.branchId || 1;

            if (orderData?.orderIds && orderData.orderIds.length > 0) {
              try {
                await api.post('/orders/pay-table', {
                  branchId,
                  tableId: orderData.tableId,
                  orderIds: orderData.orderIds,
                  paymentMethod: 'BANK_TRANSFER',
                  amountPaid: normalizedTotal,
                });
              } catch (err) {
                console.warn('pay-table call during QR status check:', err);
              }
              setCompletedOrder({
                id: orderData.orderIds[0],
                orderCode: orderCode || undefined,
                tableId: orderData.tableId,
                orderType: 'AT_TABLE',
                branchId,
                items: orderData.items,
                discountPercent: orderData.discountPercent || 0,
                finalAmount: normalizedTotal,
                totalAmount: orderData.totalAmount || normalizedTotal,
                createdAt: new Date().toISOString(),
                payment: { paymentMethod: 'BANK_TRANSFER', amount: normalizedTotal }
              });
            } else if (orderData?.items && orderData.items.length > 0) {
              const targetId = activeOrderId || orderId || 'ORDER';
              setCompletedOrder({
                id: targetId,
                orderCode: orderCode || undefined,
                tableId: orderData.tableId,
                orderType: orderData.orderType || 'TAKE_AWAY',
                branchId: orderData.branchId || branchId,
                items: orderData.items,
                discountPercent: orderData.discountPercent || 0,
                totalAmount: orderData.totalAmount || normalizedTotal,
                finalAmount: normalizedTotal,
                createdAt: new Date().toISOString(),
                payment: { paymentMethod: 'BANK_TRANSFER', amount: normalizedTotal }
              });
            } else {
              const resOrder = await api.get(`/orders?branchId=${branchId}`);
              const targetId = activeOrderId || orderId;
              const foundOrder = resOrder.data.find((o: any) => o.id === targetId);
              if (foundOrder) {
                setCompletedOrder({ 
                  ...foundOrder, 
                  discountPercent: foundOrder.discountPercent || orderData?.discountPercent || 0, 
                  finalAmount: normalizedTotal, 
                  payment: { paymentMethod: 'BANK_TRANSFER', amount: normalizedTotal } 
                });
              }
            }
            setIsSuccess(true);
            clearCart();
          }
        } catch (e) {
          console.error('Polling payment status failed', e);
        }
      }, 3000); // Check every 3 seconds
      return () => clearInterval(interval);
    }
  }, [paymentMethod, orderCode, isSuccess, orderId, activeOrderId, normalizedTotal, clearCart, orderData]);

  const handlePayment = async () => {
    if (amountPaid < normalizedTotal) {
      setWarningMsg({
        title: 'Chưa đủ tiền',
        message: 'Số tiền khách đưa chưa đủ so với tổng giá trị đơn hàng!'
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      let targetOrderId = activeOrderId || orderId;
      let orderToComplete: any = null;

      if (orderData?.orderIds && orderData.orderIds.length > 0) {
        const userStr = localStorage.getItem('pos_user');
        const user = userStr ? JSON.parse(userStr) : null;
        const branchId = user?.branchId || orderData.branchId || '1';

        await api.post('/orders/pay-table', {
          branchId,
          tableId: orderData.tableId,
          orderIds: orderData.orderIds,
          paymentMethod,
          amountPaid,
        });

        setTempQrCreatedId(null);
        setCompletedOrder({
          id: orderData.orderIds[0],
          orderCode: orderCode || undefined,
          tableId: orderData.tableId,
          orderType: 'AT_TABLE',
          branchId,
          items: orderData.items,
          discountPercent: orderData.discountPercent || 0,
          totalAmount: orderData.totalAmount || normalizedTotal,
          finalAmount: normalizedTotal,
          createdAt: new Date().toISOString(),
          payment: { paymentMethod, amount: amountPaid }
        });
      } else {
        // If new order from cart, create it now with current items
        if (!targetOrderId && orderData) {
          const userStr = localStorage.getItem('pos_user');
          const user = userStr ? JSON.parse(userStr) : null;
          const branchId = user?.branchId || orderData.branchId || '1';

          const createRes = await api.post('/orders', {
            ...orderData,
            branchId,
            totalAmount: orderData.totalAmount || normalizedTotal,
            finalAmount: normalizedTotal,
            discountPercent: orderData.discountPercent || 0,
            paymentMethod
          });
          orderToComplete = createRes.data;
          targetOrderId = orderToComplete.id;
          setActiveOrderId(targetOrderId || null);
        }

        if (targetOrderId) {
          await api.post(`/orders/${targetOrderId}/pay`, {
            paymentMethod,
            amountPaid,
            discountPercent: orderData?.discountPercent || 0,
            finalAmount: normalizedTotal
          });

          // Clear tempQrCreatedId so handleClose won't delete the completed order
          setTempQrCreatedId(null);

          if (orderData?.items && orderData.items.length > 0) {
            setCompletedOrder({
              id: targetOrderId,
              orderCode: orderCode || orderToComplete?.orderCode || undefined,
              tableId: orderData.tableId,
              orderType: orderData.orderType || 'TAKE_AWAY',
              branchId: orderData.branchId || '1',
              items: orderData.items,
              discountPercent: orderData.discountPercent || 0,
              totalAmount: orderData.totalAmount || normalizedTotal,
              finalAmount: normalizedTotal,
              createdAt: new Date().toISOString(),
              payment: { paymentMethod, amount: amountPaid }
            });
          } else {
            // Fetch the order to get full details for the receipt
            try {
              const userStr = localStorage.getItem('pos_user');
              const user = userStr ? JSON.parse(userStr) : null;
              const res = await api.get(`/orders?branchId=${user?.branchId || 1}`);
              const foundOrder = res.data.find((o: any) => o.id === targetOrderId);
              if (foundOrder) {
                setCompletedOrder({
                  ...foundOrder,
                  discountPercent: foundOrder.discountPercent || orderData?.discountPercent || 0,
                  finalAmount: normalizedTotal,
                  payment: { paymentMethod, amount: amountPaid }
                });
              } else if (orderToComplete) {
                setCompletedOrder({
                  ...orderToComplete,
                  discountPercent: orderData?.discountPercent || 0,
                  finalAmount: normalizedTotal,
                  payment: { paymentMethod, amount: amountPaid }
                });
              }
            } catch (e) {
              console.error("Could not fetch order for receipt", e);
              if (orderToComplete) {
                setCompletedOrder({
                  ...orderToComplete,
                  discountPercent: orderData?.discountPercent || 0,
                  finalAmount: normalizedTotal,
                  payment: { paymentMethod, amount: amountPaid }
                });
              }
            }
          }
        }
      }

      setIsSuccess(true);
      clearCart();
    } catch (error) {

      console.error(error);
      setErrorMsg({
        title: 'Thanh toán thất bại',
        error: 'Thanh toán thất bại! Vui lòng kiểm tra lại quyền thu ngân hoặc kết nối máy chủ.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    const user = JSON.parse(localStorage.getItem('pos_user') || '{}');
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm print:bg-white print:static print:inset-auto">
        <div className="bg-white rounded-2xl w-full max-w-sm p-8 flex flex-col items-center shadow-2xl print:hidden">
          <CheckCircle2 size={64} className="text-emerald-500 mb-4" strokeWidth={1.5} />
          <h2 className="text-2xl font-bold text-zinc-900 mb-2">Thanh toán thành công!</h2>
          <p className="text-zinc-500 mb-6 text-center">Hóa đơn đã được ghi nhận vào hệ thống.</p>
          <div className="flex flex-col gap-3 w-full">
            <button 
              onClick={() => {
                if (completedOrder) {
                  setTimeout(() => window.print(), 150);
                } else {
                  setWarningMsg({
                    title: 'Đang tải hóa đơn',
                    message: 'Đang tải dữ liệu hóa đơn, vui lòng thử lại sau giây lát!'
                  });
                }
              }}
              className="w-full py-3 bg-zinc-100 text-zinc-700 font-bold rounded-xl active:scale-95 transition-transform hover:bg-zinc-200 disabled:opacity-50"
            >
              In Hóa Đơn
            </button>
            <button 
              onClick={onSuccess}
              className="w-full py-3 bg-orange-600 text-white font-bold rounded-xl active:scale-95 transition-transform hover:bg-orange-700"
            >
              Đóng & Bắt đầu đơn mới
            </button>
          </div>
        </div>

        {/* Hidden printable receipt */}
        {completedOrder && <Receipt order={completedOrder} user={user} />}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between shrink-0">
          <h2 className="text-lg font-bold text-zinc-900">Thanh Toán Đơn Hàng</h2>
          <button onClick={handleClose} className="p-1 text-zinc-400 hover:text-zinc-900">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* Summary Card */}
          <div className="bg-orange-50/70 p-4 rounded-2xl border border-orange-100 flex justify-between items-center">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-orange-700 block mb-0.5">Tổng Cần Thu</span>
              <span className="text-xs text-zinc-500">Số tiền khách cần thanh toán</span>
            </div>
            <span className="text-2xl font-extrabold text-orange-600">{formatCurrency(normalizedTotal)}</span>
          </div>

          <div>
            <label className="block text-sm font-semibold text-zinc-900 mb-3">Phương thức thanh toán</label>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setPaymentMethod('CASH')}
                className={cn("py-3 rounded-xl font-semibold border-2 transition-colors", paymentMethod === 'CASH' ? "border-orange-500 bg-orange-50 text-orange-700" : "border-zinc-200 bg-white text-zinc-600")}
              >
                Tiền mặt
              </button>
              <button 
                onClick={() => setPaymentMethod('BANK_TRANSFER')}
                className={cn("py-3 rounded-xl font-semibold border-2 transition-colors", paymentMethod === 'BANK_TRANSFER' ? "border-orange-500 bg-orange-50 text-orange-700" : "border-zinc-200 bg-white text-zinc-600")}
              >
                Chuyển khoản (QR)
              </button>
            </div>
          </div>

          {paymentMethod === 'CASH' ? (
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-semibold text-zinc-900">Tiền khách đưa</label>
                <button
                  type="button"
                  onClick={() => setAmountPaidStr(formatAmountInput(normalizedTotal))}
                  className={cn(
                    "px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer",
                    amountPaid === normalizedTotal
                      ? "bg-orange-600 text-white shadow-sm"
                      : "bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200"
                  )}
                >
                  Đúng số tiền ({formatCurrency(normalizedTotal)})
                </button>
              </div>
              <input 
                type="text" 
                value={amountPaidStr}
                onChange={(e) => {
                  const inputVal = e.target.value;
                  let digits = inputVal.replace(/\D/g, '');
                  if (inputVal.length < amountPaidStr.length && digits === amountPaidStr.replace(/\D/g, '')) {
                    digits = digits.slice(0, -1);
                  }
                  if (!digits) {
                    setAmountPaidStr('');
                  } else {
                    setAmountPaidStr(formatAmountInput(digits));
                  }
                }}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-lg font-bold text-zinc-900 focus:outline-none focus:border-orange-500 focus:bg-white"
                placeholder="0 đ"
              />
              <div className="mt-3">
                <p className="text-xs font-semibold text-zinc-500 mb-2">Chọn nhanh mệnh giá tiền mặt:</p>
                <div className="grid grid-cols-3 gap-2">
                  {[10000, 20000, 50000, 100000, 200000, 500000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAmountPaidStr(formatAmountInput(val))}
                      className={cn(
                        "py-2.5 px-2 text-xs font-bold rounded-xl border transition-all text-center cursor-pointer active:scale-95",
                        amountPaid === val
                          ? "bg-orange-500 border-orange-500 text-white shadow-sm"
                          : "bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100 hover:border-zinc-300"
                      )}
                    >
                      {formatCurrency(val)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-6 flex flex-col items-center">
              <div className="p-3 bg-white border-2 border-orange-100 rounded-2xl shadow-sm mb-3 min-h-[192px] flex items-center justify-center">
                {payOsQr ? (
                  <img 
                    src={payOsQr}
                    alt="VietQR"
                    className="w-48 h-48 object-contain"
                  />
                ) : (
                  <div className="text-sm text-zinc-500 animate-pulse">Đang tạo mã thanh toán...</div>
                )}
              </div>
              <p className="text-sm font-medium text-zinc-600 text-center px-4">
                Quét mã để thanh toán. Hệ thống sẽ tự động chốt đơn khi nhận được tiền.
              </p>
            </div>
          )}

          <div className="flex justify-between items-center mb-8 px-1">
            <span className="text-sm font-medium text-zinc-500">Tiền thối lại</span>
            <span className={cn("text-lg font-bold", changeAmount < 0 ? "text-red-500" : "text-emerald-600")}>
              {changeAmount < 0 ? 'Chưa đủ tiền' : formatCurrency(changeAmount)}
            </span>
          </div>

          <button 
            onClick={handlePayment}
            disabled={isSubmitting || changeAmount < 0}
            className="w-full py-4 bg-orange-600 text-white font-bold text-lg rounded-xl flex items-center justify-center disabled:opacity-50 active:scale-95 transition-transform"
          >
            {isSubmitting ? 'Đang xử lý...' : (paymentMethod === 'BANK_TRANSFER' ? 'Xác nhận đã nhận tiền' : 'Xác nhận Thanh toán')}
          </button>
        </div>
      </div>

      <WarningModal
        isOpen={!!warningMsg}
        onClose={() => setWarningMsg(null)}
        title={warningMsg?.title}
        message={warningMsg?.message || ''}
      />

      <ErrorModal
        isOpen={!!errorMsg}
        onClose={() => setErrorMsg(null)}
        title={errorMsg?.title}
        error={errorMsg?.error || ''}
      />
    </div>
  );
};
