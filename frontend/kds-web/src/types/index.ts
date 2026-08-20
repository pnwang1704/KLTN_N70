export type ItemStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
export type OrderType = 'AT_TABLE' | 'TAKE_AWAY';

export interface OrderItemTopping {
  id: string;
  toppingId: string;
  toppingName: string;
  price: number;
  quantity: number;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  size?: string;
  quantity: number;
  unitPrice: number;
  note?: string;
  itemStatus: ItemStatus;
  toppings?: OrderItemTopping[];
}

export interface Order {
  id: string;
  branchId: string;
  tableId?: string;
  orderType: OrderType;
  status: string;
  totalAmount: number;
  finalAmount: number;
  createdAt: string;
  items: OrderItem[];
}
