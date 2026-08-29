import React from 'react';
import { Wifi, WifiOff, LogOut, Bell, Check, Clock } from 'lucide-react';
import { cn } from '../lib/utils';
import type { NotificationItem } from '../hooks/useSocket';

interface HeaderProps {
  isConnected: boolean;
  user: any;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  notifications?: NotificationItem[];
  onMarkAsRead?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ isConnected, user, onLogout, activeTab, setActiveTab, notifications = [], onMarkAsRead }) => {
  const [showNotifications, setShowNotifications] = React.useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  const handleLogout = () => {
    localStorage.removeItem('pos_token');
    localStorage.removeItem('pos_user');
    onLogout();
  };

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-zinc-200">
      <div className="flex items-center gap-10">
        <div className="flex items-center gap-6">
          <h1 className="text-2xl font-bold text-orange-600 tracking-tight">N70 POS</h1>
          <div className="flex items-center text-sm font-medium text-zinc-500 bg-zinc-100 px-3 py-1.5 rounded-full">
            <span>Chi nhánh {user?.branchId || 1}</span>
            <span className="mx-2">•</span>
            <span className="text-zinc-900 capitalize">Thu ngân: {user?.username}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('POS')}
            className={cn("px-4 py-2 rounded-xl text-sm font-bold transition-colors", activeTab === 'POS' ? "bg-orange-100 text-orange-700" : "text-zinc-500 hover:bg-zinc-100")}
          >
            Bán hàng
          </button>
          <button
            onClick={() => setActiveTab('HISTORY')}
            className={cn("px-4 py-2 rounded-xl text-sm font-bold transition-colors", activeTab === 'HISTORY' ? "bg-orange-100 text-orange-700" : "text-zinc-500 hover:bg-zinc-100")}
          >
            Lịch sử đơn
          </button>
          {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
            <>
              <button
                onClick={() => setActiveTab('INVENTORY')}
                className={cn("px-4 py-2 rounded-xl text-sm font-bold transition-colors", activeTab === 'INVENTORY' ? "bg-orange-100 text-orange-700" : "text-zinc-500 hover:bg-zinc-100")}
              >
                Quản lý kho
              </button>
              <button
                onClick={() => setActiveTab('STAFF')}
                className={cn("px-4 py-2 rounded-xl text-sm font-bold transition-colors", activeTab === 'STAFF' ? "bg-orange-100 text-orange-700" : "text-zinc-500 hover:bg-zinc-100")}
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
          onClick={handleLogout}
          className="p-2 bg-red-50 rounded-full hover:bg-red-100 transition-colors text-red-600"
          title="Đăng xuất"
        >
          <LogOut size={20} />
        </button>
      </div>
    </header>
  );
};
