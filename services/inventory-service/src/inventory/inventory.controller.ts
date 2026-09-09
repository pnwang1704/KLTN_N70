import { Controller } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { InventoryService } from './inventory.service';
import { CreateIngredientDto } from './dto/create-ingredient.dto';
import { UpdateIngredientDto } from './dto/update-ingredient.dto';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import { StockInDto } from './dto/stock-in.dto';

@Controller()
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @EventPattern('order.completed')
  async handleOrderCompleted(@Payload() payload: any) {
    await this.inventoryService.deductStockForOrder(payload);
  }

  @MessagePattern('create_ingredient')
  createIngredient(@Payload() dto: CreateIngredientDto) {
    return this.inventoryService.createIngredient(dto);
  }

  @MessagePattern('get_ingredients')
  getIngredients() {
    return this.inventoryService.getIngredients();
  }

  @MessagePattern('update_ingredient')
  updateIngredient(@Payload() payload: { id: string; dto: UpdateIngredientDto }) {
    return this.inventoryService.updateIngredient(payload.id, payload.dto);
  }

  @MessagePattern('delete_ingredient')
  deleteIngredient(@Payload() payload: any) {
    const id = typeof payload === 'object' && payload !== null && 'id' in payload ? payload.id : payload;
    return this.inventoryService.deleteIngredient(id);
  }

  @MessagePattern('create_recipe')
  createRecipe(@Payload() dto: CreateRecipeDto) {
    return this.inventoryService.createRecipe(dto);
  }

  @MessagePattern('get_recipes')
  getRecipes() {
    return this.inventoryService.getRecipes();
  }

  @MessagePattern('update_recipe')
  updateRecipe(@Payload() payload: { id: string; dto: UpdateRecipeDto }) {
    return this.inventoryService.updateRecipe(payload.id, payload.dto);
  }

  @MessagePattern('stock_in')
  stockIn(@Payload() dto: StockInDto) {
    return this.inventoryService.stockIn(dto);
  }

  @MessagePattern('get_stock')
  getStockByBranch(@Payload() payload: any) {
    const branchId = typeof payload === 'object' && payload !== null && 'branchId' in payload
      ? payload.branchId
      : payload;
    return this.inventoryService.getStockByBranch(branchId);
  }

  @MessagePattern('get_low_stock')
  getLowStockAlerts(@Payload() payload: any) {
    const branchId = typeof payload === 'object' && payload !== null && 'branchId' in payload
      ? payload.branchId
      : payload;
    return this.inventoryService.getLowStockAlerts(branchId);
  }
}
