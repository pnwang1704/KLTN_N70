import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateIngredientDto {
  @IsString()
  name: string;

  @IsString()
  unit: string;

  @IsOptional()
  @IsNumber()
  currentStock?: number;

  @IsOptional()
  @IsNumber()
  minStock?: number;

  @IsOptional()
  @IsNumber()
  minStockThreshold?: number;

  @IsOptional()
  @IsNumber()
  costPerUnit?: number;
}
