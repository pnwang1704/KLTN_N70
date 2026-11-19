import { Controller, Post, Get, Put, Patch, Delete, Body, Param, Query, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Roles } from './common/decorators/roles.decorator';
import { CreateIngredientDto, UpdateIngredientDto, CreateRecipeDto, UpdateRecipeDto, StockInDto } from './dto/inventory.dto';

@Controller('inventory')
export class InventoryController {
  constructor(
    @Inject('INVENTORY_SERVICE') private readonly inventoryClient: ClientProxy,
  ) {}

  // --- INGREDIENTS ---
  @Roles('ADMIN', 'MANAGER')
  @Post('ingredients')
  createIngredient(@Body() dto: CreateIngredientDto) {
    return this.inventoryClient.send('create_ingredient', dto);
  }

  @Roles('ADMIN', 'MANAGER')
  @Get('ingredients')
  getIngredients(@Query('branchId') branchId?: string) {
    return this.inventoryClient.send('get_ingredients', branchId ? { branchId } : {});
  }

  @Roles('ADMIN', 'MANAGER')
  @Put('ingredients/:id')
  updateIngredient(@Param('id') id: string, @Body() dto: UpdateIngredientDto) {
    return this.inventoryClient.send('update_ingredient', { id, dto });
  }

  @Roles('ADMIN', 'MANAGER')
  @Patch('ingredients/:id/stock')
  adjustIngredientStock(@Param('id') id: string, @Body() body: any) {
    return this.inventoryClient.send('adjust_ingredient_stock', {
      id,
      data: body || {},
    });
  }

  @Roles('ADMIN', 'MANAGER')
  @Delete('ingredients/:id')
  deleteIngredient(@Param('id') id: string) {
    return this.inventoryClient.send('delete_ingredient', { id });
  }

  // --- RECIPES / BOM ---
  @Roles('ADMIN', 'MANAGER')
  @Post('recipes')
  createRecipe(@Body() dto: CreateRecipeDto) {
    return this.inventoryClient.send('create_recipe', dto);
  }

  @Roles('ADMIN', 'MANAGER')
  @Get('recipes')
  getRecipes() {
    return this.inventoryClient.send('get_recipes', {});
  }

  @Roles('ADMIN', 'MANAGER')
  @Get('recipes/:productId')
  getRecipeByProduct(
    @Param('productId') productId: string,
    @Query('size') size?: string,
  ) {
    return this.inventoryClient.send('get_recipe_by_product', {
      productId,
      size,
    });
  }

  @Roles('ADMIN', 'MANAGER')
  @Put('recipes/:productId')
  upsertProductRecipe(
    @Param('productId') productId: string,
    @Body() body: any,
  ) {
    return this.inventoryClient.send('upsert_product_recipe', {
      productId,
      data: body || {},
    });
  }

  // --- STOCKS ---
  @Roles('ADMIN', 'MANAGER')
  @Post('stocks/in')
  stockIn(@Body() dto: StockInDto & { note?: string }) {
    return this.inventoryClient.send('stock_in', dto);
  }

  @Roles('ADMIN', 'MANAGER')
  @Get('stocks/:branchId')
  getStockByBranch(@Param('branchId') branchId: string) {
    return this.inventoryClient.send('get_stock', { branchId });
  }

  @Roles('ADMIN', 'MANAGER')
  @Get('stocks/:branchId/low')
  getLowStockAlerts(@Param('branchId') branchId: string) {
    return this.inventoryClient.send('get_low_stock', { branchId });
  }

  // --- INVENTORY LOGS / TRANSACTIONS ---
  @Roles('ADMIN', 'MANAGER')
  @Get('logs')
  getInventoryLogs(
    @Query('branchId') branchId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.inventoryClient.send('get_inventory_transactions', {
      branchId: branchId || '1',
      limit: limit ? Number(limit) : 100,
    });
  }

  @Roles('ADMIN', 'MANAGER')
  @Get('transactions/:branchId')
  getTransactionsByBranch(
    @Param('branchId') branchId: string,
    @Query('limit') limit?: string,
  ) {
    return this.inventoryClient.send('get_inventory_transactions', {
      branchId: branchId || '1',
      limit: limit ? Number(limit) : 100,
    });
  }
}
