import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Plus,
  Trash2,
  Save,
  Scale,
  Calculator,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import api from '../lib/axios';
import { formatCurrency } from '../lib/utils';
import type { Product } from '../types';

interface RecipeFormModalProps {
  product: Product;
  onClose: () => void;
  onSaved?: () => void;
}

interface RecipeItemRow {
  ingredientId: string;
  quantity: number;
}

export const RecipeFormModal: React.FC<RecipeFormModalProps> = ({
  product,
  onClose,
  onSaved,
}) => {
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [rows, setRows] = useState<RecipeItemRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const loadRecipeAndIngredients = useCallback(async () => {
    setIsLoading(true);
    try {
      const [ingRes, recRes] = await Promise.all([
        api.get('/inventory/ingredients'),
        api.get(`/inventory/recipes/${product.id}`),
      ]);

      const ingList = Array.isArray(ingRes.data) ? ingRes.data : [];
      setIngredients(ingList);

      const recData = recRes.data;
      if (recData && Array.isArray(recData.items) && recData.items.length > 0) {
        setRows(
          recData.items.map((it: any) => ({
            ingredientId: it.ingredientId,
            quantity: Number(it.quantity ?? it.quantityNeeded ?? 0),
          })),
        );
      } else {
        setRows([]);
      }
    } catch (err) {
      console.error('Error loading recipe for product:', err);
    } finally {
      setIsLoading(false);
    }
  }, [product.id]);

  useEffect(() => {
    loadRecipeAndIngredients();
  }, [loadRecipeAndIngredients]);

  const handleAddRow = () => {
    if (ingredients.length === 0) return;
    // Chọn nguyên liệu đầu tiên chưa có trong danh sách
    const unused =
      ingredients.find(
        (ing) => !rows.some((r) => r.ingredientId === ing.id),
      ) || ingredients[0];

    setRows((prev) => [
      ...prev,
      {
        ingredientId: unused.id,
        quantity: 20,
      },
    ]);
  };

  const handleChangeIngredient = (idx: number, ingredientId: string) => {
    setRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, ingredientId } : r)),
    );
  };

  const handleChangeQuantity = (idx: number, val: string) => {
    const num = Math.max(0, parseFloat(val) || 0);
    setRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, quantity: num } : r)),
    );
  };

  const handleRemoveRow = (idx: number) => {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const getIngById = (id: string) => ingredients.find((i) => i.id === id);

  // Tính nhẩm Giá vốn (COGS) dựa trên costPerUnit của từng nguyên liệu
  const totalEstimatedCogs = rows.reduce((sum, r) => {
    const ing = getIngById(r.ingredientId);
    const costPerUnit = Number(ing?.costPerUnit || 0);
    return sum + Math.round(Number(r.quantity || 0) * costPerUnit);
  }, 0);

  const grossProfit = Math.max(0, Number(product.basePrice || 0) - totalEstimatedCogs);
  const marginPct =
    Number(product.basePrice) > 0
      ? Math.round((grossProfit / Number(product.basePrice)) * 100)
      : 0;

  const handleSave = async () => {
    setIsSaving(true);
    setFeedback(null);
    try {
      await api.put(`/inventory/recipes/${product.id}`, {
        items: rows.filter((r) => r.ingredientId && r.quantity > 0),
      });
      setFeedback({
        type: 'success',
        text: 'Đã lưu công thức định lượng (BOM) thành công! Tự động áp dụng trừ kho khi có đơn mới.',
      });
      onSaved?.();
      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || 'Có lỗi xảy ra khi lưu công thức món ăn.';
      setFeedback({
        type: 'error',
        text: Array.isArray(msg) ? msg.join(', ') : String(msg),
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-zinc-200">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
              <Scale size={20} />
            </div>
            <div>
              <h3 className="text-lg font-extrabold leading-tight">
                Thiết lập Công thức (BOM): {product.name}
              </h3>
              <p className="text-xs text-emerald-100">
                Mã món: #{product.id} • Giá bán: {formatCurrency(product.basePrice)} • Tự động đồng bộ Size S (x0.8), M (x1.0), L (x1.3)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-emerald-100 hover:text-white hover:bg-white/20 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {feedback && (
            <div
              className={`p-3.5 rounded-2xl border flex items-center gap-2 text-xs font-bold ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-red-50 border-red-300 text-red-800'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle size={16} className="text-red-600 shrink-0" />
              )}
              <span>{feedback.text}</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-zinc-600">
              Nguyên vật liệu định lượng cho 1 phần chuẩn ({rows.length} nguyên liệu)
            </span>
            <button
              type="button"
              onClick={handleAddRow}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus size={14} /> + Thêm nguyên liệu vào công thức
            </button>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-zinc-500 text-xs flex items-center justify-center gap-2">
              <Loader2 size={18} className="animate-spin text-emerald-600" />
              <span>Đang tải định lượng nguyên liệu...</span>
            </div>
          ) : rows.length === 0 ? (
            <div className="p-8 rounded-2xl bg-zinc-50 border border-dashed border-zinc-300 text-center">
              <Scale size={32} className="mx-auto text-zinc-300 mb-2" />
              <p className="text-xs font-bold text-zinc-700">
                Món ăn này chưa được thiết lập công thức định lượng
              </p>
              <p className="text-[11px] text-zinc-400 mt-1">
                Bấm nút &ldquo;+ Thêm nguyên liệu vào công thức&rdquo; ở góc trên để bắt đầu.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {rows.map((row, idx) => {
                const ing = getIngById(row.ingredientId);
                const costPerUnit = Number(ing?.costPerUnit || 0);
                const lineCost = Math.round(Number(row.quantity || 0) * costPerUnit);

                return (
                  <div
                    key={idx}
                    className="p-3 bg-zinc-50 border border-zinc-200 rounded-2xl flex flex-wrap sm:flex-nowrap items-center gap-3"
                  >
                    <div className="flex-1 min-w-[200px]">
                      <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">
                        Nguyên vật liệu #{idx + 1}
                      </label>
                      <select
                        value={row.ingredientId}
                        onChange={(e) =>
                          handleChangeIngredient(idx, e.target.value)
                        }
                        className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-xl text-xs font-bold text-zinc-800 focus:outline-none focus:border-emerald-500"
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
                      <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">
                        Định lượng tiêu hao
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={row.quantity}
                          onChange={(e) =>
                            handleChangeQuantity(idx, e.target.value)
                          }
                          className="w-full pl-3 pr-10 py-2 bg-white border border-zinc-300 rounded-xl text-xs font-black text-emerald-700 focus:outline-none focus:border-emerald-500"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-zinc-400">
                          {ing?.unit || ''}
                        </span>
                      </div>
                    </div>

                    <div className="w-28 text-right">
                      <span className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">
                        Chi phí NVL
                      </span>
                      <span className="text-xs font-bold text-zinc-900">
                        {formatCurrency(lineCost)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveRow(idx)}
                      title="Xóa nguyên liệu khỏi công thức"
                      className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer self-end mb-0.5"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Bảng tính nhẩm Giá vốn (COGS) & Lợi nhuận gộp */}
          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Calculator size={18} />
              </div>
              <div>
                <div className="text-xs font-bold text-emerald-950">
                  Tính nhẩm Giá vốn định mức (Estimated COGS)
                </div>
                <div className="text-[11px] text-emerald-700">
                  Lợi nhuận gộp ước tính: <strong>{formatCurrency(grossProfit)}</strong> ({marginPct}% biên lợi nhuận)
                </div>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-bold uppercase text-emerald-700 block">
                Tổng giá vốn / 1 phần
              </span>
              <span className="text-xl font-black text-emerald-700">
                {formatCurrency(totalEstimatedCogs)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-200 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-zinc-300 text-zinc-700 text-xs font-bold hover:bg-zinc-100 cursor-pointer"
          >
            Đóng
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
          >
            {isSaving ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Save size={15} />
            )}
            <span>{isSaving ? 'Đang lưu...' : 'Lưu công thức'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
