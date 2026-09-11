import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, QueryRunner, Repository } from 'typeorm';
import { RpcException } from '@nestjs/microservices';
import { InventoryService } from './inventory.service';
import { Stock } from './entities/stock.entity';
import { Recipe } from './entities/recipe.entity';
import { RecipeItem } from './entities/recipe-item.entity';
import { Ingredient } from './entities/ingredient.entity';

describe('InventoryService', () => {
  let service: InventoryService;
  let stockRepo: any;
  let recipeRepo: any;
  let ingredientRepo: any;
  let recipeItemRepo: any;
  let dataSource: any;
  let queryRunner: any;

  beforeEach(async () => {
    // Mock QueryRunner
    queryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      manager: {
        findOne: jest.fn(),
        save: jest.fn(),
      },
    };

    // Mock DataSource
    dataSource = {
      createQueryRunner: jest.fn().mockReturnValue(queryRunner),
    };

    // Mock Repositories
    stockRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((dto) => dto),
      save: jest.fn(),
      delete: jest.fn(),
    };

    recipeRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((dto) => dto),
      save: jest.fn(),
      delete: jest.fn(),
    };

    ingredientRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((dto) => dto),
      save: jest.fn(),
      delete: jest.fn(),
      count: jest.fn().mockResolvedValue(1), // Đặt count > 0 để tránh kích hoạt auto seed
      update: jest.fn(),
    };

    recipeItemRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((dto) => dto),
      save: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: getRepositoryToken(Stock), useValue: stockRepo },
        { provide: getRepositoryToken(Recipe), useValue: recipeRepo },
        { provide: getRepositoryToken(Ingredient), useValue: ingredientRepo },
        { provide: getRepositoryToken(RecipeItem), useValue: recipeItemRepo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('deductStockForOrder (Transaction & Rollback Tests)', () => {
    const mockOrderPayload = {
      orderId: 'order-uuid-123',
      branchId: 'branch-1',
      items: [
        {
          productId: 'product-coffee-1',
          size: 'M',
          quantity: 2, // 2 ly
        },
      ],
    };

    const mockRecipe: Recipe = {
      id: 'recipe-uuid-1',
      productId: 'product-coffee-1',
      size: 'M',
      items: [
        {
          id: 'item-1',
          ingredientId: 'ing-coffee-beans',
          quantityNeeded: 20, // 20g mỗi ly
          recipe: null as any,
        },
        {
          id: 'item-2',
          ingredientId: 'ing-condensed-milk',
          quantityNeeded: 30, // 30ml mỗi ly
          recipe: null as any,
        },
      ],
    };

    it('Test 1: Trừ kho thành công khi đủ nguyên liệu -> Commit transaction, không gọi rollback', async () => {
      // Giả lập tìm thấy Recipe cho sản phẩm
      (queryRunner.manager.findOne as jest.Mock)
        .mockResolvedValueOnce(mockRecipe) // Recipe findOne
        .mockResolvedValueOnce({
          // Stock findOne cho cà phê hạt: tồn 100g, cần 20 * 2 = 40g -> ĐỦ
          id: 'stock-1',
          branchId: 'branch-1',
          ingredientId: 'ing-coffee-beans',
          currentQuantity: 100,
        } as Stock)
        .mockResolvedValueOnce({
          // Stock findOne cho sữa đặc: tồn 80ml, cần 30 * 2 = 60ml -> ĐỦ
          id: 'stock-2',
          branchId: 'branch-1',
          ingredientId: 'ing-condensed-milk',
          currentQuantity: 80,
        } as Stock);

      (queryRunner.manager.save as jest.Mock).mockImplementation((entity) => Promise.resolve(entity));

      await service.deductStockForOrder(mockOrderPayload);

      // Kiểm tra vòng đời transaction
      expect(dataSource.createQueryRunner).toHaveBeenCalledTimes(1);
      expect(queryRunner.connect).toHaveBeenCalledTimes(1);
      expect(queryRunner.startTransaction).toHaveBeenCalledTimes(1);

      // Kiểm tra lưu trừ số lượng chính xác
      expect(queryRunner.manager.save).toHaveBeenCalledTimes(2);
      // Cà phê hạt: 100 - 40 = 60
      expect(queryRunner.manager.save).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          ingredientId: 'ing-coffee-beans',
          currentQuantity: 60,
        }),
      );
      // Sữa đặc: 80 - 60 = 20
      expect(queryRunner.manager.save).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          ingredientId: 'ing-condensed-milk',
          currentQuantity: 20,
        }),
      );

      // Phải commit transaction và KHÔNG rollback
      expect(queryRunner.commitTransaction).toHaveBeenCalledTimes(1);
      expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalledTimes(1);
    });

    it('Test 2: Thiếu nguyên liệu -> Rollback transaction, ném lỗi RpcException ("Insufficient stock")', async () => {
      // Giả lập tìm thấy Recipe cho sản phẩm
      (queryRunner.manager.findOne as jest.Mock)
        .mockResolvedValueOnce(mockRecipe) // Recipe findOne
        .mockResolvedValueOnce({
          // Stock findOne cho cà phê hạt: tồn 30g, nhưng cần 20 * 2 = 40g -> THIẾU
          id: 'stock-1',
          branchId: 'branch-1',
          ingredientId: 'ing-coffee-beans',
          currentQuantity: 30,
        } as Stock);

      let error: any;
      try {
        await service.deductStockForOrder(mockOrderPayload);
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(RpcException);
      expect(error.message).toBe('Insufficient stock');

      // Bắt buộc gọi rollbackTransaction
      expect(queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
      // Đảm bảo KHÔNG commit transaction
      expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
      // Đảm bảo luôn giải phóng connection
      expect(queryRunner.release).toHaveBeenCalledTimes(1);
    });

    it('Test 2.1: Bản ghi tồn kho chưa tồn tại trong DB -> Coi như thiếu hàng và Rollback', async () => {
      (queryRunner.manager.findOne as jest.Mock)
        .mockResolvedValueOnce(mockRecipe) // Recipe findOne
        .mockResolvedValueOnce(null); // Stock null (chưa có tồn kho)

      let error: any;
      try {
        await service.deductStockForOrder(mockOrderPayload);
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(RpcException);
      expect(error.message).toBe('Insufficient stock');

      expect(queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
      expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalledTimes(1);
    });

    it('should continue gracefully and commit when no recipe found for product', async () => {
      (queryRunner.manager.findOne as jest.Mock).mockResolvedValueOnce(null); // Recipe not found

      await service.deductStockForOrder(mockOrderPayload);

      expect(queryRunner.commitTransaction).toHaveBeenCalledTimes(1);
      expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalledTimes(1);
    });
  });

  describe('Ingredient Management', () => {
    it('getIngredients: should return array of ingredients', async () => {
      const mockIngredients = [
        { id: '1', name: 'Cà phê hạt', unit: 'g', minStockThreshold: 1000 },
        { id: '2', name: 'Đường', unit: 'g', minStockThreshold: 500 },
      ] as Ingredient[];

      (ingredientRepo.find as jest.Mock).mockResolvedValue(mockIngredients);

      const result = await service.getIngredients();
      expect(result).toEqual(mockIngredients);
      expect(ingredientRepo.find).toHaveBeenCalled();
    });

    it('createIngredient: should create and return new ingredient', async () => {
      const dto = { name: 'Bột Matcha', unit: 'g', minStockThreshold: 200 };
      const saved = { id: '3', ...dto } as Ingredient;

      (ingredientRepo.create as jest.Mock).mockReturnValue(dto);
      (ingredientRepo.save as jest.Mock).mockResolvedValue(saved);

      const result = await service.createIngredient(dto);
      expect(result).toEqual(saved);
      expect(ingredientRepo.save).toHaveBeenCalledWith(dto);
    });

    it('updateIngredient: should update and return ingredient', async () => {
      const updated = { id: '1', name: 'Cà phê Robusta', unit: 'g', minStockThreshold: 1200 } as Ingredient;
      (ingredientRepo.update as jest.Mock).mockResolvedValue({ affected: 1 });
      (ingredientRepo.findOne as jest.Mock).mockResolvedValue(updated);

      const result = await service.updateIngredient('1', { name: 'Cà phê Robusta' });
      expect(result).toEqual(updated);
      expect(ingredientRepo.update).toHaveBeenCalledWith('1', { name: 'Cà phê Robusta' });
    });

    it('updateIngredient: should throw NotFoundException if ingredient not found after update', async () => {
      (ingredientRepo.update as jest.Mock).mockResolvedValue({ affected: 0 });
      (ingredientRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.updateIngredient('999', { name: 'Nonexistent' })).rejects.toThrow(NotFoundException);
    });

    it('deleteIngredient: should throw RpcException (404) if ingredient not found', async () => {
      (ingredientRepo.findOne as jest.Mock).mockResolvedValue(null);

      let error: any;
      try {
        await service.deleteIngredient('non-existent-id');
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(RpcException);
    });

    it('deleteIngredient: should reject if ingredient is used in recipe', async () => {
      (ingredientRepo.findOne as jest.Mock).mockResolvedValue({ id: '1', name: 'Cà phê hạt' });
      (recipeItemRepo.findOne as jest.Mock).mockResolvedValue({ id: 'item-1', ingredientId: '1' });

      await expect(service.deleteIngredient('1')).rejects.toThrow(RpcException);
      expect(stockRepo.delete).not.toHaveBeenCalled();
      expect(ingredientRepo.delete).not.toHaveBeenCalled();
    });

    it('deleteIngredient: should delete stock and ingredient when not used in recipe', async () => {
      (ingredientRepo.findOne as jest.Mock).mockResolvedValue({ id: '1', name: 'Cà phê hạt' });
      (recipeItemRepo.findOne as jest.Mock).mockResolvedValue(null);
      (stockRepo.delete as jest.Mock).mockResolvedValue({ affected: 1 });
      (ingredientRepo.delete as jest.Mock).mockResolvedValue({ affected: 1 });

      const result = await service.deleteIngredient('1');
      expect(result.success).toBe(true);
      expect(stockRepo.delete).toHaveBeenCalledWith({ ingredientId: '1' });
      expect(ingredientRepo.delete).toHaveBeenCalledWith('1');
    });
  });

  describe('Recipe Management', () => {
    it('createRecipe: should create and save a new recipe', async () => {
      const dto = {
        productId: 'prod-1',
        size: 'L',
        items: [{ ingredientId: 'ing-1', quantityNeeded: 25 }],
      };
      const createdRecipe = { id: 'rec-1', ...dto } as Recipe;

      (recipeRepo.create as jest.Mock).mockReturnValue(createdRecipe);
      (recipeItemRepo.create as jest.Mock).mockImplementation((item) => item);
      (recipeRepo.save as jest.Mock).mockResolvedValue(createdRecipe);

      const result = await service.createRecipe(dto);
      expect(result).toEqual(createdRecipe);
      expect(recipeRepo.save).toHaveBeenCalled();
    });

    it('getRecipes: should return all recipes with relations', async () => {
      const recipes = [{ id: 'rec-1', productId: 'prod-1', size: 'M', items: [] }] as Recipe[];
      (recipeRepo.find as jest.Mock).mockResolvedValue(recipes);

      const result = await service.getRecipes();
      expect(result).toEqual(recipes);
      expect(recipeRepo.find).toHaveBeenCalledWith({ relations: { items: true } });
    });

    it('updateRecipe: should update and save recipe', async () => {
      const existing = { id: 'rec-1', productId: 'prod-1', size: 'M', items: [] } as Recipe;
      (recipeRepo.findOne as jest.Mock).mockResolvedValue(existing);
      (recipeItemRepo.delete as jest.Mock).mockResolvedValue({ affected: 1 });
      (recipeItemRepo.create as jest.Mock).mockImplementation((item) => item);
      (recipeRepo.save as jest.Mock).mockImplementation((rec) => Promise.resolve(rec));

      const result = await service.updateRecipe('rec-1', {
        size: 'L',
        items: [{ ingredientId: 'ing-2', quantityNeeded: 50 }],
      });

      expect(result.size).toBe('L');
      expect(recipeRepo.save).toHaveBeenCalled();
    });

    it('updateRecipe: should throw NotFoundException when recipe not found', async () => {
      (recipeRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateRecipe('rec-not-found', { size: 'XL' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Stock Operations', () => {
    it('stockIn: should create new stock entry if not exists', async () => {
      (stockRepo.findOne as jest.Mock).mockResolvedValue(null);
      (stockRepo.save as jest.Mock).mockImplementation((stock) => Promise.resolve({ id: 'new-stock-id', ...stock }));

      const result = await service.stockIn({
        branchId: 'branch-1',
        ingredientId: 'ing-1',
        quantity: 500,
      });

      expect(result.currentQuantity).toBe(500);
      expect(stockRepo.save).toHaveBeenCalled();
    });

    it('stockIn: should accumulate quantity if stock entry already exists', async () => {
      const existingStock = {
        id: 'stock-1',
        branchId: 'branch-1',
        ingredientId: 'ing-1',
        currentQuantity: 200,
      } as Stock;

      (stockRepo.findOne as jest.Mock).mockResolvedValue(existingStock);
      (stockRepo.save as jest.Mock).mockImplementation((stock) => Promise.resolve(stock));

      const result = await service.stockIn({
        branchId: 'branch-1',
        ingredientId: 'ing-1',
        quantity: 300,
      });

      expect(result.currentQuantity).toBe(500);
      expect(stockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          currentQuantity: 500,
        }),
      );
    });

    it('getStockByBranch: should return stock items for a given branch', async () => {
      const branchStocks = [{ id: 's-1', branchId: 'branch-1', ingredientId: 'ing-1', currentQuantity: 100 }] as Stock[];
      (stockRepo.find as jest.Mock).mockResolvedValue(branchStocks);

      const result = await service.getStockByBranch('branch-1');
      expect(result).toEqual(branchStocks);
      expect(stockRepo.find).toHaveBeenCalledWith({ where: { branchId: 'branch-1' } });
    });

    it('getLowStockAlerts: should return alerts when stock <= minStockThreshold', async () => {
      (stockRepo.find as jest.Mock).mockResolvedValue([
        { id: '1', branchId: 'b-1', ingredientId: 'ing-1', currentQuantity: 50 },
        { id: '2', branchId: 'b-1', ingredientId: 'ing-2', currentQuantity: 500 },
      ]);

      (ingredientRepo.find as jest.Mock).mockResolvedValue([
        { id: 'ing-1', name: 'Cà phê hạt', minStockThreshold: 100 },
        { id: 'ing-2', name: 'Đường', minStockThreshold: 100 },
      ]);

      const alerts = await service.getLowStockAlerts('b-1');
      expect(alerts).toHaveLength(1);
      expect(alerts[0].ingredientName).toBe('Cà phê hạt');
      expect(alerts[0].currentQuantity).toBe(50);
      expect(alerts[0].threshold).toBe(100);
    });
  });
});
