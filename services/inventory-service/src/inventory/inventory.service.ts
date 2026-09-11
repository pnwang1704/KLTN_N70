import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
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
export class InventoryService implements OnModuleInit {
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

  async onModuleInit() {
    await this.seedInitialData();
  }

  private async seedInitialData() {
    try {
      const count = await this.ingredientRepository.count();
      if (count === 0) {
        this.logger.log('Seeding initial inventory data...');
        const coffee = await this.ingredientRepository.save({ name: 'Cà phê hạt', unit: 'g', minStockThreshold: 1000 });
        const milk = await this.ingredientRepository.save({ name: 'Sữa đặc', unit: 'ml', minStockThreshold: 500 });
        const sugar = await this.ingredientRepository.save({ name: 'Đường', unit: 'g', minStockThreshold: 500 });
        const freshMilk = await this.ingredientRepository.save({ name: 'Sữa tươi', unit: 'ml', minStockThreshold: 1000 });
        const tea = await this.ingredientRepository.save({ name: 'Trà đen', unit: 'g', minStockThreshold: 500 });

        await this.stockRepository.save([
          { branchId: '1', ingredientId: coffee.id, currentQuantity: 5000 },
          { branchId: '1', ingredientId: milk.id, currentQuantity: 2000 },
          { branchId: '1', ingredientId: sugar.id, currentQuantity: 2000 },
          { branchId: '1', ingredientId: freshMilk.id, currentQuantity: 3000 },
          { branchId: '1', ingredientId: tea.id, currentQuantity: 1500 },
        ]);

        const recipe = new Recipe();
        recipe.productId = '1';
        recipe.size = 'M';

        const item1 = new RecipeItem();
        item1.ingredientId = coffee.id;
        item1.quantityNeeded = 25;

        const item2 = new RecipeItem();
        item2.ingredientId = milk.id;
        item2.quantityNeeded = 40;

        recipe.items = [item1, item2];
        await this.recipeRepository.save(recipe);

        this.logger.log('Initial inventory data seeded successfully!');
      }
    } catch (err: any) {
      this.logger.error('Failed to seed initial inventory data', err?.stack || err);
    }
  }

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

  async deleteIngredient(id: string): Promise<{ success: boolean; message: string }> {
    const ingredient = await this.ingredientRepository.findOne({ where: { id } });
    if (!ingredient) {
      throw new RpcException({ statusCode: 404, message: 'Nguyên liệu không tồn tại' });
    }

    // Check if ingredient is used in any recipes
    const usedInRecipe = await this.recipeItemRepository.findOne({ where: { ingredientId: id } });
    if (usedInRecipe) {
      throw new RpcException({
        statusCode: 400,
        message: `Không thể xóa: Nguyên liệu "${ingredient.name}" đang được sử dụng trong công thức món ăn!`
      });
    }

    // Remove stock records for this ingredient
    await this.stockRepository.delete({ ingredientId: id });

    // Remove ingredient
    await this.ingredientRepository.delete(id);

    return { success: true, message: `Đã xóa nguyên liệu "${ingredient.name}" thành công.` };
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
      stock.currentQuantity = Number(stock.currentQuantity) + Number(dto.quantity);
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
      if (ingredient && Number(stock.currentQuantity) <= Number(ingredient.minStockThreshold)) {
        alerts.push({
          ingredientName: ingredient.name,
          currentQuantity: Number(stock.currentQuantity),
          threshold: Number(ingredient.minStockThreshold),
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

          if (!stock || Number(stock.currentQuantity) < totalQuantityNeeded) {
            this.logger.error(
              `Insufficient stock for ingredient ${recipeItem.ingredientId} in branch ${branchId}. Available: ${stock ? stock.currentQuantity : 0}, needed: ${totalQuantityNeeded}`,
            );
            throw new RpcException('Insufficient stock');
          }

          stock.currentQuantity = Number(stock.currentQuantity) - totalQuantityNeeded;
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
