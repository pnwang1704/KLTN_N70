import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorators/public.decorator';

@Controller()
export class ProductController {
  @Public()
  @Get('categories')
  getCategories() {
    return [
      { id: 'C1', name: 'Trà Sữa' },
      { id: 'C2', name: 'Cà Phê' },
      { id: 'C3', name: 'Trà Trái Cây' },
      { id: 'C4', name: 'Đồ Ăn Vặt' },
    ];
  }

  @Public()
  @Get('toppings')
  getToppings() {
    return [
      { id: 'T1', name: 'Trân châu trắng', price: 10000 },
      { id: 'T2', name: 'Trân châu đen', price: 10000 },
      { id: 'T3', name: 'Thạch phô mai', price: 15000 },
      { id: 'T4', name: 'Kem cheese', price: 15000 },
      { id: 'T5', name: 'Pudding trứng', price: 10000 },
    ];
  }

  @Public()
  @Get('products')
  getProducts() {
    return [
      {
        id: 'P1',
        categoryId: 'C1',
        name: 'Trà Sữa Trân Châu KLTN',
        description: 'Trà sữa đậm vị trà đen, thơm béo vị sữa, best seller của quán.',
        basePrice: 35000,
        imageUrl: 'https://plus.unsplash.com/premium_photo-1661335265371-155707f2a739?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
        sizes: [
          { id: 'S', name: 'Size S', priceModifier: 0 },
          { id: 'M', name: 'Size M', priceModifier: 5000 },
          { id: 'L', name: 'Size L', priceModifier: 10000 },
        ],
        availableToppings: [
          { id: 'T1', name: 'Trân châu trắng', price: 10000 },
          { id: 'T2', name: 'Trân châu đen', price: 10000 },
        ],
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
        availableToppings: [
          { id: 'T1', name: 'Trân châu trắng', price: 10000 },
          { id: 'T2', name: 'Trân châu đen', price: 10000 },
        ],
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
        categoryId: 'C2',
        name: 'Bạc Xỉu Đá',
        description: 'Vị ngọt dịu của sữa đặc hòa quyện với cà phê phin nguyên chất thơm nồng.',
        basePrice: 28000,
        imageUrl: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&q=80&w=400',
        sizes: [
          { id: 'M', name: 'Size M', priceModifier: 0 },
          { id: 'L', name: 'Size L', priceModifier: 5000 },
        ],
        availableToppings: [],
      },
      {
        id: 'P5',
        categoryId: 'C3',
        name: 'Trà Đào Cam Sả',
        description: 'Thức uống thanh nhiệt giải khát tuyệt đỉnh, thơm lừng vị sả và cam tươi.',
        basePrice: 38000,
        imageUrl: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&q=80&w=400',
        sizes: [
          { id: 'M', name: 'Size M', priceModifier: 0 },
          { id: 'L', name: 'Size L', priceModifier: 8000 },
        ],
        availableToppings: [
          { id: 'T1', name: 'Trân châu trắng', price: 10000 },
        ],
      },
      {
        id: 'P6',
        categoryId: 'C4',
        name: 'Bánh Mì Chảo Đặc Biệt',
        description: 'Xúc xích, pate gan, trứng ốp la béo ngậy phục vụ nóng giòn kèm bánh mì.',
        basePrice: 45000,
        imageUrl: 'https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&q=80&w=400',
        sizes: [
          { id: 'M', name: 'Phần Tiêu Chuẩn', priceModifier: 0 },
        ],
        availableToppings: [],
      },
    ];
  }
}
