import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Pencil, RefreshCw } from 'lucide-react';
import api from '../lib/axios';
import { mockCategories, mockProducts, mockToppings } from '../data/mockData';
import type { Category, Product, Topping } from '../types';
import { cn, formatCurrency } from '../lib/utils';
import { ProductFormModal } from './ProductFormModal';

interface ProductListProps {
  onSelectProduct: (product: Product) => void;
}

export const ProductList: React.FC<ProductListProps> = ({ onSelectProduct }) => {
  const [categories, setCategories] = useState<Category[]>(mockCategories);
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [toppings, setToppings] = useState<Topping[]>(mockToppings);
  const [activeCategory, setActiveCategory] = useState(mockCategories[0].id);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Modal Thêm / Sửa món ăn
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const fetchMenuFromApi = useCallback(async () => {
    setIsLoading(true);
    try {
      const [catRes, prodRes, topRes] = await Promise.all([
        api.get('/categories'),
        api.get('/products'),
        api.get('/toppings'),
      ]);

      if (Array.isArray(catRes.data) && catRes.data.length > 0) {
        setCategories(catRes.data);
        setActiveCategory((prev) =>
          catRes.data.some((c: Category) => c.id === prev) ? prev : catRes.data[0].id,
        );
      }

      if (Array.isArray(topRes.data) && topRes.data.length > 0) {
        setToppings(
          topRes.data.map((t: any) => ({
            id: String(t.id),
            name: t.name,
            price: Number(t.price) || 0,
          })),
        );
      }

      if (Array.isArray(prodRes.data) && prodRes.data.length > 0) {
        const normalized: Product[] = prodRes.data.map((p: any) => ({
          id: String(p.id),
          categoryId: String(p.categoryId),
          name: p.name,
          description: p.description || '',
          basePrice: Number(p.basePrice) || 0,
          imageUrl:
            p.imageUrl ||
            'https://images.unsplash.com/photo-1558857563-b37cf5a228f4?auto=format&fit=crop&q=80&w=400',
          sizes:
            Array.isArray(p.sizes) && p.sizes.length > 0
              ? p.sizes
              : [{ id: 'S', name: 'Tiêu chuẩn', priceModifier: 0 }],
          availableToppings: Array.isArray(p.availableToppings) ? p.availableToppings : [],
        }));
        setProducts(normalized);
      }
    } catch (err) {
      console.warn('Could not load products from API Gateway, using fallback data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMenuFromApi();
  }, [fetchMenuFromApi]);

  const filteredProducts = products.filter((p) => {
    if (search) return p.name.toLowerCase().includes(search.toLowerCase());
    return p.categoryId === activeCategory;
  });

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setIsFormOpen(true);
  };

  const handleOpenEditModal = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    setEditingProduct(product);
    setIsFormOpen(true);
  };

  const handleProductSaved = (savedProduct: Product) => {
    setProducts((prev) => {
      const exists = prev.some((p) => p.id === savedProduct.id);
      if (exists) {
        return prev.map((p) => (p.id === savedProduct.id ? savedProduct : p));
      }
      return [...prev, savedProduct];
    });
    setActiveCategory(savedProduct.categoryId);
    setIsFormOpen(false);
    setEditingProduct(null);
  };

  const handleProductDeleted = (deletedId: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== deletedId));
    setIsFormOpen(false);
    setEditingProduct(null);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-50 border-r border-zinc-200">
      {/* Categories & Search + Add Product Button */}
      <div className="p-4 bg-white border-b border-zinc-200 shadow-sm flex flex-col gap-3.5">
        <div className="flex items-center gap-2.5">
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Tìm kiếm món ăn..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-100 border-none rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
            />
          </div>

          <button
            type="button"
            onClick={fetchMenuFromApi}
            title="Làm mới thực đơn từ Neon DB"
            className="p-2.5 rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer shrink-0"
          >
            <RefreshCw size={17} className={cn(isLoading && 'animate-spin text-blue-600')} />
          </button>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-xs transition-all cursor-pointer shrink-0"
          >
            <Plus size={17} />
            <span>Thêm món</span>
          </button>
        </div>

        {!search && (
          <div className="flex gap-2 overflow-x-auto hide-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  'whitespace-nowrap px-4 py-2 rounded-xl text-sm font-semibold transition-colors cursor-pointer',
                  activeCategory === cat.id
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50',
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 auto-rows-max">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              onClick={() => onSelectProduct(product)}
              className="bg-white border border-zinc-200 rounded-2xl overflow-hidden hover:border-blue-500 hover:shadow-md transition-all cursor-pointer group flex flex-col relative"
            >
              {/* Nút Sửa món ăn nhanh góc phải trên */}
              <button
                type="button"
                title="Chỉnh sửa món ăn & Upload ảnh Cloudinary"
                onClick={(e) => handleOpenEditModal(e, product)}
                className="absolute top-2 right-2 z-10 p-1.5 rounded-lg bg-white/90 hover:bg-blue-600 text-zinc-700 hover:text-white shadow-sm opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
              >
                <Pencil size={14} />
              </button>

              <div className="aspect-square bg-zinc-100 relative overflow-hidden">
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (!target.src.includes('unsplash')) {
                      target.src =
                        'https://images.unsplash.com/photo-1558857563-b37cf5a228f4?auto=format&fit=crop&q=80&w=400';
                    }
                  }}
                  className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-3 flex flex-col flex-1">
                <h3 className="font-semibold text-zinc-900 text-sm line-clamp-2 mb-1">
                  {product.name}
                </h3>
                <span className="mt-auto text-blue-700 font-bold text-sm">
                  {formatCurrency(product.basePrice)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal Thêm / Chỉnh sửa món ăn & Upload ảnh Cloudinary */}
      {isFormOpen && (
        <ProductFormModal
          product={editingProduct}
          categories={categories}
          allToppings={toppings}
          defaultCategoryId={activeCategory}
          onClose={() => {
            setIsFormOpen(false);
            setEditingProduct(null);
          }}
          onSaved={handleProductSaved}
          onDeleted={handleProductDeleted}
        />
      )}
    </div>
  );
};
