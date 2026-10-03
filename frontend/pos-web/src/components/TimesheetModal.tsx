import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Users,
  Clock,
  Camera,
  CheckCircle2,
  AlertCircle,
  Upload,
  Plus,
  Edit2,
  Power,
  Loader2,
  ShieldCheck,
  Search,
  Save,
  RotateCcw,
  UserPlus,
  Lock,
  Unlock,
  Shield,
} from 'lucide-react';
import api from '../lib/axios';
import { detectSingleFaceDescriptor } from '../lib/faceApiUtil';

export interface SystemUser {
  id: string;
  username: string;
  fullName: string;
  role: string;
  branchId: string;
  isActive: boolean;
  createdAt?: string;
}

export interface EmployeeItem {
  id: string;
  branchId: string;
  employeeCode: string;
  fullName: string;
  role: string;
  pinCode: string;
  avatarUrl?: string | null;
  faceDescriptor?: number[] | null;
  isActive: boolean;
  createdAt?: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  branchId: string;
  shiftId?: string | null;
  shiftCode: string;
  checkInAt: string;
  checkInPhoto: string;
  checkOutAt?: string | null;
  checkOutPhoto?: string | null;
  workingHours?: number | null;
  status: string; // 'ON_TIME' | 'LATE' | 'EARLY_LEAVE'
  isFaceVerified: boolean;
  createdAt: string;
  employee?: EmployeeItem;
}

interface TimesheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
}

const ROLE_LABELS: Record<string, string> = {
  CASHIER: 'Thu ngân',
  BARISTA: 'Pha chế',
  WAITER: 'Phục vụ',
  MANAGER: 'Quản lý',
};

