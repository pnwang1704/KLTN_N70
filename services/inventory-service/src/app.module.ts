import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { InventoryModule } from './inventory/inventory.module';
import { Ingredient } from './inventory/entities/ingredient.entity';
import { Recipe } from './inventory/entities/recipe.entity';
import { RecipeItem } from './inventory/entities/recipe-item.entity';
import { Stock } from './inventory/entities/stock.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5436,
      username: 'user',
      password: 'password',
      database: 'inventory_db',
      entities: [Ingredient, Recipe, RecipeItem, Stock],
      synchronize: true, // dev only
    }),
    InventoryModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
