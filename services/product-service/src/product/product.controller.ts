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
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { ProductService } from './product.service';

@Controller()
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  // ========================================================
  // HTTP REST ENDPOINTS (Port 3002)
  // ========================================================

  @Get('categories')
  async getCategoriesHttp() {
    return this.productService.getCategories();
  }

  @Post('categories')
  async createCategoryHttp(@Body() body: any) {
    return this.productService.createCategory(body);
  }

  @Get('toppings')
  async getToppingsHttp() {
    return this.productService.getToppings();
  }

  @Get('products')
  async getProductsHttp(@Query('includeInactive') includeInactive?: string) {
    return this.productService.getProducts(includeInactive === 'true');
  }

  @Get('products/:id')
  async getProductByIdHttp(@Param('id') id: string) {
    return this.productService.getProductById(id);
  }

  @Post('products/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadProductImageHttp(@UploadedFile() file: Express.Multer.File) {
    if (!file || !file.buffer) {
      throw new BadRequestException('Vui lòng đính kèm file ảnh trong trường "file" (multipart/form-data)');
    }
    return this.productService.uploadProductImage(file.buffer, file.originalname);
  }

  @Post('products/seed')
  async seedProductsHttp() {
    return this.productService.seedInitialData();
  }

  @Post('products')
  @UseInterceptors(FileInterceptor('file'))
  async createProductHttp(
    @Body() body: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.productService.createProduct(body, file?.buffer, file?.originalname);
  }

  @Patch('products/:id')
  @UseInterceptors(FileInterceptor('file'))
  async patchProductHttp(
    @Param('id') id: string,
    @Body() body: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.productService.updateProduct(id, body, file?.buffer, file?.originalname);
  }

  @Put('products/:id')
  @UseInterceptors(FileInterceptor('file'))
  async putProductHttp(
    @Param('id') id: string,
    @Body() body: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.productService.updateProduct(id, body, file?.buffer, file?.originalname);
  }

  @Delete('products/:id')
  async deleteProductHttp(@Param('id') id: string) {
    return this.productService.deleteProduct(id);
  }

  // ========================================================
  // RABBITMQ RPC MESSAGE PATTERNS ('product_queue')
  // ========================================================

  @MessagePattern({ cmd: 'get_categories' })
  async getCategoriesRpc() {
    return this.productService.getCategories();
  }

  @MessagePattern({ cmd: 'create_category' })
  async createCategoryRpc(@Payload() data: any) {
    try {
      return await this.productService.createCategory(data);
    } catch (err: any) {
      throw new RpcException(err?.response || { statusCode: 400, message: err?.message });
    }
  }

  @MessagePattern({ cmd: 'get_toppings' })
  async getToppingsRpc() {
    return this.productService.getToppings();
  }

  @MessagePattern({ cmd: 'get_products' })
  async getProductsRpc(@Payload() data?: { includeInactive?: boolean }) {
    return this.productService.getProducts(Boolean(data?.includeInactive));
  }

  @MessagePattern({ cmd: 'get_product' })
  async getProductByIdRpc(@Payload() data: { id: string }) {
    try {
      return await this.productService.getProductById(data.id);
    } catch (err: any) {
      throw new RpcException(err?.response || { statusCode: 404, message: err?.message });
    }
  }

  @MessagePattern({ cmd: 'upload_product_image' })
  async uploadProductImageRpc(@Payload() data: { fileBase64: string; originalName?: string }) {
    try {
      const buffer = Buffer.from(data.fileBase64, 'base64');
      return await this.productService.uploadProductImage(buffer, data.originalName);
    } catch (err: any) {
      throw new RpcException(err?.response || { statusCode: 400, message: err?.message });
    }
  }

  @MessagePattern({ cmd: 'create_product' })
  async createProductRpc(@Payload() data: { dto: any; fileBase64?: string; originalName?: string }) {
    try {
      const buffer = data.fileBase64 ? Buffer.from(data.fileBase64, 'base64') : undefined;
      return await this.productService.createProduct(data.dto || data, buffer, data.originalName);
    } catch (err: any) {
      throw new RpcException(err?.response || { statusCode: 400, message: err?.message });
    }
  }

  @MessagePattern({ cmd: 'update_product' })
  async updateProductRpc(
    @Payload() data: { id: string; dto: any; fileBase64?: string; originalName?: string },
  ) {
    try {
      const buffer = data.fileBase64 ? Buffer.from(data.fileBase64, 'base64') : undefined;
      return await this.productService.updateProduct(data.id, data.dto, buffer, data.originalName);
    } catch (err: any) {
      throw new RpcException(err?.response || { statusCode: 400, message: err?.message });
    }
  }

  @MessagePattern({ cmd: 'delete_product' })
  async deleteProductRpc(@Payload() data: { id: string }) {
    try {
      return await this.productService.deleteProduct(data.id);
    } catch (err: any) {
      throw new RpcException(err?.response || { statusCode: 404, message: err?.message });
    }
  }

  @MessagePattern({ cmd: 'seed_products' })
  async seedProductsRpc() {
    return this.productService.seedInitialData();
  }
}

