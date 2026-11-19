import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  AlertTriangle,
  Download,
  RefreshCw,
  Calendar,
  Building2,
  Award,
  Clock,
  CreditCard,
  BarChart3,
  Loader2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
} from 'recharts';
import * as XLSX from 'xlsx';
import api from '../lib/axios';
import { formatCurrency, cn } from '../lib/utils';
import type { BranchItem } from './BranchManagement';

interface ReportsDashboardProps {
  activeBranchId: string;
  branches: BranchItem[];
  user: any;
}

type DatePreset = 'TODAY' | 'LAST_7_DAYS' | 'THIS_MONTH' | 'CUSTOM';

const PIE_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

function formatDateInput(date: Date): string {
  const vn = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  return vn.toISOString().slice(0, 10);
}

function getPresetRange(preset: Exclude<DatePreset, 'CUSTOM'>): { start: string; end: string } {
  const now = new Date();
  const today = formatDateInput(now);
  if (preset === 'TODAY') {
    return { start: today, end: today };
  }
  if (preset === 'LAST_7_DAYS') {
    const start = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
    return { start: formatDateInput(start), end: today };
  }
  // THIS_MONTH
  const vnNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const firstDay = `${vnNow.getUTCFullYear()}-${String(vnNow.getUTCMonth() + 1).padStart(2, '0')}-01`;
  return { start: firstDay, end: today };
}

