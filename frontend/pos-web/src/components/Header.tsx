import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Settings, Bell } from 'lucide-react';
import { cn } from '../lib/utils';

interface HeaderProps {
  isConnected: boolean;
}

export const Header: React.FC<HeaderProps> = ({ isConnected }) => {
  const [token, setToken] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const savedToken = localStorage.getItem('pos_token');
    if (savedToken) setToken(savedToken);
  }, []);

  const handleSaveToken = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setToken(val);
    localStorage.setItem('pos_token', val);
  };

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-zinc-200">
      <div className="flex items-center gap-6">
        <h1 className="text-2xl font-bold text-orange-600 tracking-tight">N70 POS</h1>
        <div className="flex items-center text-sm font-medium text-zinc-500 bg-zinc-100 px-3 py-1.5 rounded-full">
          <span>Chi nhánh 1</span>
          <span className="mx-2">•</span>
          <span className="text-zinc-900">Thu ngân: Nhat Quang</span>
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

        <div className="relative">
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 bg-zinc-100 rounded-full hover:bg-zinc-200 transition-colors text-zinc-600"
          >
            <Settings size={20} />
          </button>
          
          {showSettings && (
            <div className="absolute right-0 mt-2 w-72 bg-white border border-zinc-200 rounded-xl shadow-xl p-4 z-50">
              <label className="block text-sm font-semibold text-zinc-900 mb-2">Cashier Token (JWT)</label>
              <p className="text-xs text-zinc-500 mb-3">Dùng để xác thực API Thanh toán & Tạo đơn.</p>
              <input 
                type="text" 
                value={token}
                onChange={handleSaveToken}
                placeholder="Paste token here..."
                className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
              />
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
