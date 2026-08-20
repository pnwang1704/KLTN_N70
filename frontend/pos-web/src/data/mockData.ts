import type { Category, Product, Topping } from '../types';

export const mockCategories: Category[] = [
  { id: 'C1', name: 'Trà Sữa' },
  { id: 'C2', name: 'Cà Phê' },
  { id: 'C3', name: 'Trà Trái Cây' },
  { id: 'C4', name: 'Đồ Ăn Vặt' },
];

export const mockToppings: Topping[] = [
  { id: 'T1', name: 'Trân châu trắng', price: 10000 },
  { id: 'T2', name: 'Trân châu đen', price: 10000 },
  { id: 'T3', name: 'Thạch phô mai', price: 15000 },
  { id: 'T4', name: 'Kem cheese', price: 15000 },
  { id: 'T5', name: 'Pudding trứng', price: 10000 },
];

export const mockProducts: Product[] = [
  {
    id: 'P1',
    categoryId: 'C1',
    name: 'Trà Sữa Trân Châu KLTN',
    description: 'Trà sữa đậm vị trà đen, thơm béo vị sữa, best seller của quán.',
    basePrice: 35000,
    imageUrl: 'https://images.unsplash.com/photo-1558857563-b29598bdce58?auto=format&fit=crop&q=80&w=400',
    sizes: [
      { id: 'S', name: 'Size S', priceModifier: 0 },
      { id: 'M', name: 'Size M', priceModifier: 5000 },
      { id: 'L', name: 'Size L', priceModifier: 10000 },
    ],
    availableToppings: mockToppings,
  },
  {
    id: 'P2',
    categoryId: 'C1',
    name: 'Trà Sữa Matcha',
    description: 'Trà sữa matcha Nhật Bản thơm lừng, thanh mát.',
    basePrice: 40000,
    imageUrl: 'https://images.unsplash.com/photo-1557142046-c704a3adf364?auto=format&fit=crop&q=80&w=400',
    sizes: [
      { id: 'M', name: 'Size M', priceModifier: 0 },
      { id: 'L', name: 'Size L', priceModifier: 10000 },
    ],
    availableToppings: mockToppings,
  },
  {
    id: 'P3',
    categoryId: 'C2',
    name: 'Cà Phê Muối',
    description: 'Cà phê rang xay đậm đà kết hợp cùng lớp kem muối mặn mặn béo ngậy.',
    basePrice: 29000,
    imageUrl: 'https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&q=80&w=400',
    sizes: [
      { id: 'M', name: 'Size M', priceModifier: 0 },
      { id: 'L', name: 'Size L', priceModifier: 6000 },
    ],
    availableToppings: [],
  },
  {
    id: 'P4',
    categoryId: 'C3',
    name: 'Trà Đào Cam Sả',
    description: 'Thanh mát giải nhiệt với vị đào sả đặc trưng.',
    basePrice: 45000,
    imageUrl: 'https://images.unsplash.com/photo-1499638673689-79a0b5115d87?auto=format&fit=crop&q=80&w=400',
    sizes: [
      { id: 'M', name: 'Size M', priceModifier: 0 },
      { id: 'L', name: 'Size L', priceModifier: 10000 },
    ],
    availableToppings: [mockToppings[0]],
  },
  {
    id: 'P5',
    categoryId: 'C4',
    name: 'Bánh Mì Que Hải Phòng',
    description: 'Bánh mì que giòn rụm với pate cay nồng đậm vị.',
    basePrice: 15000,
    imageUrl: 'https://images.unsplash.com/photo-1550508139-b9c1d1a12a32?auto=format&fit=crop&q=80&w=400',
    sizes: [],
    availableToppings: [],
  }
];
