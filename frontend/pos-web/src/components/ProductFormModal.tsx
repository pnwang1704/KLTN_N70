import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  Link as LinkIcon,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  Image as ImageIcon,
} from 'lucide-react';
import api from '../lib/axios';
import type { Category, Product, ProductSize, Topping } from '../types';
import { cn, formatCurrency } from '../lib/utils';

interface ProductFormModalProps {
  product: Product | null; // null = Thêm mới, có giá trị = Chỉnh sửa
  categories: Category[];
  allToppings: Topping[];
  defaultCategoryId?: string;
  onClose: () => void;
  onSaved: (savedProduct: Product) => void;
  onDeleted?: (deletedProductId: string) => void;
}

const DEFAULT_SIZES: ProductSize[] = [
  { id: 'S', name: 'Size S', priceModifier: 0 },
  { id: 'M', name: 'Size M', priceModifier: 6000 },
  { id: 'L', name: 'Size L', priceModifier: 12000 },
];

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  product,
  categories,
  allToppings,
  defaultCategoryId,
  onClose,
  onSaved,
  onDeleted,
}) => {
  const isEditing = Boolean(product);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [name, setName] = useState(product?.name || '');
  const [categoryId, setCategoryId] = useState(
    product?.categoryId || defaultCategoryId || categories[0]?.id || 'C1',
  );
  const [basePrice, setBasePrice] = useState<string>(
    product?.basePrice !== undefined ? String(product.basePrice) : '35000',
  );
  const [description, setDescription] = useState(product?.description || '');
  const [imageUrl, setImageUrl] = useState(product?.imageUrl || '');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(product?.imageUrl || '');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState<string | null>(null);

  const [sizes, setSizes] = useState<ProductSize[]>(
    product?.sizes && product.sizes.length > 0 ? product.sizes : DEFAULT_SIZES,
  );
  const [selectedToppingIds, setSelectedToppingIds] = useState<string[]>(
    product?.availableToppings ? product.availableToppings.map((t) => t.id) : [],
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Xử lý khi người dùng chọn file ảnh từ máy tính -> gọi POST /products/upload lên Cloudinary
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setErrorMessage(null);
    setUploadSuccessMsg(null);

    // Hiển thị preview tức thì từ local object URL
    const localPreviewUrl = URL.createObjectURL(file);
    setImagePreview(localPreviewUrl);

    // Upload ngay lên Cloudinary qua endpoint POST /products/upload
    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await api.post('/products/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.imageUrl) {
        setImageUrl(res.data.imageUrl);
        setImagePreview(res.data.imageUrl);
        setSelectedFile(null); // Đã có secure_url từ Cloudinary
        setUploadSuccessMsg('Đã tải ảnh lên Cloudinary thành công!');
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Không thể upload ảnh trực tiếp, ảnh sẽ được gửi kèm khi lưu món.';
      console.warn('Upload preview warning:', msg);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleImageUrlInput = (val: string) => {
    setImageUrl(val);
    setImagePreview(val);
    setSelectedFile(null);
    setUploadSuccessMsg(null);
  };

  const handleToggleTopping = (toppingId: string) => {
    setSelectedToppingIds((prev) =>
      prev.includes(toppingId)
        ? prev.filter((id) => id !== toppingId)
        : [...prev, toppingId],
    );
  };

  const handleSizeChange = (
    idx: number,
    field: keyof ProductSize,
    val: string | number,
  ) => {
    setSizes((prev) =>
      prev.map((s, i) =>
        i === idx
          ? {
              ...s,
              [field]: field === 'priceModifier' ? Number(val) || 0 : String(val),
            }
          : s,
      ),
    );
  };

  const handleAddSize = () => {
    setSizes((prev) => [
      ...prev,
      { id: `SZ_${prev.length + 1}`, name: 'Size Mới', priceModifier: 0 },
    ]);
  };

  const handleRemoveSize = (idx: number) => {
    if (sizes.length <= 1) return;
    setSizes((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('Vui lòng nhập tên món ăn.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const chosenToppings = allToppings.filter((t) =>
      selectedToppingIds.includes(t.id),
    );

    try {
      let res;
      if (selectedFile) {
        // Nếu người dùng chọn file mà chưa lấy được link ở bước preview, gửi trực tiếp multipart/form-data
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('name', name.trim());
        formData.append('categoryId', categoryId);
        formData.append('basePrice', String(Number(basePrice) || 0));
        formData.append('description', description.trim());
        if (imageUrl) formData.append('imageUrl', imageUrl);
        formData.append('sizes', JSON.stringify(sizes));
        formData.append('availableToppings', JSON.stringify(chosenToppings));

        if (isEditing && product) {
          res = await api.patch(`/products/${product.id}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        } else {
          res = await api.post('/products', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        }
      } else {
        const payload = {
          name: name.trim(),
          categoryId,
          basePrice: Number(basePrice) || 0,
          description: description.trim(),
          imageUrl:
            imageUrl.trim() ||
            'https://images.unsplash.com/photo-1558857563-b37cf5a228f4?auto=format&fit=crop&q=80&w=400',
          sizes,
          availableToppings: chosenToppings,
        };

        if (isEditing && product) {
          res = await api.patch(`/products/${product.id}`, payload);
        } else {
          res = await api.post('/products', payload);
        }
      }

      const savedData = res.data;
      const normalizedProduct: Product = {
        id: String(savedData.id),
        categoryId: String(savedData.categoryId),
        name: savedData.name,
        description: savedData.description || '',
        basePrice: Number(savedData.basePrice) || 0,
        imageUrl: savedData.imageUrl,
        sizes: Array.isArray(savedData.sizes) ? savedData.sizes : sizes,
        availableToppings: Array.isArray(savedData.availableToppings)
          ? savedData.availableToppings
          : chosenToppings,
      };

      onSaved(normalizedProduct);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Có lỗi xảy ra khi lưu món ăn.';
      setErrorMessage(Array.isArray(msg) ? msg.join(', ') : String(msg));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!product || !onDeleted) return;
    if (!window.confirm(`Bạn có chắc chắn muốn xóa món "${product.name}" khỏi thực đơn?`)) {
      return;
    }

    setIsDeleting(true);
    setErrorMessage(null);
    try {
      await api.delete(`/products/${product.id}`);
      onDeleted(product.id);
    } catch (err: any) {
      setErrorMessage(
        err?.response?.data?.message || 'Không thể xóa món ăn này.',
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-zinc-200">
        {/* Header */}
        <div className="px-6 py-4 bg-zinc-900 text-white flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-bold">
              {isEditing ? `Chỉnh sửa món: ${product?.name}` : 'Thêm món ăn mới'}
            </h2>
            <p className="text-xs text-zinc-400">
              Lưu trữ trên Neon PostgreSQL & Hình ảnh tự động đồng bộ Cloudinary (pos_n70/products)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
              {errorMessage}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tên món */}
            <div>
              <label className="block text-xs font-bold uppercase text-zinc-600 mb-1.5">
                Tên món ăn *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: Trà Sữa Oolong Nướng..."
                className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Danh mục */}
            <div>
              <label className="block text-xs font-bold uppercase text-zinc-600 mb-1.5">
                Danh mục thực đơn *
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name} ({cat.id})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Giá cơ bản */}
            <div>
              <label className="block text-xs font-bold uppercase text-zinc-600 mb-1.5">
                Giá cơ bản (VNĐ) *
              </label>
              <input
                type="number"
                min={0}
                step={1000}
                required
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-300 rounded-xl text-sm font-bold text-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Mô tả ngắn */}
            <div>
              <label className="block text-xs font-bold uppercase text-zinc-600 mb-1.5">
                Mô tả hương vị
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mô tả nguyên liệu, hương vị đặc trưng..."
                className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Hình ảnh sản phẩm (Upload Cloudinary hoặc nhập URL) */}
          <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase text-zinc-700 flex items-center gap-1.5">
                <ImageIcon size={15} className="text-blue-600" />
                Hình ảnh món ăn (Cloudinary)
              </label>
              {imageUrl.includes('res.cloudinary.com') && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                  <CheckCircle2 size={12} /> Cloudinary CDN
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-start">
              {/* Khung Preview Ảnh */}
              <div className="w-28 h-28 rounded-2xl bg-zinc-200 border border-zinc-300 overflow-hidden shrink-0 flex items-center justify-center relative">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImageIcon size={28} className="text-zinc-400" />
                )}
                {isUploadingImage && (
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white text-[10px] font-bold gap-1">
                    <Loader2 size={20} className="animate-spin" />
                    Đang tải...
                  </div>
                )}
              </div>

              {/* Điều khiển chọn file hoặc nhập link */}
              <div className="flex-1 w-full space-y-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={isUploadingImage}
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    {isUploadingImage ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Upload size={15} />
                    )}
                    Chọn ảnh từ máy tính (Upload Cloudinary)
                  </button>
                  {uploadSuccessMsg && (
                    <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 size={14} /> {uploadSuccessMsg}
                    </span>
                  )}
                </div>

                <div className="relative">
                  <LinkIcon
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                  />
                  <input
                    type="text"
                    value={imageUrl}
                    onChange={(e) => handleImageUrlInput(e.target.value)}
                    placeholder="Hoặc dán trực tiếp URL ảnh (https://res.cloudinary.com/...)"
                    className="w-full pl-9 pr-3 py-2 bg-white border border-zinc-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <p className="text-[11px] text-zinc-500">
                  Ảnh tải lên sẽ tự động lưu vào thư mục{' '}
                  <code className="font-mono text-zinc-700">pos_n70/products</code> trên Cloudinary.
                </p>
              </div>
            </div>
          </div>

          {/* Cấu hình Size & Phụ thu */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase text-zinc-600">
                Kích cỡ (Sizes) & Giá cộng thêm
              </label>
              <button
                type="button"
                onClick={handleAddSize}
                className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
              >
                <Plus size={14} /> Thêm size
              </button>
            </div>
            <div className="space-y-2">
              {sizes.map((sz, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={sz.id}
                    onChange={(e) => handleSizeChange(idx, 'id', e.target.value)}
                    placeholder="Mã (S/M/L)"
                    className="w-20 px-2.5 py-1.5 bg-zinc-50 border border-zinc-300 rounded-lg text-xs font-bold text-center"
                  />
                  <input
                    type="text"
                    value={sz.name}
                    onChange={(e) => handleSizeChange(idx, 'name', e.target.value)}
                    placeholder="Tên hiển thị (VD: Size M)"
                    className="flex-1 px-3 py-1.5 bg-zinc-50 border border-zinc-300 rounded-lg text-xs"
                  />
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-zinc-500">+</span>
                    <input
                      type="number"
                      step={1000}
                      value={sz.priceModifier}
                      onChange={(e) =>
                        handleSizeChange(idx, 'priceModifier', e.target.value)
                      }
                      className="w-28 px-2.5 py-1.5 bg-zinc-50 border border-zinc-300 rounded-lg text-xs font-semibold text-right"
                    />
                    <span className="text-xs text-zinc-500">đ</span>
                  </div>
                  {sizes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveSize(idx)}
                      className="p-1.5 text-zinc-400 hover:text-red-600 cursor-pointer"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Chọn Topping đi kèm */}
          {allToppings.length > 0 && (
            <div>
              <label className="block text-xs font-bold uppercase text-zinc-600 mb-2">
                Topping đi kèm ({selectedToppingIds.length}/{allToppings.length})
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {allToppings.map((top) => {
                  const checked = selectedToppingIds.includes(top.id);
                  return (
                    <button
                      key={top.id}
                      type="button"
                      onClick={() => handleToggleTopping(top.id)}
                      className={cn(
                        'p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between text-xs',
                        checked
                          ? 'bg-blue-50 border-blue-400 text-blue-900 font-semibold'
                          : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50',
                      )}
                    >
                      <span className="truncate pr-1">{top.name}</span>
                      <span className="text-[11px] text-zinc-500 shrink-0">
                        +{formatCurrency(top.price)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="pt-4 border-t border-zinc-200 flex items-center justify-between gap-3">
            {isEditing && onDeleted ? (
              <button
                type="button"
                disabled={isDeleting || isSubmitting}
                onClick={handleDelete}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold transition-colors cursor-pointer"
              >
                {isDeleting ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Trash2 size={15} />
                )}
                Xóa món
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-zinc-300 text-zinc-700 hover:bg-zinc-100 text-xs font-bold transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isUploadingImage}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
              >
                {isSubmitting && <Loader2 size={15} className="animate-spin" />}
                {isEditing ? 'Lưu cập nhật' : 'Tạo món ăn'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

