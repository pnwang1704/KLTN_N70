import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Ingredient } from './inventory/entities/ingredient.entity';
import { Recipe } from './inventory/entities/recipe.entity';
import { RecipeItem } from './inventory/entities/recipe-item.entity';
import { Stock } from './inventory/entities/stock.entity';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  const ingredientRepo = app.get(getRepositoryToken(Ingredient));
  const recipeRepo = app.get(getRepositoryToken(Recipe));
  const recipeItemRepo = app.get(getRepositoryToken(RecipeItem));
  const stockRepo = app.get(getRepositoryToken(Stock));

  console.log('Clearing old data...');
  await stockRepo.delete({});
  await recipeItemRepo.delete({});
  await recipeRepo.delete({});
  await ingredientRepo.delete({});

  console.log('Seeding ingredients...');
  const coffee = await ingredientRepo.save({ name: 'Cà phê hạt', unit: 'g', minStockThreshold: 1000 });
  const milk = await ingredientRepo.save({ name: 'Sữa đặc', unit: 'ml', minStockThreshold: 500 });
  const sugar = await ingredientRepo.save({ name: 'Đường', unit: 'g', minStockThreshold: 500 });

  console.log('Seeding stock for branchId: "1"...');
  await stockRepo.save([
    { branchId: '1', ingredientId: coffee.id, currentQuantity: 5000 },
    { branchId: '1', ingredientId: milk.id, currentQuantity: 2000 },
    { branchId: '1', ingredientId: sugar.id, currentQuantity: 2000 },
  ]);

  console.log('Seeding recipe for productId: "1", size: "M"...');
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
  await recipeRepo.save(recipe);

  console.log('Seed completed successfully!');
  await app.close();
}
bootstrap();
