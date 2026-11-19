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
    try {
      await this.inventoryService.deductStockForOrder({ ...payload, allowPartial: true });
    } catch (e) {
      // Prevent unhandled exception from crashing consumer
    }
  }

  @EventPattern('order.deduct_stock')
  async handleOrderDeductStock(@Payload() payload: any) {
    try {
      await this.inventoryService.deductStockForOrder({ ...payload, allowPartial: true });
    } catch (e) {
      // Prevent unhandled exception from crashing consumer
    }
  }

  @EventPattern('order.restore_stock')
  async handleOrderRestoreStock(@Payload() payload: any) {
    try {
      await this.inventoryService.restoreStockForOrder(payload);
    } catch (e) {
      // Prevent unhandled exception from crashing consumer
    }
  }

  @EventPattern('order.adjust_stock')
  async handleOrderAdjustStock(@Payload() payload: any) {
    try {
      await this.inventoryService.adjustStockForOrderUpdate(payload);
    } catch (e) {
      // Prevent unhandled exception from crashing consumer
    }
  }

  @MessagePattern('create_ingredient')
  createIngredient(@Payload() dto: CreateIngredientDto) {
    return this.inventoryService.createIngredient(dto);
  }

  @MessagePattern('get_ingredients')
  getIngredients(@Payload() payload?: any) {
    const branchId =
      typeof payload === 'object' && payload !== null && 'branchId' in payload
        ? payload.branchId
        : undefined;
    return this.inventoryService.getIngredients(branchId);
  }

  @MessagePattern('update_ingredient')
  updateIngredient(@Payload() payload: { id: string; dto: UpdateIngredientDto }) {
    return this.inventoryService.updateIngredient(payload.id, payload.dto);
  }

  @MessagePattern('adjust_ingredient_stock')
  adjustIngredientStock(@Payload() payload: { id: string; data: any }) {
    return this.inventoryService.adjustIngredientStock(payload.id, payload.data || {});
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

  @MessagePattern('get_recipe_by_product')
  getRecipeByProduct(@Payload() payload: { productId: string; size?: string }) {
    return this.inventoryService.getRecipeByProduct(payload.productId, payload.size);
  }

  @MessagePattern('upsert_product_recipe')
  upsertProductRecipe(@Payload() payload: { productId: string; data: any }) {
    return this.inventoryService.upsertProductRecipe(payload.productId, payload.data || {});
  }

  @MessagePattern('update_recipe')
  updateRecipe(@Payload() payload: { id: string; dto: UpdateRecipeDto }) {
    return this.inventoryService.updateRecipe(payload.id, payload.dto);
  }

  @MessagePattern('stock_in')
  stockIn(@Payload() dto: StockInDto & { note?: string }) {
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

  @MessagePattern('get_inventory_transactions')
  getTransactionsByBranch(@Payload() payload: any) {
    const branchId =
      typeof payload === 'object' && payload !== null && 'branchId' in payload
        ? payload.branchId
        : payload || '1';
    const limit =
      typeof payload === 'object' && payload !== null && 'limit' in payload
        ? Number(payload.limit)
        : 100;
    return this.inventoryService.getTransactionsByBranch(branchId, limit);
  }
}
