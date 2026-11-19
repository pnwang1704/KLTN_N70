import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  Plus,
  Edit3,
  Trash2,
  MapPin,
  Phone,
  Clock,
  Wifi,
  QrCode,
  Users,
  RefreshCw,
  X,
  Check,
  LayoutGrid,
} from 'lucide-react';
import api from '../lib/axios';
import { cn } from '../lib/utils';
import { TableQrModal } from './TableQrModal';

export interface BranchItem {
  id: string;
  code: string;
  name: string;
  address?: string;
  phone?: string;
  openTime?: string;
  closeTime?: string;
  wifiName?: string;
  wifiPassword?: string;
  isActive: boolean;
}

export interface BranchTableItem {
  id: string;
  branchId: string;
  tableNumber: string;
  name: string;
  area?: string;
  capacity: number;
  status: 'AVAILABLE' | 'OCCUPIED';
}

interface BranchManagementProps {
  activeBranchId: string;
  onSelectActiveBranch?: (branchId: string) => void;
  onBranchesChanged?: () => void;
}

export const BranchManagement: React.FC<BranchManagementProps> = ({
  activeBranchId,
  onSelectActiveBranch,
  onBranchesChanged,
}) => {
  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(activeBranchId || '1');
  const [tables, setTables] = useState<BranchTableItem[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [loadingTables, setLoadingTables] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Branch Modal state
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState<BranchItem | null>(null);
  const [branchForm, setBranchForm] = useState({
    code: '',
    name: '',
    address: '',
    phone: '',
    openTime: '07:00',
    closeTime: '22:00',
    wifiName: '',
    wifiPassword: '',
    isActive: true,
  });
  const [savingBranch, setSavingBranch] = useState(false);

  // Table Modal state
  const [showTableModal, setShowTableModal] = useState(false);
  const [editingTable, setEditingTable] = useState<BranchTableItem | null>(null);
  const [tableForm, setTableForm] = useState({
    tableNumber: '',
    name: '',
    area: 'Tầng 1',
    capacity: 4,
    status: 'AVAILABLE' as 'AVAILABLE' | 'OCCUPIED',
  });
  const [savingTable, setSavingTable] = useState(false);

  // QR Modal state
  const [qrTarget, setQrTarget] = useState<{ tableId: string; branchId: string; branchName: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3500);
  };

  const fetchBranches = useCallback(async () => {
    setLoadingBranches(true);
    try {
      const res = await api.get('/branches');
      const list: BranchItem[] = Array.isArray(res.data) ? res.data : [];
      setBranches(list);
      if (list.length > 0 && !list.some((b) => String(b.id) === String(selectedBranchId))) {
        setSelectedBranchId(String(list[0].id));
      }
    } catch (err) {
      console.error('Lỗi tải danh sách chi nhánh:', err);
      showToast('error', 'Không thể tải danh sách chi nhánh.');
    } finally {
      setLoadingBranches(false);
    }
  }, [selectedBranchId]);

  const fetchTables = useCallback(async (bId: string) => {
    if (!bId) return;
    setLoadingTables(true);
    try {
      const res = await api.get(`/branches/${bId}/tables`);
      setTables(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Lỗi tải danh sách bàn:', err);
      setTables([]);
    } finally {
      setLoadingTables(false);
    }
  }, []);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  useEffect(() => {
    if (selectedBranchId) {
      fetchTables(selectedBranchId);
    }
  }, [selectedBranchId, fetchTables]);

  const selectedBranch = branches.find((b) => String(b.id) === String(selectedBranchId)) || branches[0];

  const openCreateBranch = () => {
    setEditingBranch(null);
    const nextNum = branches.length + 1;
    setBranchForm({
      code: `CN${String(nextNum).padStart(2, '0')}`,
      name: '',
      address: '',
      phone: '',
      openTime: '07:00',
      closeTime: '22:00',
      wifiName: `N70_Coffee_CN${String(nextNum).padStart(2, '0')}`,
      wifiPassword: '',
      isActive: true,
    });
    setShowBranchModal(true);
  };

  const openEditBranch = (branch: BranchItem) => {
    setEditingBranch(branch);
    setBranchForm({
      code: branch.code || '',
      name: branch.name || '',
      address: branch.address || '',
      phone: branch.phone || '',
      openTime: branch.openTime || '07:00',
      closeTime: branch.closeTime || '22:00',
      wifiName: branch.wifiName || '',
      wifiPassword: branch.wifiPassword || '',
      isActive: branch.isActive !== false,
    });
    setShowBranchModal(true);
  };

  const handleSaveBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchForm.name.trim()) {
      showToast('error', 'Vui lòng nhập tên chi nhánh.');
      return;
    }
    setSavingBranch(true);
    try {
      if (editingBranch) {
        await api.patch(`/branches/${editingBranch.id}`, branchForm);
        showToast('success', `Đã cập nhật "${branchForm.name}" thành công!`);
      } else {
        const res = await api.post('/branches', branchForm);
        const created = res.data;
        if (created?.id) {
          setSelectedBranchId(String(created.id));
        }
        showToast('success', `Đã thêm chi nhánh "${branchForm.name}" (tự động tạo 6 bàn mẫu)!`);
      }
      setShowBranchModal(false);
      await fetchBranches();
      onBranchesChanged?.();
    } catch (err: any) {
      showToast('error', err?.response?.data?.message || 'Lưu thông tin chi nhánh thất bại.');
    } finally {
      setSavingBranch(false);
    }
  };

  const handleDeleteBranch = async (branch: BranchItem) => {
    if (branches.length <= 1) {
      showToast('error', 'Không thể xóa chi nhánh cuối cùng của hệ thống.');
      return;
    }
    if (!window.confirm(`Bạn có chắc muốn xóa chi nhánh "${branch.name}" và toàn bộ bàn thuộc chi nhánh này?`)) {
      return;
    }
    try {
      await api.delete(`/branches/${branch.id}`);
      showToast('success', `Đã xóa chi nhánh "${branch.name}".`);
      await fetchBranches();
      onBranchesChanged?.();
    } catch (err: any) {
      showToast('error', err?.response?.data?.message || 'Xóa chi nhánh thất bại.');
    }
  };

  const openCreateTable = () => {
    setEditingTable(null);
    const maxNum = tables.reduce((m, t) => Math.max(m, parseInt(t.tableNumber, 10) || 0), 0);
    const nextNum = maxNum + 1;
    setTableForm({
      tableNumber: String(nextNum),
      name: `Bàn ${String(nextNum).padStart(2, '0')}`,
      area: 'Tầng 1',
      capacity: 4,
      status: 'AVAILABLE',
    });
    setShowTableModal(true);
  };

  const openEditTable = (t: BranchTableItem) => {
    setEditingTable(t);
    setTableForm({
      tableNumber: t.tableNumber || '',
      name: t.name || '',
      area: t.area || 'Tầng 1',
      capacity: Number(t.capacity || 4),
      status: t.status || 'AVAILABLE',
    });
    setShowTableModal(true);
  };

  const handleSaveTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranch) return;
    if (!tableForm.name.trim()) {
      showToast('error', 'Vui lòng nhập tên bàn.');
      return;
    }
    setSavingTable(true);
    try {
      if (editingTable) {
        await api.patch(`/branches/${selectedBranch.id}/tables/${editingTable.id}`, tableForm);
        showToast('success', `Đã cập nhật ${tableForm.name}!`);
      } else {
        await api.post(`/branches/${selectedBranch.id}/tables`, tableForm);
        showToast('success', `Đã thêm ${tableForm.name} vào ${selectedBranch.name}!`);
      }
      setShowTableModal(false);
      await fetchTables(selectedBranch.id);
    } catch (err: any) {
      showToast('error', err?.response?.data?.message || 'Lưu thông tin bàn thất bại.');
    } finally {
      setSavingTable(false);
    }
  };

  const handleDeleteTable = async (t: BranchTableItem) => {
    if (!selectedBranch) return;
    if (!window.confirm(`Xóa "${t.name}" khỏi ${selectedBranch.name}?`)) return;
    try {
      await api.delete(`/branches/${selectedBranch.id}/tables/${t.id}`);
      showToast('success', `Đã xóa ${t.name}.`);
      await fetchTables(selectedBranch.id);
    } catch (err: any) {
      showToast('error', err?.response?.data?.message || 'Xóa bàn thất bại.');
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-zinc-50">
      {/* Top Bar */}
      <div className="bg-white border-b border-zinc-200 px-6 py-4 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
            <Building2 size={22} />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-zinc-900">
              Quản lý Chuỗi Chi nhánh & Sơ đồ Bàn
            </h1>
            <p className="text-xs text-zinc-500">
              Cấu hình thông tin chi nhánh, Wi-Fi in hóa đơn và quản lý mã QR gọi món theo từng chi nhánh
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              fetchBranches();
              if (selectedBranchId) fetchTables(selectedBranchId);
            }}
            className="px-3 py-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw size={14} className={cn((loadingBranches || loadingTables) && 'animate-spin')} />
            <span>Làm mới</span>
          </button>
          <button
            type="button"
            onClick={openCreateBranch}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95 transition-all"
          >
            <Plus size={16} />
            <span>Thêm chi nhánh</span>
          </button>
        </div>
      </div>

      {/* Toast Message */}
      {message && (
        <div
          className={cn(
            'mx-6 mt-3 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between border',
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-700 border-red-200'
          )}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="p-0.5 cursor-pointer">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Main Content: 2 Columns */}
      <div className="flex-1 flex overflow-hidden p-6 gap-6">
        {/* Left: Branch List */}
        <div className="w-[38%] min-w-[320px] flex flex-col gap-3 overflow-y-auto pr-1">
          <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider px-1">
            Danh sách chi nhánh ({branches.length})
          </div>

          {branches.map((branch) => {
            const isSelected = String(branch.id) === String(selectedBranch?.id);
            const isCurrentWorking = String(branch.id) === String(activeBranchId);
            return (
              <div
                key={branch.id}
                onClick={() => setSelectedBranchId(String(branch.id))}
                className={cn(
                  'p-4 rounded-2xl border-2 bg-white transition-all cursor-pointer relative',
                  isSelected
                    ? 'border-blue-500 shadow-md ring-2 ring-blue-100'
                    : 'border-zinc-200 hover:border-blue-300'
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white text-[11px] font-black">
                      {branch.code}
                    </span>
                    <h3 className="font-bold text-sm text-zinc-900">{branch.name}</h3>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditBranch(branch);
                      }}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                      title="Sửa chi nhánh"
                    >
                      <Edit3 size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteBranch(branch);
                      }}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                      title="Xóa chi nhánh"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <div className="space-y-1 text-xs text-zinc-600">
                  {branch.address && (
                    <div className="flex items-start gap-1.5">
                      <MapPin size={13} className="text-zinc-400 shrink-0 mt-0.5" />
                      <span>{branch.address}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-4 flex-wrap">
                    {branch.phone && (
                      <span className="flex items-center gap-1">
                        <Phone size={12} className="text-zinc-400" />
                        {branch.phone}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock size={12} className="text-zinc-400" />
                      {branch.openTime || '07:00'} - {branch.closeTime || '22:00'}
                    </span>
                  </div>
                  {(branch.wifiName || branch.wifiPassword) && (
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg mt-2 w-fit font-medium">
                      <Wifi size={12} />
                      <span>
                        Wi-Fi Bill: <strong>{branch.wifiName || 'N/A'}</strong> / Pass:{' '}
                        <strong>{branch.wifiPassword || 'Không'}</strong>
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-3 pt-2.5 border-t border-zinc-100 flex items-center justify-between">
                  <span
                    className={cn(
                      'text-[11px] font-bold px-2 py-0.5 rounded-full',
                      branch.isActive
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-zinc-200 text-zinc-600'
                    )}
                  >
                    {branch.isActive ? 'Đang hoạt động' : 'Tạm đóng'}
                  </span>

                  {isCurrentWorking ? (
                    <span className="text-[11px] font-bold text-blue-600 flex items-center gap-1">
                      <Check size={13} /> Đang làm việc tại đây
                    </span>
                  ) : (
                    onSelectActiveBranch && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectActiveBranch(String(branch.id));
                        }}
                        className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                      >
                        Chuyển POS sang chi nhánh này →
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Branch Tables & QR Management */}
        <div className="flex-1 bg-white rounded-2xl border border-zinc-200 flex flex-col overflow-hidden shadow-xs">
          <div className="px-5 py-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50/70">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                <LayoutGrid size={18} />
              </div>
              <div>
                <h2 className="font-bold text-sm text-zinc-900">
                  Danh sách Bàn & Mã QR • {selectedBranch?.name || 'Chọn chi nhánh'}
                </h2>
                <p className="text-xs text-zinc-500">
                  Tổng cộng {tables.length} bàn • Mã QR tự động gắn branchId={selectedBranch?.id}
                </p>
              </div>
            </div>

            {selectedBranch && (
              <button
                type="button"
                onClick={openCreateTable}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
              >
                <Plus size={15} />
                <span>Thêm bàn</span>
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {loadingTables ? (
              <div className="h-40 flex items-center justify-center text-sm text-zinc-500 font-medium">
                Đang tải danh sách bàn...
              </div>
            ) : tables.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center text-zinc-400 gap-2">
                <LayoutGrid size={32} />
                <p className="text-sm font-medium">Chi nhánh này chưa có bàn nào</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {tables.map((t) => (
                  <div
                    key={t.id}
                    className="p-4 rounded-2xl border border-zinc-200 hover:border-blue-300 bg-white hover:shadow-md transition-all flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <span className="font-black text-base text-zinc-900">{t.name}</span>
                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => openEditTable(t)}
                            className="p-1 text-zinc-400 hover:text-blue-600 rounded-md hover:bg-blue-50 cursor-pointer"
                            title="Sửa bàn"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTable(t)}
                            className="p-1 text-zinc-400 hover:text-red-600 rounded-md hover:bg-red-50 cursor-pointer"
                            title="Xóa bàn"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      <div className="mt-1.5 flex items-center gap-2 flex-wrap text-[11px] text-zinc-500">
                        <span className="px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 font-semibold">
                          {t.area || 'Tầng 1'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users size={11} /> {t.capacity} chỗ
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        selectedBranch &&
                        setQrTarget({
                          tableId: t.tableNumber || t.name.replace(/\D/g, '') || t.id,
                          branchId: String(selectedBranch.id),
                          branchName: selectedBranch.name,
                        })
                      }
                      className="w-full py-2 rounded-xl bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200 hover:border-blue-600 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <QrCode size={14} />
                      <span>Xem / In mã QR</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Branch Modal */}
      {showBranchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
              <h3 className="font-bold text-base text-zinc-900">
                {editingBranch ? `Chỉnh sửa ${editingBranch.name}` : 'Thêm chi nhánh mới'}
              </h3>
              <button
                onClick={() => setShowBranchModal(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-900 rounded-full hover:bg-zinc-200 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveBranch} className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Mã CN *</label>
                  <input
                    type="text"
                    required
                    value={branchForm.code}
                    onChange={(e) => setBranchForm({ ...branchForm, code: e.target.value })}
                    placeholder="CN03"
                    className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-sm font-semibold focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Tên chi nhánh *</label>
                  <input
                    type="text"
                    required
                    value={branchForm.name}
                    onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                    placeholder="VD: Chi nhánh 3 - Gò Vấp"
                    className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-sm font-semibold focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Địa chỉ (in trên hóa đơn)</label>
                <input
                  type="text"
                  value={branchForm.address}
                  onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })}
                  placeholder="12 Nguyễn Văn Bảo, Gò Vấp, TP.HCM"
                  className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Hotline</label>
                  <input
                    type="text"
                    value={branchForm.phone}
                    onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })}
                    placeholder="028 3822 1111"
                    className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Giờ mở cửa</label>
                  <input
                    type="text"
                    value={branchForm.openTime}
                    onChange={(e) => setBranchForm({ ...branchForm, openTime: e.target.value })}
                    placeholder="07:00"
                    className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Giờ đóng cửa</label>
                  <input
                    type="text"
                    value={branchForm.closeTime}
                    onChange={(e) => setBranchForm({ ...branchForm, closeTime: e.target.value })}
                    placeholder="22:00"
                    className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl">
                <div>
                  <label className="block text-xs font-bold text-emerald-900 mb-1">Tên Wi-Fi in Bill</label>
                  <input
                    type="text"
                    value={branchForm.wifiName}
                    onChange={(e) => setBranchForm({ ...branchForm, wifiName: e.target.value })}
                    placeholder="N70_Coffee_Q1"
                    className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-emerald-900 mb-1">Mật khẩu Wi-Fi</label>
                  <input
                    type="text"
                    value={branchForm.wifiPassword}
                    onChange={(e) => setBranchForm({ ...branchForm, wifiPassword: e.target.value })}
                    placeholder="n70coffee8888"
                    className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs font-semibold text-zinc-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={branchForm.isActive}
                  onChange={(e) => setBranchForm({ ...branchForm, isActive: e.target.checked })}
                  className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Chi nhánh đang hoạt động</span>
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBranchModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-zinc-200 text-zinc-700 text-xs font-bold hover:bg-zinc-100 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={savingBranch}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {savingBranch ? 'Đang lưu...' : editingBranch ? 'Lưu thay đổi' : 'Tạo chi nhánh'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit Table Modal */}
      {showTableModal && selectedBranch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
              <h3 className="font-bold text-base text-zinc-900">
                {editingTable ? `Sửa ${editingTable.name}` : `Thêm bàn • ${selectedBranch.name}`}
              </h3>
              <button
                onClick={() => setShowTableModal(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-900 rounded-full hover:bg-zinc-200 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveTable} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Số bàn (ID) *</label>
                  <input
                    type="text"
                    required
                    value={tableForm.tableNumber}
                    onChange={(e) => setTableForm({ ...tableForm, tableNumber: e.target.value })}
                    placeholder="9"
                    className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-sm font-semibold focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Tên hiển thị *</label>
                  <input
                    type="text"
                    required
                    value={tableForm.name}
                    onChange={(e) => setTableForm({ ...tableForm, name: e.target.value })}
                    placeholder="Bàn 09"
                    className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-sm font-semibold focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Khu vực</label>
                  <input
                    type="text"
                    value={tableForm.area}
                    onChange={(e) => setTableForm({ ...tableForm, area: e.target.value })}
                    placeholder="Tầng 1 / Sân vườn / VIP"
                    className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Số chỗ ngồi</label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={tableForm.capacity}
                    onChange={(e) => setTableForm({ ...tableForm, capacity: Number(e.target.value) || 4 })}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTableModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-zinc-200 text-zinc-700 text-xs font-bold hover:bg-zinc-100 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={savingTable}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {savingTable ? 'Đang lưu...' : editingTable ? 'Cập nhật bàn' : 'Thêm bàn'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Preview & Print Modal */}
      {qrTarget && (
        <TableQrModal
          tableId={qrTarget.tableId}
          branchId={qrTarget.branchId}
          branchName={qrTarget.branchName}
          onClose={() => setQrTarget(null)}
        />
      )}
    </div>
  );
};
