import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { ProductList } from './components/ProductList';
import { OrderPanel, type OpenPaymentParams } from './components/OrderPanel';
import { ProductDetailModal } from './components/ProductDetailModal';
import { PaymentModal } from './components/PaymentModal';
import { LoginScreen } from './components/LoginScreen';
import { OrderHistory } from './components/OrderHistory';
import { InventoryManagement } from './components/InventoryManagement';
import { ShiftSelectModal, type ShiftSession } from './components/ShiftSelectModal';
import { ShiftSummaryModal } from './components/ShiftSummaryModal';
import { ExpenseModal } from './components/ExpenseModal';
import { ShiftManagementModal } from './components/ShiftManagementModal';
import { AttendanceKioskModal } from './components/AttendanceKioskModal';
import { TimesheetModal } from './components/TimesheetModal';
import { HeldOrdersDrawer } from './components/HeldOrdersDrawer';
import { QrOrderApprovalModal } from './components/QrOrderApprovalModal';
import { useSocket } from './hooks/useSocket';
import type { Product } from './types';

function App() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'POS' | 'HISTORY' | 'INVENTORY'>('POS');
  const [currentShift, setCurrentShift] = useState<ShiftSession | null>(null);
  const [showShiftSelect, setShowShiftSelect] = useState<boolean>(false);
  const [showShiftSummary, setShowShiftSummary] = useState<boolean>(false);
  const [showExpenseModal, setShowExpenseModal] = useState<boolean>(false);
  const [showShiftManagementModal, setShowShiftManagementModal] = useState<boolean>(false);
  const [showAttendanceKiosk, setShowAttendanceKiosk] = useState<boolean>(false);
  const [showTimesheetModal, setShowTimesheetModal] = useState<boolean>(false);
  const [showQrApprovalModal, setShowQrApprovalModal] = useState<boolean>(false);
  
  useEffect(() => {
    // Check if user is already logged in
    const storedUser = localStorage.getItem('pos_user');
    const token = localStorage.getItem('pos_token');
    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
    }

    // Check if shift is already active
    const storedShift = localStorage.getItem('pos_shift');
    if (storedShift) {
      try {
        setCurrentShift(JSON.parse(storedShift));
      } catch (e) {
        console.error('Lỗi parse pos_shift:', e);
      }
    }

    // Listen for unauthorized event from Axios interceptor
    const handleUnauthorized = () => {
      setUser(null);
      setCurrentShift(null);
      localStorage.removeItem('pos_shift');
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const branchId = user?.branchId || '1';
  const {
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
  } = useSocket(branchId, Boolean(user));
  
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<OpenPaymentParams | null>(null);

  if (!user) {
    return <LoginScreen onLoginSuccess={(u) => {
      setUser(u);
      setActiveTab('POS');
      // If no active shift, prompt selection
      const storedShift = localStorage.getItem('pos_shift');
      if (!storedShift) {
        setShowShiftSelect(true);
      }
    }} />;
  }

  return (
    <div className="h-screen flex flex-col bg-zinc-100 overflow-hidden relative">
      <Header 
        isConnected={isConnected} 
        user={user} 
        onLogout={() => {
          setUser(null);
          setCurrentShift(null);
          localStorage.removeItem('pos_shift');
          setActiveTab('POS');
        }} 
        activeTab={activeTab}
        setActiveTab={(t) => setActiveTab(t as any)}
        notifications={notifications}
        onMarkAsRead={markAsRead}
        currentShift={currentShift}
        onOpenShiftSummary={() => setShowShiftSummary(true)}
        onOpenShiftSelect={() => setShowShiftSelect(true)}
        onOpenExpenseModal={() => setShowExpenseModal(true)}
        onOpenShiftManagement={() => setShowShiftManagementModal(true)}
        onOpenAttendanceKiosk={() => setShowAttendanceKiosk(true)}
        onOpenTimesheet={() => setShowTimesheetModal(true)}
        pendingQrCount={pendingQrOrders.length}
        onOpenQrApproval={() => setShowQrApprovalModal(true)}
      />
      
      {activeTab === 'POS' && (
        <div className="flex-1 flex overflow-hidden">
          <div className="w-[60%] h-full">
            <ProductList onSelectProduct={setSelectedProduct} />
          </div>
          
          <div className="w-[40%] h-full border-l border-zinc-200">
            <OrderPanel onOpenPayment={(params) => setPaymentInfo(params)} />
          </div>
        </div>
      )}

      {activeTab === 'HISTORY' && (
        <OrderHistory branchId={branchId} currentShift={currentShift} />
      )}

      {activeTab === 'INVENTORY' && (
        <InventoryManagement branchId={branchId} />
      )}

      {/* Modals */}
      {selectedProduct && (
        <ProductDetailModal 
          product={selectedProduct} 
          onClose={() => setSelectedProduct(null)} 
        />
      )}

      {paymentInfo && (
        <PaymentModal 
          orderId={paymentInfo.orderId}
          orderData={paymentInfo.orderData}
          totalAmount={paymentInfo.totalAmount}
          onClose={() => setPaymentInfo(null)}
          onSuccess={() => setPaymentInfo(null)}
        />
      )}

      {/* Shift Selection Modal */}
      {(showShiftSelect || (user && !currentShift)) && (
        <ShiftSelectModal 
          user={user}
          currentShift={currentShift}
          canDismiss={!!currentShift}
          onClose={() => setShowShiftSelect(false)}
          onSelectShift={(shift) => {
            setCurrentShift(shift);
            setShowShiftSelect(false);
          }}
        />
      )}

      {/* Shift Summary Report Modal */}
      <ShiftSummaryModal 
        isOpen={showShiftSummary}
        onClose={() => setShowShiftSummary(false)}
        user={user}
        currentShift={currentShift}
        branchId={branchId}
        onSwitchShift={() => {
          setShowShiftSummary(false);
          setShowShiftSelect(true);
        }}
      />

      {/* Expense Modal (Cash Out) */}
      <ExpenseModal 
        isOpen={showExpenseModal}
        onClose={() => setShowExpenseModal(false)}
        currentShift={currentShift}
        branchId={branchId}
      />

      {/* Shift Management Modal (Admin/Manager) */}
      <ShiftManagementModal 
        isOpen={showShiftManagementModal}
        onClose={() => setShowShiftManagementModal(false)}
        user={user}
      />

      {/* Attendance Kiosk Modal (Face Verification Check-in/out) */}
      <AttendanceKioskModal
        isOpen={showAttendanceKiosk}
        onClose={() => setShowAttendanceKiosk(false)}
        branchId={branchId}
      />

      {/* Timesheet & Face Enrollment Modal (Admin/Manager) */}
      <TimesheetModal
        isOpen={showTimesheetModal}
        onClose={() => setShowTimesheetModal(false)}
        user={user}
      />

      {/* Held / Draft Orders Drawer */}
      <HeldOrdersDrawer onNavigatePOS={() => setActiveTab('POS')} />

      {/* QR Order Approval Modal */}
      <QrOrderApprovalModal
        isOpen={showQrApprovalModal}
        orders={pendingQrOrders}
        onClose={() => setShowQrApprovalModal(false)}
        onConfirm={confirmQrOrder}
        onReject={rejectQrOrder}
      />

      {/* Instant Floating Alert when a Customer scans QR & submits order */}
      {qrAlertOrder && !showQrApprovalModal && (
        <div className="absolute bottom-6 right-6 z-50 bg-white border-2 border-amber-400 rounded-2xl shadow-2xl p-4 w-88 animate-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-start justify-between gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs font-black">
              🔔 Đơn QR mới • Bàn {qrAlertOrder.tableId}
            </span>
            <button
              onClick={clearQrAlert}
              className="text-zinc-400 hover:text-zinc-700 text-lg leading-none px-1 cursor-pointer"
            >
              &times;
            </button>
          </div>
          <p className="text-xs text-zinc-600 mb-3">
            Khách tại <strong>Bàn {qrAlertOrder.tableId}</strong> vừa đặt{' '}
            <strong>{(qrAlertOrder.items || []).reduce((s: number, i: any) => s + Number(i.quantity || 1), 0)} món</strong> qua mã QR. Vui lòng kiểm tra và xác nhận!
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={async () => {
                await confirmQrOrder(qrAlertOrder.id);
              }}
              className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Duyệt ngay
            </button>
            <button
              type="button"
              onClick={() => {
                clearQrAlert();
                setShowQrApprovalModal(true);
              }}
              className="flex-1 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Xem chi tiết
            </button>
          </div>
        </div>
      )}

      {/* Toast Notification for Realtime ITEM_READY */}
      {toastMessage && (
        <div className="absolute top-20 right-6 z-50 bg-emerald-600 text-white px-6 py-4 rounded-xl shadow-2xl animate-in slide-in-from-right flex items-center gap-3">
          <span className="font-semibold">{toastMessage}</span>
          <button onClick={clearToast} className="text-emerald-200 hover:text-white">&times;</button>
        </div>
      )}
    </div>
  );
}

export default App;
