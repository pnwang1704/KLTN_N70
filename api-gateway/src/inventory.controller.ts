import { Controller, Post, Get, Put, Body, Param, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { CreateIngredientDto, UpdateIngredientDto, CreateRecipeDto, UpdateRecipeDto, StockInDto } from './dto/inventory.dto';

@Controller('inventory')
export class InventoryController {
  constructor(
    @Inject('INVENTORY_SERVICE') private readonly inventoryClient: ClientProxy,
  ) {}

  // --- INGREDIENTS ---
  @Post('ingredients')
  createIngredient(@Body() dto: CreateIngredientDto) {
    return this.inventoryClient.send('create_ingredient', dto);
  }

  @Get('ingredients')
  getIngredients() {
    return this.inventoryClient.send('get_ingredients', {});
  }

  @Put('ingredients/:id')
  updateIngredient(@Param('id') id: string, @Body() dto: UpdateIngredientDto) {
    return this.inventoryClient.send('update_ingredient', { id, dto });
  }

  // --- RECIPES ---
  @Post('recipes')
  createRecipe(@Body() dto: CreateRecipeDto) {
    return this.inventoryClient.send('create_recipe', dto);
  }

  @Get('recipes')
  getRecipes() {
    return this.inventoryClient.send('get_recipes', {});
  }

  @Put('recipes/:id')
  updateRecipe(@Param('id') id: string, @Body() dto: UpdateRecipeDto) {
    return this.inventoryClient.send('update_recipe', { id, dto });
  }

  // --- STOCKS ---
  @Post('stocks/in')
  stockIn(@Body() dto: StockInDto) {
    return this.inventoryClient.send('stock_in', dto);
  }

  @Get('stocks/:branchId')
  getStockByBranch(@Param('branchId') branchId: string) {
    return this.inventoryClient.send('get_stock', branchId);
  }

  @Get('stocks/:branchId/low')
  getLowStockAlerts(@Param('branchId') branchId: string) {
    return this.inventoryClient.send('get_low_stock', branchId);
  }
}
