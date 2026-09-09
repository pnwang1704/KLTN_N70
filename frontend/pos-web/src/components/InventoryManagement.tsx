import React, { useState, useEffect } from 'react';
import { Package, AlertTriangle, PlusCircle, X, Plus, Trash2 } from 'lucide-react';
import api from '../lib/axios';
import { SuccessModal, ErrorModal, WarningModal, ConfirmModal } from './ui/Modals';

export const InventoryManagement: React.FC<{ branchId: string }> = ({ branchId }) => {
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [stocks, setStocks] = useState<any[]>([]);
  const [lowStocks, setLowStocks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
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
  });

  const [addIngredientForm, setAddIngredientForm] = useState({
    name: '',
    unit: 'g',
    minStockThreshold: '500',
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [ingRes, stockRes, lowStockRes] = await Promise.allSettled([
        api.get('/inventory/ingredients'),
        api.get(`/inventory/stocks/${branchId}`),
        api.get(`/inventory/stocks/${branchId}/low`)
      ]);

      if (ingRes.status === 'fulfilled') {
        setIngredients(ingRes.value.data || []);
      } else {
        console.error('Failed to load ingredients:', ingRes.reason);
      }

      if (stockRes.status === 'fulfilled') {
        setStocks(stockRes.value.data || []);
      } else {
        console.error('Failed to load stocks:', stockRes.reason);
      }

      if (lowStockRes.status === 'fulfilled') {
        setLowStocks(lowStockRes.value.data || []);
      } else {
        console.error('Failed to load low stocks:', lowStockRes.reason);
      }
    } catch (err) {
      console.error('Error fetching inventory data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [branchId]);

  const handleStockIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockInForm.ingredientId || !stockInForm.quantity) {
      setWarningModal({
        title: 'Thông tin chưa đầy đủ',
        message: 'Vui lòng chọn nguyên liệu và nhập số lượng cần nhập kho!'
      });
      return;
    }
    
    try {
      await api.post('/inventory/stocks/in', {
        branchId,
        ingredientId: stockInForm.ingredientId,
        quantity: parseFloat(stockInForm.quantity)
      });
      setShowStockInModal(false);
      setStockInForm({ ingredientId: '', quantity: '' });
      fetchData();
      setSuccessModal({
        title: 'Nhập kho thành công',
        message: 'Đã cập nhật số lượng tồn kho thành công!',
        subMessage: 'Dữ liệu số lượng tồn kho chi nhánh đã được đồng bộ tự động.'
      });
    } catch (err) {
      console.error(err);
      setErrorModal({
        title: 'Lỗi nhập kho',
        error: 'Có lỗi xảy ra khi nhập kho. Vui lòng thử lại sau!'
      });
    }
  };

  const handleAddIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = addIngredientForm.name.trim();
    if (!trimmedName) {
      setWarningModal({
        title: 'Thông tin chưa đầy đủ',
        message: 'Vui lòng nhập tên nguyên liệu mới!'
      });
      return;
    }

    try {
      await api.post('/inventory/ingredients', {
        name: trimmedName,
        unit: addIngredientForm.unit.trim(),
        minStockThreshold: parseFloat(addIngredientForm.minStockThreshold) || 0,
      });
      setShowAddIngredientModal(false);
      setAddIngredientForm({ name: '', unit: 'g', minStockThreshold: '500' });
      fetchData();
      setSuccessModal({
        title: 'Thêm nguyên liệu thành công',
        message: `Nguyên liệu "${trimmedName}" đã được lưu vào hệ thống!`,
        subMessage: 'Bạn có thể tiến hành nhập kho cho nguyên liệu này ngay bây giờ.'
      });
    } catch (err) {
      console.error(err);
      setErrorModal({
        title: 'Lỗi thêm nguyên liệu',
        error: 'Có lỗi xảy ra khi thêm nguyên liệu mới. Vui lòng thử lại!'
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
        subMessage: 'Dữ liệu kho và danh sách nguyên liệu đã được cập nhật.'
      });
      setIngredientToDelete(null);
      fetchData();
    } catch (err: any) {
      console.error(err);
      const serverMessage = err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi xóa nguyên liệu!';
      setErrorModal({
        title: 'Không thể xóa nguyên liệu',
        error: serverMessage
      });
      setIngredientToDelete(null);
    }
  };

  // Map from ingredients so all ingredients are shown even if they haven't had stock-in yet
  const inventoryData = ingredients.map(ingredient => {
    const stock = stocks.find(s => s.ingredientId === ingredient.id);
    return {
      id: ingredient.id,
      name: ingredient.name,
      unit: ingredient.unit,
      quantity: Number(stock?.currentQuantity ?? 0),
      minThreshold: Number(ingredient.minStockThreshold ?? 0)
    };
  });

  return (
    <div className="flex-1 p-6 overflow-y-auto bg-zinc-50">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
          <Package className="text-orange-600" />
          Quản lý Kho nguyên liệu
        </h2>
        <div className="flex gap-3">
          <button onClick={fetchData} className="px-4 py-2 bg-white border border-zinc-200 rounded-xl text-sm font-semibold text-zinc-600 hover:bg-zinc-100">
            Làm mới
          </button>
          <button onClick={() => setShowAddIngredientModal(true)} className="px-4 py-2 bg-white border border-orange-200 text-orange-600 rounded-xl text-sm font-semibold hover:bg-orange-50 flex items-center gap-2">
            <Plus size={16} /> Thêm nguyên liệu
          </button>
          <button onClick={() => setShowStockInModal(true)} className="px-4 py-2 bg-orange-600 text-white rounded-xl text-sm font-semibold hover:bg-orange-700 flex items-center gap-2">
            <PlusCircle size={16} /> Nhập kho
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-orange-50 text-orange-600 rounded-xl"><Package size={24} /></div>
          <div>
            <p className="text-zinc-500 text-sm font-semibold">Tổng nguyên liệu</p>
            <p className="text-2xl font-bold text-zinc-900">{ingredients.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-red-200 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-red-50 text-red-600 rounded-xl"><AlertTriangle size={24} /></div>
          <div>
            <p className="text-red-500 text-sm font-semibold">Cảnh báo sắp hết</p>
            <p className="text-2xl font-bold text-red-600">{lowStocks.length}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-100 text-zinc-600 font-semibold border-b border-zinc-200">
            <tr>
              <th className="px-6 py-4">Tên nguyên liệu</th>
              <th className="px-6 py-4">Tồn kho hiện tại</th>
              <th className="px-6 py-4">Đơn vị</th>
              <th className="px-6 py-4">Ngưỡng tối thiểu</th>
              <th className="px-6 py-4">Trạng thái</th>
              <th className="px-6 py-4 text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {isLoading ? (
              <tr><td colSpan={6} className="text-center py-8 text-zinc-500">Đang tải dữ liệu...</td></tr>
            ) : inventoryData.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-zinc-500">Kho trống</td></tr>
            ) : (
              inventoryData.map(item => {
                const isLow = Number(item.quantity) <= Number(item.minThreshold);
                return (
                  <tr key={item.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-zinc-700">{item.name}</td>
                    <td className={`px-6 py-4 font-bold ${isLow ? 'text-red-600' : 'text-zinc-900'}`}>{item.quantity}</td>
                    <td className="px-6 py-4 text-zinc-500">{item.unit}</td>
                    <td className="px-6 py-4 text-zinc-500">{item.minThreshold}</td>
                    <td className="px-6 py-4">
                      {isLow ? (
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded-md text-xs font-bold flex items-center gap-1 w-max">
                          <AlertTriangle size={12} /> Sắp hết hàng
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-md text-xs font-bold w-max block text-center">
                          Đầy đủ
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => setIngredientToDelete({ id: item.id, name: item.name })}
                        title={`Xóa ${item.name}`}
                        className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors inline-flex items-center justify-center"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add Ingredient Modal */}
      {showAddIngredientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-zinc-200 flex justify-between items-center">
              <h3 className="font-bold text-lg text-zinc-900">Thêm nguyên liệu mới</h3>
              <button onClick={() => setShowAddIngredientModal(false)} className="p-1 text-zinc-400 hover:text-zinc-900"><X size={20} /></button>
            </div>

            <form onSubmit={handleAddIngredient} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-zinc-900 mb-1">Tên nguyên liệu</label>
                <input
                  type="text"
                  value={addIngredientForm.name}
                  onChange={(e) => setAddIngredientForm({ ...addIngredientForm, name: e.target.value })}
                  placeholder="VD: Cà phê Robusta, Trà sữa..."
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-orange-500 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-900 mb-1">Đơn vị tính</label>
                <input
                  type="text"
                  value={addIngredientForm.unit}
                  onChange={(e) => setAddIngredientForm({ ...addIngredientForm, unit: e.target.value })}
                  placeholder="VD: g, ml, chai, gói, kg..."
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-orange-500 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-900 mb-1">Ngưỡng cảnh báo tối thiểu</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={addIngredientForm.minStockThreshold}
                  onChange={(e) => setAddIngredientForm({ ...addIngredientForm, minStockThreshold: e.target.value })}
                  placeholder="VD: 500"
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-orange-500 text-sm"
                  required
                />
              </div>

              <button type="submit" className="w-full py-3.5 bg-orange-600 text-white font-bold rounded-xl active:scale-95 transition-transform mt-2">
                Xác nhận Thêm
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
              <h3 className="font-bold text-lg text-zinc-900">Nhập kho</h3>
              <button onClick={() => setShowStockInModal(false)} className="p-1 text-zinc-400 hover:text-zinc-900"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleStockIn} className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-semibold text-zinc-900 mb-2">Chọn nguyên liệu</label>
                <select 
                  value={stockInForm.ingredientId}
                  onChange={(e) => setStockInForm({...stockInForm, ingredientId: e.target.value})}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-orange-500 text-sm"
                  required
                >
                  <option value="">-- Chọn nguyên liệu --</option>
                  {ingredients.map(ing => (
                    <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>
                  ))}
                </select>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-zinc-900 mb-2">Số lượng nhập thêm</label>
                <input 
                  type="number" 
                  step="0.01"
                  min="0"
                  value={stockInForm.quantity}
                  onChange={(e) => setStockInForm({...stockInForm, quantity: e.target.value})}
                  placeholder="VD: 500"
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-orange-500 text-sm"
                  required
                />
              </div>

              <button type="submit" className="w-full py-3.5 bg-orange-600 text-white font-bold rounded-xl active:scale-95 transition-transform">
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

