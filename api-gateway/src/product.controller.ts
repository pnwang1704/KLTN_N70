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
      { id: 'T3', name: 'Thạch phô mai tươi', price: 15000 },
      { id: 'T4', name: 'Kem cheese Macchiato', price: 15000 },
      { id: 'T5', name: 'Pudding trứng caramen', price: 10000 },
      { id: 'T6', name: 'Thạch củ năng giòn', price: 12000 },
      { id: 'T7', name: 'Đào miếng giòn', price: 12000 },
      { id: 'T8', name: 'Hạt sen bùi béo', price: 15000 },
    ];
  }

  @Public()
  @Get('products')
  getProducts() {
    return [
      // ==========================================
      // NHÓM 1: TRÀ SỮA (C1)
      // ==========================================
      {
        id: 'P1',
        categoryId: 'C1',
        name: 'Trà Sữa Trân Châu KLTN',
        description: 'Trà sữa đậm vị trà đen, thơm béo vị sữa, best seller của quán.',
        basePrice: 35000,
        imageUrl: 'https://images.unsplash.com/photo-1558857563-b37cf5a228f4?auto=format&fit=crop&q=80&w=400',
        sizes: [
          { id: 'S', name: 'Size S', priceModifier: 0 },
          { id: 'M', name: 'Size M', priceModifier: 5000 },
          { id: 'L', name: 'Size L', priceModifier: 10000 },
        ],
        availableToppings: [
          { id: 'T1', name: 'Trân châu trắng', price: 10000 },
          { id: 'T2', name: 'Trân châu đen', price: 10000 },
          { id: 'T4', name: 'Kem cheese Macchiato', price: 15000 },
        ],
      },
      {
        id: 'P2',
        categoryId: 'C1',
        name: 'Trà Sữa Matcha Nhật Bản',
        description: 'Trà sữa matcha Uji thơm lừng, vị trà xanh thanh mát béo ngậy.',
        basePrice: 40000,
        imageUrl: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&q=80&w=400',
        sizes: [
          { id: 'M', name: 'Size M', priceModifier: 0 },
          { id: 'L', name: 'Size L', priceModifier: 10000 },
        ],
        availableToppings: [
          { id: 'T1', name: 'Trân châu trắng', price: 10000 },
          { id: 'T5', name: 'Pudding trứng caramen', price: 10000 },
        ],
      },
      {
        id: 'P7',
        categoryId: 'C1',
        name: 'Trà Sữa Oolong Nướng',
        description: 'Vị trà Ô long sao nướng đậm đà, thơm lừng vị khói caramen đặc trưng.',
        basePrice: 42000,
        imageUrl: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&q=80&w=400',
        sizes: [
          { id: 'M', name: 'Size M', priceModifier: 0 },
          { id: 'L', name: 'Size L', priceModifier: 8000 },
        ],
        availableToppings: [
          { id: 'T2', name: 'Trân châu đen', price: 10000 },
          { id: 'T4', name: 'Kem cheese Macchiato', price: 15000 },
        ],
      },
      {
        id: 'P8',
        categoryId: 'C1',
        name: 'Trà Sữa Khoai Môn Tươi',
        description: 'Khoai môn tươi dầm béo bùi, màu tím pastel ngọt ngào quyến rũ.',
        basePrice: 39000,
        imageUrl: 'https://images.unsplash.com/photo-1579954115545-a95591f28bfc?auto=format&fit=crop&q=80&w=400',
        sizes: [
          { id: 'M', name: 'Size M', priceModifier: 0 },
          { id: 'L', name: 'Size L', priceModifier: 8000 },
        ],
        availableToppings: [
          { id: 'T1', name: 'Trân châu trắng', price: 10000 },
          { id: 'T3', name: 'Thạch phô mai tươi', price: 15000 },
        ],
      },
      {
        id: 'P9',
        categoryId: 'C1',
        name: 'Trà Sữa Socola Hạnh Nhân',
        description: 'Cacao nguyên chất đắng nhẹ hòa quyện cùng sữa béo và vụn hạnh nhân.',
        basePrice: 42000,
        imageUrl: 'https://images.unsplash.com/photo-1541658016709-82535e94bc69?auto=format&fit=crop&q=80&w=400',
        sizes: [
          { id: 'M', name: 'Size M', priceModifier: 0 },
          { id: 'L', name: 'Size L', priceModifier: 10000 },
        ],
        availableToppings: [
          { id: 'T2', name: 'Trân châu đen', price: 10000 },
          { id: 'T5', name: 'Pudding trứng caramen', price: 10000 },
        ],
      },
      {
        id: 'P10',
        categoryId: 'C1',
        name: 'Trà Sữa Thái Xanh Thảo Mộc',
        description: 'Trà xanh Thái Lan đậm vị thảo mộc thanh dịu, giải nhiệt cực tốt.',
        basePrice: 32000,
        imageUrl: 'https://images.unsplash.com/photo-1556881286-fc6915169721?auto=format&fit=crop&q=80&w=400',
        sizes: [
          { id: 'M', name: 'Size M', priceModifier: 0 },
          { id: 'L', name: 'Size L', priceModifier: 6000 },
        ],
        availableToppings: [
          { id: 'T1', name: 'Trân châu trắng', price: 10000 },
          { id: 'T6', name: 'Thạch củ năng giòn', price: 12000 },
        ],
      },
      {
        id: 'P11',
        categoryId: 'C1',
        name: 'Trà Bá Tước Kem Trứng Cháy',
        description: 'Trà Earl Grey quý tộc thơm hương cam Bergamot phủ lớp kem trứng cháy béo mịn.',
        basePrice: 46000,
        imageUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&q=80&w=400',
        sizes: [
          { id: 'M', name: 'Size M', priceModifier: 0 },
          { id: 'L', name: 'Size L', priceModifier: 10000 },
        ],
        availableToppings: [
          { id: 'T1', name: 'Trân châu trắng', price: 10000 },
          { id: 'T3', name: 'Thạch phô mai tươi', price: 15000 },
        ],
      },

      // ==========================================
      // NHÓM 2: CÀ PHÊ (C2)
      // ==========================================
      {
        id: 'P3',
        categoryId: 'C2',
        name: 'Cà Phê Muối Xứ Huế',
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
        name: 'Bạc Xỉu 3 Tầng Sài Gòn',
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
        id: 'P12',
        categoryId: 'C2',
        name: 'Cà Phê Đen Đá Phin Truyền Thống',
        description: 'Hạt Robusta Đắk Lắk nguyên chất, vị đắng đậm đà đánh thức mọi giác quan.',
        basePrice: 22000,
        imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&q=80&w=400',
        sizes: [
          { id: 'M', name: 'Size M', priceModifier: 0 },
          { id: 'L', name: 'Size L', priceModifier: 5000 },
        ],
        availableToppings: [],
      },
      {
        id: 'P13',
        categoryId: 'C2',
        name: 'Cà Phê Sữa Đá Đậm Đà',
        description: 'Cà phê phin pha chế theo tỷ lệ vàng cùng sữa đặc truyền thống.',
        basePrice: 25000,
        imageUrl: 'https://images.unsplash.com/photo-1587080413959-06b859fb107d?auto=format&fit=crop&q=80&w=400',
        sizes: [
          { id: 'M', name: 'Size M', priceModifier: 0 },
          { id: 'L', name: 'Size L', priceModifier: 5000 },
        ],
        availableToppings: [],
      },
      {
        id: 'P14',
        categoryId: 'C2',
        name: 'Cold Brew Cam Vàng Mọng Nước',
        description: 'Cà phê Arabica ủ lạnh 18 tiếng kết hợp lát cam vàng tươi mát sảng khoái.',
        basePrice: 45000,
        imageUrl: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&q=80&w=400',
        sizes: [
          { id: 'M', name: 'Size M', priceModifier: 0 },
          { id: 'L', name: 'Size L', priceModifier: 8000 },
        ],
        availableToppings: [],
      },
      {
        id: 'P15',
        categoryId: 'C2',
        name: 'Cà Phê Cốt Dừa Đá Xay',
        description: 'Cốt dừa béo ngậy xay tuyết mịn màng hòa quyện shot cà phê nguyên chất thơm lừng.',
        basePrice: 42000,
        imageUrl: 'https://images.unsplash.com/photo-1592321675774-3de57f3ee0dc?auto=format&fit=crop&q=80&w=400',
        sizes: [
          { id: 'M', name: 'Size M', priceModifier: 0 },
          { id: 'L', name: 'Size L', priceModifier: 8000 },
        ],
        availableToppings: [],
      },

      // ==========================================
      // NHÓM 3: TRÀ TRÁI CÂY (C3)
      // ==========================================
      {
        id: 'P5',
        categoryId: 'C3',
        name: 'Trà Đào Cam Sả Tươi',
        description: 'Thức uống thanh nhiệt giải khát tuyệt đỉnh, thơm lừng vị sả và cam vàng tươi.',
        basePrice: 38000,
        imageUrl: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&q=80&w=400',
        sizes: [
          { id: 'M', name: 'Size M', priceModifier: 0 },
          { id: 'L', name: 'Size L', priceModifier: 8000 },
        ],
        availableToppings: [
          { id: 'T1', name: 'Trân châu trắng', price: 10000 },
          { id: 'T7', name: 'Đào miếng giòn', price: 12000 },
        ],
      },
      {
        id: 'P16',
        categoryId: 'C3',
        name: 'Trà Vải Hoa Lài Thanh Mát',
        description: 'Hương lài thơm ngát kết hợp cùng những trái vải mọng nước ngọt thanh dịu nhẹ.',
        basePrice: 38000,
        imageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&q=80&w=400',
        sizes: [
          { id: 'M', name: 'Size M', priceModifier: 0 },
          { id: 'L', name: 'Size L', priceModifier: 8000 },
        ],
        availableToppings: [
          { id: 'T1', name: 'Trân châu trắng', price: 10000 },
          { id: 'T6', name: 'Thạch củ năng giòn', price: 12000 },
        ],
      },
      {
        id: 'P17',
        categoryId: 'C3',
        name: 'Trà Ổi Hồng Hạt Chia',
        description: 'Ổi hồng tươi thơm ngọt mát lành hòa quyện hạt chia dinh dưỡng đẹp dáng sáng da.',
        basePrice: 40000,
        imageUrl: 'https://images.unsplash.com/photo-1546173159-315724a31696?auto=format&fit=crop&q=80&w=400',
        sizes: [
          { id: 'M', name: 'Size M', priceModifier: 0 },
          { id: 'L', name: 'Size L', priceModifier: 8000 },
        ],
        availableToppings: [
          { id: 'T1', name: 'Trân châu trắng', price: 10000 },
        ],
      },
      {
        id: 'P18',
        categoryId: 'C3',
        name: 'Trà Mãng Cầu Tươi Đắk Lắk',
        description: 'Thịt mãng cầu xiêm xé sợi chua ngọt đậm đà, hot trend giải nhiệt ngày hè.',
        basePrice: 42000,
        imageUrl: 'https://images.unsplash.com/photo-1622597467836-f3285f2131b8?auto=format&fit=crop&q=80&w=400',
        sizes: [
          { id: 'M', name: 'Size M', priceModifier: 0 },
          { id: 'L', name: 'Size L', priceModifier: 8000 },
        ],
        availableToppings: [
          { id: 'T1', name: 'Trân châu trắng', price: 10000 },
        ],
      },
      {
        id: 'P19',
        categoryId: 'C3',
        name: 'Trà Chanh Giã Tay Thơm Nồng',
        description: 'Chanh thơm Quảng Đông giã tay tươi giải phóng trọn vẹn tinh dầu the mát sảng khoái.',
        basePrice: 35000,
        imageUrl: 'https://images.unsplash.com/photo-1527661591475-527312dd65f5?auto=format&fit=crop&q=80&w=400',
        sizes: [
          { id: 'M', name: 'Size M', priceModifier: 0 },
          { id: 'L', name: 'Size L', priceModifier: 6000 },
        ],
        availableToppings: [
          { id: 'T1', name: 'Trân châu trắng', price: 10000 },
        ],
      },
      {
        id: 'P20',
        categoryId: 'C3',
        name: 'Trà Dâu Tằm Pha Lê Tuyết',
        description: 'Dâu tằm chín mọng nước chua ngọt dịu mát, sắc đỏ ruby quyến rũ mê hoặc.',
        basePrice: 40000,
        imageUrl: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&q=80&w=400',
        sizes: [
          { id: 'M', name: 'Size M', priceModifier: 0 },
          { id: 'L', name: 'Size L', priceModifier: 8000 },
        ],
        availableToppings: [
          { id: 'T1', name: 'Trân châu trắng', price: 10000 },
          { id: 'T4', name: 'Kem cheese Macchiato', price: 15000 },
        ],
      },

      // ==========================================
      // NHÓM 4: ĐỒ ĂN VẶT (C4)
      // ==========================================
      {
        id: 'P6',
        categoryId: 'C4',
        name: 'Bánh Mì Chảo Đặc Biệt',
        description: 'Xúc xích, pate gan, trứng ốp la béo ngậy phục vụ nóng giòn kèm bánh mì thơm phức.',
        basePrice: 45000,
        imageUrl: 'https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&q=80&w=400',
        sizes: [
          { id: 'M', name: 'Phần Tiêu Chuẩn', priceModifier: 0 },
        ],
        availableToppings: [],
      },
      {
        id: 'P21',
        categoryId: 'C4',
        name: 'Cá Viên Chiên Nước Mắm Tỏi Ớt',
        description: 'Cá viên, bò viên chiên vàng giòn xóc sốt nước mắm tỏi ớt kẹo dẻo thơm nức mũi.',
        basePrice: 35000,
        imageUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&q=80&w=400',
        sizes: [
          { id: 'M', name: 'Hộp Vừa', priceModifier: 0 },
          { id: 'L', name: 'Hộp Lớn', priceModifier: 15000 },
        ],
        availableToppings: [],
      },
      {
        id: 'P22',
        categoryId: 'C4',
        name: 'Khoai Tây Lắc Phô Mai Giòn Rụm',
        description: 'Khoai tây cọng Bỉ chiên vàng giòn rụm phủ lớp bột phô mai thơm lừng mặn ngọt.',
        basePrice: 30000,
        imageUrl: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&q=80&w=400',
        sizes: [
          { id: 'M', name: 'Phần Vừa', priceModifier: 0 },
          { id: 'L', name: 'Phần Lớn', priceModifier: 10000 },
        ],
        availableToppings: [],
      },
      {
        id: 'P23',
        categoryId: 'C4',
        name: 'Gà Rán Giòn Sốt Cay Hàn Quốc',
        description: 'Má đùi gà tẩm bột chiên giòn tan ngập trong sốt tương cay ngọt đậm đà chuẩn vị.',
        basePrice: 48000,
        imageUrl: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&q=80&w=400',
        sizes: [
          { id: 'M', name: '3 Miếng', priceModifier: 0 },
          { id: 'L', name: '5 Miếng', priceModifier: 25000 },
        ],
        availableToppings: [],
      },
      {
        id: 'P24',
        categoryId: 'C4',
        name: 'Bánh Tráng Trộn Bò Khô Trứng Cút',
        description: 'Bánh tráng phơi sương dẻo, bò khô cay, tép khô, xoài chua băm và trứng cút.',
        basePrice: 25000,
        imageUrl: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&q=80&w=400',
        sizes: [
          { id: 'M', name: 'Phần Tiêu Chuẩn', priceModifier: 0 },
        ],
        availableToppings: [],
      },
      {
        id: 'P25',
        categoryId: 'C4',
        name: 'Nem Chua Rán Phố Cổ Hà Nội',
        description: 'Nem chua tẩm bột chiên xù giòn rụm bên ngoài, dai mềm ngọt vị bên trong chấm tương ớt.',
        basePrice: 38000,
        imageUrl: 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?auto=format&fit=crop&q=80&w=400',
        sizes: [
          { id: 'M', name: 'Phần 6 Chiếc', priceModifier: 0 },
          { id: 'L', name: 'Phần 10 Chiếc', priceModifier: 20000 },
        ],
        availableToppings: [],
      },
      {
        id: 'P26',
        categoryId: 'C4',
        name: 'Bắp Xào Tép Bơ Hành Nóng Hổi',
        description: 'Hạt bắp ngọt xào bơ thơm lừng quyện cùng tép khô mằn mặn và hành hoa ngát hương.',
        basePrice: 30000,
        imageUrl: 'https://images.unsplash.com/photo-1551782450-a2132b4ba21d?auto=format&fit=crop&q=80&w=400',
        sizes: [
          { id: 'M', name: 'Phần Tiêu Chuẩn', priceModifier: 0 },
        ],
        availableToppings: [],
      },
    ];
  }
}
