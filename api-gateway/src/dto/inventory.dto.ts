import { IsString, IsNumber, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateIngredientDto {
  @IsString()
  name: string;

  @IsString()
  unit: string;

  @IsOptional()
  @IsNumber()
  minStockThreshold?: number;
}

export class UpdateIngredientDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsNumber()
  minStockThreshold?: number;
}

export class RecipeItemDto {
  @IsString()
  ingredientId: string;

  @IsNumber()
  quantityNeeded: number;
}

export class CreateRecipeDto {
  @IsString()
  productId: string;

  @IsOptional()
  @IsString()
  size?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecipeItemDto)
  items: RecipeItemDto[];
}

export class UpdateRecipeDto {
  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsString()
  size?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecipeItemDto)
  items?: RecipeItemDto[];
}

export class StockInDto {
  @IsString()
  branchId: string;

  @IsString()
  ingredientId: string;

  @IsNumber()
  quantity: number;
}