export const ReportsDashboard: React.FC<ReportsDashboardProps> = ({
  activeBranchId,
  branches,
  user,
}) => {
  const canViewAllBranches = user?.role === 'ADMIN' || !user?.branchId;
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    canViewAllBranches ? 'ALL' : String(activeBranchId || '1'),
  );
  const [datePreset, setDatePreset] = useState<DatePreset>('LAST_7_DAYS');
  const [startDate, setStartDate] = useState<string>(() => getPresetRange('LAST_7_DAYS').start);
  const [endDate, setEndDate] = useState<string>(() => getPresetRange('LAST_7_DAYS').end);

  const [loading, setLoading] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);

  const [overview, setOverview] = useState<any>({
    netRevenue: 0,
    totalOrders: 0,
    aov: 0,
    estimatedCogs: 0,
    grossProfit: 0,
    grossMarginPercent: 0,
    voidedCount: 0,
    voidedAmount: 0,
    cancelledCount: 0,
    paidVoidedCount: 0,
  });
  const [revenueChart, setRevenueChart] = useState<{
    granularity: 'hour' | 'day';
    data: Array<{ label: string; date: string; revenue: number; cogs: number; profit: number; orders: number }>;
  }>({ granularity: 'day', data: [] });
  const [paymentMethods, setPaymentMethods] = useState<
    Array<{ method: string; label: string; count: number; amount: number; percentage: number }>
  >([]);
  const [topProducts, setTopProducts] = useState<
    Array<{ productId: string; productName: string; quantity: number; revenue: number; estimatedCogs: number; profit: number }>
  >([]);
  const [peakHours, setPeakHours] = useState<
    Array<{ hour: number; label: string; orders: number; revenue: number }>
  >([]);
  const [branchComparison, setBranchComparison] = useState<
    Array<{
      branchId: string;
      branchCode: string;
      branchName: string;
      netRevenue: number;
      totalOrders: number;
      aov: number;
      estimatedCogs: number;
      grossProfit: number;
      voidedCount: number;
      voidedAmount: number;
      cancelRate: number;
    }>
  >([]);

  const handleSelectPreset = (preset: DatePreset) => {
    setDatePreset(preset);
    if (preset !== 'CUSTOM') {
      const range = getPresetRange(preset);
      setStartDate(range.start);
      setEndDate(range.end);
    }
  };

  const fetchAllReports = useCallback(async () => {
    setLoading(true);
    const params = {
      branchId: selectedBranchId,
      startDate,
      endDate,
    };
    try {
      const [ovRes, chartRes, pmRes, topRes, peakRes, cmpRes] = await Promise.allSettled([
        api.get('/reports/overview', { params }),
        api.get('/reports/revenue-chart', { params }),
        api.get('/reports/payment-methods', { params }),
        api.get('/reports/top-products', { params }),
        api.get('/reports/peak-hours', { params }),
        selectedBranchId === 'ALL'
          ? api.get('/reports/branches-comparison', { params })
          : Promise.resolve({ data: [] }),
      ]);

      if (ovRes.status === 'fulfilled' && ovRes.value.data) {
        setOverview(ovRes.value.data);
      }
      if (chartRes.status === 'fulfilled' && chartRes.value.data) {
        setRevenueChart(chartRes.value.data);
      }
      if (pmRes.status === 'fulfilled' && Array.isArray(pmRes.value.data)) {
        setPaymentMethods(pmRes.value.data);
      }
      if (topRes.status === 'fulfilled' && Array.isArray(topRes.value.data)) {
        setTopProducts(topRes.value.data);
      }
      if (peakRes.status === 'fulfilled' && Array.isArray(peakRes.value.data)) {
        setPeakHours(peakRes.value.data);
      }
      if (cmpRes.status === 'fulfilled' && Array.isArray(cmpRes.value.data)) {
        setBranchComparison(cmpRes.value.data);
      }
    } catch (err) {
      console.error('Lỗi tải dữ liệu báo cáo:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedBranchId, startDate, endDate]);

  useEffect(() => {
    fetchAllReports();
  }, [fetchAllReports]);

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const res = await api.get('/reports/export-orders', {
        params: { branchId: selectedBranchId, startDate, endDate },
      });
      const detailOrders: any[] = Array.isArray(res.data) ? res.data : [];

      const wb = XLSX.utils.book_new();

      // Sheet 1: Tổng quan KPI
      const selectedBranchObj = branches.find((b) => String(b.id) === String(selectedBranchId));
      const branchTitle =
        selectedBranchId === 'ALL'
          ? 'Tất cả chi nhánh (Toàn chuỗi)'
          : selectedBranchObj?.name || `Chi nhánh ${selectedBranchId}`;

      const overviewSheetData = [
        ['BÁO CÁO DOANH THU & LỢI NHUẬN - N70 POS'],
        ['Chi nhánh', branchTitle],
        ['Kỳ báo cáo', `${startDate} đến ${endDate}`],
        ['Ngày xuất', new Date().toLocaleString('vi-VN')],
        [],
        ['Chỉ tiêu', 'Giá trị'],
        ['Doanh thu thực thu (VNĐ)', overview.netRevenue],
        ['Giá vốn nguyên liệu ước tính (VNĐ)', overview.estimatedCogs],
        ['Lợi nhuận gộp (VNĐ)', overview.grossProfit],
        ['Biên lợi nhuận gộp (%)', `${overview.grossMarginPercent || 0}%`],
        ['Tổng số đơn đã thanh toán', overview.totalOrders],
        ['Giá trị trung bình/đơn - AOV (VNĐ)', overview.aov],
        ['Số đơn Hủy / Void Bill', overview.voidedCount],
        ['Tổng giá trị đơn Hủy / Void (VNĐ)', overview.voidedAmount],
      ];
      const wsOverview = XLSX.utils.aoa_to_sheet(overviewSheetData);
      XLSX.utils.book_append_sheet(wb, wsOverview, 'Tong_Quan');

      // Sheet 2: Top món bán chạy
      const topSheetData = topProducts.map((p, idx) => ({
        'Hạng': idx + 1,
        'Mã món': p.productId,
        'Tên món': p.productName,
        'Số lượng bán': p.quantity,
        'Doanh thu (VNĐ)': p.revenue,
        'Giá vốn (VNĐ)': p.estimatedCogs,
        'Lợi nhuận gộp (VNĐ)': p.profit,
      }));
      const wsTop = XLSX.utils.json_to_sheet(
        topSheetData.length > 0 ? topSheetData : [{ 'Thông báo': 'Chưa có dữ liệu món bán trong kỳ' }],
      );
      XLSX.utils.book_append_sheet(wb, wsTop, 'Top_Mon_Ban_Chay');

      // Sheet 3: So sánh chi nhánh (nếu xem tất cả)
      if (selectedBranchId === 'ALL' && branchComparison.length > 0) {
        const cmpSheetData = branchComparison.map((b) => ({
          'Mã CN': b.branchCode,
          'Tên chi nhánh': b.branchName,
          'Doanh thu thực thu (VNĐ)': b.netRevenue,
          'Số đơn PAID': b.totalOrders,
          'AOV (VNĐ)': b.aov,
          'Giá vốn (VNĐ)': b.estimatedCogs,
          'Lợi nhuận gộp (VNĐ)': b.grossProfit,
          'Số đơn Hủy/Void': b.voidedCount,
          'Tỷ lệ hủy (%)': b.cancelRate,
        }));
        const wsCmp = XLSX.utils.json_to_sheet(cmpSheetData);
        XLSX.utils.book_append_sheet(wb, wsCmp, 'So_Sanh_Chi_Nhanh');
      }

      // Sheet 4: Chi tiết đơn hàng
      const ordersSheetData = detailOrders.map((o) => ({
        'Mã đơn': o.orderId,
        'Chi nhánh': o.branchName,
        'Hình thức': o.orderType,
        'Trạng thái': o.status,
        'Phương thức TT': o.paymentMethod,
        'Chi tiết món': o.itemsSummary,
        'Doanh thu (VNĐ)': o.revenue,
        'Giá vốn (VNĐ)': o.estimatedCogs,
        'Lợi nhuận gộp (VNĐ)': o.grossProfit,
        'Lý do hủy/void': o.cancelReason,
        'Thời gian tạo': o.createdAt ? new Date(o.createdAt).toLocaleString('vi-VN') : '',
      }));
      const wsOrders = XLSX.utils.json_to_sheet(
        ordersSheetData.length > 0 ? ordersSheetData : [{ 'Thông báo': 'Không có đơn hàng trong kỳ lọc' }],
      );
      XLSX.utils.book_append_sheet(wb, wsOrders, 'Chi_Tiet_Don_Hang');

      const fileName = `Bao_Cao_N70_${selectedBranchId}_${startDate}_${endDate}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (err) {
      console.error('Lỗi xuất báo cáo Excel:', err);
      alert('Không thể xuất file Excel lúc này. Vui lòng thử lại!');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-zinc-50">
      {/* Filter Header Bar */}
      <div className="bg-white border-b border-zinc-200 px-6 py-4 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
            <BarChart3 size={22} />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-zinc-900">Báo cáo & Thống kê Kinh doanh</h1>
            <p className="text-xs text-zinc-500">
              Theo dõi doanh thu, giá vốn, lợi nhuận gộp, khung giờ cao điểm & hiệu suất chuỗi chi nhánh
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Branch selector */}
          <div className="flex items-center gap-1.5 px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-800">
            <Building2 size={14} className="text-indigo-600 shrink-0" />
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              disabled={!canViewAllBranches}
              className="bg-transparent focus:outline-none cursor-pointer disabled:opacity-60"
            >
              {canViewAllBranches && <option value="ALL">Tất cả chi nhánh (Toàn chuỗi)</option>}
              {branches.map((b) => (
                <option key={b.id} value={String(b.id)}>
                  {b.code ? `${b.code} - ` : ''}{b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Quick date presets */}
          <div className="flex items-center bg-zinc-100 p-1 rounded-xl border border-zinc-200 text-xs font-bold">
            {[
              { id: 'TODAY' as DatePreset, label: 'Hôm nay' },
              { id: 'LAST_7_DAYS' as DatePreset, label: '7 ngày qua' },
              { id: 'THIS_MONTH' as DatePreset, label: 'Tháng này' },
              { id: 'CUSTOM' as DatePreset, label: 'Tùy chọn' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelectPreset(p.id)}
                className={cn(
                  'px-3 py-1.5 rounded-lg transition-all cursor-pointer',
                  datePreset === p.id
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900',
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom Date Inputs */}
          {datePreset === 'CUSTOM' && (
            <div className="flex items-center gap-1.5 bg-white border border-zinc-200 px-2.5 py-1.5 rounded-xl text-xs">
              <Calendar size={14} className="text-zinc-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="font-semibold text-zinc-800 focus:outline-none"
              />
              <span className="text-zinc-400">→</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="font-semibold text-zinc-800 focus:outline-none"
              />
            </div>
          )}

          {/* Refresh */}
          <button
            type="button"
            onClick={fetchAllReports}
            disabled={loading}
            className="p-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-700 cursor-pointer"
            title="Làm mới dữ liệu"
          >
            <RefreshCw size={16} className={cn(loading && 'animate-spin text-blue-600')} />
          </button>

          {/* Export Excel */}
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={exporting || loading}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50 active:scale-95"
          >
            {exporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
            <span>Xuất báo cáo Excel</span>
          </button>
        </div>
      </div>

      {/* Main Scrollable Dashboard Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* ROW 1: 4 KPI CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* KPI 1: Net Revenue */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                Doanh thu thực thu
              </span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <DollarSign size={18} />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-zinc-900">
                {formatCurrency(overview.netRevenue || 0)}
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                Kỳ lọc: <span className="font-semibold text-zinc-700">{startDate}</span> →{' '}
                <span className="font-semibold text-zinc-700">{endDate}</span>
              </p>
            </div>
          </div>

          {/* KPI 2: Gross Profit & COGS */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                Lợi nhuận gộp
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <TrendingUp size={18} />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-emerald-600">
                  {formatCurrency(overview.grossProfit || 0)}
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {overview.grossMarginPercent || 0}%
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                Giá vốn ước tính (BOM):{' '}
                <span className="font-bold text-zinc-700">
                  {formatCurrency(overview.estimatedCogs || 0)}
                </span>
              </p>
            </div>
          </div>

          {/* KPI 3: Total Orders & AOV */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                Tổng đơn & AOV
              </span>
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <ShoppingBag size={18} />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-zinc-900">
                {overview.totalOrders || 0}{' '}
                <span className="text-sm font-bold text-zinc-500">đơn</span>
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                Trung bình/đơn (AOV):{' '}
                <span className="font-bold text-indigo-700">
                  {formatCurrency(overview.aov || 0)}
                </span>
              </p>
            </div>
          </div>

          {/* KPI 4: Voided / Cancelled */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                Đơn hủy / Void Bill
              </span>
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertTriangle size={18} />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-rose-600">
                {overview.voidedCount || 0}{' '}
                <span className="text-sm font-bold text-rose-400">đơn</span>
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                Thất thoát: <span className="font-bold text-rose-700">{formatCurrency(overview.voidedAmount || 0)}</span>{' '}
                ({overview.cancelledCount || 0} hủy • {overview.paidVoidedCount || 0} void)
              </p>
            </div>
          </div>
        </div>

        {/* ROW 2: REVENUE & PROFIT TREND + PAYMENT METHODS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue & Profit Chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-zinc-200 p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold text-sm text-zinc-900">
                  Xu hướng Doanh thu & Lợi nhuận ({revenueChart.granularity === 'hour' ? 'Theo giờ' : 'Theo ngày'})
                </h2>
                <p className="text-xs text-zinc-500">
                  So sánh doanh thu thực thu và lợi nhuận gộp sau khi trừ giá vốn nguyên liệu
                </p>
              </div>
            </div>
            <div className="h-[300px] w-full">
              {revenueChart.data.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-zinc-400">
                  Chưa có dữ liệu doanh thu trong kỳ lọc
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={revenueChart.data} margin={{ top: 10, right: 16, left: 4, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#71717a' }} />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#71717a' }}
                      tickFormatter={(v) => (v >= 1000000 ? `${(v / 1000000).toFixed(1)}tr` : `${Math.round(v / 1000)}k`)}
                    />
                    <Tooltip
                      formatter={(val: any, name: any) => [formatCurrency(Number(val || 0)), String(name)]}
                      contentStyle={{ borderRadius: 12, borderColor: '#e4e4e7', fontSize: 12 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="revenue" name="Doanh thu" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={36} />
                    <Line
                      type="monotone"
                      dataKey="profit"
                      name="Lợi nhuận gộp"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      dot={{ r: 3.5 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Payment Methods Pie Chart */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-2xs flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <CreditCard size={16} className="text-blue-600" />
              <h2 className="font-bold text-sm text-zinc-900">Cơ cấu Phương thức Thanh toán</h2>
            </div>

            {paymentMethods.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-xs text-zinc-400">
                Chưa có giao dịch thanh toán trong kỳ
              </div>
            ) : (
              <>
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentMethods}
                        dataKey="amount"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        innerRadius={52}
                        outerRadius={80}
                        paddingAngle={3}
                      >
                        {paymentMethods.map((entry, idx) => (
                          <Cell key={entry.method} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val: any) => formatCurrency(Number(val || 0))} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-3 space-y-2">
                  {paymentMethods.map((pm, idx) => (
                    <div
                      key={pm.method}
                      className="flex items-center justify-between text-xs p-2 rounded-xl bg-zinc-50 border border-zinc-100"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                        />
                        <span className="font-bold text-zinc-800">{pm.label}</span>
                        <span className="text-zinc-400">({pm.count} đơn)</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-zinc-900">{formatCurrency(pm.amount)}</div>
                        <div className="text-[10px] font-semibold text-zinc-500">{pm.percentage}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ROW 3: TOP 10 PRODUCTS & PEAK HOURS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top 10 Products Table */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-2xs">
            <div className="flex items-center gap-2 mb-4">
              <Award size={17} className="text-amber-500" />
              <h2 className="font-bold text-sm text-zinc-900">Top 10 Món Bán Chạy Nhất</h2>
            </div>

            {topProducts.length === 0 ? (
              <div className="h-56 flex items-center justify-center text-xs text-zinc-400">
                Chưa có món ăn nào được bán trong kỳ lọc
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-200 text-zinc-500 font-bold uppercase text-[10px]">
                      <th className="py-2 pr-2">#</th>
                      <th className="py-2 px-2">Tên món</th>
                      <th className="py-2 px-2 text-center">SL bán</th>
                      <th className="py-2 px-2 text-right">Doanh thu</th>
                      <th className="py-2 pl-2 text-right">Lợi nhuận</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {topProducts.map((p, idx) => (
                      <tr key={p.productId} className="hover:bg-zinc-50">
                        <td className="py-2.5 pr-2">
                          <span
                            className={cn(
                              'w-5 h-5 rounded-full inline-flex items-center justify-center font-black text-[10px]',
                              idx === 0
                                ? 'bg-amber-100 text-amber-700'
                                : idx === 1
                                ? 'bg-zinc-200 text-zinc-700'
                                : idx === 2
                                ? 'bg-orange-100 text-orange-700'
                                : 'text-zinc-400',
                            )}
                          >
                            {idx + 1}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 font-bold text-zinc-900">{p.productName}</td>
                        <td className="py-2.5 px-2 text-center">
                          <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold">
                            {p.quantity}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-right font-bold text-zinc-800">
                          {formatCurrency(p.revenue)}
                        </td>
                        <td className="py-2.5 pl-2 text-right font-bold text-emerald-600">
                          {formatCurrency(p.profit)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Peak Hours Chart */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-2xs">
            <div className="flex items-center gap-2 mb-4">
              <Clock size={17} className="text-indigo-600" />
              <h2 className="font-bold text-sm text-zinc-900">Phân bố Khung Giờ Cao Điểm (06:00 - 24:00)</h2>
            </div>

            <div className="h-[290px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={peakHours} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#71717a' }} interval={1} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#71717a' }} />
                  <Tooltip
                    formatter={(val: any, name: any) =>
                      name === 'Số đơn' ? [`${val} đơn`, 'Số đơn'] : [formatCurrency(Number(val || 0)), 'Doanh thu']
                    }
                    contentStyle={{ borderRadius: 12, borderColor: '#e4e4e7', fontSize: 12 }}
                  />
                  <Bar dataKey="orders" name="Số đơn" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={26} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ROW 4: BRANCHES COMPARISON (ONLY WHEN VIEWING ALL BRANCHES) */}
        {selectedBranchId === 'ALL' && (
          <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Building2 size={18} className="text-blue-600" />
                <div>
                  <h2 className="font-bold text-sm text-zinc-900">So sánh Hiệu suất Các Chi nhánh</h2>
                  <p className="text-xs text-zinc-500">
                    Đánh giá doanh thu, lợi nhuận gộp, giá trị đơn trung bình (AOV) và tỷ lệ hủy đơn giữa các chi nhánh
                  </p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-zinc-50 border-y border-zinc-200 text-zinc-500 font-bold uppercase text-[10px]">
                    <th className="py-3 px-3">Mã CN</th>
                    <th className="py-3 px-3">Tên chi nhánh</th>
                    <th className="py-3 px-3 text-right">Doanh thu thực thu</th>
                    <th className="py-3 px-3 text-right">Lợi nhuận gộp</th>
                    <th className="py-3 px-3 text-center">Số đơn PAID</th>
                    <th className="py-3 px-3 text-right">AOV</th>
                    <th className="py-3 px-3 text-center">Đơn Hủy / Void</th>
                    <th className="py-3 px-3 text-center">Tỷ lệ hủy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {branchComparison.map((b) => (
                    <tr key={b.branchId} className="hover:bg-blue-50/30 transition-colors">
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white font-black text-[10px]">
                          {b.branchCode}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-bold text-zinc-900">{b.branchName}</td>
                      <td className="py-3 px-3 text-right font-black text-blue-700">
                        {formatCurrency(b.netRevenue)}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-emerald-600">
                        {formatCurrency(b.grossProfit)}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-zinc-800">{b.totalOrders}</td>
                      <td className="py-3 px-3 text-right font-semibold text-zinc-700">
                        {formatCurrency(b.aov)}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-rose-600">{b.voidedCount}</td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-full text-[11px] font-bold',
                            b.cancelRate > 15
                              ? 'bg-rose-100 text-rose-700'
                              : b.cancelRate > 5
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-emerald-100 text-emerald-700',
                          )}
                        >
                          {b.cancelRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
