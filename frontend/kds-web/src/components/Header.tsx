import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Settings } from 'lucide-react';
import { cn } from '../lib/utils';

interface HeaderProps {
  branchId: string;
  setBranchId: (id: string) => void;
  isConnected: boolean;
  filter: string;
  setFilter: (f: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ branchId, setBranchId, isConnected, filter, setFilter }) => {
  const [token, setToken] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const savedToken = localStorage.getItem('kds_token');
    if (savedToken) setToken(savedToken);
  }, []);

  const handleSaveToken = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setToken(val);
    localStorage.setItem('kds_token', val);
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
          <input 
            type="text" 
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            className="w-16 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-center text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold",
          isConnected ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
        )}>
          {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
          {isConnected ? 'Connected' : 'Disconnected'}
        </div>

        <div className="relative">
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 bg-zinc-800 rounded-full hover:bg-zinc-700 transition-colors"
          >
            <Settings size={18} className="text-zinc-300" />
          </button>
          
          {showSettings && (
            <div className="absolute right-0 mt-2 w-64 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl p-4 z-50">
              <label className="block text-xs font-medium text-zinc-400 mb-1">Bearer Token (JWT)</label>
              <input 
                type="text" 
                value={token}
                onChange={handleSaveToken}
                placeholder="Paste token here..."
                className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-xs focus:outline-none focus:border-emerald-500 text-zinc-300"
              />
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
