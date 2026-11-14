import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { Category } from './entities/category.entity';
import { Topping } from './entities/topping.entity';
import { Product, ProductSizeItem, ProductToppingItem } from './entities/product.entity';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { SEED_CATEGORIES, SEED_TOPPINGS, SEED_PRODUCTS, SeedProductItem } from './seed-data';

@Injectable()
export class ProductService implements OnModuleInit {
  private readonly logger = new Logger(ProductService.name);

  constructor(
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(Topping)
    private readonly toppingRepo: Repository<Topping>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async onModuleInit() {
    try {
      await this.seedInitialData();
    } catch (error: any) {
      this.logger.error(`Error during ProductService auto-seed: ${error?.message || error}`);
    }
  }

  private resolveLocalAssetPath(relativePath: string): string | null {
    const cleanRel = relativePath.replace(/^\/+/, ''); // e.g. 'products/tra-sua-tran-chau.jpg'
    const baseName = path.basename(cleanRel);
    const candidates = [
      path.resolve(process.cwd(), 'assets', cleanRel),
      path.resolve(process.cwd(), 'assets/products', baseName),
      path.resolve(__dirname, '../../assets', cleanRel),
      path.resolve(__dirname, '../../../assets', cleanRel),
      path.resolve(process.cwd(), '../../frontend/pos-web/public', cleanRel),
      path.resolve(__dirname, '../../../../frontend/pos-web/public', cleanRel),
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
    return null;
  }

  async resolveSeedImageToCloudinary(item: SeedProductItem): Promise<string> {
    if (item.imageUrl && item.imageUrl.includes('res.cloudinary.com')) {
      return item.imageUrl;
    }

    if (!this.cloudinaryService.isConfigured()) {
      return item.imageUrl;
    }

    const publicId = `product_${item.id.toLowerCase()}`;
    try {
      if (item.imageUrl.startsWith('/')) {
        const localFile = this.resolveLocalAssetPath(item.imageUrl);
        if (localFile) {
          const secureUrl = await this.cloudinaryService.uploadFromPathOrUrl(
            localFile,
            'pos_n70/products',
            publicId,
          );
          this.logger.log(`Uploaded local image for ${item.id} (${item.name}) -> ${secureUrl}`);
          return secureUrl;
        } else if (item.fallbackUrl) {
          const secureUrl = await this.cloudinaryService.uploadFromPathOrUrl(
            item.fallbackUrl,
            'pos_n70/products',
            publicId,
          );
          this.logger.log(`Uploaded fallback URL for ${item.id} (${item.name}) -> ${secureUrl}`);
          return secureUrl;
        }
      } else if (item.imageUrl.startsWith('http://') || item.imageUrl.startsWith('https://')) {
        const secureUrl = await this.cloudinaryService.uploadFromPathOrUrl(
          item.imageUrl,
          'pos_n70/products',
          publicId,
        );
        this.logger.log(`Uploaded remote image for ${item.id} (${item.name}) -> ${secureUrl}`);
        return secureUrl;
      }
    } catch (error: any) {
      this.logger.warn(
        `Could not upload seed image for ${item.id} to Cloudinary (${error?.message}). Using original URL.`,
      );
    }

    return item.imageUrl;
  }

  async seedInitialData(): Promise<{
    categoriesCount: number;
    toppingsCount: number;
    productsCount: number;
    cloudinaryUploadedCount: number;
  }> {
    // 1. Seed Categories
    const existingCategories = await this.categoryRepo.count();
    if (existingCategories === 0) {
      this.logger.log('Seeding default categories (C1..C4) into product_db...');
      await this.categoryRepo.save(
        SEED_CATEGORIES.map((c) => this.categoryRepo.create({ ...c, isActive: true })),
      );
    }

    // 2. Seed Toppings
    const existingToppings = await this.toppingRepo.count();
    if (existingToppings === 0) {
      this.logger.log('Seeding default toppings (T1..T8) into product_db...');
      await this.toppingRepo.save(
        SEED_TOPPINGS.map((t) => this.toppingRepo.create({ ...t, isActive: true })),
      );
    }

    // 3. Seed Products & Upload non-Cloudinary images if Cloudinary is configured
    let cloudinaryUploadedCount = 0;
    const existingProducts = await this.productRepo.find();
    const existingMap = new Map<string, Product>(existingProducts.map((p) => [p.id, p]));

    if (existingProducts.length === 0) {
      this.logger.log('Seeding 26 default products into product_db...');
      for (const item of SEED_PRODUCTS) {
        const resolvedImageUrl = await this.resolveSeedImageToCloudinary(item);
        if (resolvedImageUrl.includes('res.cloudinary.com')) {
          cloudinaryUploadedCount++;
        }
        const entity = this.productRepo.create({
          id: item.id,
          categoryId: item.categoryId,
          name: item.name,
          description: item.description,
          basePrice: item.basePrice,
          imageUrl: resolvedImageUrl,
          sizes: item.sizes,
          availableToppings: item.availableToppings,
          isActive: true,
        });
        await this.productRepo.save(entity);
      }
      this.logger.log(
        `Seeded ${SEED_PRODUCTS.length} products (${cloudinaryUploadedCount} uploaded to Cloudinary).`,
      );
    } else if (this.cloudinaryService.isConfigured()) {
      // If products already exist but some still use local/external non-Cloudinary URLs, migrate them to Cloudinary
      const seedMap = new Map<string, SeedProductItem>(SEED_PRODUCTS.map((s) => [s.id, s]));
      for (const product of existingProducts) {
        if (!product.imageUrl || !product.imageUrl.includes('res.cloudinary.com')) {
          const seedRef = seedMap.get(product.id) || {
            id: product.id,
            categoryId: product.categoryId,
            name: product.name,
            description: product.description || '',
            basePrice: product.basePrice,
            imageUrl: product.imageUrl || '/products/tra-sua-tran-chau.jpg',
            sizes: product.sizes || [],
            availableToppings: product.availableToppings || [],
          };
          const newUrl = await this.resolveSeedImageToCloudinary(seedRef);
          if (newUrl && newUrl !== product.imageUrl) {
            product.imageUrl = newUrl;
            await this.productRepo.save(product);
            if (newUrl.includes('res.cloudinary.com')) {
              cloudinaryUploadedCount++;
            }
          }
        }
      }
      if (cloudinaryUploadedCount > 0) {
        this.logger.log(
          `Migrated ${cloudinaryUploadedCount} existing product images to Cloudinary (pos_n70/products).`,
        );
      }
    }

    return {
      categoriesCount: await this.categoryRepo.count(),
      toppingsCount: await this.toppingRepo.count(),
      productsCount: await this.productRepo.count(),
      cloudinaryUploadedCount,
    };
  }

  async getCategories(): Promise<Category[]> {
    return this.categoryRepo.find({
      where: { isActive: true },
      order: { displayOrder: 'ASC', id: 'ASC' },
    });
  }

  async createCategory(dto: { id?: string; name: string; description?: string; displayOrder?: number }): Promise<Category> {
    if (!dto?.name?.trim()) {
      throw new BadRequestException('Tên danh mục không được để trống');
    }

    let id = dto.id?.trim();
    if (!id) {
      const all = await this.categoryRepo.find();
      let maxNum = 0;
      for (const c of all) {
        const m = /^C(\d+)$/i.exec(c.id);
        if (m) {
          const num = parseInt(m[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
      id = `C${maxNum + 1}`;
    }

    const category = this.categoryRepo.create({
      id,
      name: dto.name.trim(),
      description: dto.description || '',
      displayOrder: dto.displayOrder ?? 0,
      isActive: true,
    });
    return this.categoryRepo.save(category);
  }

  async getToppings(): Promise<Topping[]> {
    return this.toppingRepo.find({
      where: { isActive: true },
      order: { id: 'ASC' },
    });
  }

  private sortProductsNaturally(products: Product[]): Product[] {
    return [...products].sort((a, b) => {
      const ma = /^P(\d+)$/i.exec(a.id);
      const mb = /^P(\d+)$/i.exec(b.id);
      if (ma && mb) {
        return parseInt(ma[1], 10) - parseInt(mb[1], 10);
      }
      return a.createdAt && b.createdAt
        ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        : a.id.localeCompare(b.id);
    });
  }

  async getProducts(includeInactive = false): Promise<Product[]> {
    const products = await this.productRepo.find(
      includeInactive ? {} : { where: { isActive: true } },
    );
    return this.sortProductsNaturally(products);
  }

  async getProductById(id: string): Promise<Product> {
    const product = await this.productRepo.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Không tìm thấy món ăn với mã ${id}`);
    }
    return product;
  }

  async getNextProductCode(): Promise<string> {
    const all = await this.productRepo.find({ select: { id: true } });
    let maxNum = 0;
    for (const p of all) {
      const match = /^P(\d+)$/i.exec(p.id);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
    return `P${maxNum + 1}`;
  }

  private parseJsonField<T>(val: any, fallback: T): T {
    if (val === undefined || val === null || val === '') return fallback;
    if (Array.isArray(val) || typeof val === 'object') return val as T;
    if (typeof val === 'string') {
      try {
        return JSON.parse(val) as T;
      } catch {
        return fallback;
      }
    }
    return fallback;
  }

  async uploadProductImage(buffer: Buffer, originalName?: string): Promise<{ imageUrl: string; publicId: string }> {
    const baseName = originalName
      ? path.parse(originalName).name.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase()
      : undefined;
    const publicId = baseName ? `${baseName}_${Date.now()}` : `product_${Date.now()}`;
    const result = await this.cloudinaryService.uploadBuffer(buffer, 'pos_n70/products', publicId);
    return {
      imageUrl: result.secure_url,
      publicId: result.public_id,
    };
  }

  async createProduct(dto: any, fileBuffer?: Buffer, fileName?: string): Promise<Product> {
    if (!dto?.name?.trim()) {
      throw new BadRequestException('Tên món ăn không được để trống');
    }
    if (!dto?.categoryId?.trim()) {
      throw new BadRequestException('Danh mục món ăn (categoryId) không được để trống');
    }

    const id = dto.id?.trim() || (await this.getNextProductCode());
    let imageUrl = (dto.imageUrl || '').trim();

    if (fileBuffer && fileBuffer.length > 0) {
      const uploaded = await this.uploadProductImage(fileBuffer, fileName || id);
      imageUrl = uploaded.imageUrl;
    } else if (!imageUrl) {
      imageUrl = '/products/tra-sua-tran-chau.jpg';
    }

    const defaultSizes: ProductSizeItem[] = [
      { id: 'M', name: 'Size M', priceModifier: 0 },
      { id: 'L', name: 'Size L', priceModifier: 8000 },
    ];

    const sizes = this.parseJsonField<ProductSizeItem[]>(dto.sizes, defaultSizes);
    const availableToppings = this.parseJsonField<ProductToppingItem[]>(dto.availableToppings, []);
    const basePrice = Number(dto.basePrice ?? 0);

    const product = this.productRepo.create({
      id,
      categoryId: dto.categoryId.trim(),
      name: dto.name.trim(),
      description: (dto.description ?? '').trim(),
      basePrice: isNaN(basePrice) ? 0 : basePrice,
      imageUrl,
      sizes: Array.isArray(sizes) && sizes.length > 0 ? sizes : defaultSizes,
      availableToppings: Array.isArray(availableToppings) ? availableToppings : [],
      isActive: dto.isActive !== undefined ? String(dto.isActive) !== 'false' : true,
    });

    return this.productRepo.save(product);
  }

  async updateProduct(id: string, dto: any, fileBuffer?: Buffer, fileName?: string): Promise<Product> {
    const product = await this.getProductById(id);

    if (fileBuffer && fileBuffer.length > 0) {
      const uploaded = await this.uploadProductImage(fileBuffer, fileName || id);
      product.imageUrl = uploaded.imageUrl;
    } else if (dto.imageUrl !== undefined) {
      product.imageUrl = String(dto.imageUrl).trim();
    }

    if (dto.name !== undefined) product.name = String(dto.name).trim();
    if (dto.categoryId !== undefined) product.categoryId = String(dto.categoryId).trim();
    if (dto.description !== undefined) product.description = String(dto.description).trim();
    if (dto.basePrice !== undefined) {
      const parsed = Number(dto.basePrice);
      if (!isNaN(parsed)) product.basePrice = parsed;
    }
    if (dto.sizes !== undefined) {
      product.sizes = this.parseJsonField<ProductSizeItem[]>(dto.sizes, product.sizes);
    }
    if (dto.availableToppings !== undefined) {
      product.availableToppings = this.parseJsonField<ProductToppingItem[]>(
        dto.availableToppings,
        product.availableToppings,
      );
    }
    if (dto.isActive !== undefined) {
      product.isActive = String(dto.isActive) !== 'false';
    }

    return this.productRepo.save(product);
  }

  async deleteProduct(id: string): Promise<{ success: boolean; id: string }> {
    const product = await this.getProductById(id);
    await this.productRepo.remove(product);
    return { success: true, id };
  }
}
