import { useState } from 'react';
import axios from 'axios';
import { Header } from './components/Header';
import { OrderGrid } from './components/OrderGrid';
import { useSocket } from './hooks/useSocket';

function App() {
  const [branchId, setBranchId] = useState('1');
  const [filter, setFilter] = useState('ALL');
  const { isConnected, orders, updateItemStatusState } = useSocket(branchId);

  const handleUpdateItemStatus = async (orderId: string, itemId: string, status: string) => {
    try {
      const token = localStorage.getItem('kds_token');
      
      // Update local state immediately for fast feedback
      updateItemStatusState(orderId, itemId, status);

      // Call API Gateway
      await axios.patch(
        'http://localhost:3000/orders/item-status',
        { orderItemId: itemId, itemStatus: status },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
    } catch (error) {
      console.error('Failed to update status', error);
      alert('Không thể cập nhật trạng thái món. Vui lòng kiểm tra Token!');
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header 
        branchId={branchId}
        setBranchId={setBranchId}
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
