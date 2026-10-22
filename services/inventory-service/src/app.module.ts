import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { InventoryModule } from './inventory/inventory.module';
import { Ingredient } from './inventory/entities/ingredient.entity';
import { Recipe } from './inventory/entities/recipe.entity';
import { RecipeItem } from './inventory/entities/recipe-item.entity';
import { Stock } from './inventory/entities/stock.entity';

const dbUrl = process.env.DATABASE_URL || 'postgres://user:password@localhost:5432/db';
const isSsl = process.env.DATABASE_SSL === 'true' || dbUrl.includes('sslmode=require') || dbUrl.includes('neon.tech');

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: dbUrl,
      entities: [Ingredient, Recipe, RecipeItem, Stock],
      synchronize: true, // dev only
      ssl: isSsl ? { rejectUnauthorized: false } : false,
      extra: isSsl ? { ssl: { rejectUnauthorized: false } } : undefined,
    }),
    InventoryModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

