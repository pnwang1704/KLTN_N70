import React from 'react';
import { Wifi, WifiOff, LogOut } from 'lucide-react';
import { cn } from '../lib/utils';

interface HeaderProps {
  user: any;
  onLogout: () => void;
  isConnected: boolean;
  filter: string;
  setFilter: (f: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ user, onLogout, isConnected, filter, setFilter }) => {
  const handleLogout = () => {
    localStorage.removeItem('kds_token');
    localStorage.removeItem('kds_user');
    onLogout();
  };

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-zinc-900 border-b border-zinc-800">
      <div className="flex items-center gap-6">
        <h1 className="text-2xl font-bold text-emerald-500 tracking-tight">KDS Bếp/Bar</h1>
        
        <div className="flex items-center bg-zinc-800 rounded-lg p-1">
          {['ALL', 'PENDING', 'IN_PROGRESS'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
                filter === f ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-zinc-200"
              )}
            >
              {f === 'ALL' ? 'Tất cả' : f === 'PENDING' ? 'Chờ làm' : 'Đang làm'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-400">Chi nhánh:</span>
          <span className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-center text-sm font-bold text-emerald-500">
            {user?.branchId || 1}
          </span>
          <span className="text-sm text-zinc-400 ml-2">Đầu bếp: <span className="font-bold text-zinc-200 capitalize">{user?.username}</span></span>
        </div>

        <div className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ml-4",
          isConnected ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
        )}>
          {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
          {isConnected ? 'Connected' : 'Disconnected'}
        </div>

        <button 
          onClick={handleLogout}
          className="p-2 bg-red-900/20 rounded-full hover:bg-red-900/40 transition-colors text-red-500 ml-2"
          title="Đăng xuất"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
};
