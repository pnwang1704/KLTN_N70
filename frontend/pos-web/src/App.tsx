import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { ProductList } from './components/ProductList';
import { OrderPanel } from './components/OrderPanel';
import { ProductDetailModal } from './components/ProductDetailModal';
import { PaymentModal } from './components/PaymentModal';
import { LoginScreen } from './components/LoginScreen';
import { OrderHistory } from './components/OrderHistory';
import { InventoryManagement } from './components/InventoryManagement';
import { useSocket } from './hooks/useSocket';
import type { Product } from './types';

function App() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'POS' | 'HISTORY' | 'INVENTORY'>('POS');
  
  useEffect(() => {
    // Check if user is already logged in
    const storedUser = localStorage.getItem('pos_user');
    const token = localStorage.getItem('pos_token');
    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
    }

    // Listen for unauthorized event from Axios interceptor
    const handleUnauthorized = () => {
      setUser(null);
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const branchId = user?.branchId || '1';
  const { isConnected, toastMessage, clearToast } = useSocket(branchId);
  
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<{orderId: string, amount: number} | null>(null);

  if (!user) {
    return <LoginScreen onLoginSuccess={(u) => setUser(u)} />;
  }

  return (
    <div className="h-screen flex flex-col bg-zinc-100 overflow-hidden relative">
      <Header 
        isConnected={isConnected} 
        user={user} 
        onLogout={() => setUser(null)} 
        activeTab={activeTab}
        setActiveTab={(t) => setActiveTab(t as any)}
      />
      
      {activeTab === 'POS' && (
        <div className="flex-1 flex overflow-hidden">
          <div className="w-[60%] h-full">
            <ProductList onSelectProduct={setSelectedProduct} />
          </div>
          
          <div className="w-[40%] h-full border-l border-zinc-200">
            <OrderPanel onOpenPayment={(orderId, amount) => setPaymentInfo({ orderId, amount })} />
          </div>
        </div>
      )}

      {activeTab === 'HISTORY' && (
        <OrderHistory branchId={branchId} />
      )}

      {activeTab === 'INVENTORY' && (
        <InventoryManagement branchId={branchId} />
      )}

      {/* Modals */}
      {selectedProduct && (
        <ProductDetailModal 
          product={selectedProduct} 
          onClose={() => setSelectedProduct(null)} 
        />
      )}

      {paymentInfo && (
        <PaymentModal 
          orderId={paymentInfo.orderId}
          totalAmount={paymentInfo.amount}
          onClose={() => setPaymentInfo(null)}
          onSuccess={() => setPaymentInfo(null)}
        />
      )}

      {/* Toast Notification for Realtime ITEM_READY */}
      {toastMessage && (
        <div className="absolute top-20 right-6 z-50 bg-emerald-600 text-white px-6 py-4 rounded-xl shadow-2xl animate-in slide-in-from-right flex items-center gap-3">
          <span className="font-semibold">{toastMessage}</span>
          <button onClick={clearToast} className="text-emerald-200 hover:text-white">&times;</button>
        </div>
      )}
    </div>
  );
}

export default App;
