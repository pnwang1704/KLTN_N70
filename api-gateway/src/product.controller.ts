import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Param,
  Body,
  Query,
  Inject,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { FileInterceptor } from '@nestjs/platform-express';
import { firstValueFrom, timeout } from 'rxjs';
import { Public } from './common/decorators/public.decorator';
import { Roles } from './common/decorators/roles.decorator';

const FALLBACK_CATEGORIES = [
  { id: 'C1', name: 'Trà Sữa' },
  { id: 'C2', name: 'Cà Phê' },
  { id: 'C3', name: 'Trà Trái Cây' },
  { id: 'C4', name: 'Đồ Ăn Vặt' },
];

const FALLBACK_TOPPINGS = [
  { id: 'T1', name: 'Trân châu trắng', price: 10000 },
  { id: 'T2', name: 'Trân châu đen', price: 10000 },
  { id: 'T3', name: 'Thạch phô mai tươi', price: 15000 },
  { id: 'T4', name: 'Kem cheese Macchiato', price: 15000 },
  { id: 'T5', name: 'Pudding trứng caramen', price: 10000 },
  { id: 'T6', name: 'Thạch củ năng giòn', price: 12000 },
  { id: 'T7', name: 'Đào miếng giòn', price: 12000 },
  { id: 'T8', name: 'Hạt sen bùi béo', price: 15000 },
];

@Controller()
export class ProductController {
  private readonly logger = new Logger(ProductController.name);

  constructor(
    @Inject('PRODUCT_SERVICE') private readonly productClient: ClientProxy,
  ) {}

  @Public()
  @Get('categories')
  async getCategories() {
    try {
      return await firstValueFrom(
        this.productClient.send({ cmd: 'get_categories' }, {}).pipe(timeout(8000)),
      );
    } catch (error: any) {
      this.logger.warn(`Fallback getCategories due to: ${error?.message || error}`);
      return FALLBACK_CATEGORIES;
    }
  }

  @Roles('ADMIN', 'MANAGER')
  @Post('categories')
  async createCategory(@Body() body: any) {
    return firstValueFrom(
      this.productClient.send({ cmd: 'create_category' }, body),
    );
  }

  @Public()
  @Get('toppings')
  async getToppings() {
    try {
      return await firstValueFrom(
        this.productClient.send({ cmd: 'get_toppings' }, {}).pipe(timeout(8000)),
      );
    } catch (error: any) {
      this.logger.warn(`Fallback getToppings due to: ${error?.message || error}`);
      return FALLBACK_TOPPINGS;
    }
  }

  @Public()
  @Get('products')
  async getProducts(@Query('includeInactive') includeInactive?: string) {
    return firstValueFrom(
      this.productClient
        .send({ cmd: 'get_products' }, { includeInactive: includeInactive === 'true' })
        .pipe(timeout(10000)),
    );
  }

  @Public()
  @Get('products/:id')
  async getProductById(@Param('id') id: string) {
    return firstValueFrom(
      this.productClient.send({ cmd: 'get_product' }, { id }),
    );
  }

  @Roles('ADMIN', 'MANAGER')
  @Post('products/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
    }),
  )
  async uploadProductImage(@UploadedFile() file: Express.Multer.File) {
    if (!file || !file.buffer) {
      throw new BadRequestException(
        'Vui lòng chọn file hình ảnh trong trường "file" (multipart/form-data)',
      );
    }
    return firstValueFrom(
      this.productClient.send(
        { cmd: 'upload_product_image' },
        {
          fileBase64: file.buffer.toString('base64'),
          originalName: file.originalname,
        },
      ),
    );
  }

  @Roles('ADMIN', 'MANAGER')
  @Post('products/seed')
  async seedProducts() {
    return firstValueFrom(
      this.productClient.send({ cmd: 'seed_products' }, {}),
    );
  }

  @Roles('ADMIN', 'MANAGER')
  @Post('products')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async createProduct(
    @Body() body: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return firstValueFrom(
      this.productClient.send(
        { cmd: 'create_product' },
        {
          dto: body,
          fileBase64: file?.buffer ? file.buffer.toString('base64') : undefined,
          originalName: file?.originalname,
        },
      ),
    );
  }

  @Roles('ADMIN', 'MANAGER')
  @Patch('products/:id')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async patchProduct(
    @Param('id') id: string,
    @Body() body: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return firstValueFrom(
      this.productClient.send(
        { cmd: 'update_product' },
        {
          id,
          dto: body,
          fileBase64: file?.buffer ? file.buffer.toString('base64') : undefined,
          originalName: file?.originalname,
        },
      ),
    );
  }

  @Roles('ADMIN', 'MANAGER')
  @Put('products/:id')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async putProduct(
    @Param('id') id: string,
    @Body() body: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return firstValueFrom(
      this.productClient.send(
        { cmd: 'update_product' },
        {
          id,
          dto: body,
          fileBase64: file?.buffer ? file.buffer.toString('base64') : undefined,
          originalName: file?.originalname,
        },
      ),
    );
  }

  @Roles('ADMIN', 'MANAGER')
  @Delete('products/:id')
  async deleteProduct(@Param('id') id: string) {
    return firstValueFrom(
      this.productClient.send({ cmd: 'delete_product' }, { id }),
    );
  }
}
