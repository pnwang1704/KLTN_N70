import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThanOrEqual } from 'typeorm';
import { Stock } from './entities/stock.entity';
import { Recipe } from './entities/recipe.entity';
import { RecipeItem } from './entities/recipe-item.entity';
import { Ingredient } from './entities/ingredient.entity';
import { CreateIngredientDto } from './dto/create-ingredient.dto';
import { UpdateIngredientDto } from './dto/update-ingredient.dto';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import { StockInDto } from './dto/stock-in.dto';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    @InjectRepository(Stock)
    private stockRepository: Repository<Stock>,
    @InjectRepository(Recipe)
    private recipeRepository: Repository<Recipe>,
    @InjectRepository(Ingredient)
    private ingredientRepository: Repository<Ingredient>,
    @InjectRepository(RecipeItem)
    private recipeItemRepository: Repository<RecipeItem>,
    private dataSource: DataSource,
  ) {}

  // --- INGREDIENT CRUD ---
  async createIngredient(dto: CreateIngredientDto): Promise<Ingredient> {
    const ingredient = this.ingredientRepository.create(dto);
    return this.ingredientRepository.save(ingredient);
  }

  async getIngredients(): Promise<Ingredient[]> {
    return this.ingredientRepository.find();
  }

  async updateIngredient(id: string, dto: UpdateIngredientDto): Promise<Ingredient> {
    await this.ingredientRepository.update(id, dto);
    const updated = await this.ingredientRepository.findOne({ where: { id } });
    if (!updated) throw new NotFoundException('Ingredient not found');
    return updated;
  }

  // --- RECIPE CRUD ---
  async createRecipe(dto: CreateRecipeDto): Promise<Recipe> {
    const recipe = this.recipeRepository.create({
      productId: dto.productId,
      size: dto.size,
      items: dto.items.map(item => this.recipeItemRepository.create(item)),
    });
    return this.recipeRepository.save(recipe);
  }

  async getRecipes(): Promise<Recipe[]> {
    return this.recipeRepository.find({ relations: { items: true } });
  }

  async updateRecipe(id: string, dto: UpdateRecipeDto): Promise<Recipe> {
    const recipe = await this.recipeRepository.findOne({ where: { id }, relations: { items: true } });
    if (!recipe) throw new NotFoundException('Recipe not found');
    
    if (dto.productId) recipe.productId = dto.productId;
    if (dto.size) recipe.size = dto.size;
    
    if (dto.items) {
      // Remove old items
      await this.recipeItemRepository.delete({ recipe: { id } });
      recipe.items = dto.items.map(item => this.recipeItemRepository.create(item));
    }
    
    return this.recipeRepository.save(recipe);
  }

  // --- STOCK MANAGEMENT ---
  async stockIn(dto: StockInDto): Promise<Stock> {
    let stock = await this.stockRepository.findOne({
      where: { branchId: dto.branchId, ingredientId: dto.ingredientId }
    });

    if (!stock) {
      stock = this.stockRepository.create({
        branchId: dto.branchId,
        ingredientId: dto.ingredientId,
        currentQuantity: dto.quantity,
      });
    } else {
      stock.currentQuantity = Number(stock.currentQuantity) + dto.quantity;
    }

    return this.stockRepository.save(stock);
  }

  async getStockByBranch(branchId: string): Promise<Stock[]> {
    return this.stockRepository.find({ where: { branchId } });
  }

  async getLowStockAlerts(branchId: string): Promise<any[]> {
    const stocks = await this.stockRepository.find({ where: { branchId } });
    const ingredients = await this.ingredientRepository.find();
    const alerts: any[] = [];

    for (const stock of stocks) {
      const ingredient = ingredients.find(i => i.id === stock.ingredientId);
      if (ingredient && stock.currentQuantity <= ingredient.minStockThreshold) {
        alerts.push({
          ingredientName: ingredient.name,
          currentQuantity: stock.currentQuantity,
          threshold: ingredient.minStockThreshold,
        });
      }
    }
    return alerts;
  }

  async deductStockForOrder(payload: any) {
    this.logger.log(`Received order.completed for order ${payload.orderId}`);
    const { branchId, items } = payload;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const item of items) {
        // Find recipe for the product
        const recipe = await queryRunner.manager.findOne(Recipe, {
          where: { productId: item.productId, size: item.size },
          relations: { items: true },
        });

        if (!recipe) {
          this.logger.warn(`No recipe found for product ${item.productId} size ${item.size}`);
          continue;
        }

        // Deduct stock for each ingredient in the recipe
        for (const recipeItem of recipe.items) {
          const totalQuantityNeeded = recipeItem.quantityNeeded * item.quantity;
          
          let stock = await queryRunner.manager.findOne(Stock, {
            where: { branchId, ingredientId: recipeItem.ingredientId },
            lock: { mode: 'pessimistic_write' }, // lock row to prevent race conditions
          });

          if (!stock) {
            this.logger.warn(`Stock record not found for branch ${branchId}, ingredient ${recipeItem.ingredientId}. Creating new with negative stock.`);
            stock = new Stock();
            stock.branchId = branchId;
            stock.ingredientId = recipeItem.ingredientId;
            stock.currentQuantity = 0;
          }

          stock.currentQuantity -= totalQuantityNeeded;

          if (stock.currentQuantity < 0) {
            this.logger.warn(`Stock for ingredient ${stock.ingredientId} fell below zero. Current: ${stock.currentQuantity}`);
          }

          await queryRunner.manager.save(stock);
        }
      }

      await queryRunner.commitTransaction();
      this.logger.log(`Stock successfully deducted for order ${payload.orderId}`);
    } catch (error) {
      this.logger.error(`Error deducting stock for order ${payload.orderId}`, error.stack);
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
