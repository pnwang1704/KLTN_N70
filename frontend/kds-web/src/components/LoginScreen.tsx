import React, { useState } from 'react';
import axios from 'axios';

interface LoginScreenProps {
  onLoginSuccess: (user: any, token: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await axios.post('http://localhost:3000/auth/login', { username, password });
      const { accessToken, user } = res.data;
      
      // Save to local storage
      localStorage.setItem('kds_token', accessToken);
      localStorage.setItem('kds_user', JSON.stringify(user));
      
      onLoginSuccess(user, accessToken);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại!');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-900 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-zinc-800 rounded-3xl shadow-2xl overflow-hidden border border-zinc-700">
        <div className="px-8 pt-10 pb-8 bg-zinc-900 text-center border-b border-zinc-700">
          <h1 className="text-3xl font-bold text-white mb-2">N70 KDS</h1>
          <p className="text-zinc-400 font-medium">Hệ thống Điều phối Bếp</p>
        </div>
        
        <form onSubmit={handleLogin} className="p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-900/30 border border-red-800 text-red-400 rounded-xl text-sm font-medium">
              {error}
            </div>
          )}
          
          <div className="mb-5">
            <label className="block text-sm font-semibold text-zinc-300 mb-2">Tên đăng nhập</label>
            <input 
              type="text" 
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl focus:outline-none focus:border-zinc-500 text-white transition-colors"
              placeholder="VD: chef_01"
              required
            />
          </div>

          <div className="mb-8">
            <label className="block text-sm font-semibold text-zinc-300 mb-2">Mật khẩu</label>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl focus:outline-none focus:border-zinc-500 text-white transition-colors"
              placeholder="••••••••"
              required
            />
          </div>

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full bg-zinc-700 text-white font-bold py-3.5 rounded-xl hover:bg-zinc-600 active:scale-95 transition-all disabled:opacity-70 flex justify-center"
          >
            {isLoading ? 'Đang xác thực...' : 'Đăng nhập vào Bếp'}
          </button>
        </form>
      </div>
    </div>
  );
};
