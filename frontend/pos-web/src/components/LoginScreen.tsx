import React, { useState } from 'react';
import api from '../lib/axios';
import { AttendanceKioskModal } from './AttendanceKioskModal';

interface LoginScreenProps {
  onLoginSuccess: (user: any, token: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showKiosk, setShowKiosk] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await api.post('/auth/login', { username, password });
      const { accessToken, user } = res.data;
      
      // Save to local storage
      localStorage.setItem('pos_token', accessToken);
      localStorage.setItem('pos_user', JSON.stringify(user));
      
      onLoginSuccess(user, accessToken);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại!');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden">
        <div className="px-8 pt-10 pb-8 bg-gradient-to-r from-blue-600 via-blue-700 to-sky-600 text-center">
          <h1 className="text-3xl font-bold text-white mb-2">N70 POS</h1>
          <p className="text-blue-100 font-medium">Hệ thống Thu Ngân</p>
        </div>
        
        <form onSubmit={handleLogin} className="p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-medium">
              {error}
            </div>
          )}
          
          <div className="mb-5">
            <label className="block text-sm font-semibold text-zinc-900 mb-2">Tên đăng nhập</label>
            <input 
              type="text" 
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
              placeholder="VD: cashier_01"
              required
            />
          </div>

          <div className="mb-8">
            <label className="block text-sm font-semibold text-zinc-900 mb-2">Mật khẩu</label>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
              placeholder="••••••••"
              required
            />
          </div>

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl active:scale-95 transition-all shadow-md shadow-blue-600/20 disabled:opacity-70 flex justify-center cursor-pointer"
          >
            {isLoading ? 'Đang xác thực...' : 'Đăng nhập vào Ca'}
          </button>

          <div className="relative flex py-4 items-center">
            <div className="flex-grow border-t border-zinc-200"></div>
            <span className="flex-shrink mx-3 text-zinc-400 text-xs font-semibold uppercase tracking-wider">hoặc</span>
            <div className="flex-grow border-t border-zinc-200"></div>
          </div>

          {/* Nút Chấm công Kiosk nổi bật */}
          <button
            type="button"
            onClick={() => setShowKiosk(true)}
            className="w-full py-3.5 px-4 bg-blue-50/80 hover:bg-blue-100 text-blue-700 border-2 border-dashed border-blue-300 hover:border-blue-400 font-bold rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer shadow-xs group"
          >
            <span className="text-xl group-hover:scale-110 transition-transform">⏰</span>
            <span className="text-sm">Chấm công Kiosk (Nhận diện khuôn mặt)</span>
          </button>
        </form>
      </div>

      {/* Modal Chấm công Kiosk ngay tại màn hình Đăng nhập */}
      {showKiosk && (
        <AttendanceKioskModal
          isOpen={showKiosk}
          onClose={() => setShowKiosk(false)}
          branchId="1"
        />
      )}
    </div>
  );
};
