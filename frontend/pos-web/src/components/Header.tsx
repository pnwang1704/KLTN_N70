import React from 'react';
import { Wifi, WifiOff, LogOut, Bell, Clock, Menu, Store, History, BarChart3, Receipt, Package, Users, X, Check } from 'lucide-react';
import { cn } from '../lib/utils';
import type { NotificationItem } from '../hooks/useSocket';
import type { ShiftSession } from './ShiftSelectModal';

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
}) => {
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false);
  const [showMenuDropdown, setShowMenuDropdown] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const unreadCount = notifications.filter(n => !n.read).length;

  // Handle click outside to close dropdown menu
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenuDropdown(false);
      }
    };
    if (showMenuDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenuDropdown]);

  const handleConfirmLogout = () => {
    localStorage.removeItem('pos_token');
    localStorage.removeItem('pos_user');
    onLogout();
    setShowLogoutConfirm(false);
  };

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-zinc-200">
      <div className="flex items-center gap-10">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-orange-600 tracking-tight">N70 POS</h1>
          <div className="flex items-center text-sm font-medium text-zinc-500 bg-zinc-100 px-3 py-1.5 rounded-full gap-2">
            <span>Chi nhánh {user?.branchId || 1}</span>
            <span>•</span>
            <span className="text-zinc-900 font-semibold">{user?.fullName || user?.username}</span>
            {currentShift && (
              <button 
                onClick={onOpenShiftSelect}
                className="ml-1 flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-full text-xs font-bold transition-colors cursor-pointer"
                title="Nhấp để đổi ca làm việc"
              >
                <Clock size={12} className="text-amber-600" />
                <span>{currentShift.shiftName}</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Menu Dropdown Button */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setShowMenuDropdown(!showMenuDropdown)}
              className={cn(
                "w-10 h-10 rounded-xl transition-all cursor-pointer flex items-center justify-center border shadow-xs",
                showMenuDropdown || activeTab === 'HISTORY'
                  ? "bg-orange-50 border-orange-300 text-orange-700 ring-2 ring-orange-200/50"
                  : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50 hover:text-orange-600"
              )}
              title="Menu tiện ích"
              aria-label="Menu tiện ích"
            >
              <Menu size={18} />
            </button>

            {showMenuDropdown && (
              <div className="absolute left-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-zinc-200/90 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                {/* 1. Lịch sử đơn hàng */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('HISTORY');
                    setShowMenuDropdown(false);
                  }}
                  className={cn(
                    "w-full px-4 py-2.5 flex items-center gap-3 text-left text-xs transition-colors cursor-pointer",
                    activeTab === 'HISTORY' ? "bg-orange-50 text-orange-700 font-bold" : "text-zinc-700 hover:bg-zinc-50 font-semibold"
                  )}
                >
                  <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                    <History size={16} />
                  </div>
                  <div>
                    <p className="font-bold">Lịch sử đơn hàng</p>
                    <p className="text-[11px] font-normal text-zinc-400">Xem các đơn trong ca trực</p>
                  </div>
                </button>

                {/* 2. Báo cáo kết ca */}
                <button
                  type="button"
                  onClick={() => {
                    setShowMenuDropdown(false);
                    onOpenShiftSummary?.();
                  }}
                  className="w-full px-4 py-2.5 flex items-center gap-3 text-left text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <BarChart3 size={16} />
                  </div>
                  <div>
                    <p className="font-bold">Báo cáo kết ca</p>
                    <p className="text-[11px] font-normal text-zinc-400">Đối soát tiền két & doanh thu</p>
                  </div>
                </button>

                {/* 3. Tạo phiếu chi tiền mặt */}
                <button
                  type="button"
                  onClick={() => {
                    setShowMenuDropdown(false);
                    onOpenExpenseModal?.();
                  }}
                  className="w-full px-4 py-2.5 flex items-center gap-3 text-left text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                    <Receipt size={16} />
                  </div>
                  <div>
                    <p className="font-bold text-rose-700">Tạo phiếu chi tiền mặt</p>
                    <p className="text-[11px] font-normal text-zinc-400">Chi tiền từ két & in phiếu 80mm</p>
                  </div>
                </button>

                {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
                  <>
                    <div className="border-t border-zinc-100 my-1.5" />
                    <div className="px-4 py-1 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                      Quản trị hệ thống
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('INVENTORY');
                        setShowMenuDropdown(false);
                      }}
                      className={cn(
                        "w-full px-4 py-2 flex items-center gap-3 text-left text-xs transition-colors cursor-pointer",
                        activeTab === 'INVENTORY' ? "bg-orange-50 text-orange-700 font-bold" : "text-zinc-700 hover:bg-zinc-50 font-semibold"
                      )}
                    >
                      <div className="w-7 h-7 rounded-lg bg-zinc-100 text-zinc-600 flex items-center justify-center shrink-0">
                        <Package size={14} />
                      </div>
                      <span>Quản lý kho</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('STAFF');
                        setShowMenuDropdown(false);
                      }}
                      className={cn(
                        "w-full px-4 py-2 flex items-center gap-3 text-left text-xs transition-colors cursor-pointer",
                        activeTab === 'STAFF' ? "bg-orange-50 text-orange-700 font-bold" : "text-zinc-700 hover:bg-zinc-50 font-semibold"
                      )}
                    >
                      <div className="w-7 h-7 rounded-lg bg-zinc-100 text-zinc-600 flex items-center justify-center shrink-0">
                        <Users size={14} />
                      </div>
                      <span>Quản lý nhân viên</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Main POS button */}
          <button
            onClick={() => setActiveTab('POS')}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs",
              activeTab === 'POS' ? "bg-orange-100 text-orange-700 font-extrabold" : "text-zinc-600 hover:bg-zinc-100"
            )}
          >
            <Store size={16} />
            <span>Bán hàng</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold",
          isConnected ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-red-50 text-red-600 border border-red-200"
        )}>
          {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
          {isConnected ? 'Connected' : 'Disconnected'}
        </div>

        <div className="relative">
          <button 
            onClick={() => {
              setShowNotifications(!showNotifications);
              if (unreadCount > 0 && onMarkAsRead) {
                onMarkAsRead();
              }
            }}
            className="p-2 bg-zinc-100 rounded-full hover:bg-zinc-200 transition-colors text-zinc-600 relative"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-zinc-100"></span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-zinc-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="px-4 py-3 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                <h3 className="font-semibold text-zinc-900">Thông báo từ bếp</h3>
                <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                  {notifications.length} món
                </span>
              </div>
              
              <div className="max-h-[400px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center flex flex-col items-center justify-center">
                    <Bell className="w-8 h-8 text-zinc-300 mb-2" />
                    <p className="text-sm text-zinc-500">Chưa có thông báo nào</p>
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-100">
                    {notifications.map(notif => (
                      <div key={notif.id} className={cn("p-4 transition-colors hover:bg-zinc-50", !notif.read && "bg-orange-50/50")}>
                        <div className="flex gap-3 items-start">
                          <div className="mt-0.5 w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
                            <Check className="w-4 h-4 text-emerald-600" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-zinc-900 leading-snug">
                              {notif.message}
                            </p>
                            <div className="flex items-center gap-1 mt-1.5 text-xs text-zinc-500">
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

        <button 
          onClick={() => setShowLogoutConfirm(true)}
          className="p-2 bg-red-50 rounded-full hover:bg-red-100 transition-colors text-red-600 cursor-pointer"
          title="Đăng xuất"
        >
          <LogOut size={20} />
        </button>
      </div>

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

            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/80 flex items-center justify-center mb-4 shadow-inner">
              <LogOut size={26} className="text-amber-600 translate-x-0.5" />
            </div>

            <h3 className="text-lg font-black text-zinc-900 tracking-tight mb-1.5">
              Xác nhận đăng xuất
            </h3>

            <p className="text-sm font-semibold text-zinc-800 leading-relaxed mb-1">
              Bạn có muốn đăng xuất và đóng ca làm việc?
            </p>

            {currentShift && (
              <div className="my-3 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-850 font-bold flex items-center gap-1.5">
                <Clock size={13} className="text-amber-600 shrink-0" />
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
    </header>
  );
};
