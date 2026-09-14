import React from 'react';
import { Wifi, WifiOff, LogOut, Bell, Check, Clock, FileText, X } from 'lucide-react';
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
}) => {
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

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
          <button
            onClick={() => setActiveTab('POS')}
            className={cn("px-4 py-2 rounded-xl text-sm font-bold transition-colors cursor-pointer", activeTab === 'POS' ? "bg-orange-100 text-orange-700" : "text-zinc-500 hover:bg-zinc-100")}
          >
            Bán hàng
          </button>
          <button
            onClick={() => setActiveTab('HISTORY')}
            className={cn("px-4 py-2 rounded-xl text-sm font-bold transition-colors cursor-pointer", activeTab === 'HISTORY' ? "bg-orange-100 text-orange-700" : "text-zinc-500 hover:bg-zinc-100")}
          >
            Lịch sử đơn
          </button>
          <button
            onClick={onOpenShiftSummary}
            className="px-3.5 py-2 rounded-xl text-sm font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            title="Báo cáo kết ca & Doanh thu trong ca"
          >
            <FileText size={16} className="text-amber-600" />
            <span>Báo cáo ca</span>
          </button>
          {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
            <>
              <button
                onClick={() => setActiveTab('INVENTORY')}
                className={cn("px-4 py-2 rounded-xl text-sm font-bold transition-colors cursor-pointer", activeTab === 'INVENTORY' ? "bg-orange-100 text-orange-700" : "text-zinc-500 hover:bg-zinc-100")}
              >
                Quản lý kho
              </button>
              <button
                onClick={() => setActiveTab('STAFF')}
                className={cn("px-4 py-2 rounded-xl text-sm font-bold transition-colors cursor-pointer", activeTab === 'STAFF' ? "bg-orange-100 text-orange-700" : "text-zinc-500 hover:bg-zinc-100")}
              >
                Nhân sự
              </button>
            </>
          )}
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
