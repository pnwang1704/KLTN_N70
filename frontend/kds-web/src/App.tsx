import { useState, useEffect } from 'react';
import api from './lib/axios';
import { Header } from './components/Header';
import { OrderGrid } from './components/OrderGrid';
import { LoginScreen } from './components/LoginScreen';
import { useSocket } from './hooks/useSocket';

function App() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Check if user is already logged in
    const storedUser = localStorage.getItem('kds_user');
    const token = localStorage.getItem('kds_token');
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
  const [filter, setFilter] = useState('ALL');
  const { isConnected, orders, updateItemStatusState } = useSocket(branchId);

  const handleUpdateItemStatus = async (orderId: string, itemId: string, status: string) => {
    try {
      // Update local state immediately for fast feedback
      updateItemStatusState(orderId, itemId, status);

      // Call API Gateway using Axios Interceptor
      await api.patch(
        '/orders/item-status',
        { orderItemId: itemId, itemStatus: status }
      );
    } catch (error) {
      console.error('Failed to update status', error);
      alert('Không thể cập nhật trạng thái món. Vui lòng kiểm tra Token!');
    }
  };

  if (!user) {
    return <LoginScreen onLoginSuccess={(u) => setUser(u)} />;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header 
        user={user}
        onLogout={() => setUser(null)}
        isConnected={isConnected}
        filter={filter}
        setFilter={setFilter}
      />
      <main className="flex-1 bg-zinc-950 overflow-y-auto">
        <OrderGrid 
          orders={orders}
          filter={filter}
          onUpdateItemStatus={handleUpdateItemStatus}
        />
      </main>
    </div>
  );
}

export default App;
