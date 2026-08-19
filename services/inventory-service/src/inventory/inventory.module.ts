import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { Ingredient } from './entities/ingredient.entity';
import { Recipe } from './entities/recipe.entity';
import { RecipeItem } from './entities/recipe-item.entity';
import { Stock } from './entities/stock.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ingredient, Recipe, RecipeItem, Stock]),
  ],
  controllers: [InventoryController],
  providers: [InventoryService],
})
export class InventoryModule {}
