import React from 'react';
import { Wifi, WifiOff, LogOut, Bell, Clock, Menu, Store, History, BarChart3, Receipt, Package, Users, X, Check, FileText } from 'lucide-react';
import { cn } from '../lib/utils';
import type { NotificationItem } from '../hooks/useSocket';
import type { ShiftSession } from './ShiftSelectModal';
import { useHeldOrders } from '../context/HeldOrdersContext';

interface HeaderProps {
  isConnected: boolean;
  user: any;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  notifications?: NotificationItem[];
  onMarkAsRead?: () => void;
  currentShift?: ShiftSession | null;
  onOpenShiftSummary?: () => void;
  onOpenShiftSelect?: () => void;
  onOpenExpenseModal?: () => void;
  onOpenShiftManagement?: () => void;
  onOpenAttendanceKiosk?: () => void;
  onOpenTimesheet?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  isConnected, 
  user, 
  onLogout, 
  activeTab, 
  setActiveTab, 
  notifications = [], 
  onMarkAsRead,
  currentShift,
  onOpenShiftSummary,
  onOpenShiftSelect,
  onOpenExpenseModal,
  onOpenShiftManagement,
  onOpenAttendanceKiosk,
  onOpenTimesheet,
}) => {
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  const notifRef = React.useRef<HTMLDivElement>(null);
  const unreadCount = notifications.filter(n => !n.read).length;
  const { heldOrders, openDrawer } = useHeldOrders();

  // Handle click outside to close notifications dropdown
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  // Handle ESC key to close Drawer, notifications or logout modal
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsDrawerOpen(false);
        setShowNotifications(false);
        setShowLogoutConfirm(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleConfirmLogout = () => {
    localStorage.removeItem('pos_token');
    localStorage.removeItem('pos_user');
    onLogout();
    setShowLogoutConfirm(false);
  };

  return (
    <>
      <header className="flex items-center justify-between px-5 py-3 bg-white border-b border-zinc-200">
        {/* Left Section: Menu Toggle (☰), Bán hàng Tab & Đơn tạm tính Button */}
        <div className="flex items-center gap-2.5">
          {/* Menu Drawer Toggle Button */}
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="w-10 h-10 rounded-xl transition-all cursor-pointer flex items-center justify-center border shadow-xs bg-white border-zinc-200 text-zinc-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 active:scale-95"
            title="Mở menu chức năng"
            aria-label="Mở menu chức năng"
          >
            <Menu size={20} />
          </button>

          {/* Main POS Tab Button */}
          <button
            type="button"
            onClick={() => setActiveTab('POS')}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs border",
              activeTab === 'POS'
                ? "bg-blue-50 border-blue-300 text-blue-700 font-extrabold shadow-blue-100"
                : "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
            )}
          >
            <Store size={17} className={activeTab === 'POS' ? "text-blue-600" : "text-zinc-500"} />
            <span>Bán hàng</span>
          </button>

          {/* Held Orders (Đơn tạm tính) Button with Badge */}
          <button
            type="button"
            onClick={openDrawer}
            className="border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg px-3 py-1.5 font-medium flex items-center gap-2 transition-colors cursor-pointer active:scale-95 text-xs sm:text-sm"
            title="Xem danh sách hóa đơn tạm tính"
          >
            <FileText size={16} className="text-blue-600" />
            <span>Đơn tạm tính</span>
            {heldOrders.length > 0 ? (
              <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full font-bold animate-pulse shadow-xs">
                ({heldOrders.length})
              </span>
            ) : (
              <span className="text-zinc-400 text-xs font-medium">
                (0)
              </span>
            )}
          </button>
        </div>

        {/* Right Section: Kiosk Button, Connection, Notifications, Logout */}
        <div className="flex items-center gap-3">
          {/* Quick 1-touch Attendance Kiosk Button */}
          <button 
            type="button"
            onClick={onOpenAttendanceKiosk}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-50 to-sky-50 hover:from-blue-100 hover:to-sky-100 text-blue-800 border border-blue-300/80 rounded-full text-xs font-bold transition-all shadow-xs cursor-pointer hover:border-blue-400 active:scale-95"
            title="Chấm công Kiosk (Nhận diện khuôn mặt)"
          >
            <span className="text-sm leading-none">⏰</span>
            <span>Chấm công Kiosk</span>
          </button>

          {/* Network status */}
          <div className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border",
            isConnected 
              ? "bg-emerald-50 text-emerald-600 border-emerald-200" 
              : "bg-red-50 text-red-600 border-red-200"
          )}>
            {isConnected ? <Wifi size={13} /> : <WifiOff size={13} />}
            <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>

          {/* Notifications Bell */}
          <div className="relative" ref={notifRef}>
            <button 
              type="button"
              onClick={() => {
                setShowNotifications(!showNotifications);
                if (unreadCount > 0 && onMarkAsRead) {
                  onMarkAsRead();
                }
              }}
              className="p-2 bg-zinc-100 rounded-full hover:bg-zinc-200 transition-colors text-zinc-600 relative cursor-pointer"
              title="Thông báo"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-zinc-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                <div className="px-4 py-3 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/70">
                  <h3 className="font-bold text-sm text-zinc-900">Thông báo từ bếp</h3>
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                    {notifications.length} món
                  </span>
                </div>
                
                <div className="max-h-[360px] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center flex flex-col items-center justify-center">
                      <Bell className="w-8 h-8 text-zinc-300 mb-2" />
                      <p className="text-xs font-medium text-zinc-400">Chưa có thông báo nào</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-zinc-100">
                      {notifications.map(notif => (
                        <div key={notif.id} className={cn("p-3.5 transition-colors hover:bg-zinc-50", !notif.read && "bg-blue-50/40")}>
                          <div className="flex gap-2.5 items-start">
                            <div className="mt-0.5 w-7 h-7 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shrink-0">
                              <Check className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-zinc-900 leading-snug">
                                {notif.message}
                              </p>
                              <div className="flex items-center gap-1 mt-1 text-[11px] text-zinc-400">
                                <Clock className="w-3 h-3" />
                                <span>
                                  {new Date(notif.time).toLocaleTimeString('vi-VN', { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Quick Logout Button */}
          <button 
            type="button"
            onClick={() => setShowLogoutConfirm(true)}
            className="p-2 bg-red-50 hover:bg-red-100 transition-colors text-red-600 rounded-full cursor-pointer"
            title="Đăng xuất"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Side Menu Drawer (Slide-out from Left) */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop with fade-in */}
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setIsDrawerOpen(false)}
          />

          {/* Drawer Container with slide-in from left */}
          <div className="relative w-80 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-250 ease-out border-r border-zinc-200">
            {/* Drawer Header: Profile & Session Card */}
            <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-sky-600 text-white p-5 relative shadow-md">
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="absolute top-4 right-4 text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/20 transition-colors cursor-pointer"
                title="Đóng menu"
                aria-label="Đóng menu"
              >
                <X size={18} />
              </button>

              {/* Avatar and User Info */}
              <div className="flex items-center gap-3.5 pr-8">
                <div className="w-12 h-12 rounded-2xl bg-white/20 border-2 border-white/40 flex items-center justify-center text-white font-black text-xl shadow-inner shrink-0">
                  {(user?.fullName || user?.username || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-bold text-white truncate leading-tight">
                    {user?.fullName || user?.username || 'Thu ngân'}
                  </h2>
                  <p className="text-xs text-blue-100 font-medium truncate mt-0.5">
                    Chi nhánh {user?.branchId || 1}
                  </p>
                </div>
              </div>

              {/* Current Shift Badge */}
              <div className="mt-4 pt-3 border-t border-white/20 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-blue-100">
                  <Clock size={13} className="text-sky-200 shrink-0" />
                  <span className="font-semibold text-white/90">Ca trực:</span>
                </div>
                {currentShift ? (
                  <button 
                    type="button"
                    onClick={() => {
                      setIsDrawerOpen(false);
                      onOpenShiftSelect?.();
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 bg-white/20 hover:bg-white/30 text-white border border-white/30 rounded-full text-xs font-bold transition-all cursor-pointer backdrop-blur-xs"
                    title="Nhấp để đổi ca làm việc"
                  >
                    <span>{currentShift.shiftName}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setIsDrawerOpen(false);
                      onOpenShiftSelect?.();
                    }}
                    className="px-2.5 py-1 bg-white/20 hover:bg-white/30 text-white border border-white/30 rounded-full text-xs font-semibold cursor-pointer"
                  >
                    Chưa chọn ca
                  </button>
                )}
              </div>
            </div>

            {/* Drawer Body: Action Menu Items */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              <div className="px-3 pt-2 pb-1 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                Nghiệp vụ quầy
              </div>

              {/* 1. Lịch sử đơn hàng */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('HISTORY');
                  setIsDrawerOpen(false);
                }}
                className={cn(
                  "w-full px-3.5 py-2.5 rounded-xl flex items-center gap-3 text-left text-sm transition-all cursor-pointer",
                  activeTab === 'HISTORY'
                    ? "bg-blue-50 text-blue-700 font-bold border border-blue-200"
                    : "text-zinc-700 hover:bg-blue-50 hover:text-blue-700 font-medium"
                )}
              >
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  <History size={16} />
                </div>
                <span className="flex-1">Lịch sử đơn hàng</span>
              </button>

              {/* Hóa đơn tạm tính */}
              <button
                type="button"
                onClick={() => {
                  setIsDrawerOpen(false);
                  openDrawer();
                }}
                className="w-full px-3.5 py-2.5 rounded-xl flex items-center gap-3 text-left text-sm text-zinc-700 hover:bg-blue-50 hover:text-blue-700 font-medium transition-all cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-200">
                  <FileText size={16} />
                </div>
                <span className="flex-1">Hóa đơn tạm tính</span>
                {heldOrders.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-600 text-white shadow-2xs">
                    {heldOrders.length}
                  </span>
                )}
              </button>

              {/* 2. Báo cáo kết ca */}
              <button
                type="button"
                onClick={() => {
                  setIsDrawerOpen(false);
                  onOpenShiftSummary?.();
                }}
                className="w-full px-3.5 py-2.5 rounded-xl flex items-center gap-3 text-left text-sm text-zinc-700 hover:bg-blue-50 hover:text-blue-700 font-medium transition-all cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                  <BarChart3 size={16} />
                </div>
                <span className="flex-1">Báo cáo kết ca</span>
              </button>

              {/* 3. Tạo phiếu chi tiền mặt */}
              <button
                type="button"
                onClick={() => {
                  setIsDrawerOpen(false);
                  onOpenExpenseModal?.();
                }}
                className="w-full px-3.5 py-2.5 rounded-xl flex items-center gap-3 text-left text-sm text-zinc-700 hover:bg-blue-50 hover:text-blue-700 font-medium transition-all cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                  <Receipt size={16} />
                </div>
                <span className="flex-1">Tạo phiếu chi tiền mặt</span>
              </button>

              {/* 4. Chấm công nhân viên (Kiosk) */}
              <button
                type="button"
                onClick={() => {
                  setIsDrawerOpen(false);
                  onOpenAttendanceKiosk?.();
                }}
                className="w-full px-3.5 py-2.5 rounded-xl flex items-center gap-3 text-left text-sm text-zinc-700 hover:bg-blue-50 hover:text-blue-700 font-medium transition-all cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <Clock size={16} />
                </div>
                <span className="flex-1">Chấm công nhân viên (Kiosk)</span>
              </button>

              {/* Admin/Manager Section */}
              {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
                <>
                  <div className="pt-4 pb-1 px-3 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                    Quản trị hệ thống
                  </div>

                  {/* Quản lý kho */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('INVENTORY');
                      setIsDrawerOpen(false);
                    }}
                    className={cn(
                      "w-full px-3.5 py-2.5 rounded-xl flex items-center gap-3 text-left text-sm transition-all cursor-pointer",
                      activeTab === 'INVENTORY'
                        ? "bg-blue-50 text-blue-700 font-bold border border-blue-200"
                        : "text-zinc-700 hover:bg-blue-50 hover:text-blue-700 font-medium"
                    )}
                  >
                    <div className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-600 flex items-center justify-center shrink-0">
                      <Package size={16} />
                    </div>
                    <span className="flex-1">Quản lý kho</span>
                  </button>

                  {/* Quản lý ca làm việc */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsDrawerOpen(false);
                      onOpenShiftManagement?.();
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl flex items-center gap-3 text-left text-sm text-zinc-700 hover:bg-blue-50 hover:text-blue-700 font-medium transition-all cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center shrink-0 border border-sky-200">
                      <Clock size={16} />
                    </div>
                    <span className="flex-1">Quản lý ca làm việc</span>
                  </button>

                  {/* Quản lý Nhân sự & Bảng công */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsDrawerOpen(false);
                      onOpenTimesheet?.();
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl flex items-center gap-3 text-left text-sm text-zinc-700 hover:bg-blue-50 hover:text-blue-700 font-medium transition-all cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 border border-blue-200">
                      <Users size={16} />
                    </div>
                    <span className="flex-1">Quản lý Nhân sự & Bảng công</span>
                  </button>
                </>
              )}
            </div>

            {/* Drawer Footer: Logout & System Info */}
            <div className="p-4 border-t border-zinc-200 bg-zinc-50/70 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsDrawerOpen(false);
                  setShowLogoutConfirm(true);
                }}
                className="w-full py-2.5 px-4 rounded-xl border border-red-200 bg-red-50/60 hover:bg-red-100 text-red-700 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
              >
                <LogOut size={15} />
                <span>Đăng xuất hệ thống</span>
              </button>
              <div className="text-center text-[10px] text-zinc-400 font-medium">
                N70 POS v1.0 • F&B Operations Management
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Đăng xuất & đóng ca làm việc */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-zinc-200 animate-in zoom-in-95 duration-200 p-6 flex flex-col items-center text-center relative">
            <button
              onClick={() => setShowLogoutConfirm(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 p-1.5 rounded-full hover:bg-zinc-100 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200/80 flex items-center justify-center mb-4 shadow-inner">
              <LogOut size={26} className="text-blue-600 translate-x-0.5" />
            </div>

            <h3 className="text-lg font-black text-zinc-900 tracking-tight mb-1.5">
              Xác nhận đăng xuất
            </h3>

            <p className="text-sm font-semibold text-zinc-800 leading-relaxed mb-1">
              Bạn có muốn đăng xuất và đóng ca làm việc?
            </p>

            {currentShift && (
              <div className="my-3 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 font-bold flex items-center gap-1.5">
                <Clock size={13} className="text-blue-600 shrink-0" />
                <span>Ca hiện tại: {currentShift.shiftName.replace(/\s*\(.*?\)/, '') || currentShift.shiftName}</span>
              </div>
            )}

            <p className="text-xs text-zinc-400 mb-6">
              Phiên ca làm việc của bạn sẽ được đóng và lưu trữ trên hệ thống.
            </p>

            <div className="flex items-center gap-3 w-full">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-zinc-300 font-bold text-zinc-600 text-xs hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                className="flex-1 py-2.5 px-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold rounded-xl text-xs shadow-lg shadow-red-600/25 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <LogOut size={14} />
                <span>Đăng xuất & Đóng ca</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
