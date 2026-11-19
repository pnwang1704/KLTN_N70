import { Injectable, Logger, NotFoundException, OnModuleInit, Optional } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Stock } from './entities/stock.entity';
import { Recipe } from './entities/recipe.entity';
import { RecipeItem } from './entities/recipe-item.entity';
import { Ingredient } from './entities/ingredient.entity';
import {
  InventoryTransaction,
  InventoryTransactionType,
} from './entities/inventory-transaction.entity';
import { CreateIngredientDto } from './dto/create-ingredient.dto';
import { UpdateIngredientDto } from './dto/update-ingredient.dto';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import { StockInDto } from './dto/stock-in.dto';

export interface SeedIngredientDef {
  name: string;
  unit: string;
  currentStock: number;
  minStock: number;
  costPerUnit: number;
}

export const SEED_INGREDIENTS: SeedIngredientDef[] = [
  { name: 'Cà phê hạt Robusta', unit: 'g', currentStock: 10000, minStock: 1000, costPerUnit: 250 },
  { name: 'Sữa đặc Ngôi Sao', unit: 'ml', currentStock: 5000, minStock: 500, costPerUnit: 65 },
  { name: 'Đường cát trắng', unit: 'g', currentStock: 8000, minStock: 500, costPerUnit: 30 },
  { name: 'Trà đen Phúc Long', unit: 'g', currentStock: 6000, minStock: 1000, costPerUnit: 320 },
  { name: 'Trân châu đen Đài Loan', unit: 'g', currentStock: 15000, minStock: 2000, costPerUnit: 95 },
  { name: 'Sữa tươi thanh trùng Dalat Milk', unit: 'ml', currentStock: 12000, minStock: 2000, costPerUnit: 45 },
  { name: 'Bột Matcha Uji Nhật Bản', unit: 'g', currentStock: 2000, minStock: 300, costPerUnit: 1200 },
  { name: 'Trà Oolong Nướng Thượng Hạng', unit: 'g', currentStock: 5000, minStock: 800, costPerUnit: 380 },
  { name: 'Trà Lài Thanh Hương', unit: 'g', currentStock: 5000, minStock: 800, costPerUnit: 300 },
  { name: 'Bột Kem Béo Thực Vật (Creamer)', unit: 'g', currentStock: 6000, minStock: 1000, costPerUnit: 110 },
  { name: 'Đào ngâm Hosen (Miếng)', unit: 'miếng', currentStock: 600, minStock: 80, costPerUnit: 3500 },
  { name: 'Syrup Trái Cây Tổng Hợp', unit: 'ml', currentStock: 5000, minStock: 600, costPerUnit: 180 },
  { name: 'Khoai tây & Đồ chiên đông lạnh', unit: 'g', currentStock: 10000, minStock: 1500, costPerUnit: 120 },
  { name: 'Ly nhựa PP 500ml & Nắp cầu', unit: 'cái', currentStock: 1000, minStock: 150, costPerUnit: 950 },
];

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
    @Optional()
    @InjectRepository(InventoryTransaction)
    private transactionRepository?: Repository<InventoryTransaction>,
  ) {}

  async onModuleInit() {
    await this.seedInitialData();
  }

  /**
   * Tự động khởi tạo 14 nguyên vật liệu phổ biến (kèm giá vốn costPerUnit, tồn kho ban đầu)
   * và gắn sẵn công thức định lượng (Recipe / BOM) cho toàn bộ 26 món ăn (P1..P26).
   */
  async seedInitialData() {
    try {
      const seedBranchIds = ['1', '2'];
      const existingCount = await this.ingredientRepository.count();
      if (existingCount === 0) {
        this.logger.log('Seeding initial ingredients & stocks for branches 1 & 2...');
        for (const def of SEED_INGREDIENTS) {
          const savedIng = await this.ingredientRepository.save({
            branchId: '1',
            name: def.name,
            unit: def.unit,
            currentStock: def.currentStock,
            minStock: def.minStock,
            minStockThreshold: def.minStock,
            costPerUnit: def.costPerUnit,
          });
          for (const bId of seedBranchIds) {
            await this.stockRepository.save({
              branchId: bId,
              ingredientId: savedIng.id,
              currentQuantity: def.currentStock,
            });
          }
        }
      }

      if (!this.ingredientRepository.find || !this.recipeRepository?.find) {
        return;
      }

      let allIngredients = await this.ingredientRepository.find();
      if (!Array.isArray(allIngredients) || allIngredients.length === 0) {
        return;
      }

      const existingStocks = (await this.stockRepository.find()) || [];
      const stockByBranchAndIng = new Map(
        existingStocks.map((s) => [`${s.branchId}_${s.ingredientId}`, s]),
      );

      // Bổ sung các nguyên liệu mới trong SEED_INGREDIENTS nếu chưa có và đồng bộ giá vốn / tồn kho cho cả 2 chi nhánh
      for (const def of SEED_INGREDIENTS) {
        let found = allIngredients.find(
          (i) => i.name.toLowerCase() === def.name.toLowerCase(),
        );
        if (!found) {
          found = await this.ingredientRepository.save({
            branchId: '1',
            name: def.name,
            unit: def.unit,
            currentStock: def.currentStock,
            minStock: def.minStock,
            minStockThreshold: def.minStock,
            costPerUnit: def.costPerUnit,
          });
          for (const bId of seedBranchIds) {
            await this.stockRepository.save({
              branchId: bId,
              ingredientId: found.id,
              currentQuantity: def.currentStock,
            });
          }
          allIngredients.push(found);
        } else {
          const branch1Stock = stockByBranchAndIng.get(`1_${found.id}`);
          const actualQty = branch1Stock ? Number(branch1Stock.currentQuantity) : def.currentStock;
          let needsSave = false;
          if (!Number(found.costPerUnit)) {
            found.costPerUnit = def.costPerUnit;
            needsSave = true;
          }
          if (!Number(found.minStock)) {
            found.minStock = Number(found.minStockThreshold) || def.minStock;
            needsSave = true;
          }
          if (Number(found.currentStock) !== actualQty) {
            found.currentStock = actualQty;
            needsSave = true;
          }
          if (needsSave) {
            await this.ingredientRepository.save(found);
          }
          for (const bId of seedBranchIds) {
            if (!stockByBranchAndIng.get(`${bId}_${found.id}`)) {
              await this.stockRepository.save({
                branchId: bId,
                ingredientId: found.id,
                currentQuantity: bId === '1' ? (Number(found.currentStock) || def.currentStock) : def.currentStock,
              });
            }
          }
        }
      }

      // Tìm các nguyên liệu chủ đạo để gắn công thức định lượng hợp lý cho 26 món
      const findIng = (kw: string) =>
        allIngredients.find((i) => i.name.toLowerCase().includes(kw.toLowerCase())) ||
        allIngredients[0];

      const ingCoffee = findIng('cà phê');
      const ingMilk = findIng('sữa đặc');
      const ingSugar = findIng('đường');
      const ingBlackTea = findIng('trà đen');
      const ingOolong = findIng('oolong') || ingBlackTea;
      const ingJasmine = findIng('trà lài') || ingBlackTea;
      const ingBoba = findIng('trân châu') || ingSugar;
      const ingFreshMilk = findIng('sữa tươi') || ingMilk;
      const ingMatcha = findIng('matcha') || ingBlackTea;
      const ingCreamer = findIng('kem béo') || ingMilk;
      const ingPeach = findIng('đào ngâm') || ingSugar;
      const ingSyrup = findIng('syrup') || ingSugar;
      const ingSnack = findIng('khoai tây') || ingSugar;
      const ingCup = findIng('ly nhựa');

      const existingRecipes = (await this.recipeRepository.find()) || [];
      const existingSet = new Set(
        existingRecipes.map((r) => `${r.productId}_${r.size || 'M'}`),
      );

      const sizes: Array<{ code: string; factor: number }> = [
        { code: 'S', factor: 0.8 },
        { code: 'M', factor: 1.0 },
        { code: 'L', factor: 1.3 },
      ];

      let seededRecipeCount = 0;

      const ensureRecipeForProduct = async (
        productId: string,
        baseItems: Array<{ ingredientId: string; qty: number; fixed?: boolean }>,
      ) => {
        for (const sz of sizes) {
          const key = `${productId}_${sz.code}`;
          if (existingSet.has(key)) continue;

          const recipe = new Recipe();
          recipe.productId = productId;
          recipe.size = sz.code;
          recipe.items = baseItems.map((bi) => {
            const ri = new RecipeItem();
            ri.ingredientId = bi.ingredientId;
            ri.quantityNeeded = bi.fixed ? bi.qty : Math.round(bi.qty * sz.factor);
            return ri;
          });
          await this.recipeRepository.save(recipe);
          existingSet.add(key);
          seededRecipeCount++;
        }
      };

      // C1 - Nhóm Trà Sữa
      const milkTeaIds = ['P1', 'P2', 'P7', 'P8', 'P9', 'P10', 'P11', '2'];
      for (const pid of milkTeaIds) {
        if (pid === 'P2') {
          await ensureRecipeForProduct(pid, [
            { ingredientId: ingMatcha.id, qty: 12 },
            { ingredientId: ingFreshMilk.id, qty: 150 },
            { ingredientId: ingSugar.id, qty: 20 },
            ...(ingCup ? [{ ingredientId: ingCup.id, qty: 1, fixed: true }] : []),
          ]);
        } else if (pid === 'P7') {
          await ensureRecipeForProduct(pid, [
            { ingredientId: ingOolong.id, qty: 15 },
            { ingredientId: ingCreamer.id, qty: 30 },
            { ingredientId: ingFreshMilk.id, qty: 100 },
            { ingredientId: ingSugar.id, qty: 20 },
            ...(ingCup ? [{ ingredientId: ingCup.id, qty: 1, fixed: true }] : []),
          ]);
        } else {
          await ensureRecipeForProduct(pid, [
            { ingredientId: ingBlackTea.id, qty: 15 },
            { ingredientId: ingFreshMilk.id, qty: 150 },
            { ingredientId: ingSugar.id, qty: 20 },
            { ingredientId: ingBoba.id, qty: 40 },
          ]);
        }
      }

      // C2 - Nhóm Cà Phê
      const coffeeIds = ['P3', 'P4', 'P12', 'P13', 'P14', 'P15', '1'];
      for (const pid of coffeeIds) {
        await ensureRecipeForProduct(pid, [
          { ingredientId: ingCoffee.id, qty: 25 },
          { ingredientId: ingMilk.id, qty: 35 },
          { ingredientId: ingSugar.id, qty: 10 },
          ...(ingCup ? [{ ingredientId: ingCup.id, qty: 1, fixed: true }] : []),
        ]);
      }

      // C3 - Nhóm Trà Trái Cây
      const fruitTeaIds = ['P5', 'P16', 'P17', 'P18', 'P19', 'P20'];
      for (const pid of fruitTeaIds) {
        await ensureRecipeForProduct(pid, [
          { ingredientId: ingJasmine.id, qty: 15 },
          { ingredientId: ingSyrup.id, qty: 30 },
          { ingredientId: ingPeach.id, qty: 3, fixed: true },
          { ingredientId: ingSugar.id, qty: 15 },
          ...(ingCup ? [{ ingredientId: ingCup.id, qty: 1, fixed: true }] : []),
        ]);
      }

      // C4 - Nhóm Đồ Ăn Vặt
      const snackIds = ['P6', 'P21', 'P22', 'P23', 'P24', 'P25', 'P26'];
      for (const pid of snackIds) {
        await ensureRecipeForProduct(pid, [
          { ingredientId: ingSnack.id, qty: 150 },
          { ingredientId: ingSugar.id, qty: 10 },
        ]);
      }

      if (seededRecipeCount > 0) {
        this.logger.log(`Seeded ${seededRecipeCount} recipes for products P1..P26!`);
      }
    } catch (err: any) {
      this.logger.error('Failed to seed initial inventory data', err?.stack || err);
    }
  }

  // --- INGREDIENT CRUD ---
  async createIngredient(dto: CreateIngredientDto & { branchId?: string }): Promise<Ingredient> {
    const minVal = Number(dto.minStock ?? dto.minStockThreshold ?? 0);
    const initStock = Number(dto.currentStock ?? 0);
    const costVal = Number(dto.costPerUnit ?? 0);
    const branchId = dto.branchId || '1';

    const payload: any = {
      name: dto.name,
      unit: dto.unit,
      minStockThreshold: minVal,
    };
    if (dto.branchId !== undefined) payload.branchId = branchId;
    if (dto.currentStock !== undefined) payload.currentStock = initStock;
    if (dto.minStock !== undefined) payload.minStock = minVal;
    if (dto.costPerUnit !== undefined) payload.costPerUnit = costVal;

    const ingredient = this.ingredientRepository.create(payload as Partial<Ingredient>);
    const saved = await this.ingredientRepository.save(ingredient);

    // Đồng bộ bảng Stock cho chi nhánh tạo (mặc định '1')
    if (this.stockRepository?.findOne && saved?.id) {
      const existingStock = await this.stockRepository.findOne({
        where: { branchId, ingredientId: saved.id },
      });
      if (!existingStock) {
        await this.stockRepository.save(
          this.stockRepository.create({
            branchId,
            ingredientId: saved.id,
            currentQuantity: initStock,
          }),
        );
      }
    }
    return saved;
  }

  async getIngredients(branchId?: string): Promise<Ingredient[]> {
    const ingredients = await this.ingredientRepository.find();
    if (!branchId || !this.stockRepository?.find) {
      return ingredients;
    }
    const branchStocks = (await this.stockRepository.find({ where: { branchId } })) || [];
    const stockMap = new Map(branchStocks.map((s) => [s.ingredientId, Number(s.currentQuantity)]));
    return ingredients.map((ing) => ({
      ...ing,
      branchId,
      currentStock: stockMap.has(ing.id) ? stockMap.get(ing.id)! : 0,
    }));
  }

  async updateIngredient(id: string, dto: UpdateIngredientDto): Promise<Ingredient> {
    const updatePayload: any = { ...dto };
    if (dto.minStock !== undefined && dto.minStockThreshold === undefined) {
      updatePayload.minStockThreshold = dto.minStock;
    } else if (dto.minStockThreshold !== undefined && dto.minStock === undefined) {
      updatePayload.minStock = dto.minStockThreshold;
    }
    await this.ingredientRepository.update(id, updatePayload);
    const updated = await this.ingredientRepository.findOne({ where: { id } });
    if (!updated) throw new NotFoundException('Ingredient not found');
    return updated;
  }

  /**
   * Nhập thêm hoặc điều chỉnh tồn kho cho 1 nguyên liệu (`PATCH /inventory/ingredients/:id/stock`)
   */
  async adjustIngredientStock(
    id: string,
    payload: {
      branchId?: string;
      changeAmount?: number;
      quantity?: number;
      newStock?: number;
      type?: InventoryTransactionType;
      note?: string;
    },
  ) {
    const branchId = payload.branchId || '1';
    const ingredient = await this.ingredientRepository.findOne({ where: { id } });
    if (!ingredient) {
      throw new NotFoundException('Không tìm thấy nguyên liệu');
    }

    let stock = await this.stockRepository.findOne({
      where: { branchId, ingredientId: id },
    });

    const currentQty = stock
      ? Number(stock.currentQuantity)
      : Number(ingredient.currentStock || 0);

    let delta = 0;
    let finalQty = currentQty;
    let logType = payload.type || InventoryTransactionType.MANUAL_IMPORT;

    if (payload.newStock !== undefined && payload.newStock !== null) {
      finalQty = Math.max(0, Number(payload.newStock));
      delta = finalQty - currentQty;
      logType = payload.type || InventoryTransactionType.MANUAL_ADJUST;
    } else {
      delta = Number(payload.changeAmount ?? payload.quantity ?? 0);
      finalQty = Math.max(0, currentQty + delta);
      if (delta < 0 && !payload.type) {
        logType = InventoryTransactionType.MANUAL_ADJUST;
      }
    }

    if (!stock) {
      stock = this.stockRepository.create({
        branchId,
        ingredientId: id,
        currentQuantity: finalQty,
      });
    } else {
      stock.currentQuantity = finalQty;
    }

    const savedStock = await this.stockRepository.save(stock);
    let savedIng = ingredient;
    if (branchId === (ingredient.branchId || '1')) {
      ingredient.currentStock = finalQty;
      savedIng = await this.ingredientRepository.save(ingredient);
    }

    if (this.transactionRepository && delta !== 0) {
      await this.transactionRepository.save(
        this.transactionRepository.create({
          branchId,
          itemId: id,
          ingredientId: id,
          itemName: ingredient.name,
          unit: ingredient.unit,
          changeQuantity: delta,
          changeAmount: delta,
          balanceAfter: finalQty,
          type: logType,
          note:
            payload.note ||
            (logType === InventoryTransactionType.MANUAL_ADJUST
              ? 'Điều chỉnh kiểm kê tồn kho'
              : 'Nhập bổ sung nguyên vật liệu vào kho'),
        }),
      );
    }

    return {
      ingredient: savedIng,
      stock: savedStock,
      changeAmount: delta,
      currentStock: finalQty,
    };
  }

  async deleteIngredient(id: string): Promise<{ success: boolean; message: string }> {
    const ingredient = await this.ingredientRepository.findOne({ where: { id } });
    if (!ingredient) {
      throw new RpcException({ statusCode: 404, message: 'Nguyên liệu không tồn tại' });
    }

    const usedInRecipe = await this.recipeItemRepository.findOne({ where: { ingredientId: id } });
    if (usedInRecipe) {
      throw new RpcException({
        statusCode: 400,
        message: `Không thể xóa: Nguyên liệu "${ingredient.name}" đang được sử dụng trong công thức món ăn!`,
      });
    }

    await this.stockRepository.delete({ ingredientId: id });
    await this.ingredientRepository.delete(id);

    return { success: true, message: `Đã xóa nguyên liệu "${ingredient.name}" thành công.` };
  }

  // --- RECIPE / BOM CRUD ---
  async createRecipe(dto: CreateRecipeDto): Promise<Recipe> {
    const recipe = this.recipeRepository.create({
      productId: dto.productId,
      size: dto.size || 'M',
      items: dto.items.map((item: any) =>
        this.recipeItemRepository.create({
          ingredientId: item.ingredientId,
          quantityNeeded: Number(item.quantityNeeded ?? item.quantity ?? 0),
        }),
      ),
    });
    return this.recipeRepository.save(recipe);
  }

  async getRecipes(): Promise<Recipe[]> {
    return this.recipeRepository.find({ relations: { items: true } });
  }

  /**
   * Lấy công thức định lượng của 1 món ăn (`GET /inventory/recipes/:productId`)
   */
  async getRecipeByProduct(productId: string, size?: string) {
    const ingredients = await this.ingredientRepository.find();
    const ingMap = new Map(ingredients.map((i) => [i.id, i]));

    let recipe = await this.recipeRepository.findOne({
      where: { productId, size: size || 'M' },
      relations: { items: true },
    });

    if (!recipe) {
      recipe = await this.recipeRepository.findOne({
        where: { productId },
        relations: { items: true },
      });
    }

    if (!recipe) {
      return {
        productId,
        size: size || 'M',
        totalCost: 0,
        items: [],
      };
    }

    let totalCost = 0;
    const enrichedItems = (recipe.items || []).map((ri) => {
      const ing = ingMap.get(ri.ingredientId);
      const qty = Number(ri.quantityNeeded || 0);
      const costPerUnit = Number(ing?.costPerUnit || 0);
      const lineCost = Math.round(qty * costPerUnit);
      totalCost += lineCost;
      return {
        id: ri.id,
        ingredientId: ri.ingredientId,
        ingredientName: ing?.name || ri.ingredientId,
        unit: ing?.unit || '',
        costPerUnit,
        quantity: qty,
        quantityNeeded: qty,
        lineCost,
      };
    });

    return {
      id: recipe.id,
      productId: recipe.productId,
      size: recipe.size || 'M',
      totalCost,
      items: enrichedItems,
    };
  }

  /**
   * Lưu / Cập nhật công thức định lượng cho 1 món ăn (`PUT /inventory/recipes/:productId`)
   * Đồng bộ tự động sang các size S (x0.8), M (x1.0), L (x1.3)
   */
  async upsertProductRecipe(
    productId: string,
    payload: {
      size?: string;
      items: Array<{ ingredientId: string; quantity?: number; quantityNeeded?: number }>;
    },
  ) {
    const rawItems = Array.isArray(payload?.items) ? payload.items : [];
    const normalizedItems = rawItems
      .map((it) => ({
        ingredientId: it.ingredientId,
        qty: Number(it.quantity ?? it.quantityNeeded ?? 0),
      }))
      .filter((it) => it.ingredientId && it.qty > 0);

    const ingredients = await this.ingredientRepository.find();
    const ingMap = new Map(ingredients.map((i) => [i.id, i]));

    // Nếu người dùng truyền cụ thể 1 size khác 'M', chỉ cập nhật size đó;
    // Nếu mặc định (size = 'M' hoặc không truyền), tự động đồng bộ chuẩn M và suy ra S (x0.8), L (x1.3)
    const targetSizes =
      payload?.size && payload.size !== 'M'
        ? [{ code: payload.size, factor: 1.0 }]
        : [
            { code: 'S', factor: 0.8 },
            { code: 'M', factor: 1.0 },
            { code: 'L', factor: 1.3 },
          ];

    for (const sz of targetSizes) {
      let existing = await this.recipeRepository.findOne({
        where: { productId, size: sz.code },
        relations: { items: true },
      });

      if (normalizedItems.length === 0) {
        if (existing) {
          await this.recipeItemRepository.delete({ recipe: { id: existing.id } });
          await this.recipeRepository.delete(existing.id);
        }
        continue;
      }

      if (existing) {
        await this.recipeItemRepository.delete({ recipe: { id: existing.id } });
      } else {
        existing = this.recipeRepository.create({
          productId,
          size: sz.code,
        });
      }

      existing.items = normalizedItems.map((ni) => {
        const ing = ingMap.get(ni.ingredientId);
        const isPieceUnit =
          ing?.unit === 'cái' || ing?.unit === 'miếng' || ing?.unit === 'phần';
        const scaledQty = isPieceUnit
          ? ni.qty
          : Number((ni.qty * sz.factor).toFixed(2));
        return this.recipeItemRepository.create({
          ingredientId: ni.ingredientId,
          quantityNeeded: scaledQty,
        });
      });

      await this.recipeRepository.save(existing);
    }

    return this.getRecipeByProduct(productId, payload?.size || 'M');
  }

  async updateRecipe(id: string, dto: UpdateRecipeDto): Promise<Recipe> {
    const recipe = await this.recipeRepository.findOne({ where: { id }, relations: { items: true } });
    if (!recipe) throw new NotFoundException('Recipe not found');

    if (dto.productId) recipe.productId = dto.productId;
    if (dto.size) recipe.size = dto.size;

    if (dto.items) {
      await this.recipeItemRepository.delete({ recipe: { id } });
      recipe.items = dto.items.map((item: any) =>
        this.recipeItemRepository.create({
          ingredientId: item.ingredientId,
          quantityNeeded: Number(item.quantityNeeded ?? item.quantity ?? 0),
        }),
      );
    }

    return this.recipeRepository.save(recipe);
  }

  // --- STOCK MANAGEMENT ---
  async stockIn(dto: StockInDto & { note?: string }): Promise<Stock> {
    let stock = await this.stockRepository.findOne({
      where: { branchId: dto.branchId, ingredientId: dto.ingredientId },
    });

    const addQty = Number(dto.quantity || 0);

    if (!stock) {
      stock = this.stockRepository.create({
        branchId: dto.branchId,
        ingredientId: dto.ingredientId,
        currentQuantity: addQty,
      });
    } else {
      stock.currentQuantity = Number(stock.currentQuantity) + addQty;
    }

    const savedStock = await this.stockRepository.save(stock);

    // Đồng bộ currentStock trên bảng Ingredient
    if (this.ingredientRepository?.findOne) {
      const ing = await this.ingredientRepository.findOne({
        where: { id: dto.ingredientId },
      });
      if (ing) {
        ing.currentStock = Number(savedStock.currentQuantity);
        await this.ingredientRepository.save(ing);
      }

      if (this.transactionRepository) {
        try {
          await this.transactionRepository.save(
            this.transactionRepository.create({
              branchId: dto.branchId || '1',
              itemId: dto.ingredientId,
              ingredientId: dto.ingredientId,
              itemName: ing?.name || dto.ingredientId,
              unit: ing?.unit || '',
              changeQuantity: addQty,
              changeAmount: addQty,
              balanceAfter: Number(savedStock.currentQuantity),
              type: InventoryTransactionType.MANUAL_IMPORT,
              note: dto.note || 'Nhập kho bổ sung nguyên vật liệu',
            }),
          );
        } catch (e: any) {
          this.logger.warn(`Could not save manual import transaction log: ${e?.message}`);
        }
      }
    }

    return savedStock;
  }

  async getStockByBranch(branchId: string): Promise<Stock[]> {
    return this.stockRepository.find({ where: { branchId } });
  }

  async getTransactionsByBranch(branchId: string, limit = 100): Promise<InventoryTransaction[]> {
    if (!this.transactionRepository) return [];
    return this.transactionRepository.find({
      where: { branchId: branchId || '1' },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getLowStockAlerts(branchId: string): Promise<any[]> {
    const stocks = await this.stockRepository.find({ where: { branchId } });
    const ingredients = await this.ingredientRepository.find();
    const alerts: any[] = [];

    for (const stock of stocks) {
      const ingredient = ingredients.find((i) => i.id === stock.ingredientId);
      const threshold = Number(ingredient?.minStock || ingredient?.minStockThreshold || 0);
      if (ingredient && Number(stock.currentQuantity) <= threshold) {
        alerts.push({
          ingredientId: ingredient.id,
          ingredientName: ingredient.name,
          unit: ingredient.unit,
          currentQuantity: Number(stock.currentQuantity),
          threshold,
          isOutOfStock: Number(stock.currentQuantity) <= 0,
        });
      }
    }
    return alerts;
  }

  /**
   * 1. Tự động trừ kho khi có Order (hoặc thanh toán đơn).
   * Có kiểm tra Idempotency theo `orderId` để không trừ kho 2 lần cho cùng 1 đơn!
   */
  async deductStockForOrder(payload: any) {
    const orderId = payload?.orderId;
    const orderCode = payload?.orderCode ? String(payload.orderCode) : undefined;
    const branchId = payload?.branchId || '1';
    const items = Array.isArray(payload?.items) ? payload.items : [];
    const allowPartial = Boolean(payload?.allowPartial);

    this.logger.log(`Processing deductStockForOrder for order ${orderId}`);

    if (this.transactionRepository && orderId) {
      const existingDeducts = await this.transactionRepository.count({
        where: { orderId, type: InventoryTransactionType.ORDER_DEDUCT },
      });
      const existingRestores = await this.transactionRepository.count({
        where: { orderId, type: InventoryTransactionType.ORDER_RESTORE },
      });
      if (existingDeducts > 0 && existingRestores === 0 && !payload?.isAdjustment) {
        this.logger.log(`Order ${orderId} stock already deducted (Idempotent skip).`);
        return { skipped: true, reason: 'Already deducted' };
      }
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const pendingLogs: Array<{
        itemId: string;
        changeQuantity: number;
        balanceAfter: number;
        note: string;
      }> = [];

      for (const item of items) {
        let recipe = await queryRunner.manager.findOne(Recipe, {
          where: { productId: item.productId, size: item.size || 'M' },
          relations: { items: true },
        });

        if (!recipe && this.recipeRepository?.findOne) {
          recipe = await this.recipeRepository.findOne({
            where: { productId: item.productId },
            relations: { items: true },
          });
        }

        if (!recipe || !recipe.items || recipe.items.length === 0) {
          this.logger.warn(`No recipe found for product ${item.productId} size ${item.size}`);
          continue;
        }

        for (const recipeItem of recipe.items) {
          const totalQuantityNeeded =
            Number(recipeItem.quantityNeeded) * Number(item.quantity || 1);

          const stock = await queryRunner.manager.findOne(Stock, {
            where: { branchId, ingredientId: recipeItem.ingredientId },
            lock: { mode: 'pessimistic_write' },
          });

          if (!stock || (Number(stock.currentQuantity) < totalQuantityNeeded && !allowPartial)) {
            this.logger.error(
              `Insufficient stock for ingredient ${recipeItem.ingredientId} in branch ${branchId}. Available: ${stock ? stock.currentQuantity : 0}, needed: ${totalQuantityNeeded}`,
            );
            throw new RpcException('Insufficient stock');
          }

          stock.currentQuantity = Math.max(
            0,
            Number(stock.currentQuantity) - totalQuantityNeeded,
          );
          await queryRunner.manager.save(stock);

          pendingLogs.push({
            itemId: recipeItem.ingredientId,
            changeQuantity: -totalQuantityNeeded,
            balanceAfter: Number(stock.currentQuantity),
            note:
              payload?.note ||
              `Xuất kho cho Đơn #${orderCode || (orderId ? orderId.split('-')[0] : '')} (${item.quantity}x ${item.productName || item.productId})`,
          });
        }
      }

      await queryRunner.commitTransaction();
      this.logger.log(`Stock successfully deducted for order ${orderId}`);

      if (this.transactionRepository && pendingLogs.length > 0) {
        const ingredients = await this.ingredientRepository.find();
        const ingMap = new Map(ingredients.map((i) => [i.id, i]));

        for (const l of pendingLogs) {
          const ing = ingMap.get(l.itemId);
          if (ing) {
            ing.currentStock = l.balanceAfter;
            await this.ingredientRepository.save(ing);
          }
        }

        const logEntities = pendingLogs.map((l) => {
          const ing = ingMap.get(l.itemId);
          return this.transactionRepository!.create({
            branchId,
            itemId: l.itemId,
            ingredientId: l.itemId,
            itemName: ing?.name || l.itemId,
            unit: ing?.unit || '',
            orderId,
            orderCode,
            changeQuantity: l.changeQuantity,
            changeAmount: l.changeQuantity,
            balanceAfter: l.balanceAfter,
            type: InventoryTransactionType.ORDER_DEDUCT,
            note: l.note,
          });
        });
        await this.transactionRepository.save(logEntities);
      }

      return { success: true, deductedCount: pendingLogs.length };
    } catch (error: any) {
      this.logger.error(`Error deducting stock for order ${orderId}`, error?.stack);
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 2. Hoàn lại tồn kho khi Hủy đơn (CANCELLED) hoặc Void Hóa đơn (VOIDED).
   */
  async restoreStockForOrder(payload: {
    orderId: string;
    orderCode?: string | number;
    branchId?: string;
    reason?: string;
    items?: Array<{
      productId: string;
      productName?: string;
      size?: string;
      quantity: number;
    }>;
  }) {
    const orderId = payload?.orderId;
    const orderCode = payload?.orderCode ? String(payload.orderCode) : undefined;
    const branchId = payload?.branchId || '1';

    if (!orderId) return { skipped: true };

    this.logger.log(`Processing restoreStockForOrder for order ${orderId}`);

    if (this.transactionRepository) {
      const alreadyRestored = await this.transactionRepository.count({
        where: { orderId, type: InventoryTransactionType.ORDER_RESTORE },
      });
      if (alreadyRestored > 0) {
        this.logger.log(`Order ${orderId} stock already restored (Idempotent skip).`);
        return { skipped: true, reason: 'Already restored' };
      }

      const deductLogs = await this.transactionRepository.find({
        where: { orderId, type: InventoryTransactionType.ORDER_DEDUCT },
      });

      if (deductLogs.length > 0) {
        const netByIngredient = new Map<
          string,
          { qtyToRestore: number; itemName: string; unit: string }
        >();

        for (const log of deductLogs) {
          const absQty = Math.abs(Number(log.changeQuantity || 0));
          const current = netByIngredient.get(log.itemId) || {
            qtyToRestore: 0,
            itemName: log.itemName,
            unit: log.unit,
          };
          current.qtyToRestore += absQty;
          netByIngredient.set(log.itemId, current);
        }

        const restoreLogs: InventoryTransaction[] = [];

        for (const [ingredientId, info] of netByIngredient.entries()) {
          if (info.qtyToRestore <= 0) continue;

          let stock = await this.stockRepository.findOne({
            where: { branchId, ingredientId },
          });

          if (!stock) {
            stock = this.stockRepository.create({
              branchId,
              ingredientId,
              currentQuantity: info.qtyToRestore,
            });
          } else {
            stock.currentQuantity = Number(stock.currentQuantity) + info.qtyToRestore;
          }

          const savedStock = await this.stockRepository.save(stock);

          const ing = await this.ingredientRepository.findOne({ where: { id: ingredientId } });
          if (ing) {
            ing.currentStock = Number(savedStock.currentQuantity);
            await this.ingredientRepository.save(ing);
          }

          restoreLogs.push(
            this.transactionRepository.create({
              branchId,
              itemId: ingredientId,
              ingredientId,
              itemName: info.itemName,
              unit: info.unit,
              orderId,
              orderCode,
              changeQuantity: info.qtyToRestore,
              changeAmount: info.qtyToRestore,
              balanceAfter: Number(savedStock.currentQuantity),
              type: InventoryTransactionType.ORDER_RESTORE,
              note: `Hoàn trả kho do Hủy/Void Đơn #${orderCode || orderId.split('-')[0]}${
                payload.reason ? ` (${payload.reason})` : ''
              }`,
            }),
          );
        }

        if (restoreLogs.length > 0) {
          await this.transactionRepository.save(restoreLogs);
        }

        this.logger.log(`Restored ${restoreLogs.length} ingredient stocks for order ${orderId}`);
        return { success: true, restoredCount: restoreLogs.length };
      }
    }

    return { skipped: true, reason: 'No previous deduction found for this order' };
  }

  /**
   * 3. Điều chỉnh chênh lệch tồn kho khi Sửa đơn hàng (PUT /orders/:id/items)
   */
  async adjustStockForOrderUpdate(payload: {
    orderId: string;
    orderCode?: string | number;
    branchId?: string;
    oldItems: Array<{
      productId: string;
      productName?: string;
      size?: string;
      quantity: number;
    }>;
    newItems: Array<{
      productId: string;
      productName?: string;
      size?: string;
      quantity: number;
    }>;
  }) {
    const orderId = payload?.orderId;
    const orderCode = payload?.orderCode ? String(payload.orderCode) : undefined;
    const branchId = payload?.branchId || '1';
    const oldItems = Array.isArray(payload?.oldItems) ? payload.oldItems : [];
    const newItems = Array.isArray(payload?.newItems) ? payload.newItems : [];

    const calcIngredientsMap = async (
      itemsList: Array<{ productId: string; size?: string; quantity: number }>,
    ) => {
      const map = new Map<string, number>();
      for (const it of itemsList) {
        let recipe = await this.recipeRepository.findOne({
          where: { productId: it.productId, size: it.size || 'M' },
          relations: { items: true },
        });
        if (!recipe) {
          recipe = await this.recipeRepository.findOne({
            where: { productId: it.productId },
            relations: { items: true },
          });
        }
        if (!recipe || !recipe.items) continue;

        for (const ri of recipe.items) {
          const needed = Number(ri.quantityNeeded) * Number(it.quantity || 1);
          map.set(ri.ingredientId, (map.get(ri.ingredientId) || 0) + needed);
        }
      }
      return map;
    };

    const oldMap = await calcIngredientsMap(oldItems);
    const newMap = await calcIngredientsMap(newItems);

    const allIngIds = new Set([...oldMap.keys(), ...newMap.keys()]);
    const ingredients = await this.ingredientRepository.find();
    const ingLookup = new Map(ingredients.map((i) => [i.id, i]));

    for (const ingredientId of allIngIds) {
      const oldQty = oldMap.get(ingredientId) || 0;
      const newQty = newMap.get(ingredientId) || 0;
      const diff = newQty - oldQty;
      if (diff === 0) continue;

      let stock = await this.stockRepository.findOne({
        where: { branchId, ingredientId },
      });

      if (!stock) {
        stock = this.stockRepository.create({
          branchId,
          ingredientId,
          currentQuantity: Math.max(0, -diff),
        });
      } else {
        stock.currentQuantity = Math.max(0, Number(stock.currentQuantity) - diff);
      }

      const savedStock = await this.stockRepository.save(stock);
      const ing = ingLookup.get(ingredientId);
      if (ing) {
        ing.currentStock = Number(savedStock.currentQuantity);
        await this.ingredientRepository.save(ing);
      }

      if (this.transactionRepository) {
        await this.transactionRepository.save(
          this.transactionRepository.create({
            branchId,
            itemId: ingredientId,
            ingredientId,
            itemName: ing?.name || ingredientId,
            unit: ing?.unit || '',
            orderId,
            orderCode,
            changeQuantity: -diff,
            changeAmount: -diff,
            balanceAfter: Number(savedStock.currentQuantity),
            type:
              diff > 0
                ? InventoryTransactionType.ORDER_DEDUCT
                : InventoryTransactionType.ORDER_RESTORE,
            note:
              diff > 0
                ? `Trừ thêm kho do sửa tăng món Đơn #${orderCode || orderId.split('-')[0]}`
                : `Hoàn trả kho do sửa giảm món Đơn #${orderCode || orderId.split('-')[0]}`,
          }),
        );
      }
    }

    return { success: true };
  }
}
