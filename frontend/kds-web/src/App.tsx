import { useState, useEffect } from 'react';
import api from './lib/axios';
import { Header, type KdsBranchItem } from './components/Header';
import { OrderGrid } from './components/OrderGrid';
import { LoginScreen } from './components/LoginScreen';
import { useSocket } from './hooks/useSocket';

function App() {
  const [user, setUser] = useState<any>(null);
  const [branches, setBranches] = useState<KdsBranchItem[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    () => localStorage.getItem('kds_branch_id') || '1'
  );

  useEffect(() => {
    // Check if user is already logged in
    const storedUser = localStorage.getItem('kds_user');
    const token = localStorage.getItem('kds_token');
    if (storedUser && token) {
      const parsed = JSON.parse(storedUser);
      setUser(parsed);
      if (parsed?.branchId && !localStorage.getItem('kds_branch_id')) {
        setSelectedBranchId(String(parsed.branchId));
      }
    }

    // Fetch branches for KDS selector
    api
      .get('/branches')
      .then((res) => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setBranches(res.data);
        }
      })
      .catch((err) => console.warn('Không tải được danh sách chi nhánh cho KDS:', err));

    // Listen for unauthorized event from Axios interceptor
    const handleUnauthorized = () => {
      setUser(null);
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const branchId = selectedBranchId || user?.branchId || '1';
  const [filter, setFilter] = useState('ALL');
  const { isConnected, orders, updateItemStatusState } = useSocket(branchId);

  const handleChangeBranch = (newBranchId: string) => {
    setSelectedBranchId(String(newBranchId));
    localStorage.setItem('kds_branch_id', String(newBranchId));
  };

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
        branches={branches}
        selectedBranchId={branchId}
        onChangeBranch={handleChangeBranch}
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
