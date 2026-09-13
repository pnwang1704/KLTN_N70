import { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { ProductCard } from './components/ProductCard';
import { ProductDetailModal } from './components/ProductDetailModal';
import { CartModal } from './components/CartModal';
import { SuccessScreen } from './components/SuccessScreen';
import { TableSelectScreen } from './components/TableSelectScreen';
import { mockCategories, mockProducts } from './data/mockData';
import type { Product } from './types';
import { cn } from './lib/utils';

const STORAGE_KEY_BRANCH = 'customer_branch_id';
const STORAGE_KEY_TABLE = 'customer_table_id';

/**
 * Extracts branchId and tableId from current URL (Query params or Path)
 * Supports:
 * - ?branchId=1&tableId=5
 * - ?branch=1&table=5
 * - ?tableId=5 (defaults branchId to '1')
 * - /table/5?branch=1
 * - /table/5
 */
function parseTableFromUrl(): { branchId: string; tableId: string } | null {
  try {
    const url = new URL(window.location.href);
    const searchParams = url.searchParams;

    let tableId = searchParams.get('tableId') || searchParams.get('table') || '';
    let branchId = searchParams.get('branchId') || searchParams.get('branch') || '';

    // Check path pattern: /table/:tableId
    const pathMatch = url.pathname.match(/\/table\/([^/?#]+)/i);
    if (pathMatch && pathMatch[1]) {
      tableId = decodeURIComponent(pathMatch[1]);
    }

    if (tableId.trim()) {
      let cleanTableId = tableId.trim();
      if (/^\d+$/.test(cleanTableId)) {
        cleanTableId = String(parseInt(cleanTableId, 10));
      }
      return {
        tableId: cleanTableId,
        branchId: (branchId || '1').trim(),
      };
    }
  } catch (e) {
    console.warn('Could not parse URL params', e);
  }

  return null;
}

function MainApp() {
  const [branchId, setBranchId] = useState<string>('1');
  const [tableId, setTableId] = useState<string>('');
  const [isReady, setIsReady] = useState(false);
  
  const [activeCategoryId, setActiveCategoryId] = useState(mockCategories[0].id);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [successOrder, setSuccessOrder] = useState<any>(null);

  // Sync state & routing
  const applyTableSession = useCallback((bId: string, tId: string, pushToMenu = true) => {
    const cleanBranchId = bId || '1';
    const cleanTableId = tId.trim();

    setBranchId(cleanBranchId);
    setTableId(cleanTableId);
    localStorage.setItem(STORAGE_KEY_BRANCH, cleanBranchId);
    localStorage.setItem(STORAGE_KEY_TABLE, cleanTableId);
    setIsReady(true);

    if (pushToMenu) {
      const targetUrl = `/menu?branchId=${cleanBranchId}&tableId=${cleanTableId}`;
      if (window.location.pathname !== '/menu' || window.location.search !== `?branchId=${cleanBranchId}&tableId=${cleanTableId}`) {
        window.history.replaceState({ page: 'menu', branchId: cleanBranchId, tableId: cleanTableId }, '', targetUrl);
      }
    }
  }, []);

  // Handle URL identification & session restore
  useEffect(() => {
    const urlInfo = parseTableFromUrl();
    const storedTableId = localStorage.getItem(STORAGE_KEY_TABLE);
    const storedBranchId = localStorage.getItem(STORAGE_KEY_BRANCH) || '1';

    if (urlInfo && urlInfo.tableId) {
      // 1. Auto-redirect when URL contains table info (e.g. ?branchId=1&tableId=5 or /table/5)
      applyTableSession(urlInfo.branchId, urlInfo.tableId, true);
    } else if (window.location.pathname.startsWith('/menu') && storedTableId) {
      // 2. Refresh on /menu with stored session
      applyTableSession(storedBranchId, storedTableId, false);
    } else {
      // 3. Fallback screen: Show manual entry
      if (storedTableId) {
        setTableId(storedTableId);
      }
      if (storedBranchId) {
        setBranchId(storedBranchId);
      }
      setIsReady(false);
    }
  }, [applyTableSession]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const urlInfo = parseTableFromUrl();
      if (urlInfo && urlInfo.tableId) {
        applyTableSession(urlInfo.branchId, urlInfo.tableId, false);
      } else if (window.location.pathname === '/' || window.location.pathname === '') {
        setIsReady(false);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [applyTableSession]);

  // User manually confirms table on Fallback Screen
  const handleConfirmManualTable = (manualTableId: string) => {
    applyTableSession(branchId || '1', manualTableId, true);
  };

  // User clicks "Đổi bàn" in Header
  const handleChangeTable = () => {
    window.history.pushState({ page: 'table-select' }, '', '/');
    setIsReady(false);
  };

  const filteredProducts = mockProducts.filter(p => p.categoryId === activeCategoryId);

  // Fallback Screen for manual entry
  if (!isReady) {
    return (
      <TableSelectScreen 
        initialTableId={tableId}
        branchName="Chi nhánh 1: Quận Gò Vấp (12 Nguyễn Văn Bảo)"
        onConfirmTable={handleConfirmManualTable}
      />
    );
  }

  // Main Menu & Ordering Screen (Mobile-First Frame)
  return (
    <div className="min-h-screen bg-zinc-900/90 sm:bg-zinc-100 flex items-start justify-center sm:py-6 sm:px-4">
      <div className="relative min-h-screen sm:min-h-[720px] sm:max-h-[92vh] sm:rounded-3xl w-full max-w-md bg-white shadow-2xl pb-24 flex flex-col overflow-y-auto animate-in fade-in duration-200">
        
        <Header 
          branchId={branchId} 
          tableId={tableId} 
          onOpenCart={() => setIsCartOpen(true)} 
          onChangeTable={handleChangeTable}
        />

        {/* Category Horizontal Scroll */}
        <div className="sticky top-[61px] z-30 bg-white/90 backdrop-blur-md border-b border-zinc-100 py-3 shadow-xs">
          <div className="flex gap-2 overflow-x-auto px-4 hide-scrollbar snap-x">
            {mockCategories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategoryId(cat.id)}
                className={cn(
                  "whitespace-nowrap px-4 py-2 rounded-full text-xs sm:text-sm font-semibold snap-start transition-all cursor-pointer shrink-0 active:scale-95",
                  activeCategoryId === cat.id 
                    ? "bg-zinc-900 text-white shadow-xs" 
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900"
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Product List */}
        <div className="p-4 grid grid-cols-2 gap-3.5 flex-1">
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
            onSuccess={(order) => {
              setIsCartOpen(false);
              setSuccessOrder(order);
            }}
          />
        )}

        {successOrder && (
          <SuccessScreen 
            order={successOrder} 
            onBackToMenu={() => setSuccessOrder(null)} 
          />
        )}
      </div>
    </div>
  );
}

export default MainApp;
