import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { ProductCard } from './components/ProductCard';
import { ProductDetailModal } from './components/ProductDetailModal';
import { CartModal } from './components/CartModal';
import { SuccessScreen } from './components/SuccessScreen';
import { mockCategories, mockProducts } from './data/mockData';
import type { Product } from './types';
import { cn } from './lib/utils';
import { Coffee } from 'lucide-react';

function MainApp() {
  const [branchId, setBranchId] = useState<string>('');
  const [tableId, setTableId] = useState<string>('');
  
  const [activeCategoryId, setActiveCategoryId] = useState(mockCategories[0].id);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Read from URL query params
    const params = new URLSearchParams(window.location.search);
    const bId = params.get('branchId');
    const tId = params.get('tableId');
    if (bId) setBranchId(bId);
    if (tId) setTableId(tId);
    if (bId && tId) setIsReady(true);
  }, []);

  const filteredProducts = mockProducts.filter(p => p.categoryId === activeCategoryId);

  if (!isReady) {
    return (
      <div className="min-h-screen bg-orange-50 flex flex-col items-center justify-center p-6">
        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-6">
          <Coffee size={40} className="text-orange-500" />
        </div>
        <h1 className="text-2xl font-bold text-zinc-900 mb-2">Chào mừng bạn!</h1>
        <p className="text-zinc-500 text-center mb-8">Vui lòng nhập thông tin bàn để bắt đầu gọi món</p>
        
        <div className="w-full max-w-sm bg-white p-6 rounded-3xl shadow-sm border border-zinc-100">
          <div className="mb-4">
            <label className="block text-sm font-medium text-zinc-700 mb-1">Mã Chi Nhánh (Mặc định 1)</label>
            <input 
              type="text" 
              value={branchId}
              onChange={e => setBranchId(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500"
              placeholder="Nhập 1..."
            />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium text-zinc-700 mb-1">Số Bàn</label>
            <input 
              type="text" 
              value={tableId}
              onChange={e => setTableId(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500"
              placeholder="VD: 12"
            />
          </div>
          <button 
            onClick={() => {
              if(!branchId || !tableId) return alert('Vui lòng nhập đầy đủ Mã Chi Nhánh và Số Bàn!');
              setIsReady(true);
            }}
            className="w-full bg-orange-600 text-white rounded-xl py-3.5 font-bold active:scale-95 transition-transform"
          >
            Bắt đầu Gọi món
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-zinc-50 pb-24 max-w-md mx-auto shadow-2xl overflow-hidden bg-white">
      <Header 
        branchId={branchId} 
        tableId={tableId} 
        onOpenCart={() => setIsCartOpen(true)} 
      />

      {/* Category Horizontal Scroll */}
      <div className="sticky top-[61px] z-30 bg-white/80 backdrop-blur-md border-b border-zinc-100 py-3">
        <div className="flex gap-2 overflow-x-auto px-4 hide-scrollbar snap-x">
          {mockCategories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategoryId(cat.id)}
              className={cn(
                "whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold snap-start transition-colors",
                activeCategoryId === cat.id 
                  ? "bg-zinc-900 text-white" 
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Product List */}
      <div className="p-4 grid grid-cols-2 gap-4">
        {filteredProducts.map(product => (
          <ProductCard 
            key={product.id} 
            product={product} 
            onClick={setSelectedProduct} 
          />
        ))}
      </div>

      {/* Modals */}
      {selectedProduct && (
        <ProductDetailModal 
          product={selectedProduct} 
          onClose={() => setSelectedProduct(null)} 
        />
      )}

      {isCartOpen && (
        <CartModal 
          branchId={branchId}
          tableId={tableId}
          onClose={() => setIsCartOpen(false)}
          onSuccess={() => {
            setIsCartOpen(false);
            setIsSuccess(true);
          }}
        />
      )}

      {isSuccess && (
        <SuccessScreen onBackToMenu={() => setIsSuccess(false)} />
      )}
    </div>
  );
}

export default MainApp;
