export interface Category {
  id: string;
  name: string;
}

export interface Topping {
  id: string;
  name: string;
  price: number;
}

export interface ProductSize {
  id: string;
  name: string;
  priceModifier: number;
}

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  basePrice: number;
  imageUrl: string;
  sizes: ProductSize[];
  availableToppings: Topping[];
}

export interface CartItemTopping {
  toppingId: string;
  toppingName: string;
  price: number;
  quantity: number;
}

export interface CartItem {
  cartItemId: string; // Unique ID for cart item
  productId: string;
  productName: string;
  size: string; // 'S', 'M', 'L'
  unitPrice: number; // Base price + size modifier
  quantity: number;
  note: string;
  toppings: CartItemTopping[];
  totalPrice: number;
}

export interface HeldOrder {
  id: string;
  code: string; // e.g. '#TAM-01'
  createdAt: string; // ISO string
  orderType: 'AT_TABLE' | 'TAKE_AWAY';
  tableId?: string;
  items: CartItem[];
  discountType?: 'PERCENT' | 'AMOUNT';
  discountInput?: string;
  discountPercent?: number;
  discountAmount?: number;
  subtotal: number;
  finalTotal: number;
  note?: string;
}
