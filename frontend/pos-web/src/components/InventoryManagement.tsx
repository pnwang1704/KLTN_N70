import React, { useState, useEffect, useCallback } from 'react';
import {
  Warehouse,
  AlertTriangle,
  PlusCircle,
  X,
  Plus,
  Trash2,
  RotateCw,
  ArrowDownRight,
  ArrowUpRight,
  History,
  Scale,
  Calculator,
  CheckCircle2,
  Save,
  Search,
} from 'lucide-react';
import { io } from 'socket.io-client';
import api from '../lib/axios';
import { cn, formatCurrency, formatDateTimeFull } from '../lib/utils';
import { mockProducts } from '../data/mockData';
import { SuccessModal, ErrorModal, WarningModal, ConfirmModal } from './ui/Modals';

interface RecipeItemRow {
  ingredientId: string;
  quantity: number;
}

export const InventoryManagement: React.FC<{ branchId: string }> = ({ branchId }) => {
  const [activeSubTab, setActiveSubTab] = useState<'STOCKS' | 'RECIPES' | 'TRANSACTIONS'>('STOCKS');
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [stocks, setStocks] = useState<any[]>([]);
  const [lowStocks, setLowStocks] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>(mockProducts);
  const [isLoading, setIsLoading] = useState(false);

  // Tab 2 (Thiết lập Công thức / BOM) State
  const [selectedProductId, setSelectedProductId] = useState<string>('P1');
  const [productSearch, setProductSearch] = useState<string>('');
  const [bomRows, setBomRows] = useState<RecipeItemRow[]>([]);
  const [isSavingBom, setIsSavingBom] = useState<boolean>(false);

  const [showStockInModal, setShowStockInModal] = useState(false);
  const [showAddIngredientModal, setShowAddIngredientModal] = useState(false);

  // Notification Modals
  const [successModal, setSuccessModal] = useState<{ title?: string; message: string; subMessage?: string } | null>(null);
  const [errorModal, setErrorModal] = useState<{ title?: string; error: string } | null>(null);
  const [warningModal, setWarningModal] = useState<{ title?: string; message: string } | null>(null);
  const [ingredientToDelete, setIngredientToDelete] = useState<{ id: string; name: string } | null>(null);

  const [stockInForm, setStockInForm] = useState({
    ingredientId: '',
    quantity: '',
    note: '',
  });

  const [addIngredientForm, setAddIngredientForm] = useState({
    name: '',
    unit: 'g',
    currentStock: '5000',
    minStockThreshold: '500',
    costPerUnit: '100',
  });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [ingRes, stockRes, lowStockRes, txRes, recRes, prodRes] =
        await Promise.allSettled([
          api.get(`/inventory/ingredients?branchId=${branchId}`),
          api.get(`/inventory/stocks/${branchId}`),
          api.get(`/inventory/stocks/${branchId}/low`),
          api.get(`/inventory/logs?branchId=${branchId}&limit=100`),
          api.get('/inventory/recipes'),
          api.get('/products'),
        ]);

      if (ingRes.status === 'fulfilled') {
        setIngredients(Array.isArray(ingRes.value.data) ? ingRes.value.data : []);
      }
      if (stockRes.status === 'fulfilled') {
        setStocks(Array.isArray(stockRes.value.data) ? stockRes.value.data : []);
      }
      if (lowStockRes.status === 'fulfilled') {
        setLowStocks(Array.isArray(lowStockRes.value.data) ? lowStockRes.value.data : []);
      }
      if (txRes.status === 'fulfilled') {
        setTransactions(Array.isArray(txRes.value.data) ? txRes.value.data : []);
      }
      if (recRes.status === 'fulfilled') {
        setRecipes(Array.isArray(recRes.value.data) ? recRes.value.data : []);
      }
      if (prodRes.status === 'fulfilled' && Array.isArray(prodRes.value.data) && prodRes.value.data.length > 0) {
        setProducts(prodRes.value.data);
      }
    } catch (err) {
      console.error('Error fetching inventory data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    fetchData();

    const socket = io(
      import.meta.env.VITE_SOCKET_URL ||
      import.meta.env.VITE_API_GATEWAY_URL ||
      'http://localhost:3000',
      { transports: ['websocket', 'polling'] },
    );
    socket.emit('joinBranchRoom', String(branchId));

    const refreshAfterEvent = () => {
      setTimeout(() => {
        fetchData();
      }, 350);
    };

    socket.on('NEW_ORDER_CREATED', refreshAfterEvent);
    socket.on('QR_ORDER_UPDATED', refreshAfterEvent);
    socket.on('orderUpdated', refreshAfterEvent);
    socket.on('orderCancelled', refreshAfterEvent);
    socket.on('order:paid', refreshAfterEvent);
    socket.on('table:completed', refreshAfterEvent);

    return () => {
      socket.disconnect();
    };
  }, [branchId, fetchData]);

  // Khi người dùng chọn món ở cột trái Tab 2 -> nạp công thức hiện tại của món đó (size chuẩn M)
  useEffect(() => {
    const matchedRecipe =
      recipes.find(
        (r) => String(r.productId) === String(selectedProductId) && r.size === 'M',
      ) ||
      recipes.find((r) => String(r.productId) === String(selectedProductId));

    if (matchedRecipe && Array.isArray(matchedRecipe.items)) {
      setBomRows(
        matchedRecipe.items.map((it: any) => ({
          ingredientId: it.ingredientId,
          quantity: Number(it.quantityNeeded ?? it.quantity ?? 0),
        })),
      );
    } else {
      setBomRows([]);
    }
  }, [selectedProductId, recipes]);

  const handleOpenQuickStockIn = (ingredientId?: string) => {
    setStockInForm({
      ingredientId: ingredientId || ingredients[0]?.id || '',
      quantity: '1000',
      note: 'Nhập bổ sung nguyên vật liệu',
    });
    setShowStockInModal(true);
  };

  const handleStockIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockInForm.ingredientId || !stockInForm.quantity) {
      setWarningModal({
        title: 'Thông tin chưa đầy đủ',
        message: 'Vui lòng chọn nguyên liệu và nhập số lượng cần nhập kho!',
      });
      return;
    }

    try {
      await api.patch(`/inventory/ingredients/${stockInForm.ingredientId}/stock`, {
        branchId,
        changeAmount: parseFloat(stockInForm.quantity),
        type: 'MANUAL_IMPORT',
        note: stockInForm.note.trim() || 'Nhập kho bổ sung nguyên vật liệu',
      });
      setShowStockInModal(false);
      setStockInForm({ ingredientId: '', quantity: '', note: '' });
      fetchData();
      setSuccessModal({
        title: 'Nhập kho thành công',
        message: 'Đã cập nhật số lượng tồn kho và ghi nhận vào Lịch sử xuất - nhập kho!',
        subMessage: 'Dữ liệu số lượng tồn kho chi nhánh đã được đồng bộ tự động.',
      });
    } catch (err) {
      console.error(err);
      setErrorModal({
        title: 'Lỗi nhập kho',
        error: 'Có lỗi xảy ra khi nhập kho. Vui lòng thử lại sau!',
      });
    }
  };

  const handleAddIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = addIngredientForm.name.trim();
    if (!trimmedName) {
      setWarningModal({
        title: 'Thông tin chưa đầy đủ',
        message: 'Vui lòng nhập tên nguyên liệu mới!',
      });
      return;
    }

    try {
      await api.post('/inventory/ingredients', {
        name: trimmedName,
        unit: addIngredientForm.unit.trim(),
        currentStock: parseFloat(addIngredientForm.currentStock) || 0,
        minStock: parseFloat(addIngredientForm.minStockThreshold) || 0,
        minStockThreshold: parseFloat(addIngredientForm.minStockThreshold) || 0,
        costPerUnit: parseFloat(addIngredientForm.costPerUnit) || 0,
      });
      setShowAddIngredientModal(false);
      setAddIngredientForm({
        name: '',
        unit: 'g',
        currentStock: '5000',
        minStockThreshold: '500',
        costPerUnit: '100',
      });
      fetchData();
      setSuccessModal({
        title: 'Thêm nguyên liệu thành công',
        message: `Nguyên liệu "${trimmedName}" đã được lưu vào hệ thống!`,
        subMessage: 'Bạn có thể gắn nguyên liệu này vào công thức món ăn ngay bây giờ.',
      });
    } catch (err) {
      console.error(err);
      setErrorModal({
        title: 'Lỗi thêm nguyên liệu',
        error: 'Có lỗi xảy ra khi thêm nguyên liệu mới. Vui lòng thử lại!',
      });
    }
  };

  const handleDeleteIngredient = async () => {
    if (!ingredientToDelete) return;
    try {
      await api.delete(`/inventory/ingredients/${ingredientToDelete.id}`);
      setSuccessModal({
        title: 'Đã xóa nguyên liệu',
        message: `Đã xóa nguyên liệu "${ingredientToDelete.name}" thành công!`,
        subMessage: 'Dữ liệu kho và danh sách nguyên liệu đã được cập nhật.',
      });
      setIngredientToDelete(null);
      fetchData();
    } catch (err: any) {
      console.error(err);
      const serverMessage =
        err?.response?.data?.message ||
        err?.message ||
        'Có lỗi xảy ra khi xóa nguyên liệu!';
      setErrorModal({
        title: 'Không thể xóa nguyên liệu',
        error: serverMessage,
      });
      setIngredientToDelete(null);
    }
  };

  // --- Xử lý Thiết lập Công thức (BOM) ở Tab 2 ---
  const handleAddBomRow = () => {
    if (ingredients.length === 0) return;
    const unused =
      ingredients.find(
        (ing) => !bomRows.some((r) => r.ingredientId === ing.id),
      ) || ingredients[0];

    setBomRows((prev) => [
      ...prev,
      {
        ingredientId: unused.id,
        quantity: 20,
      },
    ]);
  };

  const handleChangeBomIngredient = (idx: number, ingredientId: string) => {
    setBomRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, ingredientId } : r)),
    );
  };

  const handleChangeBomQuantity = (idx: number, val: string) => {
    const num = Math.max(0, parseFloat(val) || 0);
    setBomRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, quantity: num } : r)),
    );
  };

  const handleRemoveBomRow = (idx: number) => {
    setBomRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSaveBomRecipe = async () => {
    if (!selectedProductId) return;
    setIsSavingBom(true);
    try {
      await api.put(`/inventory/recipes/${selectedProductId}`, {
        items: bomRows.filter((r) => r.ingredientId && r.quantity > 0),
      });
      await fetchData();
      const prodObj = products.find((p) => String(p.id) === String(selectedProductId));
      setSuccessModal({
        title: 'Lưu công thức thành công',
        message: `Đã cập nhật công thức định lượng cho món "${prodObj?.name || selectedProductId}"!`,
        subMessage: 'Hệ thống sẽ tự động trừ kho theo định lượng mới khi có đơn hàng.',
      });
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || 'Không thể lưu công thức món ăn.';
      setErrorModal({
        title: 'Lỗi lưu công thức',
        error: Array.isArray(msg) ? msg.join(', ') : String(msg),
      });
    } finally {
      setIsSavingBom(false);
    }
  };

  const inventoryData = ingredients.map((ingredient) => {
    const stock = stocks.find((s) => s.ingredientId === ingredient.id);
    const currentQty =
      stock !== undefined
        ? Number(stock.currentQuantity ?? 0)
        : Number(ingredient.currentStock ?? 0);
    const minVal = Number(ingredient.minStock || ingredient.minStockThreshold || 0);
    return {
      id: ingredient.id,
      name: ingredient.name,
      unit: ingredient.unit,
      quantity: currentQty,
      minThreshold: minVal,
      costPerUnit: Number(ingredient.costPerUnit || 0),
    };
  });

  const getIngById = (id: string) => ingredients.find((i) => i.id === id);

  const selectedProductObj = products.find(
    (p) => String(p.id) === String(selectedProductId),
  );

  const estimatedCogs = bomRows.reduce((sum, r) => {
    const ing = getIngById(r.ingredientId);
    const cost = Number(ing?.costPerUnit || 0);
    return sum + Math.round(Number(r.quantity || 0) * cost);
  }, 0);

  const sellPrice = Number(selectedProductObj?.basePrice || 0);
  const estimatedProfit = Math.max(0, sellPrice - estimatedCogs);
  const profitMarginPct =
    sellPrice > 0 ? Math.round((estimatedProfit / sellPrice) * 100) : 0;

  const hasRecipeForProduct = (pid: string) => {
    return recipes.some(
      (r) =>
        String(r.productId) === String(pid) &&
        Array.isArray(r.items) &&
        r.items.length > 0,
    );
  };

  const filteredProductsForBom = products.filter((p) => {
    if (!productSearch.trim()) return true;
    const q = productSearch.trim().toLowerCase();
    return (
      String(p.name || '').toLowerCase().includes(q) ||
      String(p.id || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex-1 p-6 overflow-y-auto bg-zinc-50">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 flex items-center gap-2.5">
            <Warehouse className="text-emerald-600" size={26} />
            Quản lý Kho & Thiết lập Công thức Định lượng (BOM)
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Quản lý tồn kho nguyên vật liệu, thiết lập định lượng tiêu hao (Recipe / BOM), tính giá vốn (COGS) và theo dõi lịch sử trừ/hoàn kho tự động
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="px-4 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-bold text-zinc-700 hover:bg-zinc-100 flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <RotateCw size={14} className={cn(isLoading && 'animate-spin text-blue-600')} />
            <span>{isLoading ? 'Đang tải...' : 'Làm mới'}</span>
          </button>
          <button
            onClick={() => setShowAddIngredientModal(true)}
            className="px-4 py-2 bg-white border border-blue-200 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-50 flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus size={15} /> + Thêm nguyên liệu mới
          </button>
          <button
            onClick={() => handleOpenQuickStockIn()}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <PlusCircle size={15} /> + Nhập thêm kho
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs flex items-center gap-4">
          <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <Warehouse size={24} />
          </div>
          <div>
            <p className="text-zinc-500 text-xs font-bold uppercase">Tổng mặt hàng nguyên liệu</p>
            <p className="text-2xl font-black text-zinc-900">{ingredients.length}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-red-200 shadow-xs flex items-center gap-4">
          <div className="p-3.5 bg-red-50 text-red-600 rounded-xl">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-red-600 text-xs font-bold uppercase">Cảnh báo sắp hết / Hết hàng</p>
            <p className="text-2xl font-black text-red-600">{lowStocks.length}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-blue-200 shadow-xs flex items-center gap-4">
          <div className="p-3.5 bg-blue-50 text-blue-600 rounded-xl">
            <History size={24} />
          </div>
          <div>
            <p className="text-blue-600 text-xs font-bold uppercase">Lịch sử xuất - nhập kho</p>
            <p className="text-2xl font-black text-blue-600">{transactions.length} lượt</p>
          </div>
        </div>
      </div>

      {/* 3 Sub-Tabs Switcher */}
      <div className="bg-white p-2 rounded-2xl border border-zinc-200 shadow-xs mb-5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveSubTab('STOCKS')}
          className={cn(
            'px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer',
            activeSubTab === 'STOCKS'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200',
          )}
        >
          <Warehouse size={16} />
          <span>1. Tồn kho Nguyên liệu ({inventoryData.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('RECIPES')}
          className={cn(
            'px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer',
            activeSubTab === 'RECIPES'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200',
          )}
        >
          <Scale size={16} />
          <span>2. Thiết lập Công thức (Định lượng món)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('TRANSACTIONS')}
          className={cn(
            'px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer',
            activeSubTab === 'TRANSACTIONS'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200',
          )}
        >
          <History size={16} />
          <span>3. Lịch sử Xuất - Nhập kho ({transactions.length})</span>
        </button>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: TỒN KHO NGUYÊN LIỆU                                            */}
      {/* ===================================================================== */}
      {activeSubTab === 'STOCKS' && (
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-100 text-zinc-600 font-semibold border-b border-zinc-200 text-xs uppercase">
              <tr>
                <th className="px-6 py-4">Tên nguyên liệu</th>
                <th className="px-6 py-4">Tồn kho hiện tại</th>
                <th className="px-6 py-4">Đơn vị</th>
                <th className="px-6 py-4">Mức cảnh báo tối thiểu</th>
                <th className="px-6 py-4">Giá vốn / Đơn vị</th>
                <th className="px-6 py-4">Trạng thái</th>
                <th className="px-6 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {isLoading && inventoryData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-zinc-500">
                    Đang tải dữ liệu tồn kho...
                  </td>
                </tr>
              ) : inventoryData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-zinc-500">
                    Kho trống
                  </td>
                </tr>
              ) : (
                inventoryData.map((item) => {
                  const isOut = Number(item.quantity) <= 0;
                  const isLow = Number(item.quantity) <= Number(item.minThreshold);
                  return (
                    <tr key={item.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-zinc-800">{item.name}</td>
                      <td
                        className={cn(
                          'px-6 py-4 font-black text-base',
                          isOut
                            ? 'text-red-600'
                            : isLow
                              ? 'text-amber-600'
                              : 'text-zinc-900',
                        )}
                      >
                        {item.quantity.toLocaleString('vi-VN')}
                      </td>
                      <td className="px-6 py-4 text-zinc-500 font-semibold">{item.unit}</td>
                      <td className="px-6 py-4 text-zinc-500">
                        {item.minThreshold.toLocaleString('vi-VN')}
                      </td>
                      <td className="px-6 py-4 text-zinc-700 font-semibold text-xs">
                        {formatCurrency(item.costPerUnit)} / {item.unit}
                      </td>
                      <td className="px-6 py-4">
                        {isOut ? (
                          <span className="px-2.5 py-1 bg-red-600 text-white rounded-lg text-xs font-black inline-flex items-center gap-1">
                            <AlertTriangle size={12} /> Hết hàng (0)
                          </span>
                        ) : isLow ? (
                          <span className="px-2.5 py-1 bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-xs font-bold inline-flex items-center gap-1">
                            <AlertTriangle size={12} /> Sắp hết hàng
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold inline-block">
                            Đầy đủ
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenQuickStockIn(item.id)}
                            className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200 text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1"
                          >
                            <Plus size={13} /> + Nhập thêm kho
                          </button>
                          <button
                            onClick={() =>
                              setIngredientToDelete({ id: item.id, name: item.name })
                            }
                            title={`Xóa ${item.name}`}
                            className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors inline-flex items-center justify-center cursor-pointer"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: THIẾT LẬP CÔNG THỨC (ĐỊNH LƯỢNG MÓN - RECIPE / BOM)             */}
      {/* ===================================================================== */}
      {activeSubTab === 'RECIPES' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* CỘT TRÁI (5/12): Danh sách các món ăn/đồ uống */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-zinc-200 shadow-xs flex flex-col h-[620px] overflow-hidden">
            <div className="p-4 border-b border-zinc-200 bg-zinc-50/70 space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-zinc-900">
                  Danh sách Món ăn / Đồ uống ({products.length})
                </h3>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  {products.filter((p) => hasRecipeForProduct(p.id)).length}/{products.length} đã có công thức
                </span>
              </div>

              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                />
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Tìm kiếm món ăn theo tên hoặc mã..."
                  className="w-full pl-8 pr-3 py-2 bg-white border border-zinc-200 rounded-xl text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 p-2">
              {filteredProductsForBom.map((prod) => {
                const isSelected = String(prod.id) === String(selectedProductId);
                const configured = hasRecipeForProduct(prod.id);

                return (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => setSelectedProductId(String(prod.id))}
                    className={cn(
                      'w-full p-3 rounded-xl flex items-center justify-between gap-3 text-left transition-all cursor-pointer',
                      isSelected
                        ? 'bg-blue-50 border border-blue-300 shadow-2xs'
                        : 'hover:bg-zinc-50 border border-transparent',
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={prod.imageUrl}
                        alt={prod.name}
                        referrerPolicy="no-referrer"
                        className="w-11 h-11 rounded-xl object-cover bg-zinc-100 shrink-0 border border-zinc-200"
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-xs sm:text-sm text-zinc-900 truncate">
                          {prod.name}
                        </div>
                        <div className="text-[11px] text-zinc-500 mt-0.5">
                          Mã: <strong>#{prod.id}</strong> • Giá bán:{' '}
                          <strong className="text-blue-600">
                            {formatCurrency(prod.basePrice)}
                          </strong>
                        </div>
                      </div>
                    </div>

                    {configured ? (
                      <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                        <CheckCircle2 size={12} /> Đã có công thức
                      </span>
                    ) : (
                      <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold">
                        Chưa thiết lập
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* CỘT PHẢI (7/12): Chỉnh sửa định lượng nguyên liệu & Tính giá vốn COGS */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-zinc-200 shadow-xs flex flex-col h-[620px] overflow-hidden">
            {selectedProductObj ? (
              <>
                <div className="px-6 py-4 bg-zinc-900 text-white flex items-center justify-between shrink-0">
                  <div>
                    <div className="text-xs text-emerald-400 font-bold uppercase tracking-wider">
                      Thiết lập Công thức Định lượng (BOM)
                    </div>
                    <h3 className="text-lg font-extrabold mt-0.5">
                      {selectedProductObj.name} (#{selectedProductObj.id})
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddBomRow}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                  >
                    <Plus size={15} />
                    <span>+ Thêm nguyên liệu vào công thức</span>
                  </button>
                </div>

                {/* Danh sách nguyên liệu trong công thức */}
                <div className="flex-1 overflow-y-auto p-5 space-y-3">
                  {bomRows.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-zinc-200 rounded-2xl">
                      <Scale size={36} className="text-zinc-300 mb-2" />
                      <p className="text-sm font-bold text-zinc-700">
                        Chưa có nguyên liệu nào trong công thức của món này
                      </p>
                      <p className="text-xs text-zinc-400 mt-1 max-w-sm">
                        Nhấn nút &ldquo;+ Thêm nguyên liệu vào công thức&rdquo; ở góc phải phía trên để chọn nguyên vật liệu và định lượng tiêu hao.
                      </p>
                    </div>
                  ) : (
                    bomRows.map((row, idx) => {
                      const ing = getIngById(row.ingredientId);
                      const costPerUnit = Number(ing?.costPerUnit || 0);
                      const lineCost = Math.round(Number(row.quantity || 0) * costPerUnit);

                      return (
                        <div
                          key={idx}
                          className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl flex flex-wrap sm:flex-nowrap items-center gap-3 hover:border-blue-300 transition-colors"
                        >
                          <div className="flex-1 min-w-[210px]">
                            <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">
                              Nguyên vật liệu #{idx + 1}
                            </label>
                            <select
                              value={row.ingredientId}
                              onChange={(e) =>
                                handleChangeBomIngredient(idx, e.target.value)
                              }
                              className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-xl text-xs font-bold text-zinc-800 focus:outline-none focus:border-blue-500"
                            >
                              {ingredients.map((i) => (
                                <option key={i.id} value={i.id}>
                                  {i.name} ({i.unit}) — Giá vốn:{' '}
                                  {formatCurrency(Number(i.costPerUnit || 0))}/{i.unit}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="w-36">
                            <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">
                              Định lượng tiêu hao
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                step="0.5"
                                min="0"
                                value={row.quantity}
                                onChange={(e) =>
                                  handleChangeBomQuantity(idx, e.target.value)
                                }
                                className="w-full pl-3 pr-11 py-2 bg-white border border-zinc-300 rounded-xl text-xs font-black text-blue-700 focus:outline-none focus:border-blue-500"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-zinc-400">
                                {ing?.unit || ''}
                              </span>
                            </div>
                          </div>

                          <div className="w-28 text-right">
                            <span className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">
                              Giá vốn dòng
                            </span>
                            <span className="text-xs font-extrabold text-zinc-900">
                              {formatCurrency(lineCost)}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveBomRow(idx)}
                            title="Xóa nguyên liệu khỏi công thức"
                            className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer self-end mb-0.5"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Khung tính nhẩm Giá vốn (COGS) & Nút Lưu công thức */}
                <div className="p-5 bg-zinc-50 border-t border-zinc-200 space-y-4 shrink-0">
                  <div className="grid grid-cols-3 gap-3 p-3.5 bg-white rounded-2xl border border-zinc-200">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-zinc-400 block">
                        Giá bán cơ sở
                      </span>
                      <span className="text-base font-black text-zinc-900">
                        {formatCurrency(sellPrice)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase text-emerald-700 flex items-center gap-1">
                        <Calculator size={12} /> Giá vốn (COGS)
                      </span>
                      <span className="text-base font-black text-emerald-600">
                        {formatCurrency(estimatedCogs)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase text-blue-700 block">
                        Lãi gộp ước tính ({profitMarginPct}%)
                      </span>
                      <span className="text-base font-black text-blue-600">
                        {formatCurrency(estimatedProfit)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] text-zinc-500">
                      * Tự động suy luận định lượng cho Size S (x0.8), Size M (x1.0) và Size L (x1.3).
                    </span>
                    <button
                      type="button"
                      disabled={isSavingBom}
                      onClick={handleSaveBomRecipe}
                      className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer active:scale-95"
                    >
                      <Save size={16} />
                      <span>{isSavingBom ? 'Đang lưu...' : 'Lưu công thức'}</span>
                    </button>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: LỊCH SỬ XUẤT - NHẬP KHO (STOCK TRANSACTIONS LOG)               */}
      {/* ===================================================================== */}
      {activeSubTab === 'TRANSACTIONS' && (
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-100 text-zinc-600 font-semibold border-b border-zinc-200 text-xs uppercase">
              <tr>
                <th className="px-5 py-3.5">Thời gian</th>
                <th className="px-5 py-3.5">Loại biến động</th>
                <th className="px-5 py-3.5">Nguyên vật liệu</th>
                <th className="px-5 py-3.5">Số lượng thay đổi</th>
                <th className="px-5 py-3.5">Tồn kho sau GD</th>
                <th className="px-5 py-3.5">Ghi chú / Đơn hàng liên quan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-zinc-400 text-xs">
                    Chưa có lịch sử xuất - nhập kho nào được ghi nhận
                  </td>
                </tr>
              ) : (
                transactions.map((tx: any) => {
                  const change = Number(tx.changeQuantity ?? tx.changeAmount ?? 0);
                  const isDeduct = tx.type === 'ORDER_DEDUCT' || change < 0;
                  const isRestore = tx.type === 'ORDER_RESTORE';

                  return (
                    <tr key={tx.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-5 py-3.5 text-xs text-zinc-600 whitespace-nowrap">
                        {formatDateTimeFull(tx.createdAt)}
                      </td>
                      <td className="px-5 py-3.5">
                        {isDeduct ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            <ArrowDownRight size={13} className="text-amber-600" />
                            Xuất bán (ORDER_DEDUCT)
                          </span>
                        ) : isRestore ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-purple-50 text-purple-800 border border-purple-200">
                            <ArrowUpRight size={13} className="text-purple-600" />
                            Hoàn kho (ORDER_RESTORE)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <ArrowUpRight size={13} className="text-emerald-600" />
                            Nhập kho (MANUAL_IMPORT)
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 font-bold text-zinc-800 text-xs">
                        {tx.itemName || getIngById(tx.itemId)?.name || tx.itemId}
                      </td>
                      <td
                        className={cn(
                          'px-5 py-3.5 font-black text-sm',
                          change < 0 ? 'text-red-600' : 'text-emerald-600',
                        )}
                      >
                        {change > 0 ? `+${change}` : change} {tx.unit}
                      </td>
                      <td className="px-5 py-3.5 font-bold text-zinc-700 text-xs">
                        {Number(tx.balanceAfter || 0).toLocaleString('vi-VN')} {tx.unit}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-zinc-600">
                        {tx.note}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Ingredient Modal */}
      {showAddIngredientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-zinc-200 flex justify-between items-center">
              <h3 className="font-bold text-lg text-zinc-900">Thêm nguyên vật liệu mới</h3>
              <button
                onClick={() => setShowAddIngredientModal(false)}
                className="p-1 text-zinc-400 hover:text-zinc-900 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddIngredient} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-zinc-600 mb-1">
                  Tên nguyên vật liệu *
                </label>
                <input
                  type="text"
                  value={addIngredientForm.name}
                  onChange={(e) =>
                    setAddIngredientForm({ ...addIngredientForm, name: e.target.value })
                  }
                  placeholder="VD: Hạt Cafe Arabica, Đào ngâm..."
                  className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-blue-500 text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-600 mb-1">
                    Đơn vị tính *
                  </label>
                  <input
                    type="text"
                    value={addIngredientForm.unit}
                    onChange={(e) =>
                      setAddIngredientForm({ ...addIngredientForm, unit: e.target.value })
                    }
                    placeholder="g, ml, cái, phần..."
                    className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-blue-500 text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-600 mb-1">
                    Giá vốn / 1 đơn vị (VNĐ)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={addIngredientForm.costPerUnit}
                    onChange={(e) =>
                      setAddIngredientForm({
                        ...addIngredientForm,
                        costPerUnit: e.target.value,
                      })
                    }
                    placeholder="VD: 250"
                    className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-blue-500 text-sm font-bold text-emerald-700"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-600 mb-1">
                    Tồn kho ban đầu
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={addIngredientForm.currentStock}
                    onChange={(e) =>
                      setAddIngredientForm({
                        ...addIngredientForm,
                        currentStock: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-blue-500 text-sm font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-600 mb-1">
                    Mức cảnh báo sắp hết
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={addIngredientForm.minStockThreshold}
                    onChange={(e) =>
                      setAddIngredientForm({
                        ...addIngredientForm,
                        minStockThreshold: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-blue-500 text-sm"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl active:scale-95 transition-transform mt-2 cursor-pointer"
              >
                Xác nhận Thêm Nguyên Liệu
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Stock In Modal */}
      {showStockInModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-zinc-200 flex justify-between items-center">
              <h3 className="font-bold text-lg text-zinc-900">+ Nhập thêm hàng vào kho</h3>
              <button
                onClick={() => setShowStockInModal(false)}
                className="p-1 text-zinc-400 hover:text-zinc-900 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleStockIn} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-zinc-900 mb-1.5">
                  Chọn nguyên liệu
                </label>
                <select
                  value={stockInForm.ingredientId}
                  onChange={(e) =>
                    setStockInForm({ ...stockInForm, ingredientId: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-blue-500 text-sm"
                  required
                >
                  <option value="">-- Chọn nguyên liệu --</option>
                  {ingredients.map((ing) => (
                    <option key={ing.id} value={ing.id}>
                      {ing.name} ({ing.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-900 mb-1.5">
                  Số lượng nhập thêm
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  value={stockInForm.quantity}
                  onChange={(e) =>
                    setStockInForm({ ...stockInForm, quantity: e.target.value })
                  }
                  placeholder="VD: 1000"
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-blue-500 text-sm font-bold text-blue-700"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-900 mb-1.5">
                  Ghi chú nhập kho
                </label>
                <input
                  type="text"
                  value={stockInForm.note}
                  onChange={(e) =>
                    setStockInForm({ ...stockInForm, note: e.target.value })
                  }
                  placeholder="VD: Nhập hàng nhà cung cấp buổi sáng..."
                  className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-blue-500 text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl active:scale-95 transition-transform cursor-pointer"
              >
                Xác nhận Nhập kho
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Notification Modals */}
      <SuccessModal
        isOpen={!!successModal}
        onClose={() => setSuccessModal(null)}
        title={successModal?.title}
        message={successModal?.message || ''}
        subMessage={successModal?.subMessage}
      />

      <ErrorModal
        isOpen={!!errorModal}
        onClose={() => setErrorModal(null)}
        title={errorModal?.title}
        error={errorModal?.error || ''}
      />

      <WarningModal
        isOpen={!!warningModal}
        onClose={() => setWarningModal(null)}
        title={warningModal?.title}
        message={warningModal?.message || ''}
      />

      {ingredientToDelete && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setIngredientToDelete(null)}
          onConfirm={handleDeleteIngredient}
          title="Xác nhận xóa nguyên liệu"
          message={`Bạn có chắc chắn muốn xóa nguyên liệu "${ingredientToDelete.name}" không? Thao tác này sẽ xóa nguyên liệu và lượng tồn kho liên quan.`}
          confirmText="Xóa nguyên liệu"
          cancelText="Hủy"
          isDestructive={true}
        />
      )}
    </div>
  );
};
