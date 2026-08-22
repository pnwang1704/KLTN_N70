import React, { useState, useEffect } from 'react';
import { Package, AlertTriangle, PlusCircle, X } from 'lucide-react';
import api from '../lib/axios';

export const InventoryManagement: React.FC<{ branchId: string }> = ({ branchId }) => {
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [stocks, setStocks] = useState<any[]>([]);
  const [lowStocks, setLowStocks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showStockInModal, setShowStockInModal] = useState(false);

  const [stockInForm, setStockInForm] = useState({
    ingredientId: '',
    quantity: '',
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [ingRes, stockRes, lowStockRes] = await Promise.all([
        api.get('/inventory/ingredients'),
        api.get(`/inventory/stocks/${branchId}`),
        api.get(`/inventory/stocks/${branchId}/low`)
      ]);
      setIngredients(ingRes.data);
      setStocks(stockRes.data);
      setLowStocks(lowStockRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [branchId]);

  const handleStockIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockInForm.ingredientId || !stockInForm.quantity) return alert('Vui lòng nhập đủ thông tin!');
    
    try {
      await api.post('/inventory/stocks/in', {
        branchId,
        ingredientId: stockInForm.ingredientId,
        quantity: parseFloat(stockInForm.quantity)
      });
      alert('Nhập kho thành công!');
      setShowStockInModal(false);
      setStockInForm({ ingredientId: '', quantity: '' });
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Có lỗi xảy ra khi nhập kho!');
    }
  };

  // Merge stocks with ingredient names and minThresholds
  const inventoryData = stocks.map(stock => {
    const ingredient = ingredients.find(i => i.id === stock.ingredientId);
    return {
      ...stock,
      name: ingredient?.name || 'Unknown',
      unit: ingredient?.unit || '',
      minThreshold: ingredient?.minThreshold || 0
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
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {isLoading ? (
              <tr><td colSpan={5} className="text-center py-8 text-zinc-500">Đang tải dữ liệu...</td></tr>
            ) : inventoryData.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 text-zinc-500">Kho trống</td></tr>
            ) : (
              inventoryData.map(item => {
                const isLow = item.quantity <= item.minThreshold;
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
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

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
    </div>
  );
};