export const TimesheetModal: React.FC<TimesheetModalProps> = ({
  isOpen,
  onClose,
  user,
}) => {
  const [activeTab, setActiveTab] = useState<'timesheet' | 'employees' | 'users'>('timesheet');

  // Timesheet Tab State
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [loadingAttendances, setLoadingAttendances] = useState<boolean>(true);
  const [filterFromDate, setFilterFromDate] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [filterToDate, setFilterToDate] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [filterEmployeeId, setFilterEmployeeId] = useState<string>('');

  // Photo Audit Modal
  const [auditPhoto, setAuditPhoto] = useState<{
    title: string;
    inPhoto?: string;
    outPhoto?: string;
    employeeName: string;
    checkInTime: string;
    checkOutTime?: string;
  } | null>(null);

  // Employees Tab State
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Create / Edit Employee Form State
  const [isEmployeeFormOpen, setIsEmployeeFormOpen] = useState<boolean>(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [nextEmployeeCode, setNextEmployeeCode] = useState<string>('NV01');
  const [loadingNextCode, setLoadingNextCode] = useState<boolean>(false);
  const [employeeFormData, setEmployeeFormData] = useState({
    employeeCode: '',
    fullName: '',
    role: 'WAITER',
    pinCode: '1234',
    branchId: user?.branchId || '1',
  });
  const [savingEmployee, setSavingEmployee] = useState<boolean>(false);

  // Tab 3: System Users State
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(true);
  const [searchUserQuery, setSearchUserQuery] = useState<string>('');
  const [isUserFormOpen, setIsUserFormOpen] = useState<boolean>(false);
  const [userFormData, setUserFormData] = useState({
    fullName: '',
    username: '',
    password: '',
    role: user?.role === 'MANAGER' ? 'CASHIER' : 'MANAGER',
    branchId: user?.branchId || '1',
  });
  const [savingUser, setSavingUser] = useState<boolean>(false);
  const [confirmToggleUser, setConfirmToggleUser] = useState<{
    user: SystemUser;
    action: 'LOCK' | 'UNLOCK';
  } | null>(null);
  const [togglingStatus, setTogglingStatus] = useState<boolean>(false);

  // Face Enrollment Submodal State
  const [enrollingEmployee, setEnrollingEmployee] = useState<EmployeeItem | null>(null);
  const [enrollSource, setEnrollSource] = useState<'camera' | 'upload'>('camera');
  const [enrollVideoActive, setEnrollVideoActive] = useState<boolean>(false);
  const [enrollPhotoPreview, setEnrollPhotoPreview] = useState<string | null>(null);
  const [extractedDescriptor, setExtractedDescriptor] = useState<number[] | null>(null);
  const [extractingFace, setExtractingFace] = useState<boolean>(false);
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const [savingFace, setSavingFace] = useState<boolean>(false);

  const enrollVideoRef = useRef<HTMLVideoElement>(null);
  const enrollStreamRef = useRef<MediaStream | null>(null);

  // Toast State
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Fetch Attendances
  const fetchAttendances = () => {
    setLoadingAttendances(true);
    api.get('/attendances/timesheet', {
      params: {
        branchId: user?.branchId || '1',
        fromDate: filterFromDate,
        toDate: filterToDate,
        employeeId: filterEmployeeId || undefined,
      },
    })
      .then(res => {
        setAttendances(Array.isArray(res.data) ? res.data : []);
      })
      .catch(err => {
        console.error('Lỗi tải bảng chấm công:', err);
        showToast('Không thể tải dữ liệu chấm công', 'error');
      })
      .finally(() => setLoadingAttendances(false));
  };

  // Fetch Employees
  const fetchEmployees = () => {
    setLoadingEmployees(true);
    api.get('/employees', {
      params: { branchId: user?.branchId || '1' },
    })
      .then(res => {
        setEmployees(Array.isArray(res.data) ? res.data : []);
      })
      .catch(err => {
        console.error('Lỗi tải danh sách nhân viên:', err);
        showToast('Không thể tải danh sách nhân viên', 'error');
      })
      .finally(() => setLoadingEmployees(false));
  };

  // Fetch System Users
  const fetchUsers = () => {
    setLoadingUsers(true);
    api.get('/auth/users', {
      params: { branchId: user?.role === 'MANAGER' ? user.branchId : '' },
    })
      .then(res => {
        setUsers(Array.isArray(res.data) ? res.data : []);
      })
      .catch((err: any) => {
        console.error('Lỗi tải danh sách tài khoản:', err);
        showToast(err.response?.data?.message || 'Không thể tải danh sách tài khoản', 'error');
      })
      .finally(() => setLoadingUsers(false));
  };

  // Fetch Next Employee Code
  const fetchNextEmployeeCode = async (): Promise<string> => {
    setLoadingNextCode(true);
    try {
      const res = await api.get('/employees/next-code', {
        params: { branchId: user?.branchId || '1' },
      });
      if (res.data?.nextCode) {
        setNextEmployeeCode(res.data.nextCode);
        return res.data.nextCode;
      }
    } catch (err) {
      console.warn('Không thể lấy mã nhân viên tự động từ server, tính toán cục bộ:', err);
    } finally {
      setLoadingNextCode(false);
    }

    // Fallback: Compute from current loaded employees
    let maxNum = 0;
    employees.forEach(emp => {
      const match = emp.employeeCode?.trim().match(/^NV(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    });
    const fallbackCode = `NV${String(maxNum + 1).padStart(2, '0')}`;
    setNextEmployeeCode(fallbackCode);
    return fallbackCode;
  };

  useEffect(() => {
    if (!isOpen) return;
    fetchAttendances();
    fetchEmployees();
    fetchUsers();
    fetchNextEmployeeCode();
  }, [isOpen, filterFromDate, filterToDate, filterEmployeeId]);

  // Handle Create System User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userFormData.fullName.trim() || !userFormData.username.trim() || !userFormData.password) {
      showToast('Vui lòng điền đầy đủ họ tên, tên đăng nhập và mật khẩu', 'error');
      return;
    }
    setSavingUser(true);
    try {
      await api.post('/auth/users', userFormData);
      showToast(`Tài khoản "${userFormData.username}" đã được tạo với quyền ${userFormData.role}`);
      setIsUserFormOpen(false);
      setUserFormData({
        fullName: '',
        username: '',
        password: '',
        role: user?.role === 'MANAGER' ? 'CASHIER' : 'MANAGER',
        branchId: user?.branchId || '1',
      });
      fetchUsers();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Có lỗi xảy ra khi tạo tài khoản', 'error');
    } finally {
      setSavingUser(false);
    }
  };

  // Handle Toggle User Lock/Unlock Status
  const handleToggleUserStatus = async () => {
    if (!confirmToggleUser) return;
    setTogglingStatus(true);
    try {
      const { user: targetUser, action } = confirmToggleUser;
      const newStatus = action === 'UNLOCK';
      await api.patch(`/auth/users/${targetUser.id}/status`, { isActive: newStatus });
      showToast(`Tài khoản "${targetUser.username}" đã được ${newStatus ? 'mở khóa' : 'khóa'}`);
      setConfirmToggleUser(null);
      fetchUsers();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Có lỗi xảy ra khi cập nhật trạng thái', 'error');
    } finally {
      setTogglingStatus(false);
    }
  };

  const getUserRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'MANAGER':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'CASHIER':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'KITCHEN':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'WAITER':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      default:
        return 'bg-zinc-100 text-zinc-700 border-zinc-200';
    }
  };

  // Handle Save Employee
  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEmployee(true);

    const targetCode = employeeFormData.employeeCode || (!editingEmployeeId ? nextEmployeeCode : '');
    const payload = {
      ...employeeFormData,
      employeeCode: targetCode,
    };

    try {
      if (editingEmployeeId) {
        await api.put(`/employees/${editingEmployeeId}`, payload);
        showToast('Cập nhật nhân viên thành công');
      } else {
        await api.post('/employees', payload);
        showToast('Tạo nhân viên mới thành công');
      }
      setIsEmployeeFormOpen(false);
      setEditingEmployeeId(null);
      fetchEmployees();
      fetchNextEmployeeCode();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Lỗi lưu thông tin nhân viên';
      showToast(msg, 'error');
    } finally {
      setSavingEmployee(false);
    }
  };

  // Handle Open Edit Employee
  const handleOpenEditEmployee = (emp: EmployeeItem) => {
    setEditingEmployeeId(emp.id);
    setEmployeeFormData({
      employeeCode: emp.employeeCode,
      fullName: emp.fullName,
      role: emp.role,
      pinCode: emp.pinCode || '1234',
      branchId: emp.branchId,
    });
    setIsEmployeeFormOpen(true);
  };

  // Handle Toggle Employee Active Status
  const handleToggleEmployee = async (emp: EmployeeItem) => {
    try {
      await api.put(`/employees/${emp.id}`, { isActive: !emp.isActive });
      showToast(emp.isActive ? 'Đã tạm ngưng tài khoản nhân viên' : 'Đã kích hoạt lại nhân viên');
      fetchEmployees();
    } catch (err: any) {
      showToast(err.message || 'Lỗi đổi trạng thái', 'error');
    }
  };

  // ================= Face Enrollment Functions =================
  const startEnrollCamera = () => {
    setEnrollError(null);
    navigator.mediaDevices
      ?.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' } })
      .then(stream => {
        enrollStreamRef.current = stream;
        if (enrollVideoRef.current) {
          enrollVideoRef.current.srcObject = stream;
          enrollVideoRef.current.onloadedmetadata = () => {
            enrollVideoRef.current?.play();
            setEnrollVideoActive(true);
          };
        }
      })
      .catch(err => {
        console.error('Không thể mở camera:', err);
        setEnrollError('Không thể mở camera thiết bị. Vui lòng cho phép quyền truy cập.');
      });
  };

  const stopEnrollCamera = () => {
    if (enrollStreamRef.current) {
      enrollStreamRef.current.getTracks().forEach(t => t.stop());
      enrollStreamRef.current = null;
    }
    setEnrollVideoActive(false);
  };

  const handleOpenFaceEnroll = (emp: EmployeeItem) => {
    setEnrollingEmployee(emp);
    setEnrollPhotoPreview(emp.avatarUrl || null);
    setExtractedDescriptor(null);
    setEnrollError(null);
    setEnrollSource('camera');
    setTimeout(() => {
      startEnrollCamera();
    }, 150);
  };

  const handleCloseFaceEnroll = () => {
    stopEnrollCamera();
    setEnrollingEmployee(null);
    setEnrollPhotoPreview(null);
    setExtractedDescriptor(null);
    setEnrollError(null);
  };

  // Capture from Camera & Run AI
  const handleCaptureAndExtract = async () => {
    const video = enrollVideoRef.current;
    if (!video) return;

    setExtractingFace(true);
    setEnrollError(null);

    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
      setEnrollPhotoPreview(dataUrl);

      // Run AI Detection on Canvas
      const result = await detectSingleFaceDescriptor(canvas);
      if (!result) {
        setEnrollError('Không phát hiện thấy khuôn mặt rõ ràng trong ảnh. Hãy nhìn thẳng vào camera và thử lại.');
        setExtractedDescriptor(null);
      } else {
        setExtractedDescriptor(result.descriptor);
        stopEnrollCamera();
      }
    } catch (err: any) {
      console.error('Lỗi trích xuất khuôn mặt:', err);
      setEnrollError(err.message || 'Lỗi trích xuất vector đặc trưng');
    } finally {
      setExtractingFace(false);
    }
  };

  // Upload Photo File & Run AI
  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExtractingFace(true);
    setEnrollError(null);
    stopEnrollCamera();

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setEnrollPhotoPreview(dataUrl);

      const img = new Image();
      img.src = dataUrl;
      img.onload = async () => {
        try {
          const result = await detectSingleFaceDescriptor(img);
          if (!result) {
            setEnrollError('Không phát hiện khuôn mặt trong ảnh tải lên. Vui lòng chọn ảnh chụp rõ mặt.');
            setExtractedDescriptor(null);
          } else {
            setExtractedDescriptor(result.descriptor);
          }
        } catch (err: any) {
          setEnrollError('Lỗi phân tích khuôn mặt: ' + err.message);
        } finally {
          setExtractingFace(false);
        }
      };
    };
    reader.readAsDataURL(file);
  };

  // Save Face Descriptor to Backend
  const handleSaveFace = async () => {
    if (!enrollingEmployee || !extractedDescriptor) return;
    setSavingFace(true);

    try {
      await api.put(`/employees/${enrollingEmployee.id}/face`, {
        descriptor: extractedDescriptor,
        avatarBase64: enrollPhotoPreview || undefined,
      });

      showToast(`Đã đăng ký khuôn mặt thành công cho ${enrollingEmployee.fullName}`);
      handleCloseFaceEnroll();
      fetchEmployees();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Lỗi cập nhật sinh trắc học';
      showToast(msg, 'error');
    } finally {
      setSavingFace(false);
    }
  };

  if (!isOpen) return null;

  const filteredEmployees = employees.filter(
    e =>
      e.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.employeeCode.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const filteredUsers = users.filter(
    u =>
      u.fullName.toLowerCase().includes(searchUserQuery.toLowerCase()) ||
      u.username.toLowerCase().includes(searchUserQuery.toLowerCase()) ||
      u.role.toLowerCase().includes(searchUserQuery.toLowerCase()),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-5xl rounded-3xl overflow-hidden shadow-2xl border border-zinc-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-amber-600 p-4 sm:p-5 text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-inner">
              <Users size={22} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight">Quản Lý Nhân Sự & Bảng Công</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 border border-white/20">
                  {user?.role || 'ADMIN'}
                </span>
              </div>
              <p className="text-orange-100 text-xs mt-0.5">
                Chấm công tự động, hồ sơ sinh trắc học AI & tài khoản hệ thống
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-2xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-5 pt-3 border-b border-zinc-200 bg-zinc-50/70 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('timesheet')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border-b-2 ${
              activeTab === 'timesheet'
                ? 'border-orange-500 text-orange-600 bg-white shadow-2xs'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Clock size={15} />
            <span>🕒 Bảng chấm công (Timesheet)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('employees')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border-b-2 ${
              activeTab === 'employees'
                ? 'border-orange-500 text-orange-600 bg-white shadow-2xs'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Users size={15} />
            <span>👥 Hồ sơ Nhân viên & Sinh trắc học ({employees.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border-b-2 ${
              activeTab === 'users'
                ? 'border-orange-500 text-orange-600 bg-white shadow-2xs'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <ShieldCheck size={15} />
            <span>🔐 Tài khoản hệ thống (Users & Roles) ({users.length})</span>
          </button>
        </div>

        {/* Toast Alert */}
        {toastMsg && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-3 duration-200">
            <div
              className={`px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-bold border ${
                toastMsg.type === 'success'
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-600/25'
                  : 'bg-rose-600 text-white border-rose-500 shadow-rose-600/25'
              }`}
            >
              {toastMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{toastMsg.text}</span>
            </div>
          </div>
        )}

        {/* Tab 1: Timesheet Content */}
        {activeTab === 'timesheet' && (
          <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-4">
            {/* Filter Bar */}
            <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                {/* From Date */}
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-500 font-semibold">Từ:</span>
                  <input
                    type="date"
                    value={filterFromDate}
                    onChange={e => setFilterFromDate(e.target.value)}
                    className="px-2.5 py-1.5 bg-white border border-zinc-200 rounded-xl font-bold text-zinc-800 focus:outline-none focus:border-orange-500"
                  />
                </div>

                {/* To Date */}
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-500 font-semibold">Đến:</span>
                  <input
                    type="date"
                    value={filterToDate}
                    onChange={e => setFilterToDate(e.target.value)}
                    className="px-2.5 py-1.5 bg-white border border-zinc-200 rounded-xl font-bold text-zinc-800 focus:outline-none focus:border-orange-500"
                  />
                </div>

                {/* Employee Filter */}
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-500 font-semibold">Nhân viên:</span>
                  <select
                    value={filterEmployeeId}
                    onChange={e => setFilterEmployeeId(e.target.value)}
                    className="px-2.5 py-1.5 bg-white border border-zinc-200 rounded-xl font-semibold text-zinc-800 focus:outline-none focus:border-orange-500 cursor-pointer"
                  >
                    <option value="">Tất cả nhân viên</option>
                    {employees.map(e => (
                      <option key={e.id} value={e.id}>
                        {e.employeeCode} - {e.fullName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={fetchAttendances}
                className="px-3.5 py-1.5 bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-700 font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw size={13} />
                <span>Làm mới</span>
              </button>
            </div>

            {/* Attendance Table */}
            <div className="border border-zinc-200 rounded-2xl overflow-hidden shadow-2xs">
              {loadingAttendances ? (
                <div className="py-16 flex flex-col items-center justify-center gap-2 text-zinc-400 text-xs">
                  <Loader2 size={24} className="animate-spin text-orange-500" />
                  <span>Đang tải bảng chấm công...</span>
                </div>
              ) : attendances.length === 0 ? (
                <div className="py-16 text-center text-zinc-400 text-xs">
                  Không có bản ghi chấm công nào trong khoảng thời gian này.
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-3.5">Mã NV</th>
                      <th className="py-3 px-3.5">Nhân viên</th>
                      <th className="py-3 px-3.5">Chức vụ</th>
                      <th className="py-3 px-3.5">Ca làm</th>
                      <th className="py-3 px-3.5">Giờ vào (Check-in)</th>
                      <th className="py-3 px-3.5">Giờ ra (Check-out)</th>
                      <th className="py-3 px-3.5 text-center">Giờ làm</th>
                      <th className="py-3 px-3.5 text-center">Trạng thái</th>
                      <th className="py-3 px-3.5 text-center">Xác thực AI</th>
                      <th className="py-3 px-3.5 text-center">Ảnh đối soát</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {attendances.map(record => {
                      const emp = record.employee;
                      const isLate = record.status === 'LATE';

                      return (
                        <tr key={record.id} className="hover:bg-zinc-50/70 transition-colors">
                          <td className="py-3 px-3.5 font-mono font-bold text-zinc-800">
                            {emp?.employeeCode || 'N/A'}
                          </td>
                          <td className="py-3 px-3.5 font-bold text-zinc-900">
                            {emp?.fullName || 'Nhân viên'}
                          </td>
                          <td className="py-3 px-3.5 text-zinc-600 font-medium">
                            {ROLE_LABELS[emp?.role || ''] || emp?.role || '-'}
                          </td>
                          <td className="py-3 px-3.5">
                            <span className="font-bold bg-orange-50 border border-orange-200 text-orange-700 px-2 py-0.5 rounded-md text-[11px]">
                              {record.shiftCode}
                            </span>
                          </td>
                          <td className="py-3 px-3.5 font-mono text-zinc-700">
                            {new Date(record.checkInAt).toLocaleDateString('vi-VN')}{' '}
                            <span className="font-bold text-zinc-900">
                              {new Date(record.checkInAt).toLocaleTimeString('vi-VN')}
                            </span>
                          </td>
                          <td className="py-3 px-3.5 font-mono text-zinc-700">
                            {record.checkOutAt ? (
                              <>
                                {new Date(record.checkOutAt).toLocaleDateString('vi-VN')}{' '}
                                <span className="font-bold text-zinc-900">
                                  {new Date(record.checkOutAt).toLocaleTimeString('vi-VN')}
                                </span>
                              </>
                            ) : (
                              <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                Đang trong ca
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3.5 text-center font-bold text-zinc-900 font-mono">
                            {record.workingHours !== null && record.workingHours !== undefined
                              ? `${record.workingHours}h`
                              : '-'}
                          </td>
                          <td className="py-3 px-3.5 text-center">
                            {isLate ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                                ⚠️ Đi trễ
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                ✅ Đúng giờ
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3.5 text-center">
                            {record.isFaceVerified ? (
                              <span className="text-[11px] font-bold text-emerald-700 inline-flex items-center gap-1">
                                <ShieldCheck size={14} />
                                <span>AI Match</span>
                              </span>
                            ) : (
                              <span className="text-[11px] font-medium text-zinc-400 inline-flex items-center gap-1">
                                <span>PIN/Thủ công</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3.5 text-center">
                            <button
                              type="button"
                              onClick={() =>
                                setAuditPhoto({
                                  title: `Ảnh đối soát chấm công: ${emp?.fullName} (${record.shiftCode})`,
                                  inPhoto: record.checkInPhoto,
                                  outPhoto: record.checkOutPhoto || undefined,
                                  employeeName: emp?.fullName || '',
                                  checkInTime: new Date(record.checkInAt).toLocaleString('vi-VN'),
                                  checkOutTime: record.checkOutAt
                                    ? new Date(record.checkOutAt).toLocaleString('vi-VN')
                                    : undefined,
                                })
                              }
                              className="px-2.5 py-1 bg-zinc-100 hover:bg-orange-50 hover:text-orange-600 text-zinc-700 font-bold rounded-lg border border-zinc-200 inline-flex items-center gap-1 transition-colors cursor-pointer text-[11px]"
                            >
                              <Camera size={12} />
                              <span>Xem ảnh</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Employees & Face Enrollment */}
        {activeTab === 'employees' && (
          <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-4">
            {/* Header Actions */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="relative flex-1 max-w-xs">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Tìm nhân viên theo tên, mã..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold text-zinc-800 focus:outline-none focus:border-orange-500 focus:bg-white"
                />
              </div>

              <button
                type="button"
                onClick={async () => {
                  setEditingEmployeeId(null);
                  const code = await fetchNextEmployeeCode();
                  setEmployeeFormData({
                    employeeCode: code,
                    fullName: '',
                    role: 'WAITER',
                    pinCode: '1234',
                    branchId: user?.branchId || '1',
                  });
                  setIsEmployeeFormOpen(true);
                }}
                className="px-3.5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-orange-600/20 transition-all cursor-pointer"
              >
                <Plus size={14} />
                <span>Thêm nhân viên mới</span>
              </button>
            </div>

            {/* Create / Edit Form Popup Modal or Inline */}
            {isEmployeeFormOpen && (
              <form
                onSubmit={handleSaveEmployee}
                className="bg-orange-50/50 border border-orange-200 rounded-2xl p-4 animate-in slide-in-from-top-2 duration-200 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-zinc-900 text-xs">
                    {editingEmployeeId ? 'Chỉnh sửa thông tin nhân viên' : 'Thêm hồ sơ nhân viên mới'}
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsEmployeeFormOpen(false)}
                    className="text-xs font-semibold text-zinc-400 hover:text-zinc-700"
                  >
                    Đóng form
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-bold text-zinc-700">Mã nhân viên *</label>
                      {!editingEmployeeId && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md">
                          Tự động sinh
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        readOnly={!editingEmployeeId}
                        placeholder={loadingNextCode ? 'Đang lấy mã...' : 'Tự động sinh (VD: NV04)'}
                        value={employeeFormData.employeeCode || (!editingEmployeeId ? nextEmployeeCode : '')}
                        onChange={e =>
                          setEmployeeFormData({ ...employeeFormData, employeeCode: e.target.value })
                        }
                        className={`w-full px-3 py-1.5 border rounded-xl font-mono font-bold text-xs uppercase focus:outline-none transition-all ${
                          !editingEmployeeId
                            ? 'bg-zinc-100/80 border-zinc-200 text-zinc-600 cursor-not-allowed select-none'
                            : 'bg-white border-zinc-200 text-zinc-800 focus:border-orange-500'
                        }`}
                      />
                      {!editingEmployeeId && (
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">
                          <Lock size={12} />
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-zinc-700 mb-1">Họ và tên *</label>
                    <input
                      type="text"
                      required
                      placeholder="Nguyễn Văn A"
                      value={employeeFormData.fullName}
                      onChange={e =>
                        setEmployeeFormData({ ...employeeFormData, fullName: e.target.value })
                      }
                      className="w-full px-3 py-1.5 bg-white border border-zinc-200 rounded-xl font-semibold text-zinc-800 focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-zinc-700 mb-1">Vị trí / Chức vụ</label>
                    <select
                      value={employeeFormData.role}
                      onChange={e => setEmployeeFormData({ ...employeeFormData, role: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-zinc-200 rounded-xl font-bold text-zinc-800 focus:outline-none focus:border-orange-500 cursor-pointer"
                    >
                      <option value="CASHIER">Thu ngân (Cashier)</option>
                      <option value="BARISTA">Pha chế (Barista)</option>
                      <option value="WAITER">Phục vụ (Waiter)</option>
                      <option value="MANAGER">Quản lý (Manager)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-zinc-700 mb-1">Mã PIN cá nhân (4-6 số)</label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      placeholder="1234"
                      value={employeeFormData.pinCode}
                      onChange={e =>
                        setEmployeeFormData({ ...employeeFormData, pinCode: e.target.value })
                      }
                      className="w-full px-3 py-1.5 bg-white border border-zinc-200 rounded-xl font-mono font-bold text-zinc-800 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-orange-200/50">
                  <button
                    type="button"
                    onClick={() => setIsEmployeeFormOpen(false)}
                    className="px-3.5 py-1.5 bg-white border border-zinc-200 rounded-xl text-xs font-semibold text-zinc-600 hover:bg-zinc-100"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={savingEmployee}
                    className="px-4 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {savingEmployee ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                    <span>{editingEmployeeId ? 'Lưu thay đổi' : 'Tạo hồ sơ'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* Employees Table */}
            <div className="border border-zinc-200 rounded-2xl overflow-hidden shadow-2xs">
              {loadingEmployees ? (
                <div className="py-16 flex flex-col items-center justify-center gap-2 text-zinc-400 text-xs">
                  <Loader2 size={24} className="animate-spin text-orange-500" />
                  <span>Đang tải danh sách nhân viên...</span>
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Ảnh thẻ</th>
                      <th className="py-3 px-4">Mã NV</th>
                      <th className="py-3 px-4">Họ và tên</th>
                      <th className="py-3 px-4">Vị trí</th>
                      <th className="py-3 px-4">Mã PIN</th>
                      <th className="py-3 px-4 text-center">Trạng thái Sinh trắc học</th>
                      <th className="py-3 px-4 text-center">Hoạt động</th>
                      <th className="py-3 px-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {filteredEmployees.map(emp => {
                      const hasFace = Boolean(emp.faceDescriptor && emp.faceDescriptor.length === 128);

                      return (
                        <tr key={emp.id} className="hover:bg-zinc-50/70 transition-colors">
                          <td className="py-3 px-4">
                            <div className="w-9 h-9 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center font-bold text-zinc-500 overflow-hidden text-xs">
                              {emp.avatarUrl ? (
                                <img
                                  src={emp.avatarUrl}
                                  alt={emp.fullName}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span>{emp.fullName.slice(0, 2).toUpperCase()}</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-zinc-800">
                            {emp.employeeCode}
                          </td>
                          <td className="py-3 px-4 font-bold text-zinc-900">{emp.fullName}</td>
                          <td className="py-3 px-4 font-semibold text-zinc-600">
                            {ROLE_LABELS[emp.role] || emp.role}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-zinc-400">••••</td>
                          <td className="py-3 px-4 text-center">
                            {hasFace ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                                <CheckCircle2 size={12} />
                                <span>Đã có AI Face (128D)</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                                <AlertCircle size={12} />
                                <span>Chưa có dữ liệu</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {emp.isActive ? (
                              <span className="text-[11px] font-bold text-emerald-600">Hoạt động</span>
                            ) : (
                              <span className="text-[11px] font-bold text-zinc-400">Tạm ngưng</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right space-x-1.5">
                            {/* Enroll Face Button */}
                            <button
                              type="button"
                              onClick={() => handleOpenFaceEnroll(emp)}
                              className="px-2.5 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 rounded-xl font-bold inline-flex items-center gap-1 transition-colors cursor-pointer text-xs"
                              title="Đăng ký hoặc cập nhật khuôn mặt"
                            >
                              <Camera size={13} />
                              <span>{hasFace ? 'Đổi mặt' : 'Đăng ký mặt'}</span>
                            </button>

                            {/* Edit Button */}
                            <button
                              type="button"
                              onClick={() => handleOpenEditEmployee(emp)}
                              className="w-8 h-8 rounded-xl border border-zinc-200 hover:bg-zinc-100 text-zinc-700 inline-flex items-center justify-center transition-colors cursor-pointer"
                              title="Sửa thông tin"
                            >
                              <Edit2 size={13} />
                            </button>

                            {/* Toggle Status */}
                            <button
                              type="button"
                              onClick={() => handleToggleEmployee(emp)}
                              className={`w-8 h-8 rounded-xl border inline-flex items-center justify-center transition-colors cursor-pointer ${
                                emp.isActive
                                  ? 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                                  : 'border-zinc-200 text-zinc-400 hover:bg-zinc-100'
                              }`}
                              title={emp.isActive ? 'Tạm ngưng hoạt động' : 'Kích hoạt'}
                            >
                              <Power size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: System Users & Roles */}
        {activeTab === 'users' && (
          <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-4">
            {/* Header Actions */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="relative flex-1 max-w-xs">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Tìm tài khoản theo họ tên, username..."
                  value={searchUserQuery}
                  onChange={e => setSearchUserQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold text-zinc-800 focus:outline-none focus:border-orange-500 focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchUsers}
                  className="px-3 py-1.5 bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Làm mới danh sách"
                >
                  <RotateCcw size={13} />
                  <span>Làm mới</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setUserFormData({
                      fullName: '',
                      username: '',
                      password: '',
                      role: user?.role === 'MANAGER' ? 'CASHIER' : 'MANAGER',
                      branchId: user?.branchId || '1',
                    });
                    setIsUserFormOpen(true);
                  }}
                  className="px-3.5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-orange-600/20 transition-all cursor-pointer"
                >
                  <UserPlus size={14} />
                  <span>Thêm tài khoản mới</span>
                </button>
              </div>
            </div>

            {/* Create User Form */}
            {isUserFormOpen && (
              <form
                onSubmit={handleCreateUser}
                className="bg-orange-50/50 border border-orange-200 rounded-2xl p-4 animate-in slide-in-from-top-2 duration-200 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-zinc-900 text-xs flex items-center gap-2">
                    <UserPlus size={15} className="text-orange-600" />
                    <span>Thêm tài khoản đăng nhập hệ thống</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsUserFormOpen(false)}
                    className="text-xs font-semibold text-zinc-400 hover:text-zinc-700 cursor-pointer"
                  >
                    Đóng form
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                  <div>
                    <label className="block font-bold text-zinc-700 mb-1">
                      Tên hiển thị *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="VD: Thu ngân Quầy 1, Quản trị viên..."
                      value={userFormData.fullName}
                      onChange={e => setUserFormData({ ...userFormData, fullName: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-zinc-200 rounded-xl font-semibold text-zinc-800 focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-zinc-700 mb-1">Tên đăng nhập *</label>
                    <input
                      type="text"
                      required
                      placeholder="VD: nva_cashier"
                      value={userFormData.username}
                      onChange={e => setUserFormData({ ...userFormData, username: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-zinc-200 rounded-xl font-mono text-zinc-800 focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-zinc-700 mb-1">Mật khẩu *</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={userFormData.password}
                      onChange={e => setUserFormData({ ...userFormData, password: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-zinc-200 rounded-xl font-mono text-zinc-800 focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-zinc-700 mb-1">Phân quyền</label>
                    <select
                      value={userFormData.role}
                      onChange={e => setUserFormData({ ...userFormData, role: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-zinc-200 rounded-xl font-bold text-zinc-800 focus:outline-none focus:border-orange-500 cursor-pointer"
                    >
                      {user?.role === 'ADMIN' && <option value="ADMIN">Quản trị (ADMIN)</option>}
                      {user?.role === 'ADMIN' && <option value="MANAGER">Quản lý (MANAGER)</option>}
                      <option value="CASHIER">Thu ngân (CASHIER)</option>
                      <option value="KITCHEN">Bếp (KITCHEN)</option>
                      <option value="WAITER">Phục vụ (WAITER)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-zinc-700 mb-1">Chi nhánh</label>
                    <select
                      value={userFormData.branchId}
                      onChange={e => setUserFormData({ ...userFormData, branchId: e.target.value })}
                      disabled={user?.role !== 'ADMIN'}
                      className="w-full px-3 py-1.5 bg-white border border-zinc-200 rounded-xl font-bold text-zinc-800 focus:outline-none focus:border-orange-500 disabled:opacity-60 cursor-pointer"
                    >
                      <option value="1">Chi nhánh 1</option>
                      <option value="2">Chi nhánh 2</option>
                      <option value="3">Chi nhánh 3</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-orange-200/50">
                  <button
                    type="button"
                    onClick={() => setIsUserFormOpen(false)}
                    className="px-3.5 py-1.5 bg-white border border-zinc-200 rounded-xl text-xs font-semibold text-zinc-600 hover:bg-zinc-100 cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={savingUser}
                    className="px-4 py-1.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                  >
                    {savingUser ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                    <span>Tạo tài khoản</span>
                  </button>
                </div>
              </form>
            )}

            {/* Users Table */}
            <div className="border border-zinc-200 rounded-2xl overflow-hidden shadow-2xs">
              {loadingUsers ? (
                <div className="py-16 flex flex-col items-center justify-center gap-2 text-zinc-400 text-xs">
                  <Loader2 size={24} className="animate-spin text-orange-500" />
                  <span>Đang tải danh sách tài khoản...</span>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="py-16 text-center text-zinc-400 text-xs">
                  Không tìm thấy tài khoản người dùng nào.
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">TÊN HIỂN THỊ</th>
                      <th className="py-3 px-4">Tài khoản</th>
                      <th className="py-3 px-4">Phân quyền</th>
                      <th className="py-3 px-4">Chi nhánh</th>
                      <th className="py-3 px-4 text-center">Trạng thái</th>
                      <th className="py-3 px-4 text-right pr-5">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {filteredUsers.map(u => (
                      <tr key={u.id} className="hover:bg-zinc-50/70 transition-colors">
                        <td className="py-3 px-4 font-bold text-zinc-900">{u.fullName}</td>
                        <td className="py-3 px-4 font-mono font-semibold text-zinc-600">{u.username}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold border inline-flex items-center gap-1 ${getUserRoleBadge(
                              u.role,
                            )}`}
                          >
                            <Shield size={11} />
                            <span>{u.role}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-zinc-600">
                          {u.branchId ? `Chi nhánh ${u.branchId}` : 'Toàn chuỗi'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {u.isActive ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              <span>Hoạt động</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[11px] font-bold border border-rose-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                              <span>Đã khóa</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right pr-5">
                          {u.id !== user?.id && u.role !== 'ADMIN' ? (
                            <button
                              type="button"
                              onClick={() =>
                                setConfirmToggleUser({
                                  user: u,
                                  action: u.isActive ? 'LOCK' : 'UNLOCK',
                                })
                              }
                              className={`px-2.5 py-1 rounded-lg border text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer ${
                                u.isActive
                                  ? 'text-rose-600 border-rose-200 hover:bg-rose-50'
                                  : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'
                              }`}
                              title={u.isActive ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                            >
                              {u.isActive ? <Lock size={13} /> : <Unlock size={13} />}
                              <span>{u.isActive ? 'Khóa' : 'Mở khóa'}</span>
                            </button>
                          ) : u.id === user?.id ? (
                            <span className="text-[11px] text-zinc-400 font-semibold italic">Đang đăng nhập</span>
                          ) : (
                            <span className="text-[11px] text-zinc-400 italic">Mặc định</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Submodal 1: Face Enrollment Modal */}
        {enrollingEmployee && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-zinc-200 flex flex-col">
              <div className="bg-gradient-to-r from-orange-600 to-amber-600 p-4 text-white flex items-center justify-between">
                <div>
                  <h3 className="font-black text-sm">Đăng Ký Khuôn Mặt Sinh Trắc Học</h3>
                  <p className="text-orange-100 text-xs mt-0.5">
                    Nhân viên: <span className="font-bold text-white">{enrollingEmployee.fullName}</span> ({enrollingEmployee.employeeCode})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCloseFaceEnroll}
                  className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Method selector */}
                <div className="grid grid-cols-2 gap-2 bg-zinc-100 p-1 rounded-xl text-xs font-bold text-zinc-600">
                  <button
                    type="button"
                    onClick={() => {
                      setEnrollSource('camera');
                      startEnrollCamera();
                    }}
                    className={`py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                      enrollSource === 'camera' ? 'bg-white text-orange-600 shadow-2xs' : ''
                    }`}
                  >
                    <Camera size={14} />
                    <span>Bật Camera trực tiếp</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEnrollSource('upload');
                      stopEnrollCamera();
                    }}
                    className={`py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                      enrollSource === 'upload' ? 'bg-white text-orange-600 shadow-2xs' : ''
                    }`}
                  >
                    <Upload size={14} />
                    <span>Tải ảnh từ máy</span>
                  </button>
                </div>

                {/* Camera / Upload Box */}
                <div className="relative aspect-4/3 w-full bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-800 flex items-center justify-center">
                  {enrollSource === 'camera' && (
                    <>
                      <video
                        ref={enrollVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover transform -scale-x-100"
                      />
                      {!enrollVideoActive && !enrollError && (
                        <div className="absolute inset-0 bg-zinc-900 flex flex-col items-center justify-center gap-2 text-zinc-400 text-xs">
                          <Loader2 size={24} className="animate-spin text-orange-500" />
                          <span>Đang mở camera...</span>
                        </div>
                      )}
                    </>
                  )}

                  {enrollSource === 'upload' && (
                    <div className="p-4 text-center">
                      {enrollPhotoPreview ? (
                        <img
                          src={enrollPhotoPreview}
                          alt="Uploaded portrait"
                          className="max-h-56 max-w-full rounded-xl object-contain mx-auto"
                        />
                      ) : (
                        <div className="space-y-3">
                          <Upload size={32} className="mx-auto text-zinc-500" />
                          <p className="text-xs text-zinc-400">Chọn ảnh chân dung chụp trực diện, ánh sáng rõ</p>
                        </div>
                      )}
                      <label className="mt-3 inline-block px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors">
                        <span>Chọn tệp ảnh</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleUploadPhoto}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}

                  {/* Captured snapshot preview for camera */}
                  {enrollSource === 'camera' && enrollPhotoPreview && !enrollVideoActive && (
                    <img
                      src={enrollPhotoPreview}
                      alt="Captured snapshot"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  )}
                </div>

                {/* Error Banner */}
                {enrollError && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-3 flex items-start gap-2 text-xs">
                    <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                    <span>{enrollError}</span>
                  </div>
                )}

                {/* Extraction Success Banner */}
                {extractedDescriptor && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={18} className="text-emerald-600" />
                      <span className="font-bold">Đã trích xuất thành công 128 số đặc trưng khuôn mặt</span>
                    </div>
                    <span className="font-mono bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
                      128D Float
                    </span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-2 border-t border-zinc-200">
                  {enrollSource === 'camera' && enrollVideoActive ? (
                    <button
                      type="button"
                      disabled={extractingFace}
                      onClick={handleCaptureAndExtract}
                      className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all"
                    >
                      {extractingFace ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Camera size={16} />
                      )}
                      <span>Chụp ảnh & Trích xuất khuôn mặt</span>
                    </button>
                  ) : (
                    <div className="flex items-center justify-end gap-2 w-full">
                      {enrollSource === 'camera' && !enrollVideoActive && (
                        <button
                          type="button"
                          onClick={() => {
                            setEnrollPhotoPreview(null);
                            setExtractedDescriptor(null);
                            startEnrollCamera();
                          }}
                          className="px-3 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold rounded-xl text-xs cursor-pointer"
                        >
                          Chụp lại
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={!extractedDescriptor || savingFace}
                        onClick={handleSaveFace}
                        className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer transition-all"
                      >
                        {savingFace ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Save size={14} />
                        )}
                        <span>Lưu khuôn mặt nhân viên</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Submodal 2: Audit Photos View */}
        {auditPhoto && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl border border-zinc-200 flex flex-col">
              <div className="bg-zinc-900 p-4 text-white flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm">{auditPhoto.title}</h3>
                  <p className="text-zinc-400 text-xs mt-0.5">Đối chiếu ảnh chụp tự động thời điểm Check-in/Check-out</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAuditPhoto(null)}
                  className="w-8 h-8 rounded-xl bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-white"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Check In Photo */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-700 flex items-center gap-1">
                      <Camera size={13} />
                      <span>Ảnh lúc Vào ca (Check-in)</span>
                    </span>
                  </div>
                  <div className="aspect-4/3 bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-200 flex items-center justify-center">
                    {auditPhoto.inPhoto ? (
                      <img
                        src={auditPhoto.inPhoto}
                        alt="Check-in snapshot"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-zinc-500 text-xs">Không có ảnh</span>
                    )}
                  </div>
                  <p className="text-[11px] font-mono text-zinc-500 text-center">{auditPhoto.checkInTime}</p>
                </div>

                {/* Check Out Photo */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-amber-700 flex items-center gap-1">
                      <Camera size={13} />
                      <span>Ảnh lúc Tan ca (Check-out)</span>
                    </span>
                  </div>
                  <div className="aspect-4/3 bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-200 flex items-center justify-center">
                    {auditPhoto.outPhoto ? (
                      <img
                        src={auditPhoto.outPhoto}
                        alt="Check-out snapshot"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-zinc-500 text-xs">Chưa có ảnh tan ca</span>
                    )}
                  </div>
                  <p className="text-[11px] font-mono text-zinc-500 text-center">
                    {auditPhoto.checkOutTime || 'Chưa tan ca'}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex justify-end">
                <button
                  type="button"
                  onClick={() => setAuditPhoto(null)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-900 text-white rounded-xl text-xs font-bold"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Submodal 3: Confirm Toggle User Status */}
        {confirmToggleUser && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
            <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-2xl border border-zinc-200 space-y-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    confirmToggleUser.action === 'LOCK'
                      ? 'bg-rose-100 text-rose-600'
                      : 'bg-emerald-100 text-emerald-600'
                  }`}
                >
                  {confirmToggleUser.action === 'LOCK' ? <Lock size={20} /> : <Unlock size={20} />}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-zinc-900">Xác nhận thay đổi trạng thái</h3>
                  <p className="text-zinc-500 text-xs">
                    {confirmToggleUser.action === 'LOCK' ? 'Khóa đăng nhập tài khoản' : 'Mở khóa đăng nhập'}
                  </p>
                </div>
              </div>

              <p className="text-xs text-zinc-600 leading-relaxed">
                Bạn có chắc chắn muốn{' '}
                <span className="font-bold text-zinc-900">
                  {confirmToggleUser.action === 'LOCK' ? 'KHÓA' : 'MỞ KHÓA'}
                </span>{' '}
                tài khoản <span className="font-mono font-bold text-orange-600">[{confirmToggleUser.user.username}]</span> ({confirmToggleUser.user.fullName}) không?
              </p>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  disabled={togglingStatus}
                  onClick={() => setConfirmToggleUser(null)}
                  className="px-3.5 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={togglingStatus}
                  onClick={handleToggleUserStatus}
                  className={`px-4 py-2 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                    confirmToggleUser.action === 'LOCK'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {togglingStatus && <Loader2 size={13} className="animate-spin" />}
                  <span>{confirmToggleUser.action === 'LOCK' ? 'Khóa tài khoản' : 'Mở khóa'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
