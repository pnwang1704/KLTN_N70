import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  LogIn,
  LogOut,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
} from 'lucide-react';
import api from '../lib/axios';
import {
  loadFaceApiModels,
  calculateEuclideanDistance,
  faceapi,
  FACE_MATCH_THRESHOLD,
} from '../lib/faceApiUtil';

export interface EmployeeItem {
  id: string;
  branchId: string;
  employeeCode: string;
  fullName: string;
  role: string;
  pinCode?: string;
  avatarUrl?: string | null;
  faceDescriptor?: number[] | null;
  isActive: boolean;
}

interface AttendanceKioskModalProps {
  isOpen: boolean;
  onClose: () => void;
  branchId?: string;
}

const ROLE_LABELS: Record<string, string> = {
  CASHIER: 'Thu ngân',
  BARISTA: 'Pha chế',
  WAITER: 'Phục vụ',
  MANAGER: 'Quản lý',
};

export const AttendanceKioskModal: React.FC<AttendanceKioskModalProps> = ({
  isOpen,
  onClose,
  branchId = '1',
}) => {
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeItem | null>(null);
  const [selectedCode, setSelectedCode] = useState<string>('');
  const [pinCode, setPinCode] = useState<string>('');
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Camera & Face API state
  const [modelsReady, setModelsReady] = useState<boolean>(false);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [detecting, setDetecting] = useState<boolean>(false);
  const [currentDistance, setCurrentDistance] = useState<number | null>(null);
  const [isFaceMatched, setIsFaceMatched] = useState<boolean>(false);

  // Submission state
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [resultMsg, setResultMsg] = useState<{
    type: 'success' | 'error';
    title: string;
    details?: string;
  } | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectIntervalRef = useRef<any>(null);

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch active employees
  useEffect(() => {
    if (!isOpen) return;
    api.get('/employees', { params: { branchId, isActive: true } })
      .then(res => {
        const list: EmployeeItem[] = Array.isArray(res.data) ? res.data : [];
        setEmployees(list);
        if (list.length > 0 && !selectedCode) {
          setSelectedCode(list[0].employeeCode);
          setSelectedEmployee(list[0]);
        }
      })
      .catch(err => {
        console.error('Không thể tải danh sách nhân viên:', err);
      });
  }, [isOpen, branchId]);

  // Handle selected code change
  const handleSelectCode = (code: string) => {
    setSelectedCode(code);
    const emp = employees.find(e => e.employeeCode === code) || null;
    setSelectedEmployee(emp);
    setCurrentDistance(null);
    setIsFaceMatched(false);
  };

  // Start Camera & Load AI Models
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    let isMounted = true;

    // Load models
    loadFaceApiModels()
      .then(() => {
        if (isMounted) setModelsReady(true);
      })
      .catch(err => {
        console.error('Lỗi tải mô hình AI:', err);
        if (isMounted) setCameraError('Không thể tải mô hình nhận diện khuôn mặt');
      });

    // Start video stream
    navigator.mediaDevices
      ?.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
      })
      .then(stream => {
        if (!isMounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            setCameraActive(true);
          };
        }
      })
      .catch(err => {
        console.error('Không thể truy cập camera:', err);
        if (isMounted) setCameraError('Không thể kết nối với Camera thiết bị');
      });

    return () => {
      isMounted = false;
      stopCamera();
    };
  }, [isOpen]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (detectIntervalRef.current) {
      clearInterval(detectIntervalRef.current);
      detectIntervalRef.current = null;
    }
    setCameraActive(false);
    setCurrentDistance(null);
    setIsFaceMatched(false);
  };

  // Face Detection Loop
  useEffect(() => {
    if (!cameraActive || !modelsReady || !videoRef.current) return;

    const detectLoop = async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.paused || video.ended || video.readyState !== 4) return;

      try {
        const displaySize = {
          width: video.videoWidth || 640,
          height: video.videoHeight || 480,
        };
        faceapi.matchDimensions(canvas, displaySize);

        const options = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 });
        const detection = await faceapi
          .detectSingleFace(video, options)
          .withFaceLandmarks()
          .withFaceDescriptor();

        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (detection) {
          setDetecting(true);
          const resized = faceapi.resizeResults(detection, displaySize);
          const descriptor = Array.from(detection.descriptor);

          const { x, y, width, height } = resized.detection.box;

          // Compute mirrored box coordinate to match mirrored video feed (-scale-x-100)
          const boxX = Math.max(0, displaySize.width - x - width);
          const boxY = y;
          const boxWidth = width;
          const boxHeight = height;

          if (selectedEmployee && selectedEmployee.faceDescriptor) {
            const dist = calculateEuclideanDistance(descriptor, selectedEmployee.faceDescriptor);
            setCurrentDistance(dist);
            const matched = dist < FACE_MATCH_THRESHOLD;
            setIsFaceMatched(matched);

            // Draw bounding box on mirrored coordinate
            ctx.lineWidth = 3;
            ctx.strokeStyle = matched ? '#10b981' : '#ef4444'; // Green or Red
            ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

            // Draw Label Tag (Left-to-Right un-mirrored)
            const labelText = matched
              ? `Chính chủ (${((1 - dist) * 100).toFixed(0)}% khớp)`
              : `Khuôn mặt không khớp (${dist.toFixed(2)})`;

            ctx.font = 'bold 12px sans-serif';
            const textMetrics = ctx.measureText(labelText);
            const labelWidth = Math.max(textMetrics.width + 16, 120);
            const labelHeight = 24;
            const labelY = boxY > 28 ? boxY - 28 : boxY + 4;
            const labelX = Math.max(4, Math.min(boxX, displaySize.width - labelWidth - 4));

            ctx.fillStyle = matched ? 'rgba(16, 185, 129, 0.95)' : 'rgba(239, 68, 68, 0.95)';
            if (typeof ctx.roundRect === 'function') {
              ctx.beginPath();
              ctx.roundRect(labelX, labelY, labelWidth, labelHeight, 6);
              ctx.fill();
            } else {
              ctx.fillRect(labelX, labelY, labelWidth, labelHeight);
            }
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px sans-serif';
            ctx.textBaseline = 'middle';
            ctx.fillText(labelText, labelX + 8, labelY + labelHeight / 2);
          } else {
            // Employee has no face descriptor or not selected
            setCurrentDistance(null);
            setIsFaceMatched(false);

            const labelText = selectedEmployee
              ? 'Chưa đăng ký khuôn mặt'
              : 'Vui lòng chọn nhân viên';

            ctx.lineWidth = 2.5;
            ctx.strokeStyle = '#f59e0b'; // Amber
            ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

            ctx.font = 'bold 12px sans-serif';
            const textMetrics = ctx.measureText(labelText);
            const labelWidth = Math.max(textMetrics.width + 16, 120);
            const labelHeight = 24;
            const labelY = boxY > 28 ? boxY - 28 : boxY + 4;
            const labelX = Math.max(4, Math.min(boxX, displaySize.width - labelWidth - 4));

            ctx.fillStyle = 'rgba(245, 158, 11, 0.95)';
            if (typeof ctx.roundRect === 'function') {
              ctx.beginPath();
              ctx.roundRect(labelX, labelY, labelWidth, labelHeight, 6);
              ctx.fill();
            } else {
              ctx.fillRect(labelX, labelY, labelWidth, labelHeight);
            }
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px sans-serif';
            ctx.textBaseline = 'middle';
            ctx.fillText(labelText, labelX + 8, labelY + labelHeight / 2);
          }
        } else {
          setDetecting(false);
          setCurrentDistance(null);
          setIsFaceMatched(false);
        }
      } catch (err) {
        // Suppress frame grab error on render
      }
    };

    detectIntervalRef.current = setInterval(detectLoop, 200);

    return () => {
      if (detectIntervalRef.current) {
        clearInterval(detectIntervalRef.current);
        detectIntervalRef.current = null;
      }
    };
  }, [cameraActive, modelsReady, selectedEmployee]);

  // Capture video frame to Base64
  const captureSnapshot = (): string => {
    const video = videoRef.current;
    if (!video) return '';
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = video.videoWidth || 640;
    tempCanvas.height = video.videoHeight || 480;
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return '';
    ctx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
    return tempCanvas.toDataURL('image/jpeg', 0.82);
  };

  // Check In Handler
  const handleCheckIn = async () => {
    if (!selectedEmployee) return;
    setSubmitting(true);
    setResultMsg(null);

    try {
      const snapshotPhoto = captureSnapshot();
      const payload = {
        employeeCode: selectedEmployee.employeeCode,
        branchId,
        snapshotPhoto,
        faceVerified: selectedEmployee.faceDescriptor ? isFaceMatched : false,
        pinCode: pinCode || undefined,
      };

      const res = await api.post('/attendances/check-in', payload);
      const data = res.data;

      const isLate = data.status === 'LATE';
      setResultMsg({
        type: 'success',
        title: `Vào ca thành công: ${selectedEmployee.fullName}`,
        details: `Ca: ${data.shiftCode} • Giờ vào: ${new Date(data.checkInAt).toLocaleTimeString('vi-VN')} • Trạng thái: ${
          isLate ? '⚠️ ĐI TRỄ' : '✅ ĐÚNG GIỜ'
        }`,
      });

      // Auto close after 2.5s
      setTimeout(() => {
        onClose();
      }, 2500);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Lỗi khi chấm công vào ca';
      setResultMsg({
        type: 'error',
        title: 'Vào ca thất bại',
        details: msg,
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Check Out Handler
  const handleCheckOut = async () => {
    if (!selectedEmployee) return;
    setSubmitting(true);
    setResultMsg(null);

    try {
      const snapshotPhoto = captureSnapshot();
      const payload = {
        employeeCode: selectedEmployee.employeeCode,
        branchId,
        snapshotPhoto,
        faceVerified: selectedEmployee.faceDescriptor ? isFaceMatched : false,
        pinCode: pinCode || undefined,
      };

      const res = await api.post('/attendances/check-out', payload);
      const data = res.data;

      setResultMsg({
        type: 'success',
        title: `Tan ca thành công: ${selectedEmployee.fullName}`,
        details: `Giờ ra: ${new Date(data.checkOutAt).toLocaleTimeString('vi-VN')} • Tổng giờ làm: ${
          data.workingHours
        } giờ`,
      });

      // Auto close after 2.5s
      setTimeout(() => {
        onClose();
      }, 2500);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Lỗi khi chấm công tan ca';
      setResultMsg({
        type: 'error',
        title: 'Tan ca thất bại',
        details: msg,
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const hasFaceData = Boolean(selectedEmployee?.faceDescriptor);
  const canPerformAction =
    selectedEmployee &&
    !submitting &&
    (hasFaceData ? isFaceMatched : (pinCode.length >= 4 || !selectedEmployee.pinCode));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl border border-zinc-200 flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-sky-600 p-4 sm:p-5 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-inner">
              <Clock size={24} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight">Kiosk Chấm Công Sinh Trắc Học</h2>
                <span className="bg-white/20 text-white text-[11px] font-bold px-2 py-0.5 rounded-full border border-white/20">
                  AI Face Match 1:1
                </span>
              </div>
              <p className="text-blue-100 text-xs mt-0.5 flex items-center gap-2">
                <span>Chi nhánh {branchId}</span>
                <span>•</span>
                <span className="font-mono font-bold">
                  {currentTime.toLocaleDateString('vi-VN')} {currentTime.toLocaleTimeString('vi-VN')}
                </span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-2xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body Grid */}
        <div className="p-5 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column: Camera Feed (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-3">
            <div className="relative aspect-4/3 w-full bg-zinc-950 rounded-2xl overflow-hidden border-2 border-zinc-800 shadow-inner flex items-center justify-center">
              {/* Webcam Video */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />

              {/* Overlay Canvas for Bounding Box */}
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              />

              {/* Loading / Error States */}
              {!cameraActive && !cameraError && (
                <div className="absolute inset-0 bg-zinc-900 flex flex-col items-center justify-center gap-3 text-zinc-400">
                  <Loader2 size={32} className="animate-spin text-blue-500" />
                  <span className="text-xs font-semibold">Đang kích hoạt Camera & Tải AI...</span>
                </div>
              )}

              {cameraError && (
                <div className="absolute inset-0 bg-zinc-900/90 flex flex-col items-center justify-center p-6 text-center text-rose-400 gap-2">
                  <AlertCircle size={36} />
                  <p className="text-xs font-bold">{cameraError}</p>
                </div>
              )}

              {/* Live HUD Badges on Video */}
              {cameraActive && (
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                  <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] text-white font-medium border border-white/15">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Camera trực tiếp</span>
                  </div>

                  {detecting ? (
                    <div className="bg-emerald-500/90 text-white font-bold text-[11px] px-2.5 py-1 rounded-full shadow-md">
                      Đã phát hiện khuôn mặt
                    </div>
                  ) : (
                    <div className="bg-zinc-800/80 text-zinc-300 font-medium text-[11px] px-2.5 py-1 rounded-full">
                      Hướng mặt vào khung hình
                    </div>
                  )}
                </div>
              )}

              {/* Match Indicator Overlay */}
              {cameraActive && selectedEmployee && (
                <div className="absolute bottom-3 left-3 right-3 pointer-events-none">
                  {hasFaceData ? (
                    isFaceMatched ? (
                      <div className="bg-emerald-600/95 backdrop-blur-md text-white p-2.5 rounded-xl flex items-center justify-between shadow-lg border border-emerald-400">
                        <div className="flex items-center gap-2">
                          <ShieldCheck size={20} className="text-emerald-200 shrink-0" />
                          <div className="text-left">
                            <p className="text-xs font-bold">Xác thực chính chủ thành công</p>
                            <p className="text-[10px] text-emerald-100">
                              Độ lệch Euclid: {currentDistance?.toFixed(3)} (Ngưỡng an toàn &lt; 0.500)
                            </p>
                          </div>
                        </div>
                        <span className="bg-white/20 text-white font-mono font-bold text-xs px-2 py-0.5 rounded-md">
                          Mở khóa
                        </span>
                      </div>
                    ) : (
                      <div className="bg-rose-600/95 backdrop-blur-md text-white p-2.5 rounded-xl flex items-center justify-between shadow-lg border border-rose-400">
                        <div className="flex items-center gap-2">
                          <ShieldAlert size={20} className="text-rose-200 shrink-0" />
                          <div className="text-left">
                            <p className="text-xs font-bold">Khuôn mặt không khớp hồ sơ nhân viên</p>
                            <p className="text-[10px] text-rose-100">
                              {currentDistance !== null
                                ? `Độ lệch: ${currentDistance.toFixed(3)} (Yêu cầu < 0.500)`
                                : 'Vui lòng nhìn thẳng vào camera'}
                            </p>
                          </div>
                        </div>
                        <span className="bg-white/20 text-white font-bold text-[10px] px-2 py-0.5 rounded-md">
                          Khóa nút
                        </span>
                      </div>
                    )
                  ) : (
                    <div className="bg-amber-600/95 backdrop-blur-md text-white p-2.5 rounded-xl flex items-center gap-2 shadow-lg border border-amber-400">
                      <AlertCircle size={18} className="text-amber-200 shrink-0" />
                      <p className="text-xs font-medium">
                        Nhân viên chưa đăng ký sinh trắc học. Nhập mã PIN để đối chiếu.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* AI Algorithm Note */}
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-2.5 text-[11px] text-zinc-500 flex items-center justify-between">
              <span>Mô hình: SSD MobileNet + 128D Face Embedding</span>
              <span className="font-mono text-zinc-700 font-bold">Ngưỡng: 0.50</span>
            </div>
          </div>

          {/* Right Column: Employee Picker & Actions (5 cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between gap-4">
            <div className="space-y-4">
              {/* Employee Selection */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <User size={14} className="text-blue-600" />
                  <span>1. Chọn nhân sự chấm công</span>
                </label>
                <select
                  value={selectedCode}
                  onChange={e => handleSelectCode(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl font-bold text-sm text-zinc-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer"
                >
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.employeeCode}>
                      {emp.employeeCode} - {emp.fullName} ({ROLE_LABELS[emp.role] || emp.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Selected Employee Card */}
              {selectedEmployee && (
                <div className="bg-blue-50/60 border border-blue-200/80 rounded-2xl p-3.5 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center font-bold text-blue-700 text-sm overflow-hidden shrink-0 shadow-2xs">
                    {selectedEmployee.avatarUrl ? (
                      <img
                        src={selectedEmployee.avatarUrl}
                        alt={selectedEmployee.fullName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{selectedEmployee.fullName.slice(0, 2).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-zinc-900 text-sm truncate">
                        {selectedEmployee.fullName}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 border border-blue-200">
                        {selectedEmployee.employeeCode}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-semibold text-zinc-600">
                        {ROLE_LABELS[selectedEmployee.role] || selectedEmployee.role}
                      </span>
                      <span>•</span>
                      {hasFaceData ? (
                        <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 size={12} />
                          <span>Đã có AI Face</span>
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-amber-700 flex items-center gap-1">
                          <AlertCircle size={12} />
                          <span>Chưa có AI Face</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Fallback PIN input if employee has no face data */}
              {!hasFaceData && (
                <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-3 space-y-1.5 animate-in fade-in duration-200">
                  <label className="text-xs font-bold text-zinc-700 flex items-center gap-1.5">
                    <KeyRound size={13} className="text-zinc-500" />
                    <span>Mã PIN xác thực (Dự phòng)</span>
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    placeholder="Nhập mã PIN 4 số"
                    value={pinCode}
                    onChange={e => setPinCode(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl font-mono font-bold text-sm tracking-widest text-zinc-800 focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-[10px] text-zinc-400">
                    Nhân viên chưa đăng ký khuôn mặt vui lòng nhập mã PIN cá nhân
                  </p>
                </div>
              )}

              {/* Status Message / Notification */}
              {resultMsg && (
                <div
                  className={`p-3.5 rounded-2xl border flex items-start gap-2.5 animate-in slide-in-from-top-2 duration-200 ${
                    resultMsg.type === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}
                >
                  {resultMsg.type === 'success' ? (
                    <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="text-xs">
                    <p className="font-bold">{resultMsg.title}</p>
                    {resultMsg.details && <p className="mt-0.5 text-zinc-600">{resultMsg.details}</p>}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="pt-2 border-t border-zinc-200 space-y-2">
              <div className="grid grid-cols-2 gap-3">
                {/* Vào ca (Check-in) */}
                <button
                  type="button"
                  disabled={!canPerformAction}
                  onClick={handleCheckIn}
                  className="py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
                >
                  {submitting ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <LogIn size={16} />
                  )}
                  <span>Vào ca (Check-in)</span>
                </button>

                {/* Tan ca (Check-out) */}
                <button
                  type="button"
                  disabled={!canPerformAction}
                  onClick={handleCheckOut}
                  className="py-3 px-4 bg-slate-800 hover:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20 transition-all cursor-pointer"
                >
                  {submitting ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <LogOut size={16} />
                  )}
                  <span>Tan ca (Check-out)</span>
                </button>
              </div>

              <p className="text-center text-[10px] text-zinc-400">
                Camera tự động chụp ảnh khuôn mặt thời điểm Check-in/Check-out để lưu hồ sơ đối soát.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
