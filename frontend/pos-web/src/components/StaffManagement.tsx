import React, { useState, useEffect } from 'react';
import { UserPlus, Lock, Unlock, Shield } from 'lucide-react';
import api from '../lib/axios';
import { SuccessModal, ErrorModal, ConfirmModal } from './ui/Modals';
import { cn } from '../lib/utils';

interface User {
  id: string;
  username: string;
  fullName: string;
  role: string;
  branchId: string;
  isActive: boolean;
  createdAt: string;
}

export const StaffManagement: React.FC<{ loggedInUser: any }> = ({ loggedInUser }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState<{title: string, sub?: string} | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    user: User, 
    action: 'LOCK' | 'UNLOCK'
  } | null>(null);

  // Form States
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    password: '',
    role: loggedInUser?.role === 'MANAGER' ? 'CASHIER' : 'MANAGER',
    branchId: loggedInUser?.branchId || '1',
  });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/auth/users', {
        params: { branchId: loggedInUser?.role === 'MANAGER' ? loggedInUser.branchId : '' }
      });
      setUsers(res.data);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Không thể tải danh sách nhân viên');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/auth/users', formData);
      setShowAddModal(false);
      setSuccessMsg({
        title: 'Thêm tài khoản thành công',
        sub: `Tài khoản ${formData.username} đã được tạo với quyền ${formData.role}`
      });
      setFormData({
        fullName: '',
        username: '',
        password: '',
        role: loggedInUser?.role === 'MANAGER' ? 'CASHIER' : 'MANAGER',
        branchId: loggedInUser?.branchId || '1',
      });
      fetchUsers();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Có lỗi xảy ra khi tạo tài khoản');
    }
  };

  const handleToggleStatus = async () => {
    if (!confirmAction) return;
    try {
      const { user, action } = confirmAction;
      const newStatus = action === 'UNLOCK';
      
      await api.patch(`/auth/users/${user.id}/status`, { isActive: newStatus });
      setSuccessMsg({
        title: 'Cập nhật thành công',
        sub: `Tài khoản ${user.username} đã được ${newStatus ? 'mở khóa' : 'khóa'}`
      });
      fetchUsers();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Có lỗi xảy ra khi cập nhật trạng thái');
    }
  };

  const getRoleBadge = (role: string) => {
    switch(role) {
      case 'ADMIN': return 'bg-purple-100 text-purple-700';
      case 'MANAGER': return 'bg-blue-100 text-blue-700';
      case 'CASHIER': return 'bg-emerald-100 text-emerald-700';
      case 'KITCHEN': return 'bg-orange-100 text-orange-700';
      case 'WAITER': return 'bg-amber-100 text-amber-700';
      default: return 'bg-zinc-100 text-zinc-700';
    }
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-zinc-50">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900">Quản lý nhân sự</h2>
            <p className="text-zinc-500 mt-1">Danh sách tài khoản hệ thống của nhân viên</p>
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-5 py-2.5 rounded-xl font-semibold transition-colors"
          >
            <UserPlus size={20} />
            Thêm nhân viên
          </button>
        </div>

        {/* Bảng danh sách */}
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-sm font-semibold text-zinc-600">
                <th className="p-4 pl-6">Họ tên</th>
                <th className="p-4">Tài khoản</th>
                <th className="p-4">Phân quyền</th>
                <th className="p-4">Chi nhánh</th>
                <th className="p-4 text-center">Trạng thái</th>
                <th className="p-4 text-right pr-6">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-zinc-500">Đang tải dữ liệu...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-zinc-500">Chưa có dữ liệu nhân viên</td></tr>
              ) : (
                users.map(user => (
                  <tr key={user.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="p-4 pl-6 font-medium text-zinc-900">{user.fullName}</td>
                    <td className="p-4 text-zinc-600 font-mono text-sm">{user.username}</td>
                    <td className="p-4">
                      <span className={cn("px-2.5 py-1 rounded-md text-xs font-bold inline-flex items-center gap-1", getRoleBadge(user.role))}>
                        <Shield size={12} />
                        {user.role}
                      </span>
                    </td>
                    <td className="p-4 text-zinc-600">CN {user.branchId || '-'}</td>
                    <td className="p-4 text-center">
                      {user.isActive ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-semibold border border-emerald-200">
                          Hoạt động
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-600 text-xs font-semibold border border-red-200">
                          Đã khóa
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right pr-6">
                      {user.id !== loggedInUser.id && user.role !== 'ADMIN' && (
                        <button 
                          onClick={() => setConfirmAction({ user, action: user.isActive ? 'LOCK' : 'UNLOCK' })}
                          className={cn(
                            "p-2 rounded-lg transition-colors border",
                            user.isActive 
                              ? "text-red-600 border-red-200 hover:bg-red-50" 
                              : "text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                          )}
                          title={user.isActive ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                        >
                          {user.isActive ? <Lock size={18} /> : <Unlock size={18} />}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal (Custom build, not generic BaseModal for forms to have their own submit logic easily, but we can reuse the generic wrapper if we want. Here we build inline for the form) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 relative z-10 p-6 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="font-bold text-xl text-zinc-900 mb-6">Thêm nhân viên mới</h3>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-1.5">Họ và tên</label>
                <input 
                  required
                  type="text" 
                  value={formData.fullName}
                  onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                  className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Vd: Nguyễn Văn A"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-1.5">Tên đăng nhập (Username)</label>
                <input 
                  required
                  type="text" 
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Vd: nva_cashier"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-1.5">Mật khẩu</label>
                <input 
                  required
                  type="password" 
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="••••••••"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-zinc-700 mb-1.5">Quyền (Role)</label>
                  <select 
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                    className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium"
                  >
                    {loggedInUser?.role === 'ADMIN' && <option value="ADMIN">Quản trị (ADMIN)</option>}
                    {loggedInUser?.role === 'ADMIN' && <option value="MANAGER">Quản lý (MANAGER)</option>}
                    <option value="CASHIER">Thu ngân (CASHIER)</option>
                    <option value="KITCHEN">Bếp (KITCHEN)</option>
                    <option value="WAITER">Phục vụ (WAITER)</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-zinc-700 mb-1.5">Chi nhánh</label>
                  <select 
                    value={formData.branchId}
                    onChange={(e) => setFormData({...formData, branchId: e.target.value})}
                    disabled={loggedInUser?.role !== 'ADMIN'}
                    className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-60"
                  >
                    <option value="1">Chi nhánh 1</option>
                    <option value="2">Chi nhánh 2</option>
                    <option value="3">Chi nhánh 3</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 bg-zinc-100 text-zinc-700 rounded-xl font-semibold hover:bg-zinc-200 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-orange-600 text-white rounded-xl font-semibold hover:bg-orange-700 transition-colors"
                >
                  Tạo tài khoản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global Modals */}
      <SuccessModal 
        isOpen={!!successMsg} 
        onClose={() => setSuccessMsg(null)} 
        message={successMsg?.title || ''} 
        subMessage={successMsg?.sub} 
      />
      
      <ErrorModal 
        isOpen={!!errorMsg} 
        onClose={() => setErrorMsg(null)} 
        error={errorMsg || ''} 
      />

      {confirmAction && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setConfirmAction(null)}
          onConfirm={handleToggleStatus}
          title="Xác nhận thao tác"
          message={`Bạn có chắc chắn muốn ${confirmAction.action === 'LOCK' ? 'KHÓA' : 'MỞ KHÓA'} tài khoản [${confirmAction.user.username}] không?`}
          confirmText={confirmAction.action === 'LOCK' ? 'Khóa tài khoản' : 'Mở khóa'}
          isDestructive={confirmAction.action === 'LOCK'}
        />
      )}
    </div>
  );
};
