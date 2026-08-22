import React from 'react';
import { Wifi, WifiOff, LogOut, Bell } from 'lucide-react';
import { cn } from '../lib/utils';

interface HeaderProps {
  isConnected: boolean;
  user: any;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ isConnected, user, onLogout, activeTab, setActiveTab }) => {
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
            <button
              onClick={() => setActiveTab('INVENTORY')}
              className={cn("px-4 py-2 rounded-xl text-sm font-bold transition-colors", activeTab === 'INVENTORY' ? "bg-orange-100 text-orange-700" : "text-zinc-500 hover:bg-zinc-100")}
            >
              Quản lý kho
            </button>
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

        <button className="p-2 bg-zinc-100 rounded-full hover:bg-zinc-200 transition-colors text-zinc-600 relative">
          <Bell size={20} />
          <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-zinc-100"></span>
        </button>

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
